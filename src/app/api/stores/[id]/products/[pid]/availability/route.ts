import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emitRealtime } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/** تفعيل/إيقاف توفر صنف فورياً (إدارة مخزون المطبخ اللحظية) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const { id, pid } = await params
    const { is_available, stock_quantity } = await req.json()

    const product = await db.product.findUnique({ where: { id: pid } })
    if (!product || product.storeId !== id) {
      return NextResponse.json({ error: 'الصنف غير موجود في هذا المتجر' }, { status: 404 })
    }

    const updated = await db.product.update({
      where: { id: pid },
      data: {
        ...(typeof is_available === 'boolean' ? { isAvailable: is_available } : {}),
        ...(typeof stock_quantity === 'number' ? { stockQuantity: Math.max(0, Math.floor(stock_quantity)) } : {}),
      },
    })

    await emitRealtime([`store:${id}`, 'admin:fleet'], 'store:product_availability', {
      storeId: id,
      productId: pid,
      title: updated.title,
      isAvailable: updated.isAvailable,
      stockQuantity: updated.stockQuantity,
    })

    return NextResponse.json({ product: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
