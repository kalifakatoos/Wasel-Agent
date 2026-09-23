import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { mapOrder } from '@/lib/wasel/orders-server'

export const dynamic = 'force-dynamic'

/**
 * قبول الكابتن لعرض الرادار (أول من يقبل يفوز)
 * الحماية: الطلب غير المعيَّن فقط، وحالة preparing أو accepted
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { driver_id } = await req.json()
    if (!driver_id || typeof driver_id !== 'string') {
      return NextResponse.json({ error: 'معرف الكابتن مطلوب' }, { status: 400 })
    }

    const driver = await db.driver.findUnique({ where: { id: driver_id } })
    if (!driver) return NextResponse.json({ error: 'الكابتن غير موجود' }, { status: 404 })
    if (driver.status === 'offline') {
      return NextResponse.json({ error: 'يجب تشغيل الوردية أولاً' }, { status: 409 })
    }

    const order = await db.order.findUnique({ where: { id }, include: { store: true } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if (order.driverId && order.driverId !== driver_id) {
      return NextResponse.json({ error: 'سبقك كابتن آخر لهذا الطلب' }, { status: 409 })
    }
    if (!['preparing', 'accepted', 'ready_for_pickup'].includes(order.status)) {
      return NextResponse.json({ error: 'هذا الطلب لم يعد متاحاً للقبول' }, { status: 409 })
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        driverId: driver.id,
        driverName: driver.fullName,
        status: order.status === 'placed' ? 'accepted' : order.status,
      },
      include: { store: true },
    })
    await db.driver.update({
      where: { id: driver.id },
      data: { status: 'busy', activeOrdersCount: { increment: 1 } },
    })

    await emitRealtime(
      [`order:${id}`, `store:${order.storeId}`, 'admin:fleet', `driver:${driver.id}`],
      'order:assigned',
      {
        orderId: id,
        orderNumber: order.orderNumber,
        driverId: driver.id,
        driverName: driver.fullName,
        vehicleType: driver.vehicleType,
        plateNumber: driver.plateNumber,
        status: updated.status,
      },
    )
    await emitRealtime(['admin:fleet', 'drivers:radar'], 'order:radar_taken', {
      orderId: id, driverId: driver.id, driverName: driver.fullName,
    })

    return NextResponse.json({ order: mapOrder(updated, updated.store) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
