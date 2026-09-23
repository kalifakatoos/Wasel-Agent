import { NextResponse } from 'next/server'
import { getActivePromos } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 🎟️ الكوبونات النشطة الحية (الهبوط + الدفع) — المصدر: غرفة العمليات
export async function GET() {
  const promos = await getActivePromos()
  return NextResponse.json({ promos })
}
