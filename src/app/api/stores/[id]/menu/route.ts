import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const store = await db.store.findUnique({
      where: { id },
      include: {
        products: { orderBy: { basePriceLyd: 'asc' } },
      },
    })
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })
    return NextResponse.json({ store, products: store.products })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
