'use client'

// 🧾 تفاصيل الطلب (فاتورة) + ⭐ تقييم ما بعد التسليم — واصل نالوت
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Ly, OrderNo, StatusBadge } from '@/components/wasel/Badges'
import { apiGet, apiPost } from '@/lib/wasel/api'
import { useWasel } from '@/lib/wasel/store'
import { LEDGER_RATES } from '@/lib/wasel/constants'
import type { OrderDTO } from '@/lib/wasel/types'
import { ErrorBlock, fmtDate, LoadingBlock, ScreenBar } from './customer-shared'

function StarRow({
  label,
  emoji,
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  label: string
  emoji: string
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#041710]/60 p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-sm font-extrabold text-[#F8F5EE]">{label}</p>
          <p className="text-[10px] text-[#938E7E]">
            {readOnly ? 'شكراً لتقييمك 🌟' : 'اضغط النجوم للتقييم'}
          </p>
        </div>
      </div>
      <div className="flex flex-row-reverse items-center gap-1" dir="ltr">
        {[5, 4, 3, 2, 1].map((n) => {
          const active = n <= value
          const btn = (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(n)}
              aria-label={`${label}: ${n} من 5`}
              className={`rounded-lg p-1.5 transition-transform ${
                readOnly ? 'cursor-default' : 'hover:scale-125 active:scale-95'
              }`}
            >
              <Star
                className={`${size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'} transition-colors ${
                  active ? 'fill-[#F5D061] text-[#F5D061]' : 'text-[rgba(212,175,55,0.35)]'
                }`}
              />
            </button>
          )
          return btn
        })}
      </div>
    </div>
  )
}

export function OrderDetailScreen({
  orderId,
  onTrack,
  onReorder,
  onBack,
}: {
  orderId: string
  onTrack: (orderId: string) => void
  onReorder: (order: OrderDTO) => void
  onBack: () => void
}) {
  const phone = useWasel((s) => s.customerPhone)
  const [order, setOrder] = useState<OrderDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeStars, setStoreStars] = useState(0)
  const [driverStars, setDriverStars] = useState(0)
  const [sending, setSending] = useState(false)
  const [rated, setRated] = useState(false)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    apiGet<{ order: OrderDTO }>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((d) => {
        if (cancelled) return
        setOrder(d.order)
        setRated(!!d.order.ratedAt)
        setStoreStars(d.order.storeStars ?? 0)
        setDriverStars(d.order.driverStars ?? 0)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل تفاصيل الطلب')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, rated])

  const submitRating = async () => {
    if (!order || !storeStars) return
    setSending(true)
    try {
      await apiPost(`/api/orders/${encodeURIComponent(order.id)}/rate`, {
        stars_store: storeStars,
        stars_driver: order.driverId ? driverStars || storeStars : undefined,
        phone,
      })
      setRated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال التقييم')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingBlock label="جارٍ فتح تفاصيل الطلب…" />
  if (error && !order)
    return (
      <div>
        <ScreenBar title="تفاصيل الطلب" onBack={onBack} />
        <ErrorBlock message={error} onRetry={onBack} />
      </div>
    )
  if (!order) return null

  const isActive = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status)
  const merchantNet = order.subtotalLyd * LEDGER_RATES.merchantShare

  return (
    <div>
      <ScreenBar title="تفاصيل الطلب" subtitle={order.orderNumber} onBack={onBack} />

      <div className="mx-auto max-w-xl space-y-4">
        {/* رأس الطلب */}
        <div className="rounded-3xl border border-[rgba(212,175,55,0.25)] bg-[#062319] p-5 gold-glow">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{order.storeEmoji ?? '🏪'}</span>
              <div>
                <p className="text-sm font-extrabold text-[#F8F5EE]">{order.storeName}</p>
                <OrderNo no={order.orderNumber} className="text-[11px] text-[#938E7E]" />
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#938E7E]">
            🧾 أُنشئ {fmtDate(order.createdAt)}
            {order.deliveredAt ? ` • 🎉 سُلّم ${fmtDate(order.deliveredAt)}` : ''}
          </p>
          {isActive && (
            <Button
              onClick={() => onTrack(order.id)}
              className="mt-4 h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)]"
            >
              📍 فتح التتبع الحي
            </Button>
          )}
          {order.status === 'delivered' && (
            <Button
              onClick={() => onReorder(order)}
              className="mt-4 h-12 w-full rounded-xl border border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.1)] text-sm font-extrabold text-[#10B981] shadow-md shadow-[rgba(16,185,129,0.12)] transition hover:bg-[rgba(16,185,129,0.2)]"
            >
              🔁 إعادة طلب نفس الأصناف من {order.storeName}
            </Button>
          )}
        </div>

        {/* الأصناف */}
        <div className="rounded-3xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5">
          <p className="mb-3 text-xs font-extrabold tracking-wide text-[#D4AF37]">🛒 أصناف الطلب</p>
          <div className="space-y-2.5">
            {order.items.map((it, idx) => (
              <div key={`${it.productId}-${idx}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F8F5EE]">
                    <span className="font-money text-[#F5D061]">{it.qty}×</span> {it.title}
                  </p>
                  {it.notes ? (
                    <p className="mt-0.5 text-[11px] text-[#F59E0B]">📝 {it.notes}</p>
                  ) : null}
                </div>
                <Ly amount={it.unitPrice * it.qty} className="shrink-0 text-sm text-[#F8F5EE]" />
              </div>
            ))}
          </div>

          <Separator className="my-4 bg-[rgba(212,175,55,0.15)]" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#938E7E]">
              <span>قيمة الأصناف</span>
              <Ly amount={order.subtotalLyd} />
            </div>
            <div className="flex justify-between text-[#938E7E]">
              <span>أجرة التوصيل (عقد إجارة عمل)</span>
              <Ly amount={order.deliveryFeeLyd} />
            </div>
            <div className="flex justify-between text-[#10B981]">
              <span>رسوم خدمة واصل</span>
              <Ly amount={0} />
            </div>
            {order.discountLyd > 0 && (
              <div className="flex justify-between text-[#10B981]">
                <span>
                  🎟️ خصم{' '}
                  {order.promoCode ? (
                    <span dir="ltr" className="font-money font-bold">
                      {order.promoCode}
                    </span>
                  ) : (
                    ''
                  )}
                </span>
                <Ly amount={-order.discountLyd} />
              </div>
            )}
            <Separator className="my-2 bg-[rgba(212,175,55,0.15)]" />
            <div className="flex justify-between text-base font-extrabold text-[#F8F5EE]">
              <span>الإجمالي {order.paymentMethod === 'wallet' ? '(مدفوع بالمحفظة)' : '(كاش عند الاستلام)'}</span>
              <Ly amount={order.totalLyd} bold />
            </div>
          </div>
        </div>

        {/* نزاع/إلغاء */}
        {order.disputeNote && (
          <div className="rounded-2xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] p-4">
            <p className="text-xs font-extrabold text-[#EF4444]">⚖️ ملاحظة فض النزاع</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#938E7E]">{order.disputeNote}</p>
          </div>
        )}

        {/* تقييم ما بعد التسليم */}
        {order.status === 'delivered' && (
          <div className="rounded-3xl border border-[rgba(245,208,97,0.3)] bg-[#062319] p-5">
            <p className="mb-1 text-sm font-extrabold text-[#F5D061]">⭐ قيّم تجربتك</p>
            <p className="mb-4 text-[11px] text-[#938E7E]">
              تقييمك يساعد مطاعم نالوت وكباتنها على التميّز — تجربة واحدة، تقييم واحد لكل طلب
            </p>
            <div className="space-y-3">
              <StarRow
                label="جودة الوجبة (المتجر)"
                emoji={order.storeEmoji ?? '🍽️'}
                value={storeStars}
                onChange={rated ? undefined : setStoreStars}
                readOnly={rated}
                size="lg"
              />
              {order.driverId && (
                <StarRow
                  label={`خدمة الكابتن ${order.driverName ?? ''}`}
                  emoji="🛵"
                  value={driverStars}
                  onChange={rated ? undefined : setDriverStars}
                  readOnly={rated}
                  size="lg"
                />
              )}
              {!rated ? (
                <Button
                  onClick={submitRating}
                  disabled={!storeStars || sending}
                  className="h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710] disabled:opacity-40"
                >
                  {sending ? 'جارٍ الإرسال…' : 'إرسال التقييم 🌟'}
                </Button>
              ) : (
                <motion.p
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] py-3 text-center text-xs font-extrabold text-[#10B981]"
                >
                  ✅ تم تسجيل تقييمك — شكراً لمساهمتك في رقي منظومة نالوت
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* شفافية الشريك */}
        <p className="pb-2 text-center text-[10px] leading-relaxed text-[#938E7E]">
          صافي حصة المتجر من هذا الطلب: <Ly amount={merchantNet} className="text-[#D4AF37]" /> • كامل أجرة التوصيل
          ملك للكابتن 🛵
        </p>
      </div>
    </div>
  )
}
