import { NextRequest, NextResponse } from 'next/server'
import { assertAdminPin } from '@/lib/wasel/server-utils'
import { getPromoRejectDetail } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 📋 تفصيل محاولات كوبون مرفوض (R11) — نافذة التفصيل في تقرير الفرص الضائعة
/// GET /api/admin/promos/report/detail?code=WASEL10&days=30 — يتطلب درع الـ PIN
export async function GET(req: NextRequest) {
  const pinError = assertAdminPin(req)
  if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
  const code = req.nextUrl.searchParams.get('code') ?? ''
  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  if (!code.trim()) {
    return NextResponse.json({ error: 'كود الكوبون مطلوب' }, { status: 400 })
  }
  const attempts = await getPromoRejectDetail(code, Number.isFinite(days) ? days : 30)
  return NextResponse.json({
    code: code.trim().toUpperCase(),
    days: Number.isFinite(days) ? Math.max(7, Math.min(90, Math.floor(days))) : 30,
    attempts,
  })
}
