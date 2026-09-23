'use client'

// 💳 شاشة الدفع — هوية الزبون (وضع ضيوف) + عنوان + طريقة دفع + كوبون خصم + تأكيد نهائي
import { useEffect, useMemo, useState } from 'react'
import { Banknote, Loader2, TicketPercent, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Ly } from '@/components/wasel/Badges'
import { apiGet, apiPost } from '@/lib/wasel/api'
import { DISTRICTS } from '@/lib/wasel/constants'
import { computePromoDiscount, PROMOS, type PromoDef } from '@/lib/wasel/promos'
import { useWasel } from '@/lib/wasel/store'
import { useToast } from '@/hooks/use-toast'
import type { OrderDTO } from '@/lib/wasel/types'
import { isValidLibyanPhone, ScreenBar } from './customer-shared'

interface WalletBrief {
  balance: number
  walletType: string
  blocked: boolean
  blockedReason: string | null
}

type PayMethod = 'cash' | 'wallet'

export function CheckoutScreen({
  onBack,
  onPlaced,
}: {
  onBack: () => void
  onPlaced: (order: OrderDTO) => void
}) {
  const cart = useWasel((s) => s.cart)
  const cartStoreId = useWasel((s) => s.cartStoreId)
  const cartStoreName = useWasel((s) => s.cartStoreName)
  const savedName = useWasel((s) => s.customerName)
  const savedPhone = useWasel((s) => s.customerPhone)
  const setCustomerIdentity = useWasel((s) => s.setCustomerIdentity)
  const clearCart = useWasel((s) => s.clearCart)
  const { toast } = useToast()

  const [name, setName] = useState(savedName)
  const [phone, setPhone] = useState(savedPhone)
  const [district, setDistrict] = useState<string>(DISTRICTS[0])
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [wallet, setWallet] = useState<WalletBrief | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [showPromos, setShowPromos] = useState(false)
  const [promoList, setPromoList] = useState<PromoDef[]>(PROMOS) // 🎟️ حية من غرفة العمليات

  const subtotal = cart.reduce((n, i) => n + i.qty * i.unitPrice, 0)

  // جلب الكوبونات النشطة الحية (مع بقاء الافتراضية كحلاء احتياطي)
  useEffect(() => {
    let cancelled = false
    apiGet<{ promos: PromoDef[] }>('/api/promos')
      .then((d) => {
        if (!cancelled && Array.isArray(d.promos) && d.promos.length > 0) setPromoList(d.promos)
      })
      .catch(() => {
        /* تبقى الافتراضية */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 🎟️ حساب الخصم لحظياً (الخادم يعيد التحقق عند التأكيد)
  const promoPreview = useMemo(() => {
    if (!appliedPromo) return null
    const r = computePromoDiscount(appliedPromo, subtotal, promoList)
    return r.ok ? r : null
  }, [appliedPromo, subtotal, promoList])
  const discount = promoPreview?.discount ?? 0
  const payable = Math.max(0, subtotal - discount)

  const applyPromo = (codeRaw: string) => {
    const code = codeRaw.trim().toUpperCase()
    if (!code) return
    const r = computePromoDiscount(code, subtotal, promoList)
    if (!r.ok) {
      setPromoError(r.error)
      return
    }
    setAppliedPromo(r.promo.code)
    setPromoInput(r.promo.code)
    setPromoError(null)
    setShowPromos(false)
    toast({
      title: `🎟️ تم تطبيق ${r.promo.label}`,
      description: `وفّرت ${r.discount.toFixed(2)} د.ل على هذا الطلب`,
      className: 'border-[rgba(16,185,129,0.5)] bg-[#0A3324] text-[#10B981]',
    })
  }

  const removePromo = () => {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  // جلب رصيد المحفظة تلقائياً عند إدخال رقم ليبي صالح (مع مهلة قصيرة)
  useEffect(() => {
    const clean = phone.trim()
    if (!isValidLibyanPhone(clean)) {
      setWallet(null)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      setWalletLoading(true)
      apiGet<WalletBrief>(`/api/wallet/${encodeURIComponent(clean)}`)
        .then((d) => {
          if (!cancelled) setWallet(d)
        })
        .catch(() => {
          if (!cancelled) setWallet(null)
        })
        .finally(() => {
          if (!cancelled) setWalletLoading(false)
        })
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [phone])

  if (cart.length === 0 || !cartStoreId) {
    return (
      <div>
        <ScreenBar title="إتمام الطلب" onBack={onBack} />
        <div className="rounded-3xl border border-dashed border-[rgba(212,175,55,0.3)] bg-[#062319]/60 py-14 text-center">
          <p className="text-4xl">🧺</p>
          <p className="mt-3 text-sm font-bold text-[#F8F5EE]">لا توجد أصناف لإتمام الطلب</p>
        </div>
      </div>
    )
  }

  const validate = (): string | null => {
    if (wallet?.blocked) return 'رقم الهاتف محظور من الطلب في المنظومة — تواصل مع إدارة واصل نالوت لحل النزاع'
    if (!name.trim()) return 'الاسم الكامل مطلوب لتسليم الطلب'
    if (!isValidLibyanPhone(phone)) return 'رقم الهاتف يجب أن يبدأ بـ 091 أو 092 أو 093 أو 094 ويتكون من 10 أرقام'
    if (!address.trim()) return 'اكتب عنوان التوصيل بالتفصيل (أقرب علامة مميزة)'
    if (!district) return 'اختر الحي'
    return null
  }

  const submit = async () => {
    const vErr = validate()
    if (vErr) {
      toast({ variant: 'destructive', title: 'بيانات ناقصة', description: vErr })
      return
    }
    setSubmitting(true)
    try {
      const res = await apiPost<{ order: OrderDTO }>('/api/orders/checkout', {
        store_id: cartStoreId,
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty, notes: i.notes })),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
        district,
        payment_method: payMethod,
        notes: notes.trim() || undefined,
        promo_code: appliedPromo ?? undefined,
      })
      toast({
        title: '🔔 ringing في المطبخ!',
        description: `طلبك ${res.order.orderNumber} وصل إلى ${res.order.storeName} وقيد التحضير`,
        className: 'border-[rgba(212,175,55,0.55)] bg-[#0A3324] text-[#F5D061]',
      })
      setCustomerIdentity(name.trim(), phone.trim())
      clearCart()
      onPlaced(res.order)
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'تعذر إتمام الطلب',
        description: e instanceof Error ? e.message : 'خطأ غير متوقع، حاول مجدداً',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <ScreenBar title="إتمام الطلب" subtitle={`من ${cartStoreName}`} onBack={onBack} />

      {/* ملخص مصغر */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#062319] px-4 py-3">
        <span className="text-xs font-bold text-[#938E7E]">
          {cart.length} صنف • رسوم الخدمة <span className="font-bold text-[#10B981]">0.00 د.ل</span>
        </span>
        {discount > 0 ? (
          <span className="flex items-center gap-2">
            <Ly amount={subtotal} className="text-xs text-[#938E7E] line-through" />
            <Ly amount={payable} bold className="text-[#F5D061]" />
          </span>
        ) : (
          <Ly amount={subtotal} bold className="text-[#F5D061]" />
        )}
      </div>

      <div className="space-y-4">
        {/* الهوية */}
        <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
          <h4 className="mb-3 text-sm font-extrabold text-[#F5D061]">🪪 هويتك</h4>
          <label className="mb-1.5 block text-xs font-bold text-[#938E7E]" htmlFor="co-name">
            الاسم الكامل
          </label>
          <Input
            id="co-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: محمد أمين"
            maxLength={80}
            className="h-12 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm text-[#F8F5EE] placeholder:text-[#938E7E]/50"
          />
          <label className="mb-1.5 mt-3 block text-xs font-bold text-[#938E7E]" htmlFor="co-phone">
            رقم الهاتف الليبي <span className="font-normal">(091/092/093/094)</span>
          </label>
          <Input
            id="co-phone"
            dir="ltr"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0910000001"
            className={`h-12 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center font-money text-base tracking-widest text-[#F8F5EE] placeholder:text-[#938E7E]/50 ${
              phone.length > 0 && !isValidLibyanPhone(phone) ? 'border-[rgba(239,68,68,0.5)]' : ''
            }`}
          />
          {phone.length > 0 && !isValidLibyanPhone(phone) && (
            <p className="mt-1.5 text-[10px] font-semibold text-[#EF4444]">
              الرقم يجب أن يبدأ بـ 091 أو 092 أو 093 أو 094 ويتكون من 10 أرقام
            </p>
          )}
        </section>

        {/* العنوان */}
        <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
          <h4 className="mb-3 text-sm font-extrabold text-[#F5D061]">📍 عنوان التوصيل</h4>
          <label className="mb-1.5 block text-xs font-bold text-[#938E7E]" htmlFor="co-district">
            الحي
          </label>
          <Select value={district} onValueChange={(v) => setDistrict(v)}>
            <SelectTrigger
              id="co-district"
              className="h-12 w-full rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm text-[#F8F5EE]"
            >
              <SelectValue placeholder="اختر الحي" />
            </SelectTrigger>
            <SelectContent className="border-[rgba(212,175,55,0.3)] bg-[#0A3324]">
              {DISTRICTS.map((d) => (
                <SelectItem key={d} value={d} className="text-sm text-[#F8F5EE] focus:bg-[rgba(212,175,55,0.15)] focus:text-[#F5D061]">
                  📍 {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="mb-1.5 mt-3 block text-xs font-bold text-[#938E7E]" htmlFor="co-address">
            الوصف التفصيلي
          </label>
          <Textarea
            id="co-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="مثال: قرب جامع سيدي خليفة، عمارة ذهب، الطابق الثاني"
            className="resize-none rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm leading-relaxed text-[#F8F5EE] placeholder:text-[#938E7E]/50"
          />
        </section>

        {/* طريقة الدفع */}
        <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
          <h4 className="mb-3 text-sm font-extrabold text-[#F5D061]">💳 طريقة الدفع</h4>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {/* كاش */}
            <button
              onClick={() => setPayMethod('cash')}
              aria-pressed={payMethod === 'cash'}
              className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-3.5 text-right transition ${
                payMethod === 'cash'
                  ? 'border-[rgba(212,175,55,0.65)] bg-[rgba(212,175,55,0.12)] shadow-md shadow-[rgba(212,175,55,0.1)]'
                  : 'border-[rgba(212,175,55,0.2)] bg-[#041710] hover:border-[rgba(212,175,55,0.45)]'
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A3324] text-xl">
                💵
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-extrabold ${payMethod === 'cash' ? 'text-[#F5D061]' : 'text-[#F8F5EE]'}`}>
                  كاش عند الاستلام
                </span>
                <span className="block text-[10px] text-[#938E7E]">جهّز المبلغ بالدينار الليبي</span>
              </span>
            </button>
            {/* محفظة */}
            <button
              onClick={() => setPayMethod('wallet')}
              disabled={wallet?.blocked === true}
              aria-pressed={payMethod === 'wallet'}
              className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-3.5 text-right transition disabled:cursor-not-allowed disabled:opacity-50 ${
                payMethod === 'wallet'
                  ? 'border-[rgba(212,175,55,0.65)] bg-[rgba(212,175,55,0.12)] shadow-md shadow-[rgba(212,175,55,0.1)]'
                  : 'border-[rgba(212,175,55,0.2)] bg-[#041710] hover:border-[rgba(212,175,55,0.45)]'
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A3324] text-xl">
                👛
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-extrabold ${payMethod === 'wallet' ? 'text-[#F5D061]' : 'text-[#F8F5EE]'}`}>
                  محفظة واصل
                </span>
                {walletLoading ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#938E7E]">
                    <Loader2 className="h-3 w-3 animate-spin" /> جارٍ جلب الرصيد…
                  </span>
                ) : wallet && isValidLibyanPhone(phone) ? (
                  <span className="block text-[10px] font-bold text-[#10B981]">
                    الرصيد: <Ly amount={wallet.balance} className="text-[#10B981]" />
                  </span>
                ) : (
                  <span className="block text-[10px] text-[#938E7E]">أدخل رقمك لعرض الرصيد</span>
                )}
              </span>
            </button>
          </div>
          {wallet?.blocked && (
            <div className="mt-3 rounded-xl border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.1)] px-4 py-3">
              <p className="text-xs font-black text-[#EF4444]">🚫 هذا الرقم محظور من الطلب في منظومة واصل نالوت</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#F8F5EE]/70">
                السبب: {wallet.blockedReason ?? 'نزاع سابق غير محسوم'} — لا يمكن إتمام طلبات جديدة (كاش أو محفظة) حتى تُحل المسألة مع إدارة واصل.
              </p>
            </div>
          )}
          {payMethod === 'wallet' && wallet && !wallet.blocked && wallet.balance < subtotal + 5 && (
            <p className="mt-3 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-3 py-2.5 text-[11px] font-semibold text-[#F59E0B]">
              ⚠️ الرصيد قد لا يكفي — أجرة التوصيل تُحتسب عند التأكيد (تبدأ من 5.00 د.ل)
            </p>
          )}
        </section>

        {/* 🎟️ كوبون الخصم */}
        <section className="overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-[#F5D061]">🎟️ كوبون خصم</h4>
            <button
              onClick={() => setShowPromos((v) => !v)}
              className="flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#10B981] transition hover:text-[#F5D061]"
            >
              <TicketPercent className="h-3.5 w-3.5" />
              {showPromos ? 'إخفاء الكوبونات' : 'الكوبونات المتاحة'}
            </button>
          </div>

          {appliedPromo && promoPreview ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.08)] px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-xs font-extrabold text-[#10B981]" dir="ltr">
                    {appliedPromo}
                  </p>
                  <p className="text-[10px] text-[#938E7E]">خصم مُطبّق — يتحمله الإطار مُحاسبياً</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ly amount={-discount} bold className="text-sm text-[#10B981]" />
                <button
                  onClick={removePromo}
                  aria-label="إزالة الكوبون"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#938E7E] transition hover:bg-[rgba(239,68,68,0.12)] hover:text-[#EF4444]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                dir="ltr"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase())
                  setPromoError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && applyPromo(promoInput)}
                placeholder="WASEL10"
                maxLength={16}
                className={`h-12 flex-1 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center font-money text-sm tracking-widest text-[#F8F5EE] placeholder:text-[#938E7E]/40 ${
                  promoError ? 'border-[rgba(239,68,68,0.5)]' : ''
                }`}
              />
              <Button
                onClick={() => applyPromo(promoInput)}
                variant="outline"
                className="h-12 rounded-xl border-[rgba(212,175,55,0.45)] bg-[#041710] px-5 text-sm font-extrabold text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.12)] hover:text-[#F5D061]"
              >
                تطبيق
              </Button>
            </div>
          )}
          {promoError && (
            <p className="mt-2 text-[11px] font-semibold text-[#EF4444]">⚠️ {promoError}</p>
          )}

          {showPromos && (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {promoList.map((p) => {
                const eligible = subtotal >= p.minSubtotalLyd
                return (
                  <button
                    key={p.code}
                    onClick={() => eligible && applyPromo(p.code)}
                    disabled={!eligible}
                    className={`group relative rounded-xl border border-dashed p-3 text-right transition ${
                      eligible
                        ? 'border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.06)] hover:border-[rgba(212,175,55,0.8)] hover:bg-[rgba(212,175,55,0.12)]'
                        : 'cursor-not-allowed border-[rgba(147,142,126,0.25)] bg-transparent opacity-50'
                    }`}
                  >
                    <span className="absolute left-2.5 top-2.5 text-[9px] font-black tracking-widest text-[rgba(212,175,55,0.55)]" dir="ltr">
                      {p.code}
                    </span>
                    <span className="block text-xl">{p.emoji}</span>
                    <span className="mt-1 block text-[11px] font-extrabold text-[#F8F5EE]">{p.label}</span>
                    <span className="mt-0.5 block text-[9.5px] leading-relaxed text-[#938E7E]">{p.description}</span>
                    {!eligible && (
                      <span className="mt-1 block text-[9px] font-bold text-[#F59E0B]">
                        يتطلب {p.minSubtotalLyd.toFixed(0)} د.ل على الأقل
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
          <label className="mb-1.5 block text-xs font-bold text-[#938E7E]" htmlFor="co-notes">
            ملاحظات عامة للطلب <span className="font-normal">(اختياري)</span>
          </label>
          <Textarea
            id="co-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="مثال: الاتصال قبل الوصول بعشر دقائق"
            className="resize-none rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm leading-relaxed text-[#F8F5EE] placeholder:text-[#938E7E]/50"
          />
        </section>
      </div>

      {/* تأكيد */}
      <div className="mt-6 pb-2">
        <Button
          onClick={submit}
          disabled={submitting || wallet?.blocked === true}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.3)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ إرسال طلبك إلى المطبخ…
            </>
          ) : (
            <>
              <Banknote className="h-5 w-5" />
              تأكيد الطلب نهائياً •
              {discount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Ly amount={subtotal} className="text-sm line-through opacity-60" />
                  <Ly amount={payable} className="text-[#041710]" /> + التوصيل
                </span>
              ) : (
                <>
                  <Ly amount={subtotal} className="text-[#041710]" /> + التوصيل
                </>
              )}
            </>
          )}
        </Button>
        <p className="mt-2.5 text-center text-[10px] leading-relaxed text-[#938E7E]">
          بالتأكيد أنت توافق على ميثاق واصل الشرعي: بيع قطعي بلا غرر، وإجارة عمل بأجرة معلنة، ورسوم خدمة صفر.
        </p>
      </div>
    </div>
  )
}
