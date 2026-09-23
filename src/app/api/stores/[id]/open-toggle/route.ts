import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/** فتح/إغلاق المتجر فورياً (يمنع الطلبات الجديدة عند الإغلاق) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { is_open } = await req.json()

    const store = await db.store.findUnique({ where: { id } })
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const updated = await db.store.update({
      where: { id },
      data: { isOpen: !!is_open },
    })

    await emitRealtime([`store:${id}`, 'admin:fleet', 'stores:status'], 'store:status_changed', {
      storeId: id,
      storeName: store.name,
      isOpen: updated.isOpen,
    })

    return NextResponse.json({ store: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
