import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime, money } from '@/lib/wasel/server-utils'
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
      storeId: order.storeId,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      itemsJson: order.itemsJson,
    })

    // 💸 إيداع كاش باك الكوبون في محفظة الزبون (قيد مزدوج: من إيرادات المنصة → محفظة الزبون)
    await creditPromoCashback({
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      customerPhone: order.customerPhone,
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

/**
 * 💸 إيداع كاش باك الكوبون في محفظة الزبون عند التسليم الناجح.
 * - يقرأ cashbackLyd عبر SQL خام (عمود جديد — توافق عميل Prisma العالق بالذاكرة)
 * - قيد مزدوج: من محفظة إيرادات المنصة (ميزانية تسويق) → محفظة الزبون
 * - حماية من التكرار: مفتاح نوع القيد promo_cashback + orderId
 * - إشعار الزبون + بث حدث لغرفة العمليات والمتجر
 */
async function creditPromoCashback(order: {
  orderId: string
  orderNumber: string
  storeId: string
  customerPhone: string
}): Promise<void> {
  try {
    // اقرأ قيمة الكاش باك من العمود الخام
    const rows = await db.$queryRawUnsafe<{ cashbackLyd: number | null }[]>(
      `SELECT "cashbackLyd" FROM "Order" WHERE id = ? LIMIT 1`,
      order.orderId,
    )
    const cashback = money(Number(rows?.[0]?.cashbackLyd ?? 0))
    if (cashback <= 0) return

    // حماية من التقييد المزدوج (idempotency)
    const already = await db.walletTransaction.findFirst({
      where: { orderId: order.orderId, type: 'promo_cashback' },
    })
    if (already) return

    // قيد مزدوج: من إيرادات المنصة → محفظة الزبون
    await db.wallet.upsert({
      where: { ownerId: order.customerPhone },
      create: { ownerId: order.customerPhone, walletType: 'customer', balance: cashback },
      update: { balance: { increment: cashback } },
    })
    await db.wallet.upsert({
      where: { ownerId: 'platform_revenue' },
      create: { ownerId: 'platform_revenue', walletType: 'platform_revenue', balance: 0 },
      update: {},
    })
    await db.walletTransaction.create({
      data: {
        orderId: order.orderId,
        fromWalletId: 'platform_revenue',
        toWalletId: order.customerPhone,
        amount: cashback,
        type: 'promo_cashback',
        narration: `كاش باك كوبون واصل مودع محفظة الزبون عند التسليم - ${order.orderNumber}`,
      },
    })

    const wallet = await db.wallet.findUnique({ where: { ownerId: order.customerPhone } })

    // 🔔 إشعار الزبون: كاش باك وصل محفظتك
    await notifyCustomer(order.customerPhone, {
      id: `cashback:${order.orderId}`,
      kind: 'wallet',
      title: '💸 كاش باك وصل محفظتك!',
      body: `أُودع ${cashback.toFixed(2)} د.ل كاش باك كوبون من طلبك ${order.orderNumber} — رصيدك الآن ${money(wallet?.balance ?? cashback).toFixed(2)} د.ل`,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      amountLyd: cashback,
    })

    // 📡 بث لغرفة العمليات والمتجر (أي حركة مالية تُساءل)
    await emitRealtime([`store:${order.storeId}`, 'admin:fleet'], 'wallet:promo_cashback', {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone.slice(0, 4) + '****',
      amountLyd: cashback,
    })
  } catch {
    /* الكاش باك تحليل/ولاء — لا يُعطّل إتمام التسليم أبداً */
  }
}
