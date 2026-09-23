import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/wasel/ensure-seed'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await ensureSeed()
    const vertical = req.nextUrl.searchParams.get('vertical')
    const district = req.nextUrl.searchParams.get('district')

    const stores = await db.store.findMany({
      where: {
        ...(vertical ? { vertical } : {}),
        ...(district ? { district } : {}),
      },
      orderBy: { rating: 'desc' },
    })
    return NextResponse.json({ stores })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
