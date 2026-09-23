// ============================================================
// 🎟️ كوبونات واصل نالوت — نظام الخصومات الشفاف
// الخصم تتحمله المنصة كاملاً (تسويق) — لا يُنقص حصة المتجر 90%
// ولا أجرة الكابتن (التزام شرعي: لا غرر ولا خصم من عمل الغير)
// ============================================================

export interface PromoDef {
  code: string
  label: string
  description: string
  emoji: string
  kind: 'percent' | 'flat'
  percent?: number
  flatLyd?: number
  maxDiscountLyd?: number
  minSubtotalLyd: number
}

/// الكوبونات المعتمدة رسمياً في منظومة نالوت
export const PROMOS: PromoDef[] = [
  {
    code: 'WASEL10',
    label: 'خصم واصل الترحيبي',
    description: '10% على طلبك حتى سقف 10 د.ل — للطلبات من 30 د.ل',
    emoji: '🎉',
    kind: 'percent',
    percent: 10,
    maxDiscountLyd: 10,
    minSubtotalLyd: 30,
  },
  {
    code: 'NAALUT5',
    label: 'خصم نالوت الثابت',
    description: 'خصم مباشر 5 د.ل — للطلبات من 20 د.ل',
    emoji: '🏔️',
    kind: 'flat',
    flatLyd: 5,
    minSubtotalLyd: 20,
  },
  {
    code: 'JEBEL15',
    label: 'خصم عائلات جبل نفوسة',
    description: '15% للطلبات العائلية حتى سقف 15 د.ل — من 60 د.ل',
    emoji: '👨‍👩‍👧‍👦',
    kind: 'percent',
    percent: 15,
    maxDiscountLyd: 15,
    minSubtotalLyd: 60,
  },
]

export type PromoResult =
  | { ok: true; promo: PromoDef; discount: number }
  | { ok: false; error: string }

/// التحقق من الكوبون وحساب الخصم — القائمة الافتراضية الرسمية (النسخة الحية من الخادم تُمرَّر اختيارياً)
export function computePromoDiscount(
  codeRaw: string,
  subtotal: number,
  list: PromoDef[] = PROMOS,
): PromoResult {
  const code = (codeRaw || '').trim().toUpperCase()
  if (!code) return { ok: false, error: 'أدخل كود الخصم أولاً' }
  const promo = list.find((p) => p.code === code)
  if (!promo) return { ok: false, error: 'كود الخصم غير معروف' }
  if (subtotal < promo.minSubtotalLyd) {
    return {
      ok: false,
      error: `هذا الكوبون يتطلب طلباً بقيمة ${promo.minSubtotalLyd.toFixed(2)} د.ل على الأقل`,
    }
  }
  let discount =
    promo.kind === 'percent'
      ? (subtotal * (promo.percent ?? 0)) / 100
      : (promo.flatLyd ?? 0)
  if (promo.maxDiscountLyd != null) discount = Math.min(discount, promo.maxDiscountLyd)
  // لا يزيد الخصم عن قيمة الأصناف نفسها (ولا يمس أجرة التوصيل — حق الكابتن)
  discount = Math.min(discount, subtotal)
  discount = Math.round(discount * 100) / 100
  if (discount <= 0) return { ok: false, error: 'لا يوجد خصم قابل للتطبيق' }
  return { ok: true, promo, discount }
}
