import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapOrder, patchNewOrderFields } from '@/lib/wasel/orders-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: { store: { select: { latitude: true, longitude: true, emoji: true } } },
    })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    const [patched] = await patchNewOrderFields([order])
    return NextResponse.json({ order: mapOrder(patched, order.store) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
