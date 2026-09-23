import { NextRequest, NextResponse } from 'next/server'
import { assertAdminPin } from '@/lib/wasel/server-utils'
import { getMonthlyLostReport } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 📉 تقرير الفرص الضائعة الشهري (CRON-R9) — اتجاه يومي + تفصيل لكل كوبون
/// GET /api/admin/promos/report?days=30 — يتطلب درع الـ PIN
export async function GET(req: NextRequest) {
  const pinError = assertAdminPin(req)
  if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
  const daysParam = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30
  const report = await getMonthlyLostReport(days)
  return NextResponse.json(report)
}
