import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/wasel/ensure-seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureSeed()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [stores, drivers, todayOrders, onlineDrivers, activeCount, realtime] = await Promise.all([
      db.store.count(),
      db.driver.count(),
      db.order.findMany({ where: { createdAt: { gte: todayStart } } }),
      db.driver.count({ where: { status: { in: ['online', 'busy'] } } }),
      db.order.count({
        where: { status: { in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] } },
      }),
      fetch('http://localhost:3013/health', { signal: AbortSignal.timeout(1500) })
        .then((r) => r.json())
        .catch(() => null),
    ])

    const delivered = todayOrders.filter((o) => o.status === 'delivered')
    const gmvToday = Math.round(delivered.reduce((s, o) => s + o.totalLyd, 0) * 100) / 100

    return NextResponse.json({
      ok: true,
      service: 'wasel-nalut',
      currency: 'LYD',
      city: 'نالوت',
      db: { stores, drivers },
      realtime: realtime?.ok ? 'connected' : 'degraded',
      live: {
        ordersToday: todayOrders.length,
        deliveredToday: delivered.length,
        gmvToday,
        onlineDrivers,
        activeOrders: activeCount,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
