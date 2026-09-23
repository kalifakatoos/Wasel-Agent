import { NextRequest, NextResponse } from 'next/server'
import { emitRealtime } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/**
 * تيليمتري الكابتن عبر HTTP (بديل احتياطي للـ socket)
 * يُبث لغرفة العمليات ولغرفة الطلب النشط
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { lat, lng, heading, status, order_id } = await req.json()
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'إحداثيات غير صالحة' }, { status: 400 })
    }
    await emitRealtime(['admin:fleet'], 'fleet:driver_location', {
      driverId: id, lat, lng, heading, status, updatedAt: new Date().toISOString(),
    })
    if (order_id) {
      await emitRealtime([`order:${order_id}`], 'order:driver_location', {
        driverId: id, lat, lng, heading, status, updatedAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
