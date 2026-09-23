// ============================================================
// 🎟️ كوبونات واصل — طبقة الخادم (SQL خام لتوافق عميل Prisma العالق بالذاكرة)
// الكوبونات مُدارة من غرفة العمليات (إنشاء/تعطيل) وتُزرع تلقائياً.
// الخصم تتحمله المنصة كاملاً — لا يمس حصة المتجر 90% ولا أجرة الكابتن.
// ============================================================
import { db } from '@/lib/db'
import { PROMOS, type PromoDef } from './promos'
import { money } from './server-utils'

export interface PromoRow {
  id: string
  code: string
  label: string
  description: string
  emoji: string
  kind: string
  percent: number | null
  flatLyd: number | null
  maxDiscountLyd: number | null
  minSubtotalLyd: number
  maxUses: number | null
  isActive: number | boolean
  usedCount: number
  totalDiscountLyd: number
  createdAt: string
}

export function promoRowToDef(p: PromoRow): PromoDef {
  return {
    code: p.code,
    label: p.label,
    description: p.description,
    emoji: p.emoji || '🎟️',
    kind: p.kind === 'flat' ? 'flat' : p.kind === 'cashback' ? 'cashback' : 'percent',
    percent: p.percent ?? undefined,
    flatLyd: p.flatLyd ?? undefined,
    maxDiscountLyd: p.maxDiscountLyd ?? undefined,
    minSubtotalLyd: p.minSubtotalLyd,
    maxUses: p.maxUses ?? undefined,
  }
}

let promoSeed: Promise<void> | null = null

/// زرع الكوبونات الرسمية الافتراضية عند أول استخدام (INSERT OR IGNORE)
export async function ensurePromosSeeded(): Promise<void> {
  if (promoSeed) return promoSeed
  promoSeed = (async () => {
    for (const p of PROMOS) {
      await db.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "PromoCode" ("id","code","label","description","emoji","kind","percent","flatLyd","maxDiscountLyd","minSubtotalLyd","isActive","usedCount","totalDiscountLyd","createdAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)`,
        `promo_${p.code.toLowerCase()}`,
        p.code,
        p.label,
        p.description,
        p.emoji,
        p.kind,
        p.percent ?? null,
        p.flatLyd ?? null,
        p.maxDiscountLyd ?? null,
        p.minSubtotalLyd,
        new Date().toISOString(),
      )
    }
  })().finally(() => {
    promoSeed = null
  })
  return promoSeed
}

/// الكوبونات النشطة فقط (للعرض على الزبائن)
export async function getActivePromos(): Promise<PromoDef[]> {
  try {
    await ensurePromosSeeded()
    const rows = await db.$queryRawUnsafe<PromoRow[]>(
      `SELECT * FROM "PromoCode" WHERE "isActive" = 1 AND ("maxUses" IS NULL OR "usedCount" < "maxUses") ORDER BY "minSubtotalLyd" ASC`,
    )
    if (!rows || rows.length === 0) return PROMOS
    return rows.map(promoRowToDef)
  } catch {
    return PROMOS
  }
}

/// الكوبونات النشطة مع عدّاد الاستخدام الحي (لشارة «المتبقي» على الزبائن)
export interface PromoPublic extends PromoDef {
  usedCount: number
  remainingUses: number | null // null = بلا حصة
}

export async function getActivePromosWithMeta(): Promise<PromoPublic[]> {
  try {
    await ensurePromosSeeded()
    const rows = await db.$queryRawUnsafe<PromoRow[]>(
      `SELECT * FROM "PromoCode" WHERE "isActive" = 1 AND ("maxUses" IS NULL OR "usedCount" < "maxUses") ORDER BY "minSubtotalLyd" ASC`,
    )
    if (!rows || rows.length === 0) return PROMOS.map((p) => ({ ...p, usedCount: 0, remainingUses: null }))
    return rows.map((r) => ({
      ...promoRowToDef(r),
      usedCount: r.usedCount,
      remainingUses: r.maxUses != null ? Math.max(0, Number(r.maxUses) - r.usedCount) : null,
    }))
  } catch {
    return PROMOS.map((p) => ({ ...p, usedCount: 0, remainingUses: null }))
  }
}

/// كل الكوبونات مع الإحصائيات (غرفة العمليات)
export async function getAllPromos(): Promise<PromoRow[]> {
  await ensurePromosSeeded()
  return db.$queryRawUnsafe<PromoRow[]>(
    `SELECT * FROM "PromoCode" ORDER BY "isActive" DESC, "createdAt" ASC`,
  )
}

export type PromoServerResult =
  | { ok: true; promo: PromoRow; discount: number; cashback?: number }
  | { ok: false; error: string; reason: PromoRejectReason; row: PromoRow | null }

export type PromoRejectReason = 'exhausted' | 'disabled' | 'min_not_met' | 'unknown'

/// التحقق الخادمي النهائي من الكوبون (الجدول هو مصدر الحقيقة)
export async function computePromoDiscountDb(
  codeRaw: string,
  subtotal: number,
): Promise<PromoServerResult> {
  const code = (codeRaw || '').trim().toUpperCase()
  if (!code) return { ok: false, error: 'أدخل كود الخصم أولاً', reason: 'unknown', row: null }
  await ensurePromosSeeded()
  const rows = await db.$queryRawUnsafe<PromoRow[]>(
    `SELECT * FROM "PromoCode" WHERE UPPER("code") = ? LIMIT 1`,
    code,
  )
  const row = rows?.[0]
  if (!row) return { ok: false, error: 'كود الخصم غير معروف', reason: 'unknown', row: null }
  if (!row.isActive)
    return { ok: false, error: 'هذا الكوبون مُعطّل حالياً', reason: 'disabled', row }
  if (row.maxUses != null && row.usedCount >= Number(row.maxUses)) {
    return {
      ok: false,
      error: 'نفدت نسخ هذا الكوبون — استُخدمت كل الحصص المخصصة',
      reason: 'exhausted',
      row,
    }
  }
  if (subtotal < row.minSubtotalLyd) {
    return {
      ok: false,
      error: `هذا الكوبون يتطلب طلباً بقيمة ${Number(row.minSubtotalLyd).toFixed(2)} د.ل على الأقل`,
      reason: 'min_not_met',
      row,
    }
  }

  // 💸 كوبونات الكاش باك: لا خصم من الفاتورة — قيمة تُودع المحفظة عند التسليم
  if (row.kind === 'cashback') {
    let cashback =
      row.percent != null && Number(row.percent) > 0
        ? (subtotal * Number(row.percent)) / 100
        : Number(row.flatLyd ?? 0)
    if (row.maxDiscountLyd != null) cashback = Math.min(cashback, Number(row.maxDiscountLyd))
    cashback = Math.min(cashback, subtotal)
    cashback = money(cashback)
    if (cashback <= 0)
      return { ok: false, error: 'لا توجد قيمة كاش باك قابلة للتطبيق', reason: 'unknown', row }
    return { ok: true, promo: row, discount: 0, cashback }
  }

  let discount =
    row.kind === 'flat'
      ? Number(row.flatLyd ?? 0)
      : (subtotal * Number(row.percent ?? 0)) / 100
  if (row.maxDiscountLyd != null) discount = Math.min(discount, Number(row.maxDiscountLyd))
  discount = Math.min(discount, subtotal) // لا يمس أجرة التوصيل — حق الكابتن
  discount = money(discount)
  if (discount <= 0)
    return { ok: false, error: 'لا يوجد خصم قابل للتطبيق', reason: 'unknown', row }
  return { ok: true, promo: row, discount }
}

/// تسجيل استخدام الكوبون بعد نجاح الطلب — ذرّي مع احترام حصة maxUses
export async function recordPromoUsage(code: string, discount: number): Promise<void> {
  try {
    await db.$executeRawUnsafe(
      `UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1, "totalDiscountLyd" = "totalDiscountLyd" + ?
       WHERE UPPER("code") = UPPER(?) AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`,
      money(discount),
      code,
    )
  } catch {
    /* الإحصائية ليست حرجة */
  }
}

// ============================================================
// 📉 تحليلات الفرص الضائعة — توثيق محاولات الكوبونات المرفوضة
// نعرف منها: كم زبوناً أراد استخدام كوبون نفدت حصته؟ وكم خصماً خسرنا؟
// ============================================================

let rejectsTableEnsured = false

/// ضمان وجود جدول PromoReject (idempotent — آمن مع db:push)
async function ensureRejectsTable(): Promise<void> {
  if (rejectsTableEnsured) return
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "PromoReject" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "code" TEXT NOT NULL,
       "reason" TEXT NOT NULL,
       "phoneMasked" TEXT NOT NULL DEFAULT '',
       "subtotalLyd" REAL NOT NULL DEFAULT 0,
       "wouldDiscountLyd" REAL NOT NULL DEFAULT 0,
       "createdAt" DATETIME NOT NULL
     )`,
  )
  rejectsTableEnsured = true
}

function maskPhone(phone: string): string {
  const p = (phone || '').replace(/\D/g, '')
  if (p.length < 6) return ''
  return `${p.slice(0, 3)}****${p.slice(-3)}`
}

/// حساب قيمة الفرصة الضائعة (الخصم الذي كان سيتحمله الكوبون لو نجح)
function wouldBeDiscount(row: PromoRow | null, subtotal: number): number {
  if (!row || subtotal < row.minSubtotalLyd) return 0
  let d =
    row.kind === 'flat'
      ? Number(row.flatLyd ?? 0)
      : row.kind === 'cashback'
        ? row.percent != null && Number(row.percent) > 0
          ? (subtotal * Number(row.percent)) / 100
          : Number(row.flatLyd ?? 0)
        : (subtotal * Number(row.percent ?? 0)) / 100
  if (row.maxDiscountLyd != null) d = Math.min(d, Number(row.maxDiscountLyd))
  d = Math.min(d, subtotal)
  return money(d)
}

/// تقدير قيمة الفرصة الضائعة لمسارات خارجية (بث التحذير اللحظي لغرفة العمليات)
export function estimateLostDiscount(row: PromoRow | null, subtotal: number): number {
  return wouldBeDiscount(row, subtotal)
}

/// توثيق محاولة كوبون مرفوضة (أكواد معروفة فقط — هكذا تبقى التحليلات نظيفة من أخطاء الكتابة)
export async function recordPromoReject(
  row: PromoRow | null,
  reason: PromoRejectReason,
  subtotal: number,
  phone: string,
): Promise<void> {
  try {
    if (!row || reason === 'unknown') return
    await ensureRejectsTable()
    await db.$executeRawUnsafe(
      `INSERT INTO "PromoReject" ("id","code","reason","phoneMasked","subtotalLyd","wouldDiscountLyd","createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `rej_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      row.code,
      reason,
      maskPhone(phone),
      money(subtotal),
      wouldBeDiscount(row, subtotal),
      new Date().toISOString(),
    )
  } catch {
    /* التحليلات لا تُعطّل الطلب أبداً */
  }
}

export interface PromoRejectStats {
  count: number
  lostLyd: number
  breakdown: { code: string; count: number; lostLyd: number; topReason: string }[]
}

/// إحصاءات الفرص الضائعة منذ لحظة معينة (اليوم عادة) — لبطاقة غرفة العمليات ومحضر Z
export async function getPromoRejectStats(sinceMs: number): Promise<PromoRejectStats> {
  try {
    await ensureRejectsTable()
    const rows = await db.$queryRawUnsafe<{
      code: string
      count: number
      lostLyd: number
      topReason: string
    }[]>(
      `SELECT "code" AS code,
              COUNT(*) AS count,
              ROUND(SUM("wouldDiscountLyd"), 2) AS lostLyd,
              (SELECT "reason" FROM "PromoReject" r2 WHERE r2."code" = r1."code"
               GROUP BY "reason" ORDER BY COUNT(*) DESC LIMIT 1) AS topReason
       FROM "PromoReject" r1
       WHERE "createdAt" >= ?
       GROUP BY "code" ORDER BY count DESC LIMIT 6`,
      sinceMs,
    )
    const totals = await db.$queryRawUnsafe<{ count: number; lostLyd: number }[]>(
      `SELECT COUNT(*) AS count, ROUND(COALESCE(SUM("wouldDiscountLyd"), 0), 2) AS lostLyd
       FROM "PromoReject" WHERE "createdAt" >= ?`,
      sinceMs,
    )
    return {
      count: Number(totals?.[0]?.count ?? 0),
      lostLyd: Number(totals?.[0]?.lostLyd ?? 0),
      breakdown: (rows ?? []).map((r) => ({
        code: String(r.code),
        count: Number(r.count),
        lostLyd: Number(r.lostLyd),
        topReason: String(r.topReason),
      })),
    }
  } catch {
    return { count: 0, lostLyd: 0, breakdown: [] }
  }
}

/// إجمالي كاش باك وُدع للمحافظ منذ لحظة معينة (من جدول الطلبات)
export async function getCashbackStats(sinceMs: number): Promise<{ total: number; orders: number }> {
  try {
    const rows = await db.$queryRawUnsafe<{ total: number; orders: number }[]>(
      `SELECT ROUND(COALESCE(SUM("cashbackLyd"), 0), 2) AS total, COUNT(*) AS orders
       FROM "Order" WHERE "createdAt" >= ? AND "cashbackLyd" > 0`,
      sinceMs,
    )
    return { total: Number(rows?.[0]?.total ?? 0), orders: Number(rows?.[0]?.orders ?? 0) }
  } catch {
    return { total: 0, orders: 0 }
  }
}
