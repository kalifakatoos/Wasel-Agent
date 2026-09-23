import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** محفظة الزبون (رصيد واصل) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  try {
    const { phone } = await params
    const wallet = await db.wallet.findUnique({ where: { ownerId: phone } })
    const blocked = await db.blockedPhone.findUnique({ where: { phone } })
    const transactions = await db.walletTransaction.findMany({
      where: { OR: [{ fromWalletId: phone }, { toWalletId: phone }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({
      balance: wallet?.balance ?? 0,
      walletType: wallet?.walletType ?? 'customer',
      blocked: !!blocked,
      blockedReason: blocked?.reason ?? null,
      transactions,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
