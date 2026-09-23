'use client'

// 🛒 سلة الزبون — عدادات، حذف، ملخص شرعي صريح، وميثاق واصل
import { Minus, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Ly } from '@/components/wasel/Badges'
import { useWasel } from '@/lib/wasel/store'
import { useToast } from '@/hooks/use-toast'
import { ScreenBar } from './customer-shared'

const CHARTER_ITEMS: { strong: string; rest: string }[] = [
  {
    strong: 'أجرة التوصيل عقد إجارة عمل معلنة',
    rest: 'أجرة معلومة قبل الطلب، تُحتسب عند التأكيد بحسب المسافة وظروف الذروة.',
  },
  {
    strong: 'شراء الأصناف عقد بيع قطعي',
    rest: 'كل صنف معلوم الوصف والثمن، لا غرر ولا مبهمات.',
  },
  {
    strong: 'لا رسوم خفية إطلاقاً',
    rest: 'رسوم خدمة واصل على الزبون صفر د.ل دائماً.',
  },
  {
    strong: 'لا غرامات ربوية',
    rest: 'أي تعويض يكون عن الضرر الفعلي المثبت فقط.',
  },
]

export function CartScreen({
  onBack,
  onCheckout,
  onBrowse,
}: {
  onBack: () => void
  onCheckout: () => void
  onBrowse: () => void
}) {
  const cart = useWasel((s) => s.cart)
  const storeName = useWasel((s) => s.cartStoreName)
  const updateQty = useWasel((s) => s.updateQty)
  const clearCart = useWasel((s) => s.clearCart)
  const { toast } = useToast()

  const subtotal = cart.reduce((n, i) => n + i.qty * i.unitPrice, 0)
  const count = cart.reduce((n, i) => n + i.qty, 0)

  if (cart.length === 0) {
    return (
      <div>
        <ScreenBar title="سلتك" onBack={onBack} />
        <div className="rounded-3xl border border-dashed border-[rgba(212,175,55,0.3)] bg-[#062319]/60 py-16 text-center">
          <p className="text-5xl">🧺</p>
          <p className="mt-4 text-lg font-extrabold text-[#F8F5EE]">سلتك فارغة</p>
          <p className="mt-1 mb-6 text-xs text-[#938E7E]">
            تصفح متاجر نالوت وأضف ما يشتهيه قلبك
          </p>
          <Button
            onClick={onBrowse}
            className="h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-8 text-sm font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)]"
          >
            🧭 ابدأ الاستكشاف
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ScreenBar title="سلتك" subtitle={`أصناف من ${storeName}`} onBack={onBack} />

      {/* عناصر السلة */}
      <div className="space-y-2.5">
        {cart.map((item) => {
          const isGiftCard = item.productId.startsWith('giftcard-')
          return (
            <div
              key={item.productId}
              className={`relative flex items-center gap-3 rounded-2xl border p-3.5 ${
                isGiftCard
                  ? 'border-dashed border-[rgba(212,175,55,0.6)] bg-gradient-to-l from-[rgba(212,175,55,0.09)] to-[#062319]'
                  : 'border-[rgba(212,175,55,0.18)] bg-[#062319]'
              }`}
            >
              {isGiftCard && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-2 py-0.5 text-[9px] font-black text-[#041710] shadow-md shadow-[rgba(212,175,55,0.3)]">
                  💳 بطاقة شحن
                </span>
              )}
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#041710] text-2xl">
                {item.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#F8F5EE]">{item.title}</p>
                {isGiftCard ? (
                  <p className="mt-0.5 text-[10px] font-bold text-[#10B981]">
                    🔐 الكود يُصدر آلياً عند التسليم
                  </p>
                ) : item.notes ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-[#938E7E]">📝 {item.notes}</p>
                ) : null}
                <Ly amount={item.unitPrice} className="mt-0.5 text-xs text-[#D4AF37]" />
              </div>
              {/* عداد الكمية */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#0A3324] p-1">
                <button
                  onClick={() => updateQty(item.productId, item.qty - 1)}
                  aria-label={`إنقاص ${item.title}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.12)]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-money ltr-nums w-7 text-center text-lg font-bold text-[#F8F5EE]">
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item.productId, item.qty + 1)}
                  aria-label={`زيادة ${item.title}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.15)] text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.28)]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => updateQty(item.productId, 0)}
                aria-label={`حذف ${item.title}`}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[#EF4444]/80 transition hover:bg-[rgba(239,68,68,0.1)] hover:text-[#EF4444]"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </div>
          )
        })}
      </div>

      {/* الملخص */}
      <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#062319] p-5">
        <h4 className="mb-3 text-sm font-extrabold text-[#F8F5EE]">
          ملخص الطلب <span className="font-money ltr-nums text-xs text-[#938E7E]">({count} صنف)</span>
        </h4>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#938E7E]">قيمة الأصناف</span>
            <Ly amount={subtotal} bold className="text-[#F8F5EE]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#938E7E]">أجرة التوصيل</span>
            <span className="text-xs font-semibold text-[#938E7E]">
              تُحتسب عند التأكيد (تبدأ من <Ly amount={5} className="text-[#D4AF37]" />)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#938E7E]">رسوم خدمة واصل</span>
            <span className="flex items-center gap-1 text-xs font-bold text-[#10B981]">
              <Ly amount={0} className="text-[#10B981]" /> ✅
            </span>
          </div>
        </div>
        <Separator className="my-4 bg-[rgba(212,175,55,0.15)]" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-[#F8F5EE]">الإجمالي التقديري</span>
          <Ly amount={subtotal} bold className="text-xl text-[#F5D061]" />
        </div>
        <p className="mt-1 text-[10px] text-[#938E7E]">
          * الإجمالي النهائي = قيمة الأصناف + أجرة التوصيل المعلنة عند التأكيد
        </p>
      </div>

      {/* ميثاق واصل الشرعي */}
      <div className="mt-4 rounded-2xl border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#10B981]">
          ☪️ ميثاق واصل الشرعي
          <Sparkles className="h-4 w-4" />
        </h4>
        <ul className="space-y-2">
          {CHARTER_ITEMS.map((t) => (
            <li
              key={t.strong}
              className="rounded-xl bg-[#062319]/70 px-3 py-2.5 text-[11px] leading-relaxed text-[#938E7E]"
            >
              <b className="text-[#F8F5EE]">{t.strong}</b> — {t.rest}
            </li>
          ))}
        </ul>
      </div>

      {/* أزرار */}
      <div className="mt-6 flex flex-col gap-2.5 pb-2">
        <Button
          onClick={onCheckout}
          className="h-14 rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)] transition hover:scale-[1.01]"
        >
          متابعة الدفع • <Ly amount={subtotal} className="text-[#041710]" />
        </Button>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={onBrowse}
            className="h-12 flex-1 rounded-xl border-[rgba(212,175,55,0.35)] bg-transparent text-sm font-bold text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
          >
            + أضف أصنافاً أخرى
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearCart()
              toast({
                title: '🧹 تم تفريغ السلة',
                className: 'border-[rgba(212,175,55,0.4)] bg-[#0A3324] text-[#F5D061]',
              })
            }}
            className="h-12 rounded-xl border-[rgba(239,68,68,0.35)] bg-transparent px-5 text-sm font-bold text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
          >
            تفريغ السلة
          </Button>
        </div>
      </div>
    </div>
  )
}
