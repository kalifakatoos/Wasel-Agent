import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapOrder, patchNewOrderFields } from '@/lib/wasel/orders-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const phone = sp.get('phone')
    const storeId = sp.get('storeId')
    const driverId = sp.get('driverId')
    const status = sp.get('status') // 'active' | 'all' | محدد
    const limit = Math.min(50, Number(sp.get('limit') || 20))

    const activeStates = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery']

    const orders = await db.order.findMany({
      where: {
        ...(phone ? { customerPhone: phone } : {}),
        ...(storeId ? { storeId } : {}),
        ...(driverId ? { driverId } : {}),
        ...(status === 'active'
          ? { status: { in: activeStates } }
          : status && status !== 'all'
            ? { status }
            : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { store: { select: { latitude: true, longitude: true, emoji: true } } },
    })

    const patched = await patchNewOrderFields(orders)
    return NextResponse.json({ orders: patched.map((o) => mapOrder(o, o.store)) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
