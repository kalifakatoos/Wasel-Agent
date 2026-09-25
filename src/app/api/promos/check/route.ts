import { NextRequest, NextResponse } from 'next/server'
import { computePromoDiscountDb } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 🔍 فحص لطيف لكوبون (R11) — يشرح سبب الرفض بدقة (خاصة الجدولة الزمنية)
/// بلا أي آثار جانبية: لا يوثّق محاولات ولا يبث تنبيهات — فقط رسالة للمساعدة
/// GET /api/promos/check?code=EXPIRED11&subtotal=35
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? ''
  const subtotal = Number(req.nextUrl.searchParams.get('subtotal') ?? '0')
  if (!code.trim()) {
    return NextResponse.json({ ok: false, error: 'أدخل كود الخصم أولاً' })
  }
  const result = await computePromoDiscountDb(code, Number.isFinite(subtotal) ? subtotal : 0)
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      code: result.promo.code,
      label: result.promo.label,
      discount: result.discount,
      cashback: result.cashback ?? 0,
    })
  }
  return NextResponse.json({
    ok: false,
    error: result.error,
    reason: result.reason,
    code: result.row?.code ?? null,
  })
}
