import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/** سجل سندات القبض والصرف (يتطلب درع الـ PIN) */
export async function GET(req: NextRequest) {
  try {
    const pinError = assertAdminPin(req)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const vouchers = await db.voucher.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    const blocked = await db.blockedPhone.findMany({ orderBy: { blockedAt: 'desc' } })
    const transactions = await db.walletTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return NextResponse.json({ vouchers, blocked, transactions })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
