'use client'

// 🛵 تطبيق الكابتن — واصل نالوت (الوردية، العهدة، الرادار، دورة التوصيل الرباعية)
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { ApiError, apiGet, apiPost } from '@/lib/wasel/api'
import { CUSTODY_CAP_LYD, NALUT_CENTER } from '@/lib/wasel/constants'
import { useWasel } from '@/lib/wasel/store'
import { getSocket, joinRooms, leaveRooms } from '@/lib/wasel/socket'
import { Ly, OrderNo, StatusBadge } from '@/components/wasel/Badges'
import { OrderRadarDialog } from './captain-radar'
import { ActiveDeliveryFlow } from './captain-delivery'
import { PulseDot, StatTile, WaselCard } from './captain-shared'
import type { DeliveryStage, DriverDTO, OrderDTO, RadarOffer } from '@/lib/wasel/types'

type View = 'home' | 'delivery'
type LatLng = { lat: number; lng: number }

const SHIFT_UI: Record<
  DriverDTO['status'],
  { dot: string; ring: string; btnBg: string; label: string; sub: string }
> = {
  offline: {
    dot: '#938E7E',
    ring: 'border-[rgba(147,142,126,0.4)] bg-[#0A3324] text-[#938E7E]',
    btnBg: 'bg-[#0A3324] text-[#938E7E] border-[rgba(147,142,126,0.35)]',
    label: 'الوردية متوقفة',
    sub: 'شغّل الوردية لاستقبال عروض الرادار مباشرة',
  },
  online: {
    dot: '#10B981',
    ring: 'border-[#10B981] bg-[rgba(16,185,129,0.15)] text-[#10B981]',
    btnBg: 'bg-[#10B981] text-[#041710] border-transparent',
    label: 'أنت متصل الآن',
    sub: 'رادار العروض يعمل — كامل أجرة التوصيل لك',
  },
  busy: {
    dot: '#F5D061',
    ring: 'border-[#D4AF37] bg-[rgba(212,175,55,0.15)] text-[#F5D061]',
    btnBg: 'bg-[#D4AF37] text-[#041710] border-transparent',
    label: 'في مهمة توصيل',
    sub: 'أكمل التوصيلات الجارية قبل إنهاء الوردية',
  },
}

/** خطوة نحو الهدف بخطوة ثابتة 0.0004 درجة لكل نبضة تيليمتري */
function lerpToward(from: LatLng, to: LatLng, step = 0.0004): LatLng {
  const dx = to.lng - from.lng
  const dy = to.lat - from.lat
  const dist = Math.hypot(dx, dy)
  if (dist === 0 || dist <= step) return { lat: to.lat, lng: to.lng }
  const k = step / dist
  return { lat: from.lat + dy * k, lng: from.lng + dx * k }
}

export default function CaptainApp({ onExit }: { onExit: () => void }) {
  const driverId = useWasel((s) => s.driverId)
  const setDriverId = useWasel((s) => s.setDriverId)
  const declinedOffers = useWasel((s) => s.declinedOffers)
  const declineOfferAction = useWasel((s) => s.declineOffer)

  const [view, setView] = useState<View>('home')
  const [drivers, setDrivers] = useState<DriverDTO[]>([])
  const [driver, setDriver] = useState<DriverDTO | null>(null)
  const [activeOrders, setActiveOrders] = useState<OrderDTO[]>([])
  const [radarOffer, setRadarOffer] = useState<RadarOffer | null>(null)
  const [radarLeft, setRadarLeft] = useState(15)
  const [accepting, setAccepting] = useState(false)
  const [shiftLoading, setShiftLoading] = useState(false)
  const [arrived, setArrived] = useState({ store: false, customer: false })
  const [celebration, setCelebration] = useState<OrderDTO | null>(null)
  const [captainPos, setCaptainPos] = useState<LatLng>({ ...NALUT_CENTER })

  // موضع الكابتن الحي (ref للمنطق + state للرسم)
  const posRef = useRef<LatLng>({ ...NALUT_CENTER })
  const posOwnerRef = useRef<string>('')
  const targetRef = useRef<LatLng | null>(null)
  const movingRef = useRef(false)

  const activeOrder = activeOrders[0] ?? null
  const busy = !!activeOrder || driver?.status === 'busy'
  const onDuty = !!driver && driver.status !== 'offline'

  // أحدث حالة لاستخدامها داخل معالجات socket والتيليمتري دون إعادة اشتراك
  const latestRef = useRef<{
    driverId: string
    driverStatus: DriverDTO['status']
    activeOrder: OrderDTO | null
    radarOfferId: string | null
    declined: string[]
    view: View
    celebrating: boolean
  }>({
    driverId,
    driverStatus: 'offline',
    activeOrder: null,
    radarOfferId: null,
    declined: [],
    view: 'home',
    celebrating: false,
  })
  useEffect(() => {
    latestRef.current = {
      driverId,
      driverStatus: driver?.status ?? 'offline',
      activeOrder,
      radarOfferId: radarOffer?.orderId ?? null,
      declined: declinedOffers,
      view,
      celebrating: !!celebration,
    }
  }, [driverId, driver, activeOrder, radarOffer, declinedOffers, view, celebration])

  // ============ جلب البيانات الأساسية (كباتن + طلبات نشطة) ============
  const refreshCore = useCallback(async () => {
    try {
      const [drvRes, ordRes] = await Promise.all([
        apiGet<{ drivers: DriverDTO[] }>('/api/drivers'),
        apiGet<{ orders: OrderDTO[] }>(`/api/orders?driverId=${driverId}&status=active&limit=10`),
      ])
      setDrivers(drvRes.drivers)
      setDriver(drvRes.drivers.find((d) => d.id === driverId) ?? null)
      setActiveOrders(ordRes.orders)
    } catch {
      /* استقصاء صامت */
    }
  }, [driverId])

  useEffect(() => {
    refreshCore()
    const iv = setInterval(refreshCore, 5000)
    return () => clearInterval(iv)
  }, [refreshCore])

  // ============ اشتقاق مرحلة التوصيل من حالة الطلب + علم الوصول ============
  const stage: DeliveryStage = !activeOrder
    ? 'to_store'
    : activeOrder.status === 'out_for_delivery'
      ? arrived.customer
        ? 'verify_cash'
        : 'to_customer'
      : arrived.store || activeOrder.status === 'ready_for_pickup'
        ? 'pickup_locked'
        : 'to_store'

  // إعادة تعيين أعلام الوصول عند تغيّر الطلب النشط (وليس عند كل تغيّر حالة)
  useEffect(() => {
    const ord = latestRef.current.activeOrder
    setArrived({
      store: !!ord && (ord.status === 'ready_for_pickup' || ord.status === 'out_for_delivery'),
      customer: false,
    })
  }, [activeOrder?.id])

  // تغيير الكابتن من القائمة → تصفير الواجهة
  useEffect(() => {
    setView('home')
    setCelebration(null)
    setRadarOffer(null)
  }, [driverId])

  // عند زوال الطلب النشط (غير الشاشة الاحتفالية) نعود للرئيسية
  useEffect(() => {
    if (view === 'delivery' && !activeOrder && !celebration) setView('home')
  }, [activeOrder, view, celebration])

  // تهيئة موضع الكابتن من بطاقة السائق عند تغيير الهوية
  useEffect(() => {
    if (posOwnerRef.current === driverId) return
    const d = drivers.find((x) => x.id === driverId)
    posOwnerRef.current = driverId
    posRef.current = {
      lat: d?.currentLatitude ?? NALUT_CENTER.lat,
      lng: d?.currentLongitude ?? NALUT_CENTER.lng,
    }
    setCaptainPos({ ...posRef.current })
  }, [driverId, drivers])

  // هدف الحركة: نحو المتجر (مرحلة 1) أو نحو الزبون (مرحلة 3) — يعاد التصويب من الموقع الحالي عند تغيير المرحلة
  useEffect(() => {
    if (view !== 'delivery' || !activeOrder) {
      movingRef.current = false
      targetRef.current = null
      return
    }
    if (stage === 'to_customer' || stage === 'verify_cash') {
      targetRef.current = { lat: activeOrder.deliveryLat, lng: activeOrder.deliveryLng }
      movingRef.current = stage === 'to_customer'
    } else {
      targetRef.current = {
        lat: activeOrder.storeLatitude ?? NALUT_CENTER.lat,
        lng: activeOrder.storeLongitude ?? NALUT_CENTER.lng,
      }
      movingRef.current = stage === 'to_store'
    }
  }, [stage, activeOrder, view])

  // ============ التيليمتري الحي: emit كل 1.5 ثانية أثناء الوردية ============
  useEffect(() => {
    const tick = () => {
      const st = latestRef.current
      if (st.driverStatus === 'offline') return
      let pos = posRef.current
      if (movingRef.current && targetRef.current) {
        pos = lerpToward(pos, targetRef.current)
        posRef.current = pos
        setCaptainPos({ ...pos })
      }
      getSocket().emit('driver:location_update', {
        driverId: st.driverId,
        orderId: st.activeOrder?.id,
        lat: pos.lat,
        lng: pos.lng,
        status: st.driverStatus,
      })
    }
    const iv = setInterval(tick, 1500)
    return () => clearInterval(iv)
  }, [driverId])

  // ============ الرادار: فتح عرض مع الحراسة ضد المكرر/المرفوض/الانشغال ============
  const openOffer = useCallback((offer: RadarOffer) => {
    const st = latestRef.current
    if (st.celebrating || st.view !== 'home') return
    if (st.activeOrder) return // مشغول بمهمة
    if (st.radarOfferId === offer.orderId) return // معروض حالياً
    if (st.declined.includes(offer.orderId)) return // رفضه سابقاً
    setRadarOffer(offer)
  }, [])
  const openOfferRef = useRef(openOffer)
  useEffect(() => {
    openOfferRef.current = openOffer
  }, [openOffer])

  // استقصاء العروض كل 3 ثوانٍ — فقط أثناء online وبلا مهمة
  useEffect(() => {
    if (!onDuty || busy) return
    const iv = setInterval(async () => {
      const st = latestRef.current
      if (st.radarOfferId || st.activeOrder || st.celebrating || st.view !== 'home') return
      try {
        const res = await apiGet<{ offers: (RadarOffer & { costRank: number })[] }>(
          `/api/drivers/${driverId}/offers`,
        )
        const first = res.offers.find((o) => !latestRef.current.declined.includes(o.orderId))
        if (first) openOfferRef.current(first)
      } catch {
        /* استقصاء صامت */
      }
    }, 3000)
    return () => clearInterval(iv)
  }, [driverId, onDuty, busy])

  // عدّاد الرادار 15 → 0 ثم إغلاق تلقائي بلا قبول
  useEffect(() => {
    if (!radarOffer) return
    setRadarLeft(radarOffer.expiresInSec || 15)
    const iv = setInterval(() => {
      setRadarLeft((s) => {
        if (s <= 1) {
          clearInterval(iv)
          setRadarOffer(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [radarOffer])

  // ============ الاشتراكات اللحظية (غرف الكابتن + رادار الكباتن) ============
  useEffect(() => {
    const rooms = [`driver:${driverId}`, 'drivers:radar']
    joinRooms(rooms)
    const s = getSocket()

    const onRadarOffer = (offer: RadarOffer) => openOfferRef.current(offer)
    const onRadarTaken = ({ orderId }: { orderId: string }) => {
      if (latestRef.current.radarOfferId === orderId) setRadarOffer(null)
    }
    const onStatusChanged = ({ orderId, status }: { orderId: string; status: string }) => {
      const cur = latestRef.current.activeOrder
      if (!cur || cur.id !== orderId) return
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: status as OrderDTO['status'] } : o)),
      )
      if (status === 'ready_for_pickup') {
        toast({
          title: '🔓 فُتح قفل الاستلام',
          description: 'المطبخ أكد جاهزية الوجبة — استلمها وابدأ الرحلة الآن',
        })
      }
      refreshCore()
    }
    const onAssigned = (p: { orderId: string; orderNumber: string; driverId: string }) => {
      if (p.driverId !== driverId) return
      toast({ title: '🛵 طلب جديد معيَّن لك', description: `رقم الطلب ${p.orderNumber}` })
      setRadarOffer(null)
      refreshCore()
      setView('delivery')
    }
    const onCustodyAlert = ({ custody, cap }: { custody: number; cap: number }) => {
      toast({
        variant: 'destructive',
        title: '⚠️ تجاوزت سقف العهدة النقدية',
        description: `بحوزتك ${custody.toFixed(2)} د.ل من أصل ${cap} د.ل — أودع النقد في المقر فوراً`,
      })
    }
    const onShift = ({ status }: { status: string }) => {
      setDriver((d) => (d ? { ...d, status: status as DriverDTO['status'] } : d))
    }

    s.on('order:radar_offer', onRadarOffer)
    s.on('order:radar_taken', onRadarTaken)
    s.on('order:status_changed', onStatusChanged)
    s.on('order:assigned', onAssigned)
    s.on('driver:custody_alert', onCustodyAlert)
    s.on('driver:shift', onShift)

    return () => {
      s.off('order:radar_offer', onRadarOffer)
      s.off('order:radar_taken', onRadarTaken)
      s.off('order:status_changed', onStatusChanged)
      s.off('order:assigned', onAssigned)
      s.off('driver:custody_alert', onCustodyAlert)
      s.off('driver:shift', onShift)
      leaveRooms(rooms)
    }
  }, [driverId, refreshCore])

  // ============ الإجراءات ============
  const toggleShift = async () => {
    if (!driver || shiftLoading) return
    const goingOnline = driver.status === 'offline'
    setShiftLoading(true)
    try {
      const res = await apiPost<{ driver: DriverDTO }>(`/api/drivers/${driver.id}/shift`, {
        online: goingOnline,
      })
      setDriver(res.driver)
      setDrivers((prev) => prev.map((d) => (d.id === res.driver.id ? res.driver : d)))
      toast(
        goingOnline
          ? { title: '🟢 بدأت الوردية', description: 'رادار العروض يعمل الآن — بالتوفيق كابتن!' }
          : { title: '🌙 انتهت الوردية', description: 'عهدتك تُورّد للمقر — نراك قريباً' },
      )
    } catch (e) {
      const err = e as ApiError
      toast({ variant: 'destructive', title: err.message || 'تعذر تبديل الوردية' })
    } finally {
      setShiftLoading(false)
    }
  }

  const acceptOffer = async () => {
    if (!radarOffer || accepting) return
    setAccepting(true)
    try {
      const res = await apiPost<{ order: OrderDTO }>(`/api/orders/${radarOffer.orderId}/accept-offer`, {
        driver_id: driverId,
      })
      setRadarOffer(null)
      toast({ title: '✅ فزت بالعرض', description: `الطلب ${res.order.orderNumber} — انطلق للمتجر` })
      await refreshCore()
      setView('delivery')
    } catch (e) {
      const err = e as ApiError
      setRadarOffer(null)
      toast({ variant: 'destructive', title: err.message || 'تعذر قبول العرض' })
    } finally {
      setAccepting(false)
    }
  }

  const declineCurrentOffer = () => {
    if (!radarOffer) return
    declineOfferAction(radarOffer.orderId)
    setRadarOffer(null)
  }

  const handleOrderUpdated = useCallback(
    (o: OrderDTO) => {
      setActiveOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))
      refreshCore()
    },
    [refreshCore],
  )

  const handleDelivered = useCallback(
    (_o: OrderDTO) => {
      setCelebration(_o)
      refreshCore()
    },
    [refreshCore],
  )

  const finishCelebration = useCallback(() => {
    setCelebration(null)
    setView('home')
    refreshCore()
  }, [refreshCore])

  // عودة تلقائية للرئيسية بعد 2.5 ثانية من الاحتفال
  useEffect(() => {
    if (!celebration) return
    const t = setTimeout(finishCelebration, 2500)
    return () => clearTimeout(t)
  }, [celebration, finishCelebration])

  // ============ قيم العرض ============
  const custody = driver?.custodyCash ?? 0
  const overCap = custody > CUSTODY_CAP_LYD
  const custodyPct = Math.min(100, (custody / CUSTODY_CAP_LYD) * 100)
  const ui = SHIFT_UI[driver?.status ?? 'offline']
  const currentDriver = drivers.find((d) => d.id === driverId)

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== الرأس ===== */}
      <header className="sticky top-0 z-40 border-b border-[rgba(212,175,55,0.15)] bg-[#041710]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.4)] bg-[#0A3324] text-2xl gold-glow">
              🛵
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold leading-tight gold-text">تطبيق الكابتن</h1>
              <p className="font-money text-[10px] uppercase tracking-[0.2em] text-[#938E7E]">Wasel Captain</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger
                size="sm"
                aria-label="اختيار الكابتن"
                className="h-11 w-auto max-w-[46vw] gap-2 rounded-xl border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-xs font-bold text-[#F8F5EE]"
              >
                <SelectValue placeholder="اختر الكابتن" />
              </SelectTrigger>
              <SelectContent className="border-[rgba(212,175,55,0.3)] bg-[#062319]">
                {drivers.map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                    className="rounded-lg text-xs font-bold text-[#F8F5EE] focus:bg-[#124532]"
                  >
                    {`${d.fullName} • ${d.vehicleType} ${d.plateNumber}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={onExit}
              aria-label="خروج من تطبيق الكابتن"
              className="h-11 w-11 shrink-0 rounded-xl border-[rgba(212,175,55,0.35)] bg-transparent text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-5">
        {/* الشاشة الاحتفالية بعد التسليم الناجح */}
        {celebration ? (
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="rounded-3xl border border-[rgba(16,185,129,0.45)] bg-gradient-to-b from-[#0A3324] to-[#041710] p-8 text-center gold-glow"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
              className="text-7xl"
            >
              🎉
            </motion.div>
            <h2 className="mt-3 text-3xl font-black text-[#F8F5EE]">اكتملت الرحلة</h2>
            <p className="mt-1 text-sm text-[#938E7E]">
              الطلب <OrderNo no={celebration.orderNumber} className="text-[#F5D061]" /> سُلّم بنجاح
            </p>
            <div className="mx-auto mt-5 grid max-w-sm gap-2">
              <div className="flex items-center justify-between rounded-2xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.07)] px-4 py-3">
                <span className="text-sm font-bold text-[#F8F5EE]">أجرة مستحقة لك</span>
                <Ly amount={celebration.deliveryFeeLyd} bold className="text-xl text-[#10B981]" />
              </div>
              {celebration.paymentMethod === 'cash' && (
                <div className="flex items-center justify-between rounded-2xl border border-[rgba(245,208,97,0.4)] bg-[rgba(245,208,97,0.07)] px-4 py-3">
                  <span className="text-sm font-bold text-[#F8F5EE]">💵 الكاش المُحصّل (عهدة)</span>
                  <Ly amount={celebration.totalLyd} bold className="text-xl text-[#F5D061]" />
                </div>
              )}
            </div>
            <Button
              onClick={finishCelebration}
              className="mt-6 h-14 rounded-2xl bg-[#10B981] px-10 text-base font-black text-[#041710] hover:bg-[#0DB27A]"
            >
              العودة للرئيسية
            </Button>
            <p className="mt-3 text-[11px] text-[#938E7E]">عودة تلقائية بعد لحظات…</p>
          </motion.div>
        ) : view === 'delivery' && activeOrder ? (
          <ActiveDeliveryFlow
            order={activeOrder}
            stage={stage}
            driverId={driverId}
            driverPhone={driver?.phone ?? currentDriver?.phone ?? ''}
            captainPos={captainPos}
            onArrivedStore={() => setArrived((a) => ({ ...a, store: true }))}
            onArrivedCustomer={() => setArrived((a) => ({ ...a, customer: true }))}
            onOrderUpdated={handleOrderUpdated}
            onDelivered={handleDelivered}
            onBackHome={() => setView('home')}
          />
        ) : (
          <>
            {/* بطاقة الوردية الضخمة */}
            <WaselCard className="mb-4">
              <div className="flex items-center gap-5">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={toggleShift}
                  disabled={shiftLoading}
                  aria-pressed={driver?.status !== 'offline'}
                  aria-label="تشغيل أو إيقاف الوردية"
                  className={`relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 text-4xl transition disabled:opacity-70 ${ui.ring}`}
                >
                  {driver?.status === 'online' && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(16,185,129,0.25)]" />
                  )}
                  <span className="relative">{driver?.status === 'offline' ? '⏻' : driver?.status === 'online' ? '🟢' : '🛵'}</span>
                </motion.button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-[#F8F5EE]">تشغيل الوردية</h2>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-extrabold" style={{ color: ui.dot }}>
                    <PulseDot color={ui.dot} pulsing={driver?.status !== 'offline'} />
                    {ui.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#938E7E]">{ui.sub}</p>
                  {currentDriver && (
                    <p className="font-money ltr-nums mt-1.5 inline-block rounded-lg bg-[#0A3324] px-2.5 py-1 text-[11px] font-bold text-[#F5D061]">
                      {currentDriver.vehicleType} • {currentDriver.plateNumber}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={toggleShift}
                disabled={shiftLoading || !driver}
                className={`mt-4 h-14 w-full rounded-2xl text-base font-black transition disabled:opacity-60 ${ui.btnBg} ${
                  driver?.status === 'offline'
                    ? 'hover:bg-[#124532] hover:text-[#F8F5EE]'
                    : 'hover:brightness-110'
                }`}
              >
                {shiftLoading
                  ? 'جارٍ التبديل…'
                  : driver?.status === 'offline'
                    ? '🟢 ابدأ الوردية — أنا جاهز'
                    : driver?.status === 'online'
                      ? '🌙 إنهاء الوردية'
                      : '🔒 في مهمة — لا يمكن الإنهاء'}
              </Button>
            </WaselCard>

            {/* بطاقة الكاش بحوزتك (العهدة النقدية) */}
            <WaselCard
              className="mb-4"
              style={
                overCap
                  ? { borderColor: 'rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.05)' }
                  : { borderColor: 'rgba(16,185,129,0.3)' }
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[#938E7E]">💰 الكاش بحوزتك — عهدة نقدية</p>
                  <Ly
                    amount={custody}
                    bold
                    className={`mt-1 block text-4xl ${overCap ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}
                  />
                  <p className="font-money ltr-nums mt-1 text-[11px] text-[#938E7E]">
                    السقف المسموح قبل الإيداع: {CUSTODY_CAP_LYD} د.ل
                  </p>
                </div>
                <div className={`text-4xl ${overCap ? 'animate-bounce' : ''}`}>{overCap ? '⚠️' : '🧾'}</div>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#041710]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${custodyPct}%`, background: overCap ? '#F59E0B' : '#10B981' }}
                />
              </div>
              {overCap ? (
                <div className="ring-alert mt-3 rounded-xl border border-[rgba(245,158,11,0.6)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-center">
                  <p className="text-sm font-black text-[#F59E0B]">
                    تجاوزت السقف — أودع النقد في المقر فوراً
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-center text-[11px] font-bold text-[#10B981]">
                  العهدة ضمن الحدود — تُورّد للمقر عبر التسوية اليومية
                </p>
              )}
            </WaselCard>

            {/* صف المؤشرات */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              <StatTile
                emoji="🏅"
                label="أرباح الأجور"
                tone="gold"
                value={<Ly amount={driver?.earningsTotal ?? 0} suffix=" د.ل" />}
              />
              <StatTile emoji="🛵" label="رحلات مكتملة" tone="ivory" value={driver?.tripsCompleted ?? 0} />
              <StatTile
                emoji="⭐"
                label="تقييم الكباتن"
                tone="emerald"
                value={(driver?.rating ?? 0).toFixed(1)}
              />
              <StatTile emoji="📦" label="طلبات نشطة" tone="orange" value={driver?.activeOrdersCount ?? 0} />
            </div>

            {/* بطاقة الطلب النشط أو حالة الانتظار */}
            {activeOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-[rgba(212,175,55,0.4)] bg-gradient-to-b from-[#0A3324] to-[#062319] p-5 gold-glow"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.3)] bg-[#041710] text-2xl">
                    {activeOrder.storeEmoji || '🏪'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#F8F5EE]">{activeOrder.storeName}</p>
                    <p className="text-[11px] text-[#938E7E]">
                      طلب <OrderNo no={activeOrder.orderNumber} className="text-[#F5D061]" /> •{' '}
                      {activeOrder.district}
                    </p>
                  </div>
                  <StatusBadge status={activeOrder.status} size="sm" />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#041710]/70 px-3 py-2">
                  <span className="text-xs font-bold text-[#938E7E]">أجرة التوصيل المستحقة</span>
                  <Ly amount={activeOrder.deliveryFeeLyd} bold className="text-[#F5D061]" />
                </div>
                <Button
                  onClick={() => setView('delivery')}
                  className="mt-3 h-14 w-full rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-black text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.3)] hover:brightness-110"
                >
                  متابعة التوصيل →
                </Button>
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[rgba(212,175,55,0.3)] bg-[#062319]/60 p-6 text-center">
                {onDuty ? (
                  <>
                    <div className="shimmer mx-auto mb-3 h-12 w-12 rounded-full border border-[rgba(212,175,55,0.35)]" />
                    <p className="text-sm font-extrabold text-[#F8F5EE]">📡 بانتظار عروض الرادار…</p>
                    <p className="mt-1 text-xs text-[#938E7E]">
                      أول طلب يُطلق قرب موقعك سيظهر فوراً بعداد 15 ثانية
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-4xl">😴</div>
                    <p className="text-sm font-extrabold text-[#F8F5EE]">لا توجد مهمة حالياً</p>
                    <p className="mt-1 text-xs text-[#938E7E]">شغّل الوردية ليبدأ رادار واصل ببث العروض إليك</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== التذييل اللاصق ===== */}
      <footer className="mt-auto border-t border-[rgba(212,175,55,0.15)] bg-[#041710]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <p className="mx-auto max-w-3xl px-4 py-3.5 text-center text-xs font-bold text-[#938E7E]">
          🛵 <span className="text-[#F5D061]">كباتن واصل</span> — كامل أجرة التوصيل لك • العهدة تُورّد للمقر
        </p>
      </footer>

      {/* نافذة رادار العروض (فوق كل شيء) */}
      <OrderRadarDialog
        offer={radarOffer}
        secondsLeft={radarLeft}
        accepting={accepting}
        onAccept={acceptOffer}
        onDecline={declineCurrentOffer}
      />
    </div>
  )
}
