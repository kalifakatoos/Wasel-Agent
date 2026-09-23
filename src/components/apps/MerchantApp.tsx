'use client'

// ============================================================
// 👨‍🍳 شريك واصل — شاشة المطبخ KDS (Merchant App View)
// Tabs: شاشة المطبخ KDS | المخزون | التقارير
// بث لحظي عبر store:{id} + استقصاء احتياطي كل 4 ثوانٍ
// دينار ليبي حصرياً عبر <Ly/> — بلا ألوان زرقاء
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Printer, RefreshCw, Search, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { Ly, OrderNo } from '@/components/wasel/Badges'
import { LEDGER_RATES, STATUS_LABELS } from '@/lib/wasel/constants'
import { apiGet, apiPost } from '@/lib/wasel/api'
import { getSocket, joinRooms, leaveRooms } from '@/lib/wasel/socket'
import { useWasel } from '@/lib/wasel/store'
import type { OrderDTO, OrderItem, OrderStatus, ProductDTO, StoreDTO } from '@/lib/wasel/types'
import { ThermalReceiptDialog } from './merchant-receipt'

// ---------- أنواع حمولات البث ----------
interface NewOrderPayload {
  orderId: string
  orderNumber: string
  customerName: string
  district: string
  items: OrderItem[]
  totalLyd: number
  paymentMethod: 'cash' | 'wallet'
  notes?: string
}
interface StatusChangedPayload {
  orderId: string
  status: OrderStatus | string
  orderNumber?: string
}
interface AssignedPayload {
  orderId: string
  driverName: string
  plateNumber: string
}
interface ProductAvailPayload {
  storeId?: string
  productId: string
  title?: string
  isAvailable: boolean
  stockQuantity?: number
}
interface PayoutPayload {
  amount: number
  voucherNumber: string
}
interface PromoAppliedPayload {
  orderNumber: string
  storeId?: string
  customerName?: string
  promoCode: string
  promoLabel?: string
  discountLyd: number
}

const PREP_OPTIONS = [
  { minutes: 15, emoji: '⏱️', label: 'سريع', hint: 'المطبخ فاضي والطلب خفيف' },
  { minutes: 25, emoji: '🔥', label: 'عادي', hint: 'الضغط المعتاد في المطبخ' },
  { minutes: 35, emoji: '🌋', label: 'مزدحم', hint: 'طلبات كثيرة — خذ وقتك' },
] as const

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'تعذر الاتصال بالخادم'
}

/** 🔔 نغمة طلب جديد — WebAudio oscillator بسيط (دينغ دينغ) */
function playNewOrderBeep() {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctx = w.AudioContext || w.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes: Array<{ at: number; freq: number }> = [
      { at: 0, freq: 987.77 },
      { at: 0.22, freq: 1318.51 },
    ]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.freq
      gain.gain.setValueAtTime(0.0001, now + n.at)
      gain.gain.exponentialRampToValueAtTime(0.22, now + n.at + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + 0.19)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + n.at)
      osc.stop(now + n.at + 0.21)
    }
    window.setTimeout(() => {
      void ctx.close().catch(() => undefined)
    }, 900)
  } catch {
    /* الصوت اختياري — تجاهل أي فشل */
  }
}

// ---------- شرائح صغيرة ----------
function PayChip({ method, onWhite = false }: { method: 'cash' | 'wallet'; onWhite?: boolean }) {
  if (method === 'wallet') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
          onWhite ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] text-[#34d399]'
        }`}
      >
        👛 مدفوع مسبقاً (محفظة)
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        onWhite ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.12)] text-[#fbbf24]'
      }`}
    >
      💵 كاش عند الاستلام
    </span>
  )
}

function DriverLine({ name, plate }: { name: string; plate?: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-3 py-2">
      <span className="text-sm font-bold text-[#34d399]">🛵 الكابتن: {name}</span>
      {plate ? (
        <span className="rounded-lg border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] px-2 py-0.5 font-money text-xs font-bold text-[#F5D061] ltr-nums">
          {plate}
        </span>
      ) : null}
    </div>
  )
}

function Empty({ emoji, title, hint }: { emoji: string; title: string; hint: string }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(212,175,55,0.25)] p-6 text-center">
      <span className="text-4xl opacity-70">{emoji}</span>
      <p className="text-sm font-bold text-[#F8F5EE]">{title}</p>
      <p className="text-xs leading-relaxed text-[#938E7E]">{hint}</p>
    </div>
  )
}

function Column({
  emoji,
  title,
  count,
  accent,
  children,
}: {
  emoji: string
  title: string
  count: number
  accent: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-[rgba(212,175,55,0.16)] bg-[#062319]/70 p-3">
      <header className="flex items-center justify-between gap-2 rounded-2xl bg-[#041710]/70 px-3 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: accent }}>
          <span className="text-lg">{emoji}</span>
          {title}
        </h3>
        <span
          className="min-w-8 rounded-full px-2.5 py-1 text-center font-money text-xs font-bold ltr-nums"
          style={{ color: accent, background: `${accent}1f`, border: `1px solid ${accent}55` }}
        >
          {count}
        </span>
      </header>
      <div className="wasel-scroll mt-3 max-h-[62vh] min-h-[220px] space-y-3 overflow-y-auto pe-1 lg:max-h-[calc(100vh-370px)]">
        {children}
      </div>
    </section>
  )
}

function ItemsList({ items, generalNotes, onWhite = false }: { items: OrderItem[]; generalNotes?: string; onWhite?: boolean }) {
  const hasGiftCards = items.some((it) => it.productId.startsWith('giftcard-'))
  return (
    <div className="space-y-1.5">
      {hasGiftCards && (
        <p className={`rounded-xl border border-dashed px-3 py-2 text-[11px] font-bold ${onWhite ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.07)] text-[#F5D061]'}`}>
          💳 يتضمن بطاقات شحن واصل — الكود يُصدر آلياً من المنصة عند التسليم (لا يوجد بضاعة تُسلّم)
        </p>
      )}
      {items.map((it, idx) => {
        const isGiftCard = it.productId.startsWith('giftcard-')
        return (
          <div key={`${it.productId}-${idx}`}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className={onWhite ? 'font-bold text-[#292524]' : 'font-bold text-[#F8F5EE]'}>
                <span className="font-money ltr-nums text-[#D4AF37]">×{it.qty}</span> {it.title}
                {isGiftCard && (
                  <span className={`ms-1.5 inline-block rounded-full px-1.5 py-0.5 align-middle text-[8px] font-black ${onWhite ? 'bg-amber-200 text-amber-900' : 'bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-[#041710]'}`}>
                    💳 بطاقة شحن
                  </span>
                )}
              </span>
              <Ly amount={it.qty * it.unitPrice} className={`shrink-0 text-xs ${onWhite ? 'text-[#57534e]' : 'text-[#938E7E]'}`} />
            </div>
            {it.notes ? (
              <p className={`mt-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${onWhite ? 'bg-amber-100 text-amber-800' : 'bg-[rgba(245,158,11,0.1)] text-[#fbbf24]'}`}>
                ✏️ {it.notes}
              </p>
            ) : null}
          </div>
        )
      })}
      {generalNotes ? (
        <p className={`mt-2 rounded-xl px-3 py-2 text-[12px] font-semibold leading-relaxed ${onWhite ? 'bg-amber-100 text-amber-900' : 'bg-[rgba(245,158,11,0.12)] text-[#fbbf24]'}`}>
          📝 ملاحظات الزبون: {generalNotes}
        </p>
      ) : null}
    </div>
  )
}

/** عداد تنازلي مرئي من prepTimeMinutes انطلاقاً من dispatchAt */
function PrepCountdown({ order }: { order: OrderDTO }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => (v + 1) % 1000000), 1000)
    return () => window.clearInterval(t)
  }, [])

  if (!order.dispatchAt) return null
  const startMs = new Date(order.dispatchAt).getTime()
  if (Number.isNaN(startMs)) return null
  const totalSec = Math.max(1, order.prepTimeMinutes * 60)
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
  const remainSec = totalSec - elapsedSec
  const late = remainSec < 0
  const progress = Math.min(100, (elapsedSec / totalSec) * 100)
  const mm = Math.floor(Math.abs(remainSec) / 60)
  const ss = Math.abs(remainSec) % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={late ? 'text-[#EF4444]' : 'text-[#F5D061]'}>
          {late ? (
            <>
              ⚠️ متأخر عن الموعد <span className="font-money ltr-nums">{pad(mm)}:{pad(ss)}</span>
            </>
          ) : (
            <>
              ⏳ متبقٍ على الجاهزية <span className="font-money ltr-nums">{pad(mm)}:{pad(ss)}</span>
            </>
          )}
        </span>
        <span className="font-money text-[#938E7E] ltr-nums">{order.prepTimeMinutes} دقيقة طهي</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[rgba(212,175,55,0.12)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${late ? 'bg-[#EF4444]' : 'bg-gradient-to-l from-[#D4AF37] to-[#F5D061]'}`}
          style={{ width: `${late ? 100 : progress}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
// التطبيق الرئيسي
// ============================================================
export default function MerchantApp({ onExit }: { onExit: () => void }) {
  const { toast } = useToast()
  const merchantStoreId = useWasel((s) => s.merchantStoreId)
  const setMerchantStoreId = useWasel((s) => s.setMerchantStoreId)

  const [stores, setStores] = useState<StoreDTO[]>([])
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [menuStore, setMenuStore] = useState<StoreDTO | null>(null)
  const [activeOrders, setActiveOrders] = useState<OrderDTO[]>([])
  const [allOrders, setAllOrders] = useState<OrderDTO[]>([])
  const [connected, setConnected] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [acceptOrder, setAcceptOrder] = useState<OrderDTO | null>(null)
  const [prepChoice, setPrepChoice] = useState<number>(25)
  const [rejectOrder, setRejectOrder] = useState<OrderDTO | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<OrderDTO | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [busyProductId, setBusyProductId] = useState<string | null>(null)
  const [plates, setPlates] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  /// 📜 سجل النشاط الحي للمتجر (أحدث أولاً — حد أقصى 8 أحداث)
  const [activity, setActivity] = useState<{ id: string; emoji: string; text: string; at: number }[]>([])
  const pushActivity = useCallback((emoji: string, text: string) => {
    setActivity((prev) =>
      [{ id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, emoji, text, at: Date.now() }, ...prev].slice(0, 8),
    )
  }, [])

  const storeId = merchantStoreId
  const storeIdRef = useRef(storeId)
  const soundRef = useRef(soundOn)
  const pollTick = useRef(0)

  useEffect(() => {
    storeIdRef.current = storeId
  }, [storeId])
  useEffect(() => {
    soundRef.current = soundOn
  }, [soundOn])

  const currentStore = useMemo(
    () => stores.find((s) => s.id === storeId) ?? menuStore ?? null,
    [stores, storeId, menuStore],
  )

  const toggleStoreOpen = useCallback(async () => {
    if (!currentStore) return
    const next = !currentStore.isOpen
    try {
      await apiPost(`/api/stores/${encodeURIComponent(currentStore.id)}/open-toggle`, { is_open: next })
      // التزامن يحدث عبر حدث socket (onStoreStatus) — نحدّث هنا احتياطاً
      setStores((prev) => prev.map((s) => (s.id === currentStore.id ? { ...s, isOpen: next } : s)))
      setMenuStore((prev) => (prev && prev.id === currentStore.id ? { ...prev, isOpen: next } : prev))
    } catch {
      toast({ title: '⚠️ تعذر تغيير حالة المتجر', duration: 3000 })
    }
  }, [currentStore, toast])

  // ---------- المُحمِّلات ----------
  const loadStores = useCallback(async () => {
    try {
      const res = await apiGet<{ stores: StoreDTO[] }>('/api/stores')
      setStores(res.stores)
    } catch {
      /* القائمة تُعاد عند التحديث اليدوي */
    }
  }, [])

  const loadMenu = useCallback(async (sid: string) => {
    try {
      const res = await apiGet<{ store: StoreDTO; products: ProductDTO[] }>(`/api/stores/${encodeURIComponent(sid)}/menu`)
      if (storeIdRef.current !== sid) return
      setProducts(res.products)
      setMenuStore(res.store)
    } catch {
      if (storeIdRef.current === sid) setProducts([])
    }
  }, [])

  const loadActive = useCallback(async (sid: string, quiet = false) => {
    try {
      const res = await apiGet<{ orders: OrderDTO[] }>(
        `/api/orders?storeId=${encodeURIComponent(sid)}&status=active&limit=50`,
      )
      if (storeIdRef.current !== sid) return
      setActiveOrders(res.orders)
      setLoadError(null)
    } catch (e) {
      if (!quiet && storeIdRef.current === sid) setLoadError(errMsg(e))
    }
  }, [])

  const loadAllOrders = useCallback(async (sid: string, quiet = false) => {
    try {
      const res = await apiGet<{ orders: OrderDTO[] }>(
        `/api/orders?storeId=${encodeURIComponent(sid)}&status=all&limit=50`,
      )
      if (storeIdRef.current !== sid) return
      setAllOrders(res.orders)
    } catch (e) {
      if (!quiet && storeIdRef.current === sid) setLoadError(errMsg(e))
    }
  }, [])

  // قائمة المتاجر مرة واحدة
  useEffect(() => {
    void loadStores()
  }, [loadStores])

  // تحميل البيانات + الاستقصاء الاحتياطي كل 4 ثوانٍ
  useEffect(() => {
    if (!storeId) return
    setInitialLoading(true)
    void (async () => {
      await Promise.all([loadMenu(storeId), loadActive(storeId), loadAllOrders(storeId)])
      if (storeIdRef.current === storeId) setInitialLoading(false)
    })()
    const t = window.setInterval(() => {
      void loadActive(storeId, true)
      pollTick.current += 1
      if (pollTick.current % 3 === 0) void loadAllOrders(storeId, true)
    }, 4000)
    return () => window.clearInterval(t)
  }, [storeId, loadMenu, loadActive, loadAllOrders])

  // ---------- البث اللحظي: غرفة store:{id} ----------
  useEffect(() => {
    if (!storeId) return
    const socket = getSocket()
    const join = () => joinRooms([`store:${storeId}`])

    const onConnect = () => {
      setConnected(true)
      join()
    }
    const onDisconnect = () => setConnected(false)
    const onNewOrder = (p: NewOrderPayload) => {
      if (soundRef.current) playNewOrderBeep()
      pushActivity('🔔', `طلب جديد ${p.orderNumber} من ${p.customerName}`)
      toast({
        title: '🔔 طلب جديد وصل!',
        description: `${p.orderNumber} — ${p.customerName} • ${p.district}`,
        duration: 8000,
      })
      void loadActive(storeId, true)
    }
    const onStatusChanged = (p: StatusChangedPayload) => {
      if (p.status === 'out_for_delivery') {
        pushActivity('🛵', `${p.orderNumber ?? 'الطلب'} انطلق مع الكابتن للتسليم`)
        toast({
          title: '🛵 انطلق الطلب للتسليم',
          description: `${p.orderNumber ?? ''} خرج مع الكابتن — بالتوفيق!`,
          duration: 6000,
        })
      } else if (p.status === 'disputed') {
        pushActivity('⚖️', `فُضّ نزاع ${p.orderNumber ?? 'طلب'} — تعذر التسليم`)
      } else if (p.status === 'cancelled') {
        pushActivity('🚫', `أُلغي الطلب ${p.orderNumber ?? ''}`)
      }
      void loadActive(storeId, true)
      void loadAllOrders(storeId, true)
    }
    const onAssigned = (p: AssignedPayload) => {
      setPlates((prev) => ({ ...prev, [p.orderId]: p.plateNumber }))
      pushActivity('🧑‍✈️', `كابتن ${p.driverName} يتكفل بالطلب — ${p.plateNumber}`)
      toast({
        title: '🛵 عُيِّن كابتن للطلب',
        description: `${p.driverName} — لوحة ${p.plateNumber}`,
        duration: 6000,
      })
    }
    const onProductAvail = (p: ProductAvailPayload) => {
      setProducts((prev) =>
        prev.map((x) =>
          x.id === p.productId
            ? { ...x, isAvailable: p.isAvailable, stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : x.stockQuantity }
            : x,
        ),
      )
    }
    const onPayout = (p: PayoutPayload) => {
      pushActivity('💰', `صُرفت مستحقاتكم ${p.amount.toFixed(2)} د.ل — سند ${p.voucherNumber}`)
      toast({
        title: '💰 صُرفت مستحقاتكم',
        description: `${p.amount.toFixed(2)} د.ل — سند رقم ${p.voucherNumber}`,
        duration: 9000,
      })
    }
    const onPromoApplied = (p: PromoAppliedPayload) => {
      pushActivity('🎟️', `كوبون ${p.promoLabel ?? p.promoCode} على طلب ${p.orderNumber} — واصل يتحمّل الخصم ${(p.discountLyd ?? 0).toFixed(2)} د.ل`)
      toast({
        title: '🎟️ كوبون خصم على طلب جديد',
        description: `${p.orderNumber} — الخصم على حساب واصل، حصتكم 90% كاملة`,
        duration: 6000,
      })
    }
    const onGiftCardSold = (p: { orderNumber: string; codesCount: number; totalValueLyd: number }) => {
      pushActivity('🎁', `بعتوا ${p.codesCount} بطاقة شحن واصل بقيمة ${p.totalValueLyd.toFixed(2)} د.ل — طلب ${p.orderNumber}`)
      toast({
        title: '🎁 بيع بطاقات شحن واصل',
        description: `${p.codesCount} بطاقة بقيمة ${p.totalValueLyd.toFixed(2)} د.ل — الأكواد أُصدرت للزبون فور التسليم`,
        duration: 7000,
      })
    }
    const onStoreStatus = (p: { storeId: string; isOpen: boolean; storeName: string }) => {
      if (p.storeId !== storeIdRef.current) return
      setStores((prev) => prev.map((s) => (s.id === p.storeId ? { ...s, isOpen: p.isOpen } : s)))
      setMenuStore((prev) => (prev && prev.id === p.storeId ? { ...prev, isOpen: p.isOpen } : prev))
      pushActivity(p.isOpen ? '🟢' : '🔴', p.isOpen ? 'أُعيد فتح المتجر لاستقبال الطلبات' : 'أُغلق المتجر مؤقتاً')
      toast({
        title: p.isOpen ? '🟢 المتجر مفتوح لاستقبال الطلبات' : '🔴 تم إغلاق المتجر مؤقتاً',
        description: p.isOpen ? 'ستصلكم الطلبات الجديدة فوراً' : 'لن تقبل أي طلبات جديدة حتى إعادة الفتح',
        duration: 5000,
      })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('store:new_order', onNewOrder)
    socket.on('order:status_changed', onStatusChanged)
    socket.on('order:assigned', onAssigned)
    socket.on('store:product_availability', onProductAvail)
    socket.on('store:payout_settled', onPayout)
    socket.on('store:promo_applied', onPromoApplied)
    socket.on('store:giftcard_sold', onGiftCardSold)
    socket.on('store:status_changed', onStoreStatus)
    if (socket.connected) {
      setConnected(true)
      join()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('store:new_order', onNewOrder)
      socket.off('order:status_changed', onStatusChanged)
      socket.off('order:assigned', onAssigned)
      socket.off('store:product_availability', onProductAvail)
      socket.off('store:payout_settled', onPayout)
      socket.off('store:promo_applied', onPromoApplied)
      socket.off('store:giftcard_sold', onGiftCardSold)
      socket.off('store:status_changed', onStoreStatus)
      leaveRooms([`store:${storeId}`])
    }
  }, [storeId, loadActive, loadAllOrders, toast, pushActivity])

  // ---------- الأعمدة المشتقة ----------
  const newOrders = useMemo(() => activeOrders.filter((o) => o.status === 'placed'), [activeOrders])
  const preparingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'accepted' || o.status === 'preparing'),
    [activeOrders],
  )
  const readyOrders = useMemo(() => activeOrders.filter((o) => o.status === 'ready_for_pickup'), [activeOrders])

  // ---------- الإجراءات ----------
  const openAcceptDialog = (o: OrderDTO) => {
    const base = currentStore?.prepMinutes ?? 25
    const closest = PREP_OPTIONS.reduce((a, b) => (Math.abs(b.minutes - base) < Math.abs(a.minutes - base) ? b : a))
    setPrepChoice(closest.minutes)
    setAcceptOrder(o)
  }

  async function doAccept() {
    if (!acceptOrder) return
    setBusyOrderId(acceptOrder.id)
    try {
      const res = await apiPost<{ order: OrderDTO; radarOffersSent: number }>(
        `/api/orders/${encodeURIComponent(acceptOrder.id)}/status`,
        { action: 'accept', prep_minutes: prepChoice },
      )
      toast({
        title: '🔥 بدأ التحضير',
        description: `أُشعل رادار الكباتن (${Number(res.radarOffersSent ?? 0)} عرض) — زمن الطهي ${prepChoice} دقيقة`,
        duration: 7000,
      })
      pushActivity('🔥', `قبلتم الطلب ${acceptOrder.orderNumber} — طهي ${prepChoice} دقيقة`)
      setAcceptOrder(null)
      await loadActive(storeId)
    } catch (e) {
      toast({ title: 'تعذر قبول الطلب', description: errMsg(e), variant: 'destructive' })
    } finally {
      setBusyOrderId(null)
    }
  }

  async function doReject() {
    if (!rejectOrder) return
    setBusyOrderId(rejectOrder.id)
    try {
      await apiPost<{ order: OrderDTO }>(`/api/orders/${encodeURIComponent(rejectOrder.id)}/status`, { action: 'reject' })
      toast({ title: 'تم رفض الطلب', description: `${rejectOrder.orderNumber} أُلغي وأُبلغ الزبون`, variant: 'destructive' })
      pushActivity('🚫', `رفضتم الطلب ${rejectOrder.orderNumber}`)
      setRejectOrder(null)
      await loadActive(storeId)
    } catch (e) {
      toast({ title: 'تعذر رفض الطلب', description: errMsg(e), variant: 'destructive' })
    } finally {
      setBusyOrderId(null)
    }
  }

  async function markReady(o: OrderDTO) {
    setBusyOrderId(o.id)
    try {
      await apiPost<{ order: OrderDTO }>(`/api/orders/${encodeURIComponent(o.id)}/status`, { action: 'ready' })
      toast({
        title: '✅ الوجبة جاهزة للاستلام',
        description: `${o.orderNumber} — فُتح قفل الكابتن، بانتظار الاستلام`,
        duration: 6000,
      })
      pushActivity('✅', `الطلب ${o.orderNumber} جاهز — فُتح قفل الاستلام`)
      await loadActive(storeId)
    } catch (e) {
      toast({ title: 'تعذر تحديث الحالة', description: errMsg(e), variant: 'destructive' })
    } finally {
      setBusyOrderId(null)
    }
  }

  async function toggleAvailability(p: ProductDTO, next: boolean) {
    setBusyProductId(p.id)
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: next } : x)))
    try {
      await apiPost<{ product: ProductDTO }>(
        `/api/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(p.id)}/availability`,
        { is_available: next },
      )
      toast({
        title: next ? `✅ «${p.title}» متاح الآن` : `⛔ أوقفت «${p.title}»`,
        description: next ? 'ظهر للزبائن فوراً في القائمة' : 'اختفى من قائمة الزبائن لحظياً',
        duration: 4000,
      })
    } catch (e) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: !next } : x)))
      toast({ title: 'تعذر تحديث التوفر', description: errMsg(e), variant: 'destructive' })
    } finally {
      setBusyProductId(null)
    }
  }

  function manualRefresh() {
    if (!storeId) return
    void loadStores()
    void loadMenu(storeId)
    void loadActive(storeId)
    void loadAllOrders(storeId)
    toast({ title: '🔄 تحديث يدوي', description: 'جارٍ مزامنة كل البيانات…', duration: 2500 })
  }

  // ---------- تقرير اليوم ----------
  const report = useMemo(() => {
    const now = new Date()
    const isToday = (iso: string | null) => {
      if (!iso) return false
      const d = new Date(iso)
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
      )
    }
    const deliveredToday = allOrders.filter((o) => o.status === 'delivered' && isToday(o.deliveredAt ?? o.createdAt))
    const sales = deliveredToday.reduce((s, o) => s + o.subtotalLyd, 0)
    const net = sales * LEDGER_RATES.merchantShare
    const commission = sales * LEDGER_RATES.platformShare
    const avg = deliveredToday.length > 0 ? sales / deliveredToday.length : 0
    const map = new Map<string, { title: string; qty: number }>()
    for (const o of deliveredToday) {
      for (const it of o.items) {
        const e = map.get(it.productId) ?? { title: it.title, qty: 0 }
        e.qty += it.qty
        map.set(it.productId, e)
      }
    }
    const top = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 3)
    return { deliveredToday, sales, net, commission, avg, top }
  }, [allOrders])

  const filteredProducts = useMemo(() => {
    const q = search.trim()
    if (!q) return products
    return products.filter((p) => p.title.includes(q) || p.category.includes(q) || p.description.includes(q))
  }, [products, search])

  // ============================================================
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />

      {/* ============ الرأس ============ */}
      <header className="sticky top-0 z-40 border-b border-[rgba(212,175,55,0.2)] bg-[#041710]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.4)] bg-[#0A3324] text-2xl gold-glow">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight gold-text">شريك واصل — شاشة المطبخ</h1>
              <p className="font-money text-[10px] uppercase tracking-[0.22em] text-[#938E7E]">KDS • MERCHANT CONSOLE</p>
            </div>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {/* اختيار المتجر — عزل multi-tenant */}
            <Select value={storeId} onValueChange={(v) => setMerchantStoreId(v)}>
              <SelectTrigger
                className="h-12 w-[230px] border-[rgba(212,175,55,0.35)] bg-[#062319] text-sm font-bold text-[#F8F5EE]"
                aria-label="اختيار المتجر"
              >
                <SelectValue placeholder="اختر المتجر…" />
              </SelectTrigger>
              <SelectContent className="border-[rgba(212,175,55,0.35)] bg-[#062319]">
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="h-12 text-sm font-bold">
                    {s.emoji} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 🔓 مفتاح فتح/إغلاق المتجر — يمنع الطلبات الجديدة فوراً */}
            {currentStore && (
              <button
                type="button"
                onClick={toggleStoreOpen}
                aria-pressed={currentStore.isOpen}
                className={`flex h-12 items-center gap-2.5 rounded-xl border px-4 transition-all ${
                  currentStore.isOpen
                    ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.1)]'
                    : 'border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.1)]'
                }`}
                title={currentStore.isOpen ? 'اضغط للإغلاق المؤقت' : 'اضغط لإعادة الفتح'}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${currentStore.isOpen ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                <span
                  className={`text-xs font-extrabold ${
                    currentStore.isOpen ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}
                >
                  {currentStore.isOpen ? 'مفتوح' : 'مغلق'}
                </span>
                <span
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    currentStore.isOpen ? 'bg-[#10B981]/70' : 'bg-[#EF4444]/60'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      currentStore.isOpen ? 'right-0.5' : 'right-[22px]'
                    }`}
                  />
                </span>
              </button>
            )}

            {/* مؤشر البث */}
            <div
              className={`flex h-12 items-center gap-2 rounded-xl border px-3 ${
                connected
                  ? 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.08)]'
                  : 'border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.07)]'
              }`}
              title={connected ? 'متصل بمحرك البث اللحظي' : 'انقطع البث — يعمل النظام بالاستقصاء الاحتياطي'}
            >
              {connected ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                </span>
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              )}
              <span className={`text-xs font-bold ${connected ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {connected ? 'متصل بالبث' : 'انقطع البث'}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundOn((v) => !v)}
              className="h-12 w-12 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
              aria-label={soundOn ? 'كتم صوت التنبيهات' : 'تشغيل صوت التنبيهات'}
              title={soundOn ? 'الصوت مفعّل' : 'الصوت مكتوم'}
            >
              {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={manualRefresh}
              className="h-12 w-12 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
              aria-label="تحديث يدوي"
              title="تحديث يدوي"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              onClick={onExit}
              className="h-12 border-[rgba(239,68,68,0.4)] bg-transparent px-4 font-bold text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
            >
              <LogOut className="ms-1 h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* شريط حالة التحميل/الخطأ */}
      {(initialLoading || loadError) && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-3">
          {loadError ? (
            <div className="rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs font-bold text-[#EF4444]">
              ⚠️ فشل جلب البيانات: {loadError} — يعاد المحاولة تلقائياً كل 4 ثوانٍ
            </div>
          ) : (
            <div className="shimmer h-2 rounded-full" />
          )}
        </div>
      )}

      {/* ============ المحتوى ============ */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-4">
        <Tabs defaultValue="kds">
          <TabsList className="h-14 grid w-full grid-cols-3 gap-1 rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-1.5">
            <TabsTrigger
              value="kds"
              className="h-11 rounded-xl text-xs font-extrabold text-[#938E7E] data-[state=active]:bg-gradient-to-l data-[state=active]:from-[#D4AF37] data-[state=active]:to-[#F5D061] data-[state=active]:text-[#041710] sm:text-sm"
            >
              🔥 شاشة المطبخ KDS
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="h-11 rounded-xl text-xs font-extrabold text-[#938E7E] data-[state=active]:bg-[#0A3324] data-[state=active]:text-[#F5D061] sm:text-sm"
            >
              📦 المخزون
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="h-11 rounded-xl text-xs font-extrabold text-[#938E7E] data-[state=active]:bg-[#0A3324] data-[state=active]:text-[#F5D061] sm:text-sm"
            >
              📊 التقارير
            </TabsTrigger>
          </TabsList>

          {/* ================= تاب المطبخ KDS ================= */}
          <TabsContent value="kds" className="mt-4">
            {currentStore && (
              <p className="mb-3 text-xs text-[#938E7E]">
                عرض طلبات <span className="font-bold text-[#F5D061]">{currentStore.emoji} {currentStore.name}</span> فقط — عزل كامل لكل متجر شريك
              </p>
            )}

            {/* 📜 شريط سجل النشاط الحي */}
            <AnimatePresence initial={false}>
              {activity.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="wasel-scroll flex items-center gap-2 overflow-x-auto rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] px-3 py-2.5">
                    <span className="shrink-0 rounded-lg bg-[rgba(212,175,55,0.12)] px-2 py-1 text-[10px] font-black text-[#F5D061]">
                      📜 آخر الأحداث
                    </span>
                    {activity.map((a) => (
                      <span
                        key={a.id}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.15)] bg-[#041710] px-3 py-1.5 text-[11px] font-semibold text-[#F8F5EE]"
                      >
                        <span>{a.emoji}</span>
                        {a.text}
                        <span className="ltr-nums font-money text-[9px] text-[#938E7E]">
                          {new Date(a.at).toLocaleTimeString('ar-LY-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* ---- عمود طلبات جديدة ---- */}
              <Column emoji="🔔" title="طلبات جديدة" count={newOrders.length} accent="#F5D061">
                {initialLoading && newOrders.length === 0 ? (
                  <div className="shimmer h-48 rounded-2xl" />
                ) : newOrders.length === 0 ? (
                  <Empty emoji="☀️" title="لا طلبات جديدة الآن" hint="ستصل الطلبات هنا برنين فوري عبر البث اللحظي" />
                ) : (
                  <AnimatePresence initial={false}>
                    {newOrders.map((o) => (
                      <motion.article
                        key={o.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="ring-alert rounded-2xl border-2 border-[rgba(212,175,55,0.6)] bg-[#FFFDF6] p-4 text-[#292524] shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold text-[#a16207]">طلب جديد من زبون</p>
                            <OrderNo no={o.orderNumber} className="text-lg font-bold text-[#1c1917]" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(o)}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.4)] bg-white text-[#a16207] transition hover:bg-amber-100"
                            aria-label={`طباعة فاتورة ${o.orderNumber}`}
                            title="فاتورة حرارية 80mm"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#57534e]">
                          <span>👤 {o.customerName}</span>
                          <span className="text-[#a8a29e]">•</span>
                          <span>📍 {o.district}</span>
                        </div>

                        <div className="mt-2">
                          <PayChip method={o.paymentMethod} onWhite />
                        </div>

                        <div className="mt-3 rounded-xl bg-[#faf7ec] p-3">
                          <ItemsList items={o.items} generalNotes={o.notes || undefined} onWhite />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#e7dbc0] pt-2">
                          <span className="text-xs font-bold text-[#57534e]">إجمالي الطلب</span>
                          <Ly amount={o.totalLyd} className="text-lg text-[#1c1917]" bold />
                        </div>

                        <div className="mt-3 flex items-stretch gap-2">
                          <Button
                            onClick={() => openAcceptDialog(o)}
                            disabled={busyOrderId === o.id}
                            className="h-12 flex-1 bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710] shadow-md hover:opacity-90"
                          >
                            ✔️ قبول وبدء التحضير
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setRejectOrder(o)}
                            disabled={busyOrderId === o.id}
                            className="h-12 w-14 shrink-0 border-[rgba(239,68,68,0.5)] bg-white text-[#EF4444] hover:bg-red-50"
                            aria-label={`رفض الطلب ${o.orderNumber}`}
                            title="رفض الطلب"
                          >
                            ✕
                          </Button>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                )}
              </Column>

              {/* ---- عمود قيد التحضير ---- */}
              <Column emoji="🔥" title="قيد التحضير" count={preparingOrders.length} accent="#F59E0B">
                {initialLoading && preparingOrders.length === 0 ? (
                  <div className="shimmer h-48 rounded-2xl" />
                ) : preparingOrders.length === 0 ? (
                  <Empty emoji="🍳" title="المطبخ هادئ" hint="الطلبات المقبولة تظهر هنا مع عداد تنازلي لزمن الطهي" />
                ) : (
                  <AnimatePresence initial={false}>
                    {preparingOrders.map((o) => (
                      <motion.article
                        key={o.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        className="rounded-2xl border border-[rgba(245,158,11,0.35)] bg-[#0A3324] p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold text-[#F59E0B]">🔥 على النار — {STATUS_LABELS[o.status] ?? o.status}</p>
                            <OrderNo no={o.orderNumber} className="text-lg font-bold text-[#F8F5EE]" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(o)}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.3)] bg-[#062319] text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.1)]"
                            aria-label={`طباعة فاتورة ${o.orderNumber}`}
                            title="فاتورة حرارية 80mm"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#938E7E]">
                          <span>👤 {o.customerName}</span>
                          <span>•</span>
                          <span>📍 {o.district}</span>
                          <PayChip method={o.paymentMethod} />
                        </div>

                        <div className="mt-3 rounded-xl bg-[#062319]/80 p-3">
                          <ItemsList items={o.items} generalNotes={o.notes || undefined} />
                        </div>

                        <PrepCountdown order={o} />

                        {o.driverName ? (
                          <DriverLine name={o.driverName} plate={plates[o.id]} />
                        ) : (
                          <p className="mt-2 rounded-xl border border-dashed border-[rgba(212,175,55,0.25)] px-3 py-2 text-center text-[11px] font-bold text-[#938E7E]">
                            ⏳ الرادار يبحث عن كابتن قريب…
                          </p>
                        )}

                        <Button
                          onClick={() => void markReady(o)}
                          disabled={busyOrderId === o.id}
                          className="mt-3 h-14 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-black text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)] hover:opacity-90"
                        >
                          ✅ الوجبة جاهزة للاستلام
                        </Button>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                )}
              </Column>

              {/* ---- عمود جاهزة للاستلام ---- */}
              <Column emoji="✅" title="جاهزة للاستلام" count={readyOrders.length} accent="#10B981">
                {initialLoading && readyOrders.length === 0 ? (
                  <div className="shimmer h-48 rounded-2xl" />
                ) : readyOrders.length === 0 ? (
                  <Empty emoji="🛵" title="لا وجبات بانتظار الاستلام" hint="عند جهز الوجبة اضغط «جاهزة للاستلام» فتفك قفل الكابتن" />
                ) : (
                  <AnimatePresence initial={false}>
                    {readyOrders.map((o) => (
                      <motion.article
                        key={o.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        className="rounded-2xl border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.07)] p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold text-[#10B981]">✅ بانتظار الكابتن</p>
                            <OrderNo no={o.orderNumber} className="text-lg font-bold text-[#F8F5EE]" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(o)}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.35)] bg-[#062319] text-[#34d399] transition hover:bg-[rgba(16,185,129,0.1)]"
                            aria-label={`طباعة فاتورة ${o.orderNumber}`}
                            title="فاتورة حرارية 80mm"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#938E7E]">
                          <span>👤 {o.customerName}</span>
                          <span>•</span>
                          <span>📍 {o.district}</span>
                          <PayChip method={o.paymentMethod} />
                        </div>

                        <div className="mt-3 rounded-xl bg-[#062319]/80 p-3">
                          <ItemsList items={o.items} generalNotes={o.notes || undefined} />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-dashed border-[rgba(16,185,129,0.25)] pt-2">
                          <span className="text-xs font-bold text-[#938E7E]">الإجمالي (عهدة الكابتن إن كان كاش)</span>
                          <Ly amount={o.totalLyd} className="text-[#34d399]" bold />
                        </div>

                        {o.driverName ? (
                          <DriverLine name={o.driverName} plate={plates[o.id]} />
                        ) : (
                          <p className="shimmer mt-3 rounded-xl px-3 py-2 text-center text-[11px] font-bold text-[#F5D061]">
                            ⏳ بانتظار وصول الكابتن — الوجبة تبرد!
                          </p>
                        )}
                      </motion.article>
                    ))}
                  </AnimatePresence>
                )}
              </Column>
            </div>
          </TabsContent>

          {/* ================= تاب المخزون ================= */}
          <TabsContent value="stock" className="mt-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#938E7E]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 ابحث عن صنف بالعنوان أو التصنيف…"
                  className="h-12 border-[rgba(212,175,55,0.25)] bg-[#062319] ps-10 text-sm text-[#F8F5EE] placeholder:text-[#938E7E]/70"
                />
              </div>
              <p className="text-xs text-[#938E7E]">
                <span className="font-money font-bold text-[#F5D061] ltr-nums">{products.length}</span> صنف في قائمة{' '}
                <span className="font-bold text-[#F5D061]">{currentStore?.name ?? 'المتجر'}</span> — التغيير يظهر للزبائن لحظياً
              </p>
            </div>

            <div className="wasel-scroll max-h-[64vh] space-y-2.5 overflow-y-auto pe-1">
              {initialLoading && products.length === 0 ? (
                <>
                  <div className="shimmer h-16 rounded-2xl" />
                  <div className="shimmer h-16 rounded-2xl" />
                  <div className="shimmer h-16 rounded-2xl" />
                </>
              ) : filteredProducts.length === 0 ? (
                <Empty emoji="📦" title={search ? 'لا نتائج للبحث' : 'لا أصناف بعد'} hint={search ? 'جرّب كلمة أخرى' : 'أضف أصنافاً من لوحة المتجر أو تواصل مع الإدارة'} />
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#062319] p-3 transition hover:border-[rgba(212,175,55,0.35)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#0A3324] text-2xl">
                      {p.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-bold ${
                          p.isAvailable ? 'text-[#F8F5EE]' : 'text-[#938E7E] line-through'
                        }`}
                      >
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#938E7E]">
                        {p.category} • المخزون:{' '}
                        <span className="font-money font-bold ltr-nums">{p.stockQuantity}</span>
                      </p>
                    </div>
                    <Ly amount={p.basePriceLyd} className="shrink-0 text-sm text-[#F5D061]" bold />
                    <span className="shrink-0 rounded-xl p-1.5" title={p.isAvailable ? 'متاح — اضغط للإيقاف' : 'غير متاح — اضغط للتفعيل'}>
                      <Switch
                        checked={p.isAvailable}
                        disabled={busyProductId === p.id}
                        onCheckedChange={(v) => void toggleAvailability(p, v)}
                        className="h-7 w-12 cursor-pointer"
                        aria-label={`توفر ${p.title}`}
                      />
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ================= تاب التقارير ================= */}
          <TabsContent value="reports" className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#F8F5EE]">📊 تقرير اليوم — {currentStore?.name ?? ''}</h3>
              <p className="text-[11px] text-[#938E7E]">يُحسب من آخر 50 طلب ويتحدث مع البث لحظياً</p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-4 text-center">
                <p className="font-money text-3xl font-bold text-[#F8F5EE] ltr-nums">{report.deliveredToday.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#938E7E]">طلب مسلّم اليوم</p>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-4 text-center">
                <Ly amount={report.sales} className="text-2xl text-[#F8F5EE]" bold />
                <p className="mt-1 text-xs font-semibold text-[#938E7E]">إجمالي مبيعات الوجبات</p>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-4 text-center">
                <Ly amount={report.commission} className="text-2xl text-[#938E7E]" />
                <p className="mt-1 text-xs font-semibold text-[#938E7E]">عمولة المنصة 10% (شفافة)</p>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-4 text-center">
                <Ly amount={report.avg} className="text-2xl text-[#F8F5EE]" bold />
                <p className="mt-1 text-xs font-semibold text-[#938E7E]">متوسط قيمة الطلب</p>
              </div>

              {/* الصافي المستحق — البطاقة البطلة */}
              <div className="col-span-2 rounded-2xl border-2 border-[rgba(212,175,55,0.5)] bg-gradient-to-bl from-[#0A3324] to-[#062319] p-5 text-center gold-glow lg:col-span-4">
                <p className="text-xs font-bold tracking-wide text-[#938E7E]">💰 الصافي المستحق لكم اليوم (90% من المبيعات)</p>
                <Ly amount={report.net} className="mt-2 text-4xl text-[#F5D061] md:text-5xl" bold />
                <p className="mt-2 text-[11px] text-[#938E7E]">
                  يُصرف عبر سند صرف من الإدارة — <span className="font-bold text-[#D4AF37]">90% صافي المبيعات لك، بلا رسوم خفية</span>
                </p>
              </div>
            </div>

            {/* أكثر الأصناف مبيعاً */}
            <div className="mt-4 rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5">
              <h4 className="mb-4 text-sm font-extrabold text-[#F8F5EE]">🏆 أكثر 3 أصناف مبيعاً اليوم</h4>
              {report.top.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[rgba(212,175,55,0.25)] p-6 text-center text-xs text-[#938E7E]">
                  لا مبيعات مسلّمة اليوم بعد — تُملأ البارات تلقائياً مع أول طلب مسلّم
                </p>
              ) : (
                <div className="space-y-4">
                  {report.top.map((t, i) => {
                    const maxQty = report.top[0]?.qty || 1
                    return (
                      <div key={t.title}>
                        <div className="flex items-baseline justify-between text-xs font-bold">
                          <span className="text-[#F8F5EE]">
                            <span className="font-money text-[#D4AF37] ltr-nums">#{i + 1}</span> {t.title}
                          </span>
                          <span className="font-money text-[#F5D061] ltr-nums">{t.qty} وحدة</span>
                        </div>
                        <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-[rgba(212,175,55,0.1)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-[#C59B27] via-[#D4AF37] to-[#F5D061] transition-all duration-700"
                            style={{ width: `${Math.max(8, Math.round((t.qty / maxQty) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ============ التذييل اللاصق ============ */}
      <footer className="mt-auto border-t border-[rgba(212,175,55,0.15)] bg-[#041710]/92 py-3.5 backdrop-blur">
        <p className="text-center text-xs text-[#938E7E]">
          👨‍🍳 <b className="text-[#D4AF37]">شريك واصل</b> — 90% صافي المبيعات لك، بلا رسوم خفية
        </p>
      </footer>

      {/* ============ حوارات ============ */}
      {/* اختيار زمن الطهي */}
      <Dialog open={!!acceptOrder} onOpenChange={(o) => (!o ? setAcceptOrder(null) : undefined)}>
        <DialogContent className="w-[min(94vw,440px)] border-[rgba(212,175,55,0.35)] bg-[#062319]">
          <DialogHeader className="text-start">
            <DialogTitle className="text-base text-[#F5D061]">
              ⏱️ حدد زمن الطهي للطلب <OrderNo no={acceptOrder?.orderNumber ?? ''} />
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-[#938E7E]">
              يُبلَّغ الزبون بالموعد فوراً، ويُشعل الرادار عروضاً للكباتن القريبين لتكون جاهزة عند وصوله
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="زمن الطهي">
            {PREP_OPTIONS.map((o) => {
              const selected = prepChoice === o.minutes
              return (
                <button
                  key={o.minutes}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPrepChoice(o.minutes)}
                  className={`flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 transition ${
                    selected
                      ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.14)] shadow-[0_0_0_4px_rgba(212,175,55,0.15)]'
                      : 'border-[rgba(212,175,55,0.2)] bg-[#041710] hover:border-[rgba(212,175,55,0.5)]'
                  }`}
                >
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="font-money text-2xl font-black text-[#F8F5EE] ltr-nums">
                    {o.minutes}
                    <span className="text-xs font-bold"> دقيقة</span>
                  </span>
                  <span className="text-xs font-extrabold text-[#F5D061]">{o.label}</span>
                  <span className="text-center text-[10px] leading-tight text-[#938E7E]">{o.hint}</span>
                </button>
              )
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setAcceptOrder(null)}
              className="h-12 flex-1 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F8F5EE] hover:bg-[rgba(212,175,55,0.08)]"
            >
              رجوع
            </Button>
            <Button
              onClick={() => void doAccept()}
              disabled={busyOrderId === acceptOrder?.id}
              className="h-12 flex-[2] bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-black text-[#041710] hover:opacity-90"
            >
              🔥 تأكيد القبول وإشعال الرادار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد الرفض */}
      <AlertDialog open={!!rejectOrder} onOpenChange={(o) => (!o ? setRejectOrder(null) : undefined)}>
        <AlertDialogContent className="w-[min(94vw,420px)] border-[rgba(239,68,68,0.4)] bg-[#062319]">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-base text-[#EF4444]">
              رفض الطلب <OrderNo no={rejectOrder?.orderNumber ?? ''} />؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-[#938E7E]">
              الرفض متاح قبل بدء التحضير فقط. سيُلغى الطلب ويُبلَّغ الزبون بذلك. هل أنت متأكد من القرار؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="h-12 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F8F5EE] hover:bg-[rgba(212,175,55,0.08)]">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void doReject()}
              disabled={busyOrderId === rejectOrder?.id}
              className="h-12 bg-[#EF4444] font-bold text-white hover:bg-[#dc2626]"
            >
              نعم، ارفض الطلب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الفاتورة الحرارية */}
      <ThermalReceiptDialog
        order={receiptOrder}
        storeName={receiptOrder ? (receiptOrder.storeName || currentStore?.name || 'المتجر') : ''}
        storeEmoji={currentStore?.emoji ?? '🏪'}
        open={!!receiptOrder}
        onOpenChange={(v) => (!v ? setReceiptOrder(null) : undefined)}
      />
    </div>
  )
}
