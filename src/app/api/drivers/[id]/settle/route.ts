import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, emitRealtime, generateVoucherNumber, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/**
 * تسوية عهدة الكابتن (توريد النقد لمقر واصل نالوت):
 * - تصفير العهدة المتراكمة في الخادم
 * - إصدار سند قبض رسمي
 * - يتطلب درع الـ PIN الإداري
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const driver = await db.driver.findUnique({ where: { id } })
    if (!driver) return NextResponse.json({ error: 'الكابتن غير موجود' }, { status: 404 })
    if (driver.custodyCash <= 0) {
      return NextResponse.json({ error: 'لا توجد عهدة نقدية لتسويتها' }, { status: 409 })
    }

    const amount = money(driver.custodyCash)
    const seq = (await db.voucher.count()) + 1
    const voucher = await db.voucher.create({
      data: {
        voucherNumber: generateVoucherNumber('receipt', seq),
        type: 'receipt',
        beneficiaryName: driver.fullName,
        beneficiaryRole: 'driver',
        amountLyd: amount,
        notes: `سند قبض عهدة كاش — توريد النقد لمقر واصل نالوت من الكابتن ${driver.fullName} (${driver.id})`,
      },
    })

    const updated = await db.driver.update({
      where: { id },
      data: { custodyCash: 0 },
    })

    await db.walletTransaction.create({
      data: {
        fromWalletId: `custody:${driver.id}`,
        toWalletId: 'platform_revenue',
        amount,
        type: 'settlement',
        narration: `تسوية عهدة الكابتن ${driver.fullName} وتوريد النقد للمقر — ${voucher.voucherNumber}`,
      },
    })

    await emitRealtime(['admin:fleet', `driver:${driver.id}`], 'driver:custody_settled', {
      driverId: driver.id,
      driverName: driver.fullName,
      amount,
      voucherNumber: voucher.voucherNumber,
    })

    return NextResponse.json({ driver: updated, voucher })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
