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
  /** ⏰ نافذة الجدولة الزمنية (R11) — ISO نصية في SQLite أو null */
  startsAt?: string | null
  endsAt?: string | null
}

/// هل الكوبون داخل نافذته الزمنية الآن؟ (R11 — يُستخدم في SQL كشرط إضافي وأيضاً في التحقق الفرد)
export function isPromoInWindow(row: Pick<PromoRow, 'startsAt' | 'endsAt'>, nowMs = Date.now()): boolean {
  const s = row.startsAt ? new Date(String(row.startsAt)).getTime() : null
  const e = row.endsAt ? new Date(String(row.endsAt)).getTime() : null
  if (s != null && Number.isFinite(s) && nowMs < s) return false
  if (e != null && Number.isFinite(e) && nowMs > e) return false
  return true
}

/// شرط SQL للنافذة الزمنية — يُدمج في استعلامات الكوبونات النشطة
const PROMO_WINDOW_SQL = `("startsAt" IS NULL OR "startsAt" = '' OR "startsAt" <= ?) AND ("endsAt" IS NULL OR "endsAt" = '' OR "endsAt" >= ?)`

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

/// الكوبونات النشطة فقط (للعرض على الزبائن) — داخل نافذتها الزمنية أيضاً (R11)
export async function getActivePromos(): Promise<PromoDef[]> {
  try {
    await ensurePromosSeeded()
    const nowIso = new Date().toISOString()
    const rows = await db.$queryRawUnsafe<PromoRow[]>(
      `SELECT * FROM "PromoCode" WHERE "isActive" = 1 AND ("maxUses" IS NULL OR "usedCount" < "maxUses") AND ${PROMO_WINDOW_SQL} ORDER BY "minSubtotalLyd" ASC`,
      nowIso,
      nowIso,
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
    const nowIso = new Date().toISOString()
    const rows = await db.$queryRawUnsafe<PromoRow[]>(
      `SELECT * FROM "PromoCode" WHERE "isActive" = 1 AND ("maxUses" IS NULL OR "usedCount" < "maxUses") AND ${PROMO_WINDOW_SQL} ORDER BY "minSubtotalLyd" ASC`,
      nowIso,
      nowIso,
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

export type PromoRejectReason =
  | 'exhausted'
  | 'disabled'
  | 'min_not_met'
  | 'not_started' // 🆕 R11: الكوبون لم يبدأ بعد
  | 'expired' // 🆕 R11: انتهت صلاحية الكوبون
  | 'unknown'

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
  // ⏰ نافذة الجدولة الزمنية (R11): قبل البداية أو بعد النهاية → رفض واضح
  const startsMs = row.startsAt ? new Date(String(row.startsAt)).getTime() : null
  const endsMs = row.endsAt ? new Date(String(row.endsAt)).getTime() : null
  if (startsMs != null && Number.isFinite(startsMs) && Date.now() < startsMs) {
    return {
      ok: false,
      error: `هذا الكوبون يبدأ العمل في ${fmtArabicDateTime(startsMs)} — عاود الدخول بعدها`,
      reason: 'not_started',
      row,
    }
  }
  if (endsMs != null && Number.isFinite(endsMs) && Date.now() > endsMs) {
    return {
      ok: false,
      error: `انتهت صلاحية هذا الكوبون في ${fmtArabicDateTime(endsMs)} — تابعنا لكوبونات جديدة قريباً`,
      reason: 'expired',
      row,
    }
  }
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

// ============================================================
// 📉 تقرير الفرص الضائعة الشهري (CRON-R9) — اتجاه 30 يوماً لكل كود
//CreatedAt محفوظ كنص ISO — نجمّع بـ date() ونتصفّي زمنياً بالتقويم المحلي
// ============================================================

export interface LostReportDay {
  date: string // ISO لمنتصف اليوم المحلي
  label: string // اسم اليوم بالعربية
  count: number
  lostLyd: number
}

export interface LostReportCode {
  code: string
  count: number
  lostLyd: number
  topReason: string
  lastAt: string | null
  /// توزيع المحاولات على أيام النافذة (R10 — لربط التحويم بالسباركلاين)
  daily: { day: string; count: number }[]
}

export interface LostMonthlyReport {
  days: number
  totals: { count: number; lostLyd: number }
  series: LostReportDay[]
  codes: LostReportCode[]
}

const DAY_LABELS_R9 = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/// تقرير الفرص الضائعة لآخر N يوم (افتراضي 30) — سلسلة يومية + تفصيل لكل كود
export async function getMonthlyLostReport(days = 30): Promise<LostMonthlyReport> {
  const n = Math.max(7, Math.min(90, Math.floor(days)))
  try {
    await ensureRejectsTable()
    const rows = await db.$queryRawUnsafe<{ day: string; count: number; lostLyd: number }[]>(
      `SELECT date("createdAt") AS day, COUNT(*) AS count, ROUND(COALESCE(SUM("wouldDiscountLyd"), 0), 2) AS lostLyd
       FROM "PromoReject"
       GROUP BY date("createdAt")`,
    )
    const perCode = await db.$queryRawUnsafe<{
      code: string
      count: number
      lostLyd: number
      topReason: string
      lastAt: string | null
    }[]>(
      `SELECT "code" AS code,
              COUNT(*) AS count,
              ROUND(COALESCE(SUM("wouldDiscountLyd"), 0), 2) AS lostLyd,
              (SELECT "reason" FROM "PromoReject" r2 WHERE r2."code" = r1."code"
               GROUP BY "reason" ORDER BY COUNT(*) DESC LIMIT 1) AS topReason,
              MAX("createdAt") AS lastAt
       FROM "PromoReject" r1
       GROUP BY "code"
       ORDER BY lostLyd DESC
       LIMIT 12`,
    )
    // 🆕 R10: توزيع كل كود على الأيام — لربط صفوف التفصيل بنقاط السباركلاين عند التحويم
    const perCodeDaily = await db.$queryRawUnsafe<{
      code: string
      day: string
      count: number
    }[]>(
      `SELECT "code" AS code, date("createdAt") AS day, COUNT(*) AS count
       FROM "PromoReject"
       GROUP BY "code", date("createdAt")`,
    )

    // نصفّي زمنياً في جافاسكربت (أدق من مقارنة نص ISO بعدد في SQLite)
    const DAY_MS = 86_400_000
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const windowStartMs = todayStart.getTime() - (n - 1) * DAY_MS
    const byDay = new Map<string, { count: number; lostLyd: number }>()
    for (const r of rows ?? []) {
      const t = new Date(`${String(r.day)}T00:00:00`).getTime()
      if (!Number.isFinite(t) || t < windowStartMs) continue
      byDay.set(String(r.day), { count: Number(r.count), lostLyd: Number(r.lostLyd) })
    }

    const series: LostReportDay[] = Array.from({ length: n }, (_, i) => {
      const d = new Date(windowStartMs + i * DAY_MS)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const hit = byDay.get(key)
      return {
        date: new Date(d.getTime() + 12 * 3600_000).toISOString(),
        label: DAY_LABELS_R9[d.getDay()],
        count: hit?.count ?? 0,
        lostLyd: hit?.lostLyd ?? 0,
      }
    })

    const inWindowCodes = (perCode ?? []).filter((c) => {
      if (!c.lastAt) return false
      const t = new Date(`${String(c.lastAt)}`).getTime()
      return Number.isFinite(t) && t >= windowStartMs
    })

    // نجمع توزيع الأيام لكل كود داخل النافذة فقط (R10)
    const dailyByCode = new Map<string, { day: string; count: number }[]>()
    for (const r of perCodeDaily ?? []) {
      const t = new Date(`${String(r.day)}T00:00:00`).getTime()
      if (!Number.isFinite(t) || t < windowStartMs) continue
      const code = String(r.code)
      const arr = dailyByCode.get(code) ?? []
      arr.push({ day: String(r.day), count: Number(r.count) })
      dailyByCode.set(code, arr)
    }

    return {
      days: n,
      totals: {
        count: series.reduce((s, d) => s + d.count, 0),
        lostLyd: money(series.reduce((s, d) => s + d.lostLyd, 0)),
      },
      series,
      codes: inWindowCodes.map((c) => ({
        code: String(c.code),
        count: Number(c.count),
        lostLyd: Number(c.lostLyd),
        topReason: String(c.topReason),
        lastAt: c.lastAt ? new Date(String(c.lastAt)).toISOString() : null,
        daily: dailyByCode.get(String(c.code)) ?? [],
      })),
    }
  } catch {
    return { days: n, totals: { count: 0, lostLyd: 0 }, series: [], codes: [] }
  }
}

function fmtArabicDateTime(ms: number): string {
  const d = new Date(ms)
  const day = DAY_LABELS_R9[d.getDay()]
  const date = d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${date} الساعة ${time}`
}

// ============================================================
// 🔄 تصفير عدّاد استخدام كوبون (R11 — تصحيح يدوي منفصل عن التجديد)
// ============================================================
export async function resetPromoUses(code: string): Promise<boolean> {
  const clean = (code || '').trim().toUpperCase()
  if (!clean) return false
  try {
    const res = await db.$executeRawUnsafe(
      `UPDATE "PromoCode" SET "usedCount" = 0 WHERE UPPER("code") = UPPER(?)`,
      clean,
    )
    return res > 0
  } catch {
    return false
  }
}

// ============================================================
// 📋 تفصيل محاولات كوبون مرفوض (R11 — نافذة التفصيل في غرفة العمليات)
// ============================================================

export interface PromoRejectAttempt {
  id: string
  phoneMasked: string
  reason: string
  subtotalLyd: number
  wouldDiscountLyd: number
  createdAt: string
}

/// كل محاولات كوبون معيّن داخل نافذة N يوم — الأحدث أولاً (بحد أقصى 60 محاولة)
export async function getPromoRejectDetail(code: string, days = 30): Promise<PromoRejectAttempt[]> {
  const clean = (code || '').trim().toUpperCase()
  if (!clean) return []
  try {
    await ensureRejectsTable()
    const n = Math.max(7, Math.min(90, Math.floor(days)))
    const windowStartMs = Date.now() - n * 86_400_000
    const rows = await db.$queryRawUnsafe<{
      id: string
      phoneMasked: string
      reason: string
      subtotalLyd: number
      wouldDiscountLyd: number
      createdAt: string
    }[]>(
      `SELECT "id", "phoneMasked", "reason", "subtotalLyd", "wouldDiscountLyd", "createdAt"
       FROM "PromoReject"
       WHERE UPPER("code") = UPPER(?) AND "createdAt" >= ?
       ORDER BY "createdAt" DESC LIMIT 60`,
      clean,
      windowStartMs,
    )
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      phoneMasked: String(r.phoneMasked || ''),
      reason: String(r.reason),
      subtotalLyd: Number(r.subtotalLyd),
      wouldDiscountLyd: Number(r.wouldDiscountLyd),
      createdAt: new Date(String(r.createdAt)).toISOString(),
    }))
  } catch {
    return []
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
