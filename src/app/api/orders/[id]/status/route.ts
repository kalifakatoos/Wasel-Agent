import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { dispatchRadar, mapOrder } from '@/lib/wasel/orders-server'

export const dynamic = 'force-dynamic'

/**
 * تغيير حالة الطلب من طرف المطبخ:
 * - accept: قبول الطلب وتحديد زمن الطهي → إشعال رادار التوزيع للكباتن
 * - ready:  «الوجبة جاهزة للاستلام» → فك قفل الاستلام للكابتن
 * - reject: رفض الطلب (قبل التحضير فقط)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { action, prep_minutes } = await req.json()

    const order = await db.order.findUnique({ where: { id }, include: { store: true } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    if (action === 'accept') {
      if (order.status !== 'placed') {
        return NextResponse.json({ error: 'لا يمكن قبول طلب في هذه الحالة' }, { status: 409 })
      }
      const prep = Math.max(5, Math.min(60, Number(prep_minutes) || order.prepTimeMinutes))
      const updated = await db.order.update({
        where: { id },
        data: {
          status: 'preparing',
          prepTimeMinutes: prep,
          dispatchAt: new Date(),
        },
        include: { store: true },
      })
      await emitRealtime(
        [`order:${id}`, `store:${order.storeId}`, 'admin:fleet'],
        'order:status_changed',
        { orderId: id, status: 'preparing', orderNumber: order.orderNumber, prepMinutes: prep },
      )
      // 🛵 إشعال رادار التوزيع (خوارزمية المطابقة الثنائية) بعد معرفة زمن الطهي
      const offered = await dispatchRadar(id)
      return NextResponse.json({ order: mapOrder(updated, updated.store), radarOffersSent: offered })
    }

    if (action === 'ready') {
      if (!['placed', 'accepted', 'preparing'].includes(order.status)) {
        return NextResponse.json({ error: 'لا يمكن تجهيز طلب في هذه الحالة' }, { status: 409 })
      }
      const updated = await db.order.update({
        where: { id },
        data: { status: 'ready_for_pickup', readyAt: new Date() },
        include: { store: true },
      })
      await emitRealtime(
        [`order:${id}`, `store:${order.storeId}`, 'admin:fleet', order.driverId ? `driver:${order.driverId}` : 'drivers:radar'],
        'order:status_changed',
        { orderId: id, status: 'ready_for_pickup', orderNumber: order.orderNumber },
      )
      // إن لم يُعيَّن كابتن بعد → أعد إشعال الرادار فوراً (الوجبة تبرد!)
      await dispatchRadar(id)
      return NextResponse.json({ order: mapOrder(updated, updated.store) })
    }

    if (action === 'reject') {
      if (order.status !== 'placed') {
        return NextResponse.json({ error: 'لا يمكن رفض طلب بعد بدء التحضير' }, { status: 409 })
      }
      const updated = await db.order.update({
        where: { id },
        data: { status: 'cancelled', disputeNote: 'رفضه المتجر' },
        include: { store: true },
      })
      await emitRealtime([`order:${id}`, 'admin:fleet'], 'order:status_changed', {
        orderId: id, status: 'cancelled', orderNumber: order.orderNumber,
      })
      return NextResponse.json({ order: mapOrder(updated, updated.store) })
    }

    return NextResponse.json({ error: 'action غير معروف' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
