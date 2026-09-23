import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, money } from '@/lib/wasel/server-utils'
import { getAllPromos, promoRowToDef, type PromoRow } from '@/lib/wasel/promos-server'

export const dynamic = 'force-dynamic'

/// 🛡️ إدارة كوبونات الخصم — غرفة العمليات والمالية
/// GET: كل الكوبونات مع الإحصائيات | POST: إنشاء كوبون | PATCH: تفعيل/تعطيل
export async function GET(req: NextRequest) {
  const pinError = assertAdminPin(req)
  if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
  const rows = await getAllPromos()
  return NextResponse.json({
    promos: rows.map((r) => ({
      ...promoRowToDef(r),
      isActive: !!r.isActive,
      usedCount: r.usedCount,
      totalDiscountLyd: r.totalDiscountLyd,
      createdAt: r.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const {
      code, label, description, emoji, kind,
      percent: percentIn, flatLyd, maxDiscountLyd, minSubtotalLyd, maxUses,
    } = body as {
      code?: string
      label?: string
      description?: string
      emoji?: string
      kind?: 'percent' | 'flat' | 'cashback'
      percent?: number
      flatLyd?: number
      maxDiscountLyd?: number
      minSubtotalLyd?: number
      maxUses?: number
    }

    const cleanCode = (code || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{3,16}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'كود الكوبون يجب أن يكون 3-16 حرفاً إنجليزياً/رقماً بدون مسافات' },
        { status: 400 },
      )
    }
    if (!label?.trim()) {
      return NextResponse.json({ error: 'اسم الكوبون مطلوب' }, { status: 400 })
    }
    const finalKind = kind === 'flat' ? 'flat' : kind === 'cashback' ? 'cashback' : 'percent'
    let percent: number | null = null
    let flat: number | null = null
    if (finalKind === 'percent') {
      percent = Math.max(1, Math.min(90, Math.floor(percentIn ?? 0)))
      if (!percent) return NextResponse.json({ error: 'نسبة الخصم مطلوبة (1-90%)' }, { status: 400 })
    } else {
      flat = money(flatLyd ?? 0)
      if (flat <= 0) return NextResponse.json({ error: 'قيمة الخصم الثابت مطلوبة' }, { status: 400 })
    }
    const minSub = money(Math.max(0, minSubtotalLyd ?? 0))
    const cap = maxDiscountLyd != null ? money(Math.max(0.5, maxDiscountLyd)) : null
    if (finalKind === 'flat' && cap != null && flat != null && cap <= flat) {
      return NextResponse.json({ error: 'سقف الخصم يجب أن يكون أكبر من قيمة الخصم الثابت' }, { status: 400 })
    }
    // حصة الاستخدام الاختيارية: null = غير محدودة
    const uses = maxUses != null && Number(maxUses) > 0 ? Math.floor(Number(maxUses)) : null

    const id = `promo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    await db.$executeRawUnsafe(
      `INSERT INTO "PromoCode" ("id","code","label","description","emoji","kind","percent","flatLyd","maxDiscountLyd","minSubtotalLyd","maxUses","isActive","usedCount","totalDiscountLyd","createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)`,
      id,
      cleanCode,
      label.trim().slice(0, 60),
      (description || '').trim().slice(0, 140),
      (emoji || '🎟️').slice(0, 8),
      finalKind,
      percent,
      flat,
      cap,
      minSub,
      uses,
      new Date().toISOString(),
    )

    const rows = await db.$queryRawUnsafe<PromoRow[]>(
      `SELECT * FROM "PromoCode" WHERE "id" = ? LIMIT 1`,
      id,
    )
    return NextResponse.json({ ok: true, promo: rows?.[0] ?? null }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'هذا الكود مستخدم مسبقاً — اختر كوداً آخر' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
    const { code, isActive } = body as { code?: string; isActive?: boolean }
    const cleanCode = (code || '').trim().toUpperCase()
    if (!cleanCode || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'كود الكوبون والحالة الجديدة مطلوبان' }, { status: 400 })
    }
    const res = await db.$executeRawUnsafe(
      `UPDATE "PromoCode" SET "isActive" = ? WHERE UPPER("code") = UPPER(?)`,
      isActive ? 1 : 0,
      cleanCode,
    )
    if (!res) return NextResponse.json({ error: 'الكوبون غير موجود' }, { status: 404 })
    return NextResponse.json({ ok: true, code: cleanCode, isActive })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
