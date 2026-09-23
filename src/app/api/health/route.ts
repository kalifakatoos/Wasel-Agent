import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/wasel/ensure-seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureSeed()
    const [stores, drivers, realtime] = await Promise.all([
      db.store.count(),
      db.driver.count(),
      fetch('http://localhost:3013/health', { signal: AbortSignal.timeout(1500) })
        .then((r) => r.json())
        .catch(() => null),
    ])
    return NextResponse.json({
      ok: true,
      service: 'wasel-nalut',
      currency: 'LYD',
      city: 'نالوت',
      db: { stores, drivers },
      realtime: realtime?.ok ? 'connected' : 'degraded',
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
