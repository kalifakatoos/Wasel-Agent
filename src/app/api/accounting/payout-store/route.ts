import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, emitRealtime, generateVoucherNumber, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/** صرف مستحقات متجر (سند صرف رسمي) — يتطلب درع الـ PIN */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const { store_id, amount } = body as { store_id: string; amount: number }
    const store = await db.store.findUnique({ where: { id: store_id } })
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const wallet = await db.wallet.findUnique({ where: { ownerId: `store:${store_id}` } })
    const available = wallet?.balance ?? 0
    const amt = money(Math.min(Number(amount) || available, available))
    if (amt <= 0) {
      return NextResponse.json({ error: 'لا توجد مستحقات متاحة للصرف' }, { status: 409 })
    }

    const seq = (await db.voucher.count()) + 1
    const voucher = await db.voucher.create({
      data: {
        voucherNumber: generateVoucherNumber('disbursement', seq),
        type: 'disbursement',
        beneficiaryName: store.name,
        beneficiaryRole: 'store',
        amountLyd: amt,
        notes: `سند صرف مستحقات متجر ${store.name} — 90% صافي المبيعات`,
      },
    })

    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amt } },
      })
    }
    await db.walletTransaction.create({
      data: {
        fromWalletId: `store:${store_id}`,
        toWalletId: 'platform_revenue',
        amount: amt,
        type: 'store_payout_settled',
        narration: `صرف مستحقات المتجر ${store.name} — ${voucher.voucherNumber}`,
      },
    })

    await emitRealtime([`store:${store_id}`, 'admin:fleet'], 'store:payout_settled', {
      storeId: store_id, storeName: store.name, amount: amt, voucherNumber: voucher.voucherNumber,
    })

    return NextResponse.json({ voucher, remainingDues: money(available - amt) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
