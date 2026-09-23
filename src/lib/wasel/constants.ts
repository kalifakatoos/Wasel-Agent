// ============================================================
// نظام التصميم الفاخر - Wasel Design System Tokens
// Royal Berber & Mediterranean Luxury
// ============================================================

export const APP = {
  nameAr: 'واصل نالوت',
  nameEn: 'Wasel Nalut',
  tagline: 'منظومة التوصيل الفائقة لمدينة نالوت وجبل نفوسة',
} as const

export const COLORS = {
  canvas: '#041710',        // زمرد ليلي سحيق
  surface: '#062319',       // سطح البطاقات
  raised: '#0A3324',        // عناصر قابلة للنقر
  elevated: '#124532',      // حاويات مرتفعة
  goldPrimary: '#D4AF37',   // ذهب معتق
  goldRadiance: '#F5D061',  // ذهب لامع
  goldBurnished: '#C59B27', // حدود ذهبية
  emeraldAccent: '#10B981', // زمرد حيوي
  textPrimary: '#F8F5EE',   // عاجي ناصع
  textMuted: '#938E7E',     // رمادي دافئ
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
} as const

export const NALUT_CENTER = { lat: 31.8687, lng: 10.9818 }

/// أحياء نالوت الرئيسية
export const DISTRICTS = [
  'وسط المدينة',
  'حي القلعة',
  'سيدي خليفة',
  'شارع تونس',
  'طريق الحوامد',
] as const

/// حدود الخريطة الإسقاطية
export const MAP_BOUNDS = {
  minLat: 31.8640,
  maxLat: 31.8730,
  minLng: 10.9745,
  maxLng: 10.9885,
}

/// حدود عهدة الكاش للكابتن (تنبيه)
export const CUSTODY_CAP_LYD = 500

/// رموز PIN الإدارية المسموحة
export const ADMIN_PINS = ['7788', '9832']

/// البادئات الليبية المعتمدة
export const LIBYAN_PHONE_PREFIXES = ['091', '092', '093', '094']

/// نسب التوزيع المحاسبي الصارمة
export const LEDGER_RATES = {
  merchantShare: 0.90,  // 90% من ثمن الوجبة للمتجر
  platformShare: 0.10,  // 10% من ثمن الوجبة أرباح منصة
  driverFeeShare: 1.00, // كامل أجرة التوصيل للكابتن
} as const

/// التسعير الأساسي
export const PRICING = {
  baseFee: 5.0,        // أجرة أساسية 5 د.ل
  perKm: 1.2,          // 1.2 د.ل لكل كم
  minFee: 5.0,
  surgeCap: 2.5,       // سقف الذروة المطلق
} as const

export const STATUS_LABELS: Record<string, string> = {
  placed: 'طلب جديد',
  accepted: 'مقبول',
  preparing: 'قيد التحضير',
  ready_for_pickup: 'جاهز للاستلام',
  out_for_delivery: 'في الطريق إليك',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  disputed: 'نزاع',
}

export const STATUS_COLORS: Record<string, string> = {
  placed: COLORS.warning,
  accepted: COLORS.goldPrimary,
  preparing: COLORS.warning,
  ready_for_pickup: COLORS.emeraldAccent,
  out_for_delivery: COLORS.goldRadiance,
  delivered: COLORS.success,
  cancelled: COLORS.textMuted,
  disputed: COLORS.danger,
}

export const VERTICAL_LABELS: Record<string, string> = {
  food: 'واصل إيت',
  grocery: 'واصل مارت',
  marketplace: 'واصل متاع',
}

export const VERTICAL_EMOJI: Record<string, string> = {
  food: '🍽️',
  grocery: '🛒',
  marketplace: '🛍️',
}
