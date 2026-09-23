'use client'

// 🚀 دورة التوصيل الرباعية الفاخرة — قلب تطبيق الكابتن
// 1) التوجه للمتجر  2) استلام مقفل بقفل المطبخ  3) التوجه للزبون  4) التسليم وتحقق OTP
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiPost } from '@/lib/wasel/api'
import { NALUT_CENTER } from '@/lib/wasel/constants'
import { Ly, OrderNo, StatusBadge } from '@/components/wasel/Badges'
import { NalutMap, type MapMarker } from '@/components/wasel/NalutMap'
import { PulseDot } from './captain-shared'
import type { DeliveryStage, OrderDTO } from '@/lib/wasel/types'

interface ActiveDeliveryFlowProps {
  order: OrderDTO
  stage: DeliveryStage
  driverId: string
  driverPhone: string
  captainPos: { lat: number; lng: number }
  onArrivedStore: () => void
  onArrivedCustomer: () => void
  onOrderUpdated: (order: OrderDTO) => void
  onDelivered: (order: OrderDTO) => void
  onBackHome: () => void
}

const STEPS: { key: DeliveryStage; title: string; emoji: string }[] = [
  { key: 'to_store', title: 'التوجه للمتجر', emoji: '🏪' },
  { key: 'pickup_locked', title: 'استلام الطلب', emoji: '🍔' },
  { key: 'to_customer', title: 'التوجه للزبون', emoji: '🛵' },
  { key: 'verify_cash', title: 'التسليم والتحقق', emoji: '✅' },
]

export function ActiveDeliveryFlow({
  order,
  stage,
  driverId,
  driverPhone,
  captainPos,
  onArrivedStore,
  onArrivedCustomer,
  onOrderUpdated,
  onDelivered,
  onBackHome,
}: ActiveDeliveryFlowProps) {
  const { toast } = useToast()
  const [otp, setOtp] = useState('')
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)

  const stageIdx = STEPS.findIndex((s) => s.key === stage)
  const storeLat = order.storeLatitude ?? NALUT_CENTER.lat
  const storeLng = order.storeLongitude ?? NALUT_CENTER.lng
  const headingToCustomer = stage === 'to_customer' || stage === 'verify_cash'

  const markers: MapMarker[] = [
    { id: 'me', kind: 'captain', lat: captainPos.lat, lng: captainPos.lng, label: 'موقعي' },
    { id: 'store', kind: 'store', lat: storeLat, lng: storeLng, label: order.storeName, emoji: order.storeEmoji || '🏪' },
    { id: 'customer', kind: 'customer', lat: order.deliveryLat, lng: order.deliveryLng, label: 'الزبون', emoji: '🏠' },
  ]
  const routeFrom = captainPos
  const routeTo = headingToCustomer ? { lat: order.deliveryLat, lng: order.deliveryLng } : { lat: storeLat, lng: storeLng }

  // ================== الإجراءات ==================
  /** المرحلة 2: استلام الوجبة من المطبخ (🔒 423 يظهر رسالة القفل ولا ينتقل بالمرحلة) */
  const doHandover = async () => {
    if (handoverLoading) return
    setHandoverLoading(true)
    try {
      const res = await apiPost<{ order: OrderDTO }>(`/api/orders/${order.id}/handover`, { driver_id: driverId })
      toast({ title: '🍔 استلمت الوجبة', description: 'انطلق الآن نحو موقع الزبون' })
      onOrderUpdated(res.order)
    } catch (e) {
      const err = e as ApiError
      toast({
        variant: 'destructive',
        title: err.status === 423 ? '🔒 الاستلام مقفل' : 'تعذر الاستلام',
        description: err.message,
      })
    } finally {
      setHandoverLoading(false)
    }
  }

  /** المرحلة 4: التسليم بتحقق OTP — عند 401 اهتزاز + تفريغ الخانات */
  const doDeliver = async () => {
    if (otp.length !== 4 || delivering) return
    setDelivering(true)
    try {
      const res = await apiPost<{ order: OrderDTO }>(`/api/orders/${order.id}/deliver`, {
        driver_id: driverId,
        otp,
      })
      toast({ title: '🎉 اكتملت الرحلة', description: 'تم تقييد القيد المزدوج وعهدتك محدثة' })
      onDelivered(res.order)
    } catch (e) {
      const err = e as ApiError
      setWrongAttempts((a) => a + 1)
      setOtp('')
      toast({
        variant: 'destructive',
        title: err.status === 401 ? 'كود غير صحيح' : 'تعذر إتمام التسليم',
        description: err.message,
      })
    } finally {
      setDelivering(false)
    }
  }

  // ================== خط الزمن الرأسي ==================
  function Timeline() {
    return (
      <ol className="relative ms-1 space-y-0 border-s-2 border-dashed border-[rgba(212,175,55,0.25)] ps-5">
        {STEPS.map((s, i) => {
          const done = i < stageIdx
          const current = i === stageIdx
          return (
            <li key={s.key} className="relative pb-4 last:pb-0">
              <span
                className={`absolute -start-[31px] flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black transition-all ${
                  done
                    ? 'border-[#10B981] bg-[#10B981] text-[#041710]'
                    : current
                      ? 'border-[#F5D061] bg-[#0A3324] text-[#F5D061] shadow-[0_0_0_5px_rgba(245,208,97,0.12)]'
                      : 'border-[rgba(147,142,126,0.35)] bg-[#041710] text-[#938E7E]'
                }`}
              >
                {done ? '✓' : s.emoji}
              </span>
              <p className={`text-sm font-extrabold ${current ? 'text-[#F5D061]' : done ? 'text-[#10B981]' : 'text-[#938E7E]'}`}>
                {i + 1}. {s.title}
              </p>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* شريط علوي محلي: عودة + رقم الطلب + الحالة */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBackHome}
          className="h-12 shrink-0 rounded-xl border-[rgba(212,175,55,0.35)] bg-[#0A3324] px-4 text-[#F5D061] hover:bg-[#124532]"
        >
          <ArrowRight className="size-5" />
          <span className="sr-only">عودة للرئيسية</span>
        </Button>
        <div className="min-w-0 flex-1 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#062319] px-3 py-2">
          <p className="text-[10px] text-[#938E7E]">مهمة توصيل جارية — رقم الطلب</p>
          <OrderNo no={order.orderNumber} className="text-sm font-bold text-[#F5D061]" />
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* خط الزمن الرأسي */}
      <div className="rounded-3xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#F8F5EE]">
          🧭 رحلة التوصيل — خط الزمن
        </h2>
        <Timeline />
      </div>

      {/* لوحة المرحلة الحالية */}
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="rounded-3xl border border-[rgba(212,175,55,0.28)] bg-[#062319] p-5 gold-glow"
      >
        {/* ========== المرحلة 1: التوجه للمتجر ========== */}
        {stage === 'to_store' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.3)] bg-[#0A3324] text-3xl">
                {order.storeEmoji || '🏪'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black text-[#F8F5EE]">{order.storeName}</h3>
                <p className="text-xs text-[#938E7E]">
                  جهّز نفسك للانطلاق — المتجر ينتظر مندوب واصل
                </p>
              </div>
              <a
                href={`tel:${driverPhone}`}
                className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] px-4 text-sm font-extrabold text-[#10B981] transition hover:bg-[rgba(16,185,129,0.18)]"
              >
                <Phone className="size-4" />
                اتصال بالمطعم
              </a>
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold text-[#F5D061]">🧾 أصناف الطلب</p>
              <div className="wasel-scroll max-h-52 space-y-2 overflow-y-auto pe-1">
                {order.items.map((it) => (
                  <div
                    key={`${it.productId}-${it.title}`}
                    className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#041710]/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#F8F5EE]">
                        <span className="font-money ltr-nums text-[#F5D061]">{it.qty}×</span> {it.title}
                      </p>
                      <Ly amount={it.unitPrice * it.qty} className="text-xs text-[#938E7E]" />
                    </div>
                    {it.notes && (
                      <p className="mt-1 text-[11px] font-bold text-[#F59E0B]">📝 ملاحظة: {it.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.notes && (
              <div className="rounded-xl border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.08)] px-4 py-3">
                <p className="text-sm font-extrabold text-[#F59E0B]">📝 ملاحظات الزبون البارزة</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#F8F5EE]">{order.notes}</p>
              </div>
            )}

            <NalutMap
              markers={markers}
              routeFrom={routeFrom}
              routeTo={routeTo}
              className="h-56 w-full"
              compact
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onArrivedStore}
              className="h-16 rounded-2xl bg-[#10B981] text-lg font-black text-[#041710] shadow-lg shadow-[rgba(16,185,129,0.3)] transition hover:bg-[#0DB27A]"
            >
              وصلت للمتجر 📍
            </motion.button>
          </div>
        )}

        {/* ========== المرحلة 2: قفل المطبخ الأمني ========== */}
        {stage === 'pickup_locked' && (
          <div className="flex flex-col gap-4">
            {order.status !== 'ready_for_pickup' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.07)] p-6 text-center"
              >
                <div className="mb-3 animate-pulse text-6xl">🔒</div>
                <h3 className="text-lg font-black text-[#F8F5EE]">الاستلام مقفل</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#F59E0B]">
                  المطبخ لم يؤكد جاهزية الوجبة بعد — يُمنع الاستلام قبل إشعار «الوجبة جاهزة»
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-4 py-2 text-xs font-extrabold text-[#F59E0B]">
                  <PulseDot color="#F59E0B" />
                  بانتظار تأكيد المطبخ…
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-[rgba(245,208,97,0.5)] bg-[rgba(245,208,97,0.06)] p-6 text-center"
              >
                <div className="mb-2 text-5xl">🍔</div>
                <h3 className="text-lg font-black text-[#F5D061]">المطبخ أكد: الوجبة جاهزة!</h3>
                <p className="mt-1 text-xs text-[#938E7E]">اضغط الزر لبدء رحلة التوصيل رسمياً</p>
              </motion.div>
            )}

            <NalutMap markers={markers} className="h-40 w-full" compact />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={doHandover}
              disabled={order.status !== 'ready_for_pickup' || handoverLoading}
              className={`h-16 rounded-2xl text-lg font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                order.status === 'ready_for_pickup'
                  ? 'ring-alert bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.35)] hover:brightness-110'
                  : 'bg-[#0A3324] text-[#938E7E]'
              }`}
            >
              {handoverLoading ? 'جارٍ تأكيد الاستلام…' : 'استلمت الوجبة وبدأت الرحلة 🍔'}
            </motion.button>
          </div>
        )}

        {/* ========== المرحلة 3: التوجه للزبون ========== */}
        {stage === 'to_customer' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[#041710]/70 p-4">
              <p className="text-xs font-extrabold text-[#F5D061]">🏠 عنوان الزبون</p>
              <p className="mt-1 text-base font-black leading-relaxed text-[#F8F5EE]">{order.deliveryAddress}</p>
              <p className="mt-0.5 text-xs text-[#938E7E]">📍 {order.district} • {order.customerName}</p>
            </div>

            {order.paymentMethod === 'cash' ? (
              <div className="rounded-2xl border border-[rgba(245,208,97,0.55)] bg-[rgba(245,208,97,0.08)] p-4 text-center">
                <p className="text-xs font-extrabold text-[#938E7E]">💵 مبلغ الكاش المطلوب تحصيله من الزبون</p>
                <Ly amount={order.totalLyd} bold className="mt-1 block text-4xl text-[#F5D061]" />
                <p className="mt-1 text-[11px] text-[#938E7E]">يشمل ثمن الطلب + أجرة التوصيل — يُدخل ضمن عهدتك</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.06)] p-4 text-center">
                <p className="text-sm font-extrabold text-[#10B981]">👛 مدفوع بالمحفظة — لا كاش مطلوب</p>
                <p className="mt-1 text-[11px] text-[#938E7E]">أجرة التوصيل فقط تُقيّد لأرباحك عند التسليم</p>
              </div>
            )}

            <NalutMap
              markers={markers}
              routeFrom={routeFrom}
              routeTo={routeTo}
              className="h-56 w-full"
              compact
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onArrivedCustomer}
              className="h-16 rounded-2xl bg-[#10B981] text-lg font-black text-[#041710] shadow-lg shadow-[rgba(16,185,129,0.3)] transition hover:bg-[#0DB27A]"
            >
              وصلت لموقع الزبون 🏠
            </motion.button>
          </div>
        )}

        {/* ========== المرحلة 4: التسليم والتحقق ========== */}
        {stage === 'verify_cash' && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-lg font-black text-[#F8F5EE]">🔐 التحقق النهائي بالتسليم</h3>
              <p className="mt-1 text-sm font-bold text-[#F5D061]">اطلب الكود السري الرباعي من الزبون</p>
            </div>

            {order.paymentMethod === 'cash' && (
              <div className="w-full rounded-2xl border border-[rgba(245,208,97,0.55)] bg-[rgba(245,208,97,0.08)] p-3 text-center">
                <p className="text-xs font-bold text-[#938E7E]">حصّل الآن قبل إدخال الكود:</p>
                <Ly amount={order.totalLyd} bold className="text-3xl text-[#F5D061]" />
              </div>
            )}

            <motion.div
              key={wrongAttempts}
              animate={wrongAttempts > 0 ? { x: [0, -14, 14, -9, 9, -4, 4, 0] } : undefined}
              transition={{ duration: 0.5 }}
              dir="ltr"
              className="flex justify-center"
            >
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={setOtp}
                containerClassName="justify-center gap-3"
              >
                <InputOTPGroup className="gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="font-money h-16 w-14 rounded-xl border-[rgba(212,175,55,0.4)] bg-[#041710] text-3xl font-bold text-[#F5D061] shadow-inner"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </motion.div>

            {wrongAttempts > 0 && (
              <p className="text-xs font-extrabold text-[#EF4444]">⚠️ الكود غير صحيح — جرّب مرة أخرى ({wrongAttempts})</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={doDeliver}
              disabled={otp.length !== 4 || delivering}
              className="h-16 w-full rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-lg font-black text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {delivering ? 'جارٍ التحقق…' : 'تأكيد التسليم واستلام الكاش ✅'}
            </motion.button>

            <p className="max-w-xs text-center text-[11px] leading-relaxed text-[#938E7E]">
              الكود يظهر في تطبيق الزبون — التسليم بلا كود ممنوع نظاماً ويعزل مسؤولية الندّب
            </p>
          </div>
        )}
      </motion.div>

      <Separator className="bg-[rgba(212,175,55,0.15)]" />
    </div>
  )
}
