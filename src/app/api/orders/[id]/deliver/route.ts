import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { mapOrder, settleLedgerOnDelivered } from '@/lib/wasel/orders-server'
import { issueGiftCardsForOrder, notifyCustomer, orderNotifyText } from '@/lib/wasel/notifications-server'

export const dynamic = 'force-dynamic'

/**
 * التسليم والتحقق النهائي:
 * - إدخال كود OTP الرباعي المستلم من الزبون (مطابقة صارمة)
 * - استلام الكاش النقدي كاملاً → تقييد العهدة على الكابتن
 * - تنفيذ القيد المزدوج: 90% للمتجر، 10% للمنصة، كامل الأجرة للكابتن
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { driver_id, otp } = await req.json()

    const order = await db.order.findUnique({ where: { id }, include: { store: true } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (order.driverId !== driver_id) {
      return NextResponse.json({ error: 'هذا الطلب غير معيَّن لك أيها الكابتن' }, { status: 403 })
    }
    if (order.status !== 'out_for_delivery') {
      return NextResponse.json({ error: 'لم تبدأ رحلة التوصيل بعد' }, { status: 409 })
    }
    if (String(otp)?.trim() !== order.otpCode) {
      return NextResponse.json(
        { error: '🔒 كود التسليم غير صحيح — اطلب الكود الرباعي من الزبون مباشرة' },
        { status: 401 },
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: { status: 'delivered', deliveredAt: new Date() },
      include: { store: true },
    })

    // 🧾 القيد المزدوج المحاسبي الكامل
    await settleLedgerOnDelivered(id)

    // 🎁 إصدار أكواد بطاقات الشحن إن كان الطلب يحوي بطاقات من واصل متاع (+ إشعار بالأكواد)
    await issueGiftCardsForOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      itemsJson: order.itemsJson,
    })

    // 🔔 إشعار الزبون: اكتمل التوصيل
    const deliveredText = orderNotifyText('delivered', order)
    if (deliveredText) {
      await notifyCustomer(order.customerPhone, {
        id: `order:${id}:delivered`,
        kind: 'order',
        title: deliveredText.title,
        body: deliveredText.body,
        orderId: id,
        orderNumber: order.orderNumber,
        storeEmoji: order.store.emoji,
      })
    }

    const final = await db.order.findUnique({
      where: { id },
      include: { store: { select: { latitude: true, longitude: true, emoji: true } } },
    })

    return NextResponse.json({ order: mapOrder(final!, final!.store) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
