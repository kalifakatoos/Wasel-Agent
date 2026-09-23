import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { dispatchRadar } from '@/lib/wasel/orders-server'

export const dynamic = 'force-dynamic'

/** تبديل الوردية: online ⇄ offline (وأثناء توصيلة = busy) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { online } = await req.json()

    const driver = await db.driver.findUnique({ where: { id } })
    if (!driver) return NextResponse.json({ error: 'الكابتن غير موجود' }, { status: 404 })

    if (driver.activeOrdersCount > 0 && !online) {
      return NextResponse.json(
        { error: 'لديك توصيلات جارية — أنجزها قبل إنهاء الوردية' },
        { status: 409 },
      )
    }

    const status = online ? 'online' : 'offline'
    const updated = await db.driver.update({
      where: { id },
      data: {
        status,
        currentLatitude: online ? driver.currentLatitude ?? 31.8687 : driver.currentLatitude,
        currentLongitude: online ? driver.currentLongitude ?? 10.9818 : driver.currentLongitude,
      },
    })

    await emitRealtime(['admin:fleet'], 'fleet:driver_status', {
      driverId: id, fullName: driver.fullName, status, custodyCash: updated.custodyCash,
    })

    // الكابتن اتصل؟ أرسل فوراً أي طلبات بلا كابتن (رادار)
    if (online) {
      await dispatchPendingOffersForDriver(id)
    }

    return NextResponse.json({ driver: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function dispatchPendingOffersForDriver(driverId: string) {
  const driver = await db.driver.findUnique({ where: { id: driverId } })
  if (!driver || driver.status !== 'online') return 0
  // الطلبات غير المعينة قيد التحضير أو الجاهزة
  const pending = await db.order.findMany({
    where: { driverId: null, status: { in: ['preparing', 'accepted', 'ready_for_pickup'] } },
    include: { store: true },
    orderBy: { createdAt: 'asc' },
    take: 3,
  })
  for (const order of pending) {
    await dispatchRadar(order.id)
  }
  return pending.length
}
