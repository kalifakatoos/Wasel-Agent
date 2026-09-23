'use client'

// 🛵 التتبع الحي — خطوات ملونة + كود OTP ضخم + خريطة نالوت بمسار حي (Socket + استقصاء احتياطي)
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Ly, StatusBadge } from '@/components/wasel/Badges'
import { NalutMap, type MapMarker } from '@/components/wasel/NalutMap'
import { apiGet } from '@/lib/wasel/api'
import { STATUS_LABELS } from '@/lib/wasel/constants'
import { haversineKm } from '@/lib/wasel/pricing'
import { getSocket, joinRooms, leaveRooms } from '@/lib/wasel/socket'
import type { OrderDTO, OrderStatus } from '@/lib/wasel/types'
import { ErrorBlock, LoadingBlock, ScreenBar } from './customer-shared'

const POLL_MS = 4000
const TERMINAL_STATUSES = new Set<OrderStatus>(['delivered', 'cancelled', 'disputed'])

/// خطوات الرحلة الخمس (accepted تُحسب ضمن التحضير)
const STEPS: { key: OrderStatus; emoji: string }[] = [
  { key: 'placed', emoji: '📝' },
  { key: 'preparing', emoji: '👨‍🍳' },
  { key: 'ready_for_pickup', emoji: '🎒' },
  { key: 'out_for_delivery', emoji: '🛵' },
  { key: 'delivered', emoji: '🎉' },
]

function stepIndexFor(status: OrderStatus): number {
  switch (status) {
    case 'placed':
      return 0
    case 'accepted':
    case 'preparing':
      return 1
    case 'ready_for_pickup':
      return 2
    case 'out_for_delivery':
      return 3
    case 'delivered':
      return 4
    default:
      return -1
  }
}

export function TrackingScreen({
  orderId,
  onBrowse,
}: {
  orderId: string
  onBrowse: () => void
}) {
  const [order, setOrder] = useState<OrderDTO | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [captain, setCaptain] = useState<{ lat: number; lng: number } | null>(null)
  const orderRef = useRef<OrderDTO | null>(null)

  useEffect(() => {
    orderRef.current = order
  }, [order])

  // 1) الجلب الأولي + الاستقصاء الاحتياطي كل 4 ثوانٍ (يتوقف عند حالة نهائية)
  useEffect(() => {
    let cancelled = false
    const fetchOrder = async () => {
      try {
        const d = await apiGet<{ order: OrderDTO }>(`/api/orders/${orderId}`)
        if (cancelled) return
        setOrder(d.order)
        setLoadError(null)
      } catch (e: unknown) {
        if (!cancelled && !orderRef.current) {
          setLoadError(e instanceof Error ? e.message : 'تعذر جلب حالة الطلب')
        }
      }
    }
    fetchOrder()
    const iv = setInterval(() => {
      const st = orderRef.current?.status
      if (st && TERMINAL_STATUSES.has(st)) return
      void fetchOrder()
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [orderId])

  // 2) قناة اللحظية: حالة الطلب + موقع الكابتن الحي
  useEffect(() => {
    const room = `order:${orderId}`
    joinRooms([room])
    const s = getSocket()

    const onStatusChanged = (p: { orderId?: string; status?: OrderStatus; orderNumber?: string }) => {
      if (!p || p.orderId !== orderId || !p.status) return
      const nextStatus: OrderStatus = p.status
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev))
    }
    const onDriverLocation = (p: { driverId?: string; lat?: number; lng?: number }) => {
      if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') return
      setCaptain({ lat: p.lat, lng: p.lng })
    }

    s.on('order:status_changed', onStatusChanged)
    s.on('order:driver_location', onDriverLocation)
    return () => {
      s.off('order:status_changed', onStatusChanged)
      s.off('order:driver_location', onDriverLocation)
      leaveRooms([room])
    }
  }, [orderId])

  if (loadError && !order) {
    return (
      <div>
        <ScreenBar title="تتبع الطلب" onBack={onBrowse} />
        <ErrorBlock message={loadError} onRetry={onBrowse} />
      </div>
    )
  }

  if (!order) return <LoadingBlock label="جارٍ جلب حالة طلبك…" />

  const current = stepIndexFor(order.status)
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled' || order.status === 'disputed'
  const hasStoreGeo = typeof order.storeLatitude === 'number' && typeof order.storeLongitude === 'number'

  const markers: MapMarker[] = []
  if (hasStoreGeo) {
    markers.push({
      id: 'store',
      lat: order.storeLatitude as number,
      lng: order.storeLongitude as number,
      kind: 'store',
      emoji: order.storeEmoji || '🏪',
      label: order.storeName,
    })
  }
  markers.push({
    id: 'customer',
    lat: order.deliveryLat,
    lng: order.deliveryLng,
    kind: 'customer',
    emoji: '🏠',
    label: order.district,
  })
  if (captain) {
    markers.push({
      id: 'captain',
      lat: captain.lat,
      lng: captain.lng,
      kind: 'captain',
      emoji: '🛵',
      label: order.driverName || 'كابتن واصل',
      active: true,
    })
  }

  return (
    <div>
      <ScreenBar
        title={`تتبع الطلب ${order.orderNumber}`}
        subtitle={`${order.storeEmoji ?? '🏪'} ${order.storeName} • ${order.district}`}
        onBack={onBrowse}
      />

      {/* نزاع أو إلغاء */}
      {isCancelled && (
        <Alert variant="destructive" className="mb-5 border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)]">
          <AlertTitle>الطلب {STATUS_LABELS[order.status] ?? order.status}</AlertTitle>
          <AlertDescription>
            {order.disputeNote || 'نعتذر عن ذلك — يمكنك التواصل مع دعم واصل أو إعادة الطلب من المتجر.'}
          </AlertDescription>
        </Alert>
      )}

      {/* الاحتفال */}
      {isDelivered && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="mb-5 rounded-3xl border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.07)] p-7 text-center"
        >
          <div className="mb-2 flex items-center justify-center gap-3 text-3xl">
            {['✨', '🥳', '🍽️', '🎉', '👏'].map((e, i) => (
              <motion.span
                key={e}
                animate={{ y: [0, -9, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.18, ease: 'easeInOut' }}
              >
                {e}
              </motion.span>
            ))}
          </div>
          <h3 className="text-2xl font-black gold-text">بالهناء والشفاء! 🎉</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#938E7E]">
            اكتملت رحلة طلبك {order.orderNumber} — أجرت التوصيل دُفعت كاملة للكابتن ورسوم الخدمة كانت 0.00 د.ل.
          </p>
          <Button
            onClick={onBrowse}
            className="mt-4 h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-8 text-sm font-extrabold text-[#041710]"
          >
            🧭 اطلب شيئاً آخر
          </Button>
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* العمود الأيمن: الخطوات + OTP */}
        <div className="space-y-5 lg:col-span-2">
          {/* الخطوات الرأسية */}
          <div className="rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#062319] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#F8F5EE]">رحلة طلبك</h4>
              <StatusBadge status={order.status} />
            </div>
            {isCancelled ? (
              <p className="py-4 text-center text-xs text-[#938E7E]">توقفت رحلة الطلب عند الحالة أعلاه</p>
            ) : (
              <ol className="relative space-y-1">
                {STEPS.map((step, idx) => {
                  const done = idx < current
                  const activeStep = idx === current
                  const reached = isDelivered || idx <= current
                  return (
                    <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                      {/* خط الربط */}
                      {idx < STEPS.length - 1 && (
                        <span
                          className={`absolute start-[21px] top-11 h-[calc(100%-2.75rem)] w-0.5 rounded ${
                            idx < current ? 'bg-[#10B981]' : 'bg-[rgba(212,175,55,0.15)]'
                          }`}
                        />
                      )}
                      {/* الدائرة */}
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg transition ${
                          done
                            ? 'border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.12)]'
                            : activeStep
                              ? 'border-[rgba(212,175,55,0.7)] bg-[rgba(212,175,55,0.15)] gold-glow ring-alert'
                              : 'border-[rgba(212,175,55,0.15)] bg-[#041710] opacity-45 grayscale'
                        }`}
                      >
                        {done ? <Check className="h-5 w-5 text-[#10B981]" /> : step.emoji}
                      </span>
                      <div className="min-w-0 pt-1">
                        <p
                          className={`text-sm font-extrabold ${
                            activeStep ? 'text-[#F5D061]' : reached ? 'text-[#F8F5EE]' : 'text-[#938E7E]'
                          }`}
                        >
                          {STATUS_LABELS[step.key]}
                          {activeStep && (
                            <motion.span
                              animate={{ opacity: [1, 0.35, 1] }}
                              transition={{ repeat: Infinity, duration: 1.4 }}
                              className="ms-2 text-[10px] font-bold text-[#F5D061]"
                            >
                              ● الآن
                            </motion.span>
                          )}
                        </p>
                        {activeStep && step.key === 'out_for_delivery' && order.driverName && (
                          <p className="mt-0.5 text-[11px] text-[#938E7E]">
                            الكابتن <b className="text-[#F5D061]">{order.driverName}</b> في طريقه إليك 🛵
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* ⏱️ الوصول المتوقع (ETA) */}
          {!isDelivered && !isCancelled && (
            <div className="rounded-2xl border border-[rgba(16,185,129,0.28)] bg-[rgba(16,185,129,0.05)] p-5">
              {(() => {
                const distKm = haversineKm(
                  order.storeLatitude ?? 31.8687,
                  order.storeLongitude ?? 10.9818,
                  order.deliveryLat,
                  order.deliveryLng,
                )
                const travelMin = Math.max(3, Math.round((distKm / 22) * 60))
                let etaMin = travelMin
                let label = 'الوصول المتوقع'
                if (order.status === 'preparing' || order.status === 'accepted' || order.status === 'placed') {
                  const elapsed = order.dispatchAt
                    ? (Date.now() - new Date(order.dispatchAt).getTime()) / 60000
                    : 0
                  const prepRemaining = Math.max(0, Math.round(order.prepTimeMinutes - elapsed))
                  etaMin = prepRemaining + travelMin
                  label = 'الوصول المتوقع (بعد التحضير + الرحلة)'
                } else if (order.status === 'ready_for_pickup') {
                  etaMin = Math.max(3, travelMin + 2)
                  label = 'الوصول المتوقع (جاهز بانتظار الكابتن)'
                } else if (order.status === 'out_for_delivery') {
                  const elapsed = order.handoverAt
                    ? (Date.now() - new Date(order.handoverAt).getTime()) / 60000
                    : 0
                  etaMin = Math.max(1, Math.round(travelMin - elapsed))
                  label = 'الوصول المتوقع'
                }
                const progress =
                  order.status === 'out_for_delivery'
                    ? Math.min(92, Math.round(((travelMin - etaMin) / Math.max(1, travelMin)) * 100))
                    : order.status === 'ready_for_pickup'
                      ? 62
                      : 34
                return (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-extrabold text-[#10B981]">⏱️ {label}</p>
                      <p className="font-money text-lg font-bold text-[#F8F5EE]">
                        ~{Math.max(1, etaMin)} <span className="text-[10px] font-semibold text-[#938E7E]">دقيقة</span>
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#041710]">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-l from-[#10B981] to-[#F5D061]"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-[#938E7E]">
                      المسافة من المتجر إليك: <span className="font-money text-[#D4AF37]">{distKm.toFixed(1)}</span> كم
                      بمتوسط سرعة حضرية 22 كم/س
                    </p>
                  </>
                )
              })()}
            </div>
          )}

          {/* كود OTP */}
          <div className={`rounded-2xl border border-[rgba(212,175,55,0.3)] bg-[#062319] p-5 text-center ${isDelivered ? 'opacity-55' : ''}`}>
            <h4 className="mb-1 flex items-center justify-center gap-2 text-sm font-extrabold text-[#F5D061]">
              <ShieldCheck className="h-4 w-4" />
              كود التسليم الآمن
            </h4>
            <p className="mb-4 text-[11px] font-semibold text-[#938E7E]">
              سلّم هذا الكود للكابتن عند الاستلام — لا تسلّم طلبك بدونه
            </p>
            <div dir="ltr" className="flex justify-center gap-3">
              {(order.otpCode || '').split('').map((d, i) => (
                <span
                  key={`${i}-${d}`}
                  className="font-money ltr-nums flex h-16 w-14 items-center justify-center rounded-2xl border-2 border-[rgba(212,175,55,0.6)] bg-[#0A3324] text-3xl font-bold text-[#F5D061] gold-glow"
                >
                  {d}
                </span>
              ))}
            </div>
            {isDelivered && <p className="mt-3 text-[10px] text-[#10B981]">✔ اكتمل التسليم بهذا الكود</p>}
          </div>
        </div>

        {/* العمود الأيسر: الخريطة + الملخص */}
        <div className="space-y-5 lg:col-span-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#F8F5EE]">الخريطة الحية</h4>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                </span>
                تحديث لحظي
              </span>
            </div>
            <NalutMap
              markers={markers}
              routeFrom={hasStoreGeo ? { lat: order.storeLatitude as number, lng: order.storeLongitude as number } : null}
              routeTo={{ lat: order.deliveryLat, lng: order.deliveryLng }}
              className="h-72 sm:h-80"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#938E7E]">
              <span>🏪 المتجر</span>
              <span className="text-[#10B981]">🏠 موقعك ({order.district})</span>
              <span className="text-[#F5D061]">🛵 الكابتن {captain ? '' : '— يظهر عند انطلاق التوصيل'}</span>
            </div>
          </div>

          {/* ملخص الأصناف والإجمالي */}
          <div className="rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#062319] p-5">
            <h4 className="mb-3 text-sm font-extrabold text-[#F8F5EE]">ملخص الطلب</h4>
            <div className="wasel-scroll max-h-52 space-y-2 overflow-y-auto pe-1">
              {order.items.map((it) => (
                <div key={it.productId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 flex-1 truncate text-[#F8F5EE]">
                    <span className="font-money ltr-nums font-bold text-[#D4AF37]">×{it.qty}</span> {it.title}
                    {it.notes && <span className="text-[10px] text-[#938E7E]"> — 📝 {it.notes}</span>}
                  </span>
                  <Ly amount={it.qty * it.unitPrice} className="shrink-0 text-[#F8F5EE]" />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-[rgba(212,175,55,0.15)] pt-3 text-sm">
              <div className="flex justify-between text-xs">
                <span className="text-[#938E7E]">قيمة الأصناف</span>
                <Ly amount={order.subtotalLyd} className="text-[#F8F5EE]" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#938E7E]">أجرة التوصيل (إجارة عمل معلنة)</span>
                <Ly amount={order.deliveryFeeLyd} className="text-[#F8F5EE]" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#938E7E]">رسوم خدمة واصل</span>
                <span className="font-bold text-[#10B981]">
                  <Ly amount={order.serviceFeeLyd} className="text-[#10B981]" /> ✅
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[rgba(212,175,55,0.15)] pt-2.5">
                <span className="text-sm font-extrabold text-[#F8F5EE]">
                  الإجمالي • {order.paymentMethod === 'wallet' ? '👛 محفظة واصل' : '💵 كاش عند الاستلام'}
                </span>
                <Ly amount={order.totalLyd} bold className="text-xl text-[#F5D061]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
