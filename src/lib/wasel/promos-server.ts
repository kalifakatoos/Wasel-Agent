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
    kind: p.kind === 'flat' ? 'flat' : 'percent',
    percent: p.percent ?? undefined,
    flatLyd: p.flatLyd ?? undefined,
    maxDiscountLyd: p.maxDiscountLyd ?? undefined,
    minSubtotalLyd: p.minSubtotalLyd,
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
      `SELECT * FROM "PromoCode" WHERE "isActive" = 1 ORDER BY "minSubtotalLyd" ASC`,
    )
    if (!rows || rows.length === 0) return PROMOS
    return rows.map(promoRowToDef)
  } catch {
    return PROMOS
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
  | { ok: true; promo: PromoRow; discount: number }
  | { ok: false; error: string }

/// التحقق الخادمي النهائي من الكوبون (الجدول هو مصدر الحقيقة)
export async function computePromoDiscountDb(codeRaw: string, subtotal: number): Promise<PromoServerResult> {
  const code = (codeRaw || '').trim().toUpperCase()
  if (!code) return { ok: false, error: 'أدخل كود الخصم أولاً' }
  await ensurePromosSeeded()
  const rows = await db.$queryRawUnsafe<PromoRow[]>(
    `SELECT * FROM "PromoCode" WHERE UPPER("code") = ? LIMIT 1`,
    code,
  )
  const row = rows?.[0]
  if (!row) return { ok: false, error: 'كود الخصم غير معروف' }
  if (!row.isActive) return { ok: false, error: 'هذا الكوبون مُعطّل حالياً' }
  if (subtotal < row.minSubtotalLyd) {
    return {
      ok: false,
      error: `هذا الكوبون يتطلب طلباً بقيمة ${Number(row.minSubtotalLyd).toFixed(2)} د.ل على الأقل`,
    }
  }
  let discount =
    row.kind === 'flat'
      ? Number(row.flatLyd ?? 0)
      : (subtotal * Number(row.percent ?? 0)) / 100
  if (row.maxDiscountLyd != null) discount = Math.min(discount, Number(row.maxDiscountLyd))
  discount = Math.min(discount, subtotal) // لا يمس أجرة التوصيل — حق الكابتن
  discount = money(discount)
  if (discount <= 0) return { ok: false, error: 'لا يوجد خصم قابل للتطبيق' }
  return { ok: true, promo: row, discount }
}

/// تسجيل استخدام الكوبون بعد نجاح الطلب
export async function recordPromoUsage(code: string, discount: number): Promise<void> {
  try {
    await db.$executeRawUnsafe(
      `UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1, "totalDiscountLyd" = "totalDiscountLyd" + ? WHERE UPPER("code") = UPPER(?)`,
      money(discount),
      code,
    )
  } catch {
    /* الإحصائية ليست حرجة */
  }
}
