'use client'

// 🔔 صندوق إشعارات الزبون — واصل نالوت
// جرس برقم غير المقروء + لوحة جانبية فاخرة، بث لحظي عبر غرفة customer:{phone}
// + استقصاء احتياطي كل 12 ثانية مع منع تكرار صارم بمفتاح order:{id}:{status}
// + تجميع الأقدم بعد 24 سا + إشعارات سطح المكتب (Notification API) في الخلفية
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellRing, CheckCheck, Gift, MonitorSmartphone, PackageSearch, Trash2, Wallet2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useWasel } from '@/lib/wasel/store'
import { getSocket, joinRooms, leaveRooms } from '@/lib/wasel/socket'
import type { OrderDTO, WaselNotification } from '@/lib/wasel/types'
import { fmtDate } from './customer-shared'

const ACTIVE_STATES = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery']

/// نصوص الحالات المطابقة تماماً لنصوص الخادم (orderNotifyText)
function statusNotifyText(status: string, o: OrderDTO): { title: string; body: string } | null {
  switch (status) {
    case 'placed':
      return { title: '🔔 وصل طلبك إلى المطبخ', body: `${o.storeName} استلم طلبك ${o.orderNumber} وسيتأكد منه حالاً` }
    case 'preparing':
      return { title: '👨‍🍳 المطبخ بدأ تحضير طلبك', body: `${o.storeName} يجهز طلبك الآن — يمكنك متابعة الحالة لحظياً` }
    case 'ready_for_pickup':
      return { title: '✅ وجبتك جاهزة الآن', body: `${o.storeName} أعدت طلبك — بانتظار وصول الكابتن لاستلامه` }
    case 'out_for_delivery':
      return { title: '🛵 الكابتن في الطريق إليك', body: `${o.driverName || 'الكابتن'} استلم طلبك من ${o.storeName} — جهّز كود التسليم الرباعي` }
    case 'delivered':
      return { title: '🎉 اكتمل التوصيل — بالهناء والشفاء', body: `سلّم الكابتن طلبك ${o.orderNumber}. لا تنسَ تقييم التجربة من «طلباتي»` }
    case 'cancelled':
      return { title: '😔 عذراً، أُلغي طلبك', body: `${o.storeName} لم يتمكن من تنفيذ الطلب ${o.orderNumber} — يمكنك الطلب مجدداً في أي وقت` }
    case 'disputed':
      return { title: '⚠️ نزاع مفتوح على طلبك', body: `الطلب ${o.orderNumber} قيد فض النزاع من غرفة العمليات — سنتواصل معك` }
    default:
      return null
  }
}

function kindVisual(n: WaselNotification): { icon: string; ring: string } {
  if (n.kind === 'gift') return { icon: '🎁', ring: 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.08)]' }
  if (n.kind === 'wallet') return { icon: '👛', ring: 'border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.07)]' }
  return { icon: n.storeEmoji ?? '🔔', ring: 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.05)]' }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `قبل ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `قبل ${h} سا`
  const d = Math.floor(h / 24)
  return `قبل ${d} يوم`
}

export function CustomerNotifications({ onTrackOrder }: { onTrackOrder: (orderId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [devicePerm, setDevicePerm] = useState<string>('default')
  const { toast } = useToast()
  const customerPhone = useWasel((s) => s.customerPhone)
  const notifications = useWasel((s) => s.notifications)
  const pushNotification = useWasel((s) => s.pushNotification)
  const markNotificationsRead = useWasel((s) => s.markNotificationsRead)
  const clearNotifications = useWasel((s) => s.clearNotifications)

  const unread = notifications.filter((n) => !n.read).length
  const lastSnapshot = useRef<Map<string, string>>(new Map())

  // حالة إذن إشعارات الجهاز عند التركيب
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDevicePerm(Notification.permission)
    }
  }, [])

  /// إشعار سطح المكتب — عند وصول إشعار والتطبيق بالخلفية
  const showDesktopNotification = useCallback((n: { id: string; title: string; body: string }) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted' || !document.hidden) return
    try {
      const note = new Notification(n.title, {
        body: n.body,
        tag: n.id, // يمنع تكدس الإشعارات المكررة
        dir: 'rtl',
        lang: 'ar',
        icon: '/logo.svg',
        badge: '/logo.svg',
      })
      note.onclick = () => {
        window.focus()
        note.close()
      }
    } catch {
      /* بعض المتصفحات تتطلب ServiceWorker — نتجاهل بصمت */
    }
  }, [])

  const enableDeviceNotifications = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({ title: 'متصفحك لا يدعم إشعارات الجهاز' })
      return
    }
    void Notification.requestPermission().then((p) => {
      setDevicePerm(p)
      if (p === 'granted') {
        toast({
          title: '🔔 فُعّلت إشعارات الجهاز',
          description: 'ستصلك التنبيهات حتى وأنت تتصفح تبويباً آخر',
          className: 'border-[rgba(16,185,129,0.5)] bg-[#0A3324] text-[#10B981]',
        })
      }
    })
  }

  /// إدخال إشعار موحد: يمنع التكرار ويطلق توست ذهبي عند الجديد
  const ingest = useCallback(
    (n: Omit<WaselNotification, 'read' | 'at'> & { at?: string }) => {
      const added = pushNotification(n)
      if (added) {
        toast({
          title: n.title,
          description: n.body,
          className: 'border-[rgba(212,175,55,0.5)] bg-[#0A3324] text-[#F5D061]',
        })
        showDesktopNotification({ id: n.id, title: n.title, body: n.body })
      }
    },
    [pushNotification, toast, showDesktopNotification],
  )

  /// 1) البث اللحظي: غرفة customer:{phone} — أحداث من الخادم
  useEffect(() => {
    if (!customerPhone) return
    const room = `customer:${customerPhone}`
    joinRooms([room])
    const socket = getSocket()
    const onNotify = (data: Partial<WaselNotification>) => {
      if (!data?.id || !data.title) return
      ingest({
        id: String(data.id),
        kind: data.kind === 'gift' || data.kind === 'wallet' ? data.kind : 'order',
        title: String(data.title),
        body: String(data.body ?? ''),
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        storeEmoji: data.storeEmoji,
        codes: data.codes,
        amountLyd: data.amountLyd,
        at: data.at,
      })
    }
    socket.on('customer:notify', onNotify)
    return () => {
      socket.off('customer:notify', onNotify)
      leaveRooms([room])
    }
  }, [customerPhone, ingest])

  /// 2) الاستقصاء الاحتياطي: فرق الحالة كل 12 ثانية (يلتقط ما فاته البث)
  useEffect(() => {
    if (!customerPhone) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders?phone=${encodeURIComponent(customerPhone)}&status=all&limit=20`)
        if (!res.ok) return
        const data = (await res.json()) as { orders?: OrderDTO[] }
        if (cancelled || !data.orders) return

        const next = new Map<string, string>()
        for (const o of data.orders) {
          next.set(o.id, o.status)
          const prev = lastSnapshot.current.get(o.id)
          // أول مرة نرى الطلب؟ نسجل فقط بلا إشعار (إلا إذا كان نشطاً — سنلحق الإشعارات القادمة فقط)
          if (!prev) continue
          if (prev !== o.status) {
            const text = statusNotifyText(o.status, o)
            if (text) {
              ingest({
                id: `order:${o.id}:${o.status}`,
                kind: 'order',
                title: text.title,
                body: text.body,
                orderId: o.id,
                orderNumber: o.orderNumber,
                storeEmoji: o.storeEmoji,
              })
            }
          }
        }
        lastSnapshot.current = next
      } catch {
        /* شبكة متعثرة — نعيد لاحقاً */
      }
    }

    // تحميل أولي بلا إشعارات (مزامنة صامتة)
    poll()
    const t = setInterval(poll, 12000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [customerPhone, ingest])

  const openSheet = () => {
    setOpen(true)
    // نعلّم كمقروء بعد لحظة ليبقى الإحساس بالفتح طبيعياً
    window.setTimeout(() => markNotificationsRead(), 600)
  }

  const total = notifications.length

  // 🕐 تجميع زمني: الحديثة (آخر 24 ساعة) ثم «الأقدم» بطاقات مدمجة خافتة
  const DAY_MS = 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const recent = notifications.filter((n) => nowMs - new Date(n.at).getTime() < DAY_MS)
  const older = notifications.filter((n) => nowMs - new Date(n.at).getTime() >= DAY_MS)

  const renderCard = (n: WaselNotification, opts: { compact?: boolean; animate?: boolean }) => {
    const v = kindVisual(n)
    const compact = opts.compact === true
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border transition ${
          compact
            ? 'border-[rgba(212,175,55,0.1)] bg-[#041710]/50 opacity-70'
            : n.read
              ? 'border-[rgba(212,175,55,0.12)] bg-[#062319]/60'
              : 'border-[rgba(212,175,55,0.45)] bg-gradient-to-br from-[#062319] to-[#0A3324] shadow-lg shadow-[rgba(212,175,55,0.08)]'
        } ${opts.animate ? 'animate-in fade-in slide-in-from-top-1' : ''}`}
      >
        {/* ثقبة تذكرة جانبية */}
        {!compact && (
          <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#041710]" aria-hidden="true" />
        )}
        <div className={`flex items-start gap-3 ${compact ? 'px-3 py-2.5' : 'p-4'}`}>
          <span
            className={`flex shrink-0 items-center justify-center rounded-xl border ${compact ? 'h-8 w-8 text-sm' : 'h-11 w-11 text-xl'} ${v.ring}`}
            aria-hidden="true"
          >
            {v.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} font-extrabold leading-snug text-[#F8F5EE]`}>{n.title}</p>
              {!n.read && !compact && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" aria-hidden="true" />}
            </div>
            <p className={`mt-1 ${compact ? 'line-clamp-1 text-[10px]' : 'text-[11px] leading-relaxed'} text-[#938E7E]`}>{n.body}</p>

            {/* أكواد بطاقات الشحن */}
            {n.codes && n.codes.length > 0 && (
              <div className="mt-2 rounded-xl border border-dashed border-[rgba(212,175,55,0.4)] bg-[#041710] px-3 py-2">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[#10B981]">
                  <Gift className="h-3 w-3" /> أكواد بطاقات الشحن — انسخها واستخدمها من المحفظة
                </p>
                <ul className="space-y-1">
                  {n.codes.map((c) => (
                    <li key={c} dir="ltr" className="font-money text-center text-sm font-bold tracking-[0.18em] text-[#F5D061]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-[#938E7E]/70" title={fmtDate(n.at)}>
                {timeAgo(n.at)}
              </span>
              {n.orderId && (
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false)
                    onTrackOrder(n.orderId!)
                  }}
                  className="h-8 gap-1 rounded-lg bg-[#0A3324] px-2.5 text-[11px] font-bold text-[#F5D061] hover:bg-[#124532]"
                >
                  <PackageSearch className="h-3.5 w-3.5" />
                  تتبع الطلب
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          onClick={openSheet}
          aria-label={`الإشعارات — ${unread} غير مقروء`}
          className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.12)]"
        >
          {unread > 0 ? <BellRing className="h-5 w-5 animate-pulse" /> : <Bell className="h-5 w-5" />}
          {unread > 0 && (
            <span className="ltr-nums absolute -left-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-1 font-money text-[11px] font-bold text-[#041710]">
              {unread > 9 ? '٩+' : unread}
            </span>
          )}
          {!customerPhone && total === 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#10B981]/70" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-md border-[rgba(212,175,55,0.25)] bg-[#041710] p-0 sm:max-w-sm">
        <div className="flex h-full flex-col">
          {/* رأس اللوحة */}
          <SheetHeader className="border-b border-[rgba(212,175,55,0.18)] bg-gradient-to-br from-[#062319] to-[#0A3324] px-5 py-4 text-right">
            <SheetTitle className="flex items-center justify-between text-base font-extrabold text-[#F8F5EE]">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#F5D061]" />
                الإشعارات
                {unread > 0 && (
                  <span className="ltr-nums rounded-full bg-[rgba(212,175,55,0.15)] px-2 py-0.5 font-money text-[10px] font-bold text-[#F5D061]">
                    {unread} جديد
                  </span>
                )}
              </span>
              {total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearNotifications}
                  className="h-8 gap-1 px-2 text-[11px] font-bold text-[#938E7E] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  مسح الكل
                </Button>
              )}
            </SheetTitle>
            <SheetDescription className="text-[11px] leading-relaxed text-[#938E7E]">
              كل تحديثات طلباتك ومحفظتك تصلك هنا لحظة بلحظة — حتى وأنت تتصفح المتاجر
            </SheetDescription>
          </SheetHeader>

          {/* القائمة */}
          <div className="wasel-scroll flex-1 overflow-y-auto px-4 py-4">
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(212,175,55,0.2)] bg-[#062319]/50 px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[#0A3324] text-2xl">
                  🔕
                </span>
                <p className="text-sm font-bold text-[#F8F5EE]">لا إشعارات بعد</p>
                <p className="max-w-[240px] text-[11px] leading-relaxed text-[#938E7E]">
                  بمجرد إرسال طلبك الأول ستصلك هنا كل مراحل الرحلة: قبول المطبخ، الجاهزية، خروج الكابتن، والتسليم
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <ul className="space-y-3">
                  {recent.map((n, idx) => (
                    <li key={n.id} className={idx === 0 && !n.read ? 'animate-in fade-in slide-in-from-top-1' : ''}>
                      {renderCard(n, { animate: idx === 0 && !n.read })}
                    </li>
                  ))}
                </ul>

                {/* 🕐 الأقدم — تجميع مدمج خافت */}
                {older.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 py-1" role="separator" aria-label="الإشعارات الأقدم">
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.35)]" />
                      <span className="flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.25)] bg-[#062319]/70 px-3 py-1 text-[10px] font-bold text-[#938E7E]">
                        🕐 الأقدم — قبل أكثر من 24 ساعة
                      </span>
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.35)]" />
                    </div>
                    <ul className="space-y-2">
                      {older.map((n) => (
                        <li key={n.id}>{renderCard(n, { compact: true })}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          {/* تذييل اللوحة */}
          <div className="border-t border-[rgba(212,175,55,0.15)] bg-[#062319]/70 px-5 py-3">
            {/* 🔔 إشعارات الجهاز — تصل حتى بالخلفية */}
            {'Notification' in (typeof window !== 'undefined' ? window : {}) && devicePerm !== 'denied' && (
              <button
                onClick={enableDeviceNotifications}
                disabled={devicePerm === 'granted'}
                className={`mb-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-bold transition ${
                  devicePerm === 'granted'
                    ? 'cursor-default border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.08)] text-[#10B981]'
                    : 'border-[rgba(212,175,55,0.4)] bg-[#041710] text-[#F5D061] hover:bg-[rgba(212,175,55,0.1)]'
                }`}
              >
                {devicePerm === 'granted' ? (
                  <>
                    <MonitorSmartphone className="h-4 w-4" />
                    إشعارات الجهاز مفعلة — ستصلك حتى بالخلفية ✓
                  </>
                ) : (
                  <>
                    <MonitorSmartphone className="h-4 w-4" />
                    فعّل إشعارات الجهاز لتصلك التنبيهات في الخلفية
                  </>
                )}
              </button>
            )}
            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-[#938E7E]">
              <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />
              الإشعارات محفوظة على جهازك — تنطلق مع كل تغيير حالة لحظياً
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] text-[#938E7E]/60">
              <Wallet2 className="h-3 w-3" />
              واصل نالوت • بالدينار الليبي حصرياً
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
