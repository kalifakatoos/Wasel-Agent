import { NextResponse } from 'next/server'
import { getActivePromosWithMeta } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 🎟️ الكوبونات النشطة الحية (الهبوط + الدفع) — المصدر: غرفة العمليات
/// تتضمن عدّاد الاستخدام الحي لشارة «المتبقي» — الكوبونات النافدة تُخفى تلقائياً
export async function GET() {
  const promos = await getActivePromosWithMeta()
  return NextResponse.json({ promos })
}
