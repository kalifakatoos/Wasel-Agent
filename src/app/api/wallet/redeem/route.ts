import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidLibyanPhone, money } from '@/lib/wasel/server-utils'
import { emitRealtime } from '@/lib/wasel/server-utils'
import { notifyCustomer } from '@/lib/wasel/notifications-server'

export const dynamic = 'force-dynamic'

interface GiftRow {
  id: string
  code: string
  amountLyd: number
  isActive: number | boolean
  usedByPhone: string | null
}

/// 🎁 شحن محفظة الزبون بكود هدية (بطاقة مسبقة الدفع — بلا ربا ولا غرر)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, code } = body as { phone?: string; code?: string }

    const cleanPhone = (phone || '').trim()
    if (!isValidLibyanPhone(cleanPhone)) {
      return NextResponse.json({ error: 'رقم الهاتف الليبي غير صالح (091-094)' }, { status: 400 })
    }
    const cleanCode = (code || '').trim().toUpperCase()
    if (!cleanCode) {
      return NextResponse.json({ error: 'أدخل كود الشحن أولاً' }, { status: 400 })
    }

    const blocked = await db.blockedPhone.findUnique({ where: { phone: cleanPhone } })
    if (blocked) {
      return NextResponse.json(
        { error: `رقمك محظور مؤقتاً — لا يمكن شحن المحفظة: ${blocked.reason}` },
        { status: 403 },
      )
    }

    const rows = await db.$queryRawUnsafe<GiftRow[]>(
      `SELECT * FROM "TopupCode" WHERE UPPER("code") = ? LIMIT 1`,
      cleanCode,
    )
    const gift = rows?.[0]
    if (!gift) return NextResponse.json({ error: 'كود الشحن غير معروف — تحقق من الحروف' }, { status: 404 })
    if (!gift.isActive) {
      return NextResponse.json({ error: 'هذا الكود مُعطّل — تواصل مع دعم واصل نالوت' }, { status: 409 })
    }
    if (gift.usedByPhone) {
      return NextResponse.json(
        { error: 'هذا الكود مستخدم مسبقاً — كل كود يُستخدم مرة واحدة فقط' },
        { status: 409 },
      )
    }

    const amount = money(gift.amountLyd)

    // استهلاك الكود (ذرّي: فقط إن بقي غير مستخدم)
    const consumed = await db.$executeRawUnsafe(
      `UPDATE "TopupCode" SET "usedByPhone" = ?, "usedAt" = ? WHERE UPPER("code") = ? AND "usedByPhone" IS NULL AND "isActive" = 1`,
      cleanPhone,
      new Date().toISOString(),
      cleanCode,
    )
    if (!consumed) {
      return NextResponse.json({ error: 'تعذر استهلاك الكود — حاول مجدداً' }, { status: 409 })
    }

    // شحن المحفظة + قيد مزدوج
    await db.wallet.upsert({
      where: { ownerId: cleanPhone },
      create: { ownerId: cleanPhone, walletType: 'customer', balance: amount },
      update: { balance: { increment: amount } },
    })
    await db.walletTransaction.create({
      data: {
        fromWalletId: 'platform_escrow',
        toWalletId: cleanPhone,
        amount,
        type: 'topup',
        narration: `شحن محفظة بكود هدية ${gift.code} — دفعة مقدمة بلا ربا`,
      },
    })

    const wallet = await db.wallet.findUnique({ where: { ownerId: cleanPhone } })

    // بث لمركز الإدارة (أي حركة مالية تُساءل)
    await emitRealtime(['admin:fleet'], 'wallet:topup_redeemed', {
      phone: cleanPhone,
      code: gift.code,
      amountLyd: amount,
      balance: money(wallet?.balance ?? amount),
    })

    // 🔔 إشعار الزبون: شُحنت محفظتك
    await notifyCustomer(cleanPhone, {
      id: `wallet:${gift.code}`,
      kind: 'wallet',
      title: '💰 شُحنت محفظتك بنجاح',
      body: `أُضيف ${amount.toFixed(2)} د.ل بكود الهدية ${gift.code} — رصيدك الآن ${money(wallet?.balance ?? amount).toFixed(2)} د.ل`,
      amountLyd: amount,
    })

    return NextResponse.json({
      ok: true,
      code: gift.code,
      amountLyd: amount,
      balance: money(wallet?.balance ?? amount),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
