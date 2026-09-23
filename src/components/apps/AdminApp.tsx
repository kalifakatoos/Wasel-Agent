'use client'

// ============================================================
// 🛡️ غرفة العمليات والمالية — واصل نالوت (Task 7-d)
// درع PIN → لوحة مؤشرات حية + أسطول + نزاعات + كباتن + محاسبة Z + متاجر
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Gauge,
  LogOut,
  Lock,
  Map as MapIcon,
  ScrollText,
  ShoppingCart,
  Store as StoreIcon,
  TicketPercent,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api, apiGet, apiPost, ApiError } from '@/lib/wasel/api'
import { getSocket, joinRooms, leaveRooms } from '@/lib/wasel/socket'
import { STATUS_LABELS } from '@/lib/wasel/constants'
import type { AccountingSummary, DriverDTO, OrderDTO } from '@/lib/wasel/types'
import DashboardTab from './admin-dashboard'
import FleetTab from './admin-fleet'
import OrdersTab from './admin-orders'
import CaptainsTab from './admin-captains'
import ZAccountingTab from './admin-z'
import StoresTab from './admin-stores'
import MarketingTab, { type CreatePromoInput } from './admin-marketing'
import type {
  AuditRecord,
  FeedEvent,
  FleetPos,
  PromoAdmin,
  PayoutStoreResult,
  ResolveNoShowResult,
  SettleResult,
  TopupCodeAdmin,
  VouchersPayload,
} from './admin-shared'

const POLL_MS = 8000

// ============================================================
// درع الـ PIN — منطقة مالية حساسة
// ============================================================
function PinLock({
  pin,
  onPinChange,
  checking,
  errorNonce,
  onAttempt,
  onExit,
}: {
  pin: string
  onPinChange: (v: string) => void
  checking: boolean
  errorNonce: number
  onAttempt: (code: string) => void
  onExit: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center overflow-y-auto px-4 wasel-scroll"
      style={{
        background:
          'radial-gradient(900px 500px at 50% -10%, rgba(212,175,55,0.12), transparent 60%), radial-gradient(700px 400px at 50% 110%, rgba(16,185,129,0.08), transparent 55%), #041710',
      }}
    >
      <motion.div
        key={errorNonce}
        initial={false}
        animate={errorNonce > 0 ? { x: [0, -16, 16, -12, 12, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.55 }}
        className="w-full max-w-sm rounded-3xl border border-[rgba(212,175,55,0.28)] bg-[#062319]/90 p-8 gold-glow"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(212,175,55,0.4)] bg-[#041710] text-5xl"
          >
            🛡️
          </motion.div>
          <h1 className="gold-text mt-5 text-xl font-extrabold">غرفة عمليات واصل نالوت</h1>
          <p className="mt-1 text-[13px] font-semibold text-[#F5D061]">منطقة مالية حساسة</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#938E7E]">
            الدخول حصري للمخوّلين — أدخل رمز PIN الإداري المكوّن من 4 أرقام لفتح جلسة الإشراف والمحاسبة.
          </p>

          <div className="mt-6" dir="ltr">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={onPinChange}
              onComplete={(v) => onAttempt(v)}
              disabled={checking}
            >
              <InputOTPGroup className="gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="font-money h-16 w-13 rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#041710] text-3xl font-bold text-[#F5D061] shadow-none first:rounded-xl last:rounded-xl data-[active=true]:border-[#F5D061]"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {errorNonce > 0 && (
            <p className="mt-4 text-[13px] font-bold text-[#EF4444]">⛔ رمز غير صحيح — أُمسح الرمز، حاول مجدداً</p>
          )}
          {checking && <p className="mt-4 text-[13px] font-semibold text-[#10B981]">جارٍ التحقق من الرمز…</p>}

          <Button
            type="button"
            onClick={() => onAttempt(pin)}
            disabled={pin.length !== 4 || checking}
            className="mt-6 min-h-12 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
          >
            🔓 فتح غرفة العمليات
          </Button>
        </div>
      </motion.div>

      <Button
        type="button"
        variant="ghost"
        onClick={onExit}
        className="mt-8 min-h-12 border border-[rgba(212,175,55,0.2)] text-[#938E7E] hover:bg-[#0A3324] hover:text-[#F5D061]"
      >
        <LogOut className="h-4 w-4" />
        الخروج إلى بوابة الأدوار
      </Button>

      <p className="mt-4 pb-4 text-center text-[11px] text-[#938E7E]/70">
        🛡️ كل عملية داخل الغرفة تُسجَّل وتُساءل في دفتر السندات
      </p>
    </div>
  )
}

// ============================================================
// التطبيق الرئيسي
// ============================================================
export default function AdminApp({ onExit }: { onExit: () => void }) {
  const { toast } = useToast()

  // درع الـ PIN والجلسة
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [errorNonce, setErrorNonce] = useState(0)

  // بيانات الغرفة
  const [summary, setSummary] = useState<AccountingSummary | null>(null)
  const [vouchersData, setVouchersData] = useState<VouchersPayload | null>(null)
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [promos, setPromos] = useState<PromoAdmin[] | null>(null)
  const [giftCodes, setGiftCodes] = useState<TopupCodeAdmin[] | null>(null)
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const [positions, setPositions] = useState<Record<string, FleetPos>>({})
  const [live, setLive] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [tab, setTab] = useState('dashboard')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---------- سجل الأحداث الحي ----------
  const pushEvent = useCallback((kind: FeedEvent['kind'], text: string, sub?: string) => {
    setFeed((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          kind,
          text,
          sub,
        },
        ...prev,
      ].slice(0, 12),
    )
  }, [])

  // ---------- قفل الجلسة ----------
  const lockSession = useCallback(
    (message?: string) => {
      setUnlocked(false)
      setPin('')
      setSummary(null)
      setVouchersData(null)
      setOrders([])
      setPromos(null)
      setGiftCodes(null)
      setPositions({})
      setFeed([])
      setLive(false)
      setLastSync(null)
      setBusy(null)
      if (message) {
        toast({ title: '🔒 أُقفلت الجلسة الإدارية', description: message, variant: 'destructive' })
      }
    },
    [toast],
  )

  // ---------- معالج أخطاء موحد (401 = قفل فوري) ----------
  const handleAdminError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        lockSession('رمز الإدارة غير صحيح أو منتهٍ — يلزم إعادة فتح الغرفة')
        return
      }
      toast({
        title: 'تعذر تنفيذ العملية',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      })
    },
    [lockSession, toast],
  )

  // ---------- تحميل بيانات الغرفة (ملخص + سندات + طلبات) ----------
  const loadAll = useCallback(
    async (currentPin: string) => {
      if (!currentPin) return
      const headers = { 'x-admin-pin': currentPin }
      const [sumRes, vouRes, ordRes, promoRes, giftRes] = await Promise.allSettled([
        api<AccountingSummary>('/api/accounting/summary', { headers }),
        api<VouchersPayload>('/api/vouchers', { headers }),
        apiGet<{ orders: OrderDTO[] }>('/api/orders?status=all&limit=50'),
        api<{ promos: PromoAdmin[] }>('/api/admin/promos', { headers }),
        api<{ codes: TopupCodeAdmin[] }>('/api/admin/topup-codes', { headers }),
      ])

      for (const r of [sumRes, vouRes]) {
        if (r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401) {
          lockSession('انتهت صلاحية جلسة الإدارة — رمز غير صحيح')
          return
        }
      }

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
      if (vouRes.status === 'fulfilled') setVouchersData(vouRes.value)
      if (ordRes.status === 'fulfilled') setOrders(ordRes.value.orders ?? [])
      if (promoRes.status === 'fulfilled') setPromos(promoRes.value.promos ?? [])
      if (giftRes.status === 'fulfilled') setGiftCodes(giftRes.value.codes ?? [])
      setLastSync(Date.now())
    },
    [lockSession],
  )

  // ---------- فتح الجلسة بالـ PIN ----------
  const attemptUnlock = useCallback(
    async (code: string) => {
      if (code.length !== 4 || checking) return
      setChecking(true)
      try {
        const s = await api<AccountingSummary>('/api/accounting/summary', {
          headers: { 'x-admin-pin': code },
        })
        setPin(code)
        setSummary(s)
        setErrorNonce(0)
        setUnlocked(true)
        setFeed([
          {
            id: `unlock-${Date.now()}`,
            at: Date.now(),
            kind: 'status',
            text: '🔓 فُتحت جلسة غرفة العمليات — البث المالي واللوجستي يعمل الآن',
          },
        ])
        toast({ title: 'أهلاً بك في غرفة العمليات 🛡️', description: 'كل قرش مُساءل — البث الحي متصل' })
      } catch (e) {
        setPin('')
        if (e instanceof ApiError && e.status === 401) {
          setErrorNonce((n) => n + 1)
          toast({ title: 'رمز غير صحيح', description: 'رمز PIN الإداري مرفوض — حاول مجدداً', variant: 'destructive' })
        } else {
          toast({
            title: 'تعذر الاتصال بالخادم',
            description: e instanceof Error ? e.message : 'تحقق من الشبكة وحاول مجدداً',
            variant: 'destructive',
          })
        }
      } finally {
        setChecking(false)
      }
    },
    [checking, toast],
  )

  // ---------- دورة البيانات: فورية + كل 8 ثوانٍ ----------
  useEffect(() => {
    if (!unlocked || !pin) return
    void loadAll(pin)
    pollRef.current = setInterval(() => {
      void loadAll(pin)
    }, POLL_MS)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [unlocked, pin, loadAll])

  // ---------- البث اللحظي: غرفة admin:fleet ----------
  useEffect(() => {
    if (!unlocked) return
    const s = getSocket()

    const refreshMoney = () => {
      void loadAll(pin)
    }

    const onConnect = () => {
      setLive(true)
      joinRooms(['admin:fleet'])
      s.emit('fleet:snapshot_request')
    }
    const onDisconnect = () => setLive(false)

    const onSnapshot = (list: FleetPos[]) => {
      if (!Array.isArray(list)) return
      setPositions((prev) => {
        const next = { ...prev }
        for (const rec of list) if (rec?.driverId) next[rec.driverId] = rec
        return next
      })
    }

    const onDriverLocation = (rec: FleetPos) => {
      if (!rec?.driverId) return
      setPositions((prev) => ({ ...prev, [rec.driverId]: rec }))
    }

    const onDriverStatus = (d: { driverId: string; fullName: string; status: DriverDTO['status'] }) => {
      if (!d?.driverId) return
      setPositions((prev) => {
        if (!prev[d.driverId]) return prev
        return {
          ...prev,
          [d.driverId]: { ...prev[d.driverId], status: d.status, updatedAt: new Date().toISOString() },
        }
      })
      setSummary((prev) =>
        prev
          ? { ...prev, drivers: prev.drivers.map((x) => (x.id === d.driverId ? { ...x, status: d.status } : x)) }
          : prev,
      )
      pushEvent('status', `🛵 الكابتن ${d.fullName} أصبح «${STATUS_LABELS[d.status] ?? d.status}»`)
    }

    const onOrderStatus = (d: { orderId: string; status: string; orderNumber: string }) => {
      if (!d?.orderNumber) return
      pushEvent('status', `📦 الطلب ${d.orderNumber}: ${STATUS_LABELS[d.status] ?? d.status}`)
      setOrders((prev) =>
        prev.map((o) => (o.id === d.orderId ? { ...o, status: d.status as OrderDTO['status'] } : o)),
      )
    }

    const onRadar = (d: { orderId: string; orderNumber: string; storeName: string; candidates: number }) => {
      if (!d?.orderNumber) return
      pushEvent(
        'radar',
        `📡 رادار: أُرسل عرض الطلب ${d.orderNumber} من «${d.storeName}» إلى ${d.candidates ?? 0} كابتن`,
      )
    }

    const onCustodySettled = (d: { driverName: string; amount: number; voucherNumber: string }) => {
      if (!d?.voucherNumber) return
      pushEvent(
        'custody',
        `💰 توريد عهدة الكابتن ${d.driverName} بمبلغ ${(d.amount ?? 0).toFixed(2)} د.ل`,
        `سند قبض ${d.voucherNumber}`,
      )
      refreshMoney()
    }

    const onStorePayout = (d: { storeName: string; amount: number; voucherNumber: string }) => {
      if (!d?.voucherNumber) return
      pushEvent(
        'payout',
        `🏪 صرف مستحقات متجر «${d.storeName}» بمبلغ ${(d.amount ?? 0).toFixed(2)} د.ل`,
        `سند صرف ${d.voucherNumber}`,
      )
      refreshMoney()
    }

    const onPromoApplied = (d: { orderNumber?: string; promoCode?: string; promoLabel?: string; discountLyd?: number; customerName?: string }) => {
      if (!d?.promoCode) return
      pushEvent(
        'promo',
        `🎟️ استخدم الزبون ${d.customerName ?? ''} كوبون ${d.promoLabel ?? d.promoCode} على الطلب ${d.orderNumber ?? ''}`,
        `وفّرنا له ${(d.discountLyd ?? 0).toFixed(2)} د.ل — على حساب المنصة`,
      )
    }

    const onTopupRedeemed = (d: { phone?: string; code?: string; amountLyd?: number; balance?: number }) => {
      if (!d?.code) return
      pushEvent(
        'topup',
        `🎁 شُحنت محفظة ${d.phone ?? ''} بكود ${d.code}`,
        `قيمة ${(d.amountLyd ?? 0).toFixed(2)} د.ل — الرصيد الآن ${(d.balance ?? 0).toFixed(2)} د.ل`,
      )
    }

    if (s.connected) onConnect()
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('fleet:snapshot', onSnapshot)
    s.on('fleet:driver_location', onDriverLocation)
    s.on('fleet:driver_status', onDriverStatus)
    s.on('order:status_changed', onOrderStatus)
    s.on('order:radar_broadcast', onRadar)
    s.on('driver:custody_settled', onCustodySettled)
    s.on('store:payout_settled', onStorePayout)
    s.on('store:promo_applied', onPromoApplied)
    s.on('wallet:topup_redeemed', onTopupRedeemed)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('fleet:snapshot', onSnapshot)
      s.off('fleet:driver_location', onDriverLocation)
      s.off('fleet:driver_status', onDriverStatus)
      s.off('order:status_changed', onOrderStatus)
      s.off('order:radar_broadcast', onRadar)
      s.off('driver:custody_settled', onCustodySettled)
      s.off('store:payout_settled', onStorePayout)
      s.off('store:promo_applied', onPromoApplied)
      s.off('wallet:topup_redeemed', onTopupRedeemed)
      leaveRooms(['admin:fleet'])
    }
  }, [unlocked, pin, loadAll, pushEvent])

  // ---------- الإجراءات المالية ----------
  const settleCustody = useCallback(
    async (driver: DriverDTO): Promise<SettleResult | null> => {
      setBusy(`settle:${driver.id}`)
      try {
        const r = await apiPost<SettleResult>(`/api/drivers/${driver.id}/settle`, { pin })
        toast({
          title: `تم توريد عهدة ${r.driver.fullName} للخزينة`,
          description: `سند قبض ${r.voucher.voucherNumber} — ${r.voucher.amountLyd.toFixed(2)} د.ل`,
        })
        void loadAll(pin)
        return r
      } catch (e) {
        handleAdminError(e)
        return null
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const payoutStore = useCallback(
    async (storeId: string, amount: number): Promise<PayoutStoreResult | null> => {
      setBusy(`payout:${storeId}`)
      try {
        const r = await apiPost<PayoutStoreResult>('/api/accounting/payout-store', {
          pin,
          store_id: storeId,
          amount,
        })
        toast({
          title: 'صُرفت مستحقات المتجر',
          description: `سند صرف ${r.voucher.voucherNumber} — ${r.voucher.amountLyd.toFixed(2)} د.ل • المتبقي ${r.remainingDues.toFixed(2)} د.ل`,
        })
        void loadAll(pin)
        return r
      } catch (e) {
        handleAdminError(e)
        return null
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const resolveNoShow = useCallback(
    async (order: OrderDTO): Promise<ResolveNoShowResult | null> => {
      setBusy(`noshow:${order.id}`)
      try {
        const r = await apiPost<ResolveNoShowResult>('/api/disputes/resolve-noshow', {
          pin,
          order_id: order.id,
        })
        toast({
          title: `فُضّ نزاع الطلب ${r.orderNumber}`,
          description: `صرف للمتجر ${r.storePayout.toFixed(2)} د.ل • ${r.captainPaid ? `أُودعت أجرة الكابتن ${r.captainFee.toFixed(2)} د.ل${r.captainVoucher ? ` بسند ${r.captainVoucher.voucherNumber}` : ''}` : 'لا يوجد كابتن مُعيَّن — لم تُصرف أي أجرة'} • حُظر الزبون ${r.blockedPhone}`,
        })
        void loadAll(pin)
        return r
      } catch (e) {
        handleAdminError(e)
        return null
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  // ---------- إجراءات التسويق (كوبونات + أكواد شحن) ----------
  const createPromo = useCallback(
    async (data: CreatePromoInput): Promise<boolean> => {
      setBusy('promo:create')
      try {
        const r = await apiPost<{ ok: boolean }>('/api/admin/promos', { ...data, pin })
        toast({ title: '🎟️ أُنشئ الكوبون', description: 'ظهر فوراً على الزبائن — بالتوفيق في الحملة' })
        void loadAll(pin)
        return !!r.ok
      } catch (e) {
        handleAdminError(e)
        return false
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const togglePromo = useCallback(
    async (code: string, next: boolean) => {
      setBusy(`promo:${code}`)
      try {
        await api('/api/admin/promos', {
          method: 'PATCH',
          body: JSON.stringify({ pin, code, isActive: next }),
        })
        toast({
          title: next ? '🟢 فُعّل الكوبون' : '🟠 عُطّل الكوبون',
          description: `الكود ${code} ${next ? 'يظهر للزبائن الآن' : 'اختفى من الزبائن — الطلبات القائمة سليمة'}`,
        })
        void loadAll(pin)
      } catch (e) {
        handleAdminError(e)
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const generateCodes = useCallback(
    async (amountLyd: number, count: number, note: string): Promise<boolean> => {
      setBusy('gift:create')
      try {
        const r = await apiPost<{ ok: boolean; codes: string[] }>('/api/admin/topup-codes', {
          pin,
          amountLyd,
          count,
          note,
        })
        toast({
          title: `🎁 وُلّد ${r.codes.length} كود شحن`,
          description: `فئة ${amountLyd.toFixed(2)} د.ل — جهّزها للبيع في المقر`,
        })
        void loadAll(pin)
        return true
      } catch (e) {
        handleAdminError(e)
        return false
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const toggleGiftCode = useCallback(
    async (code: string, next: boolean) => {
      setBusy(`gift:${code}`)
      try {
        await api('/api/admin/topup-codes', {
          method: 'PATCH',
          body: JSON.stringify({ pin, code, isActive: next }),
        })
        toast({
          title: next ? '🟢 فُعّل الكود' : '🟠 عُطّل الكود',
          description: `الكود ${code} ${next ? 'صالح للاستخدام' : 'غير صالح حتى إعادة التفعيل'}`,
        })
        void loadAll(pin)
      } catch (e) {
        handleAdminError(e)
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  const closeDay = useCallback(
    async (): Promise<AuditRecord | null> => {
      setBusy('close-day')
      try {
        const r = await apiPost<{ audit: AuditRecord }>('/api/accounting/close-day', { pin })
        toast({
          title: `صدر محضر الجرد ${r.audit.auditCode}`,
          description: 'قُفلت اليومية المالية وأُضيفت لسجل المحاضر',
        })
        void loadAll(pin)
        return r.audit
      } catch (e) {
        handleAdminError(e)
        return null
      } finally {
        setBusy(null)
      }
    },
    [pin, loadAll, handleAdminError, toast],
  )

  // ---------- نمط الطباعة النظيف للسندات ----------
  const printCss = `
    @media print {
      body * { visibility: hidden !important; }
      .print-area, .print-area * { visibility: visible !important; }
      .print-area {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        margin: 0 auto !important;
        box-shadow: none !important;
      }
    }
  `

  return (
    <div className="flex min-h-screen flex-col">
      <style>{printCss}</style>

      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div key="pinlock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PinLock
              pin={pin}
              onPinChange={setPin}
              checking={checking}
              errorNonce={errorNonce}
              onAttempt={(code) => void attemptUnlock(code)}
              onExit={onExit}
            />
          </motion.div>
        ) : (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-screen flex-col"
          >
            {/* ======= الرأس العالي ======= */}
            <header className="sticky top-0 z-40 border-b border-[rgba(212,175,55,0.2)] bg-[#041710]/85 backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#062319] text-xl">
                    🛡️
                  </span>
                  <div>
                    <h1 className="gold-text text-base font-extrabold leading-tight">غرفة العمليات والمالية</h1>
                    <p className="text-[11px] text-[#938E7E]">واصل نالوت — جبل نفوسة</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* مؤشر البث الحي */}
                  <span
                    className="flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold"
                    style={{
                      borderColor: live ? 'rgba(16,185,129,0.45)' : 'rgba(147,142,126,0.4)',
                      color: live ? '#10B981' : '#938E7E',
                      background: live ? 'rgba(16,185,129,0.08)' : 'rgba(147,142,126,0.08)',
                    }}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${live ? 'animate-pulse' : ''}`}
                      style={{ background: live ? '#10B981' : '#938E7E' }}
                    />
                    {live ? 'بث حي متصل' : 'البث غير متصل'}
                    {lastSync && (
                      <span className="ltr-nums font-money hidden font-normal text-[#938E7E] sm:inline">
                        {new Date(lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => lockSession()}
                    className="min-h-12 border-[rgba(212,175,55,0.35)] bg-transparent px-4 text-[#F5D061] hover:bg-[#0A3324] hover:text-[#F5D061]"
                  >
                    <Lock className="h-4 w-4" />
                    قفل الجلسة
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onExit}
                    className="min-h-12 px-4 text-[#938E7E] hover:bg-[#0A3324] hover:text-[#F5D061]"
                  >
                    <LogOut className="h-4 w-4" />
                    خروج
                  </Button>
                </div>
              </div>
            </header>

            {/* ======= الجسم ======= */}
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
              <Tabs value={tab} onValueChange={setTab} className="gap-4">
                <div className="wasel-scroll -mx-1 overflow-x-auto px-1 pb-1">
                  <TabsList className="h-auto w-full min-w-max justify-start gap-1 border border-[rgba(212,175,55,0.2)] bg-[#062319]/80 p-1.5">
                    {[
                      { v: 'dashboard', label: 'لوحة المؤشرات', icon: Gauge },
                      { v: 'fleet', label: 'الأسطول الحي', icon: MapIcon },
                      { v: 'orders', label: 'الطلبات والنزاعات', icon: ShoppingCart },
                      { v: 'captains', label: 'الكباتن', icon: Users },
                      { v: 'marketing', label: 'التسويق', icon: TicketPercent },
                      { v: 'accounting', label: 'المحاسبة Z', icon: ScrollText },
                      { v: 'stores', label: 'المتاجر', icon: StoreIcon },
                    ].map((t) => (
                      <TabsTrigger
                        key={t.v}
                        value={t.v}
                        className="data-[state=active]:border-[rgba(212,175,55,0.45)] data-[state=active]:bg-[#041710] data-[state=active]:text-[#F5D061] min-h-[48px] gap-2 rounded-xl border border-transparent px-4 text-[13px] font-bold text-[#938E7E]"
                      >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="dashboard">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <DashboardTab summary={summary} events={feed} lastSync={lastSync} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="fleet">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <FleetTab drivers={summary?.drivers ?? []} positions={positions} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="orders">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <OrdersTab orders={orders} busyKey={busy} onResolveNoShow={resolveNoShow} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="captains">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <CaptainsTab drivers={summary?.drivers ?? []} busyKey={busy} onSettle={settleCustody} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="accounting">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <ZAccountingTab summary={summary} vouchersData={vouchersData} busy={busy === 'close-day'} onCloseDay={closeDay} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="stores">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <StoresTab stores={summary?.stores ?? []} busyKey={busy} onPayout={payoutStore} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="marketing">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <MarketingTab
                      promos={promos}
                      codes={giftCodes}
                      busyKey={busy}
                      onCreatePromo={createPromo}
                      onTogglePromo={togglePromo}
                      onGenerateCodes={generateCodes}
                      onToggleCode={toggleGiftCode}
                    />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </main>

            {/* ======= التذييل اللاصق ======= */}
            <footer className="mt-auto border-t border-[rgba(212,175,55,0.18)] bg-[#041710]/90 py-3 text-center">
              <p className="text-[12px] font-semibold text-[#938E7E]">
                🛡️ <span className="gold-text font-bold">واصل نالوت — غرفة العمليات والمالية</span> • كل قرش مُساءل
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
