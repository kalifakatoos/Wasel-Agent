import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { mapOrder } from '@/lib/wasel/orders-server'
import { notifyCustomer, orderNotifyText } from '@/lib/wasel/notifications-server'

export const dynamic = 'force-dynamic'

/**
 * 🔒 قفل الاستلام الأمني للمطبخ (Handover Security Guard)
 * يُمنع الكابتن من استلام الوجبة ما لم تكن حالتها ready_for_pickup.
 * هذا يمنع بقاء الكابتن واقفاً داخل المطبخ ويعزل مسؤولية التأخير.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { driver_id } = await req.json()

    const order = await db.order.findUnique({ where: { id }, include: { store: true } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    if (order.driverId !== driver_id) {
      return NextResponse.json({ error: 'هذا الطلب غير معيَّن لك أيها الكابتن' }, { status: 403 })
    }

    // 🔒 القفل الصارم
    if (order.status !== 'ready_for_pickup') {
      return NextResponse.json(
        {
          error: '🔒 الاستلام مقفل: المطبخ لم يؤكد جاهزية الوجبة بعد. يجب أن يضغط المطعم «الوجبة جاهزة» أولاً',
          guard: 'handover_locked',
          currentStatus: order.status,
        },
        { status: 423 },
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: { status: 'out_for_delivery', handoverAt: new Date() },
      include: { store: true },
    })

    await emitRealtime(
      [`order:${id}`, `store:${order.storeId}`, 'admin:fleet'],
      'order:status_changed',
      { orderId: id, status: 'out_for_delivery', orderNumber: order.orderNumber },
    )

    // 🔔 إشعار الزبون: الكابتن في الطريق إليك
    const outText = orderNotifyText('out_for_delivery', order)
    if (outText) {
      await notifyCustomer(order.customerPhone, {
        id: `order:${id}:out_for_delivery`,
        kind: 'order',
        title: outText.title,
        body: outText.body,
        orderId: id,
        orderNumber: order.orderNumber,
        storeEmoji: order.store.emoji,
      })
    }

    return NextResponse.json({ order: mapOrder(updated, updated.store) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
