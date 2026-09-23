import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/wasel/ensure-seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureSeed()
    const drivers = await db.driver.findMany({ orderBy: { id: 'asc' } })
    return NextResponse.json({ drivers })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
