'use client'

// 📜 سجل طلبات الزبون — بوابة هاتف للضيوف + بطاقات طلبات مع تتبع النشط
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { OrderNo, StatusBadge, Ly } from '@/components/wasel/Badges'
import { apiGet } from '@/lib/wasel/api'
import { useWasel } from '@/lib/wasel/store'
import type { OrderDTO, OrderStatus } from '@/lib/wasel/types'
import { ErrorBlock, fmtDate, LoadingBlock, PhoneGate, ScreenBar } from './customer-shared'

const ACTIVE_STATUSES = new Set<OrderStatus>([
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
])

export function OrdersScreen({
  onTrack,
  onOpenDetail,
  onReorder,
  onBack,
}: {
  onTrack: (orderId: string) => void
  onOpenDetail: (orderId: string) => void
  onReorder: (order: OrderDTO) => void
  onBack: () => void
}) {
  const phone = useWasel((s) => s.customerPhone)
  const savedName = useWasel((s) => s.customerName)
  const setCustomerIdentity = useWasel((s) => s.setCustomerIdentity)

  const [orders, setOrders] = useState<OrderDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  // 📊 إحصائيات ملف الزبون (محسوبة محلياً من السجل)
  const stats = (() => {
    if (!orders) return null
    const done = orders.filter((o) => o.status === 'delivered')
    const totalSpent = done.reduce((n, o) => n + o.totalLyd, 0)
    const totalSaved = orders.reduce((n, o) => n + (o.discountLyd ?? 0), 0)
    const byStore = new Map<string, number>()
    for (const o of orders) byStore.set(o.storeName, (byStore.get(o.storeName) ?? 0) + 1)
    let favorite: string | null = null
    let favCount = 0
    for (const [name, c] of byStore) {
      if (c > favCount) {
        favorite = name
        favCount = c
      }
    }
    return {
      count: orders.length,
      delivered: done.length,
      totalSpent,
      totalSaved,
      favorite,
      favoriteCount: favCount,
    }
  })()

  useEffect(() => {
    if (!phone) return
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    apiGet<{ orders: OrderDTO[] }>(
      `/api/orders?phone=${encodeURIComponent(phone)}&status=all&limit=20`,
    )
      .then((d) => {
        if (cancelled) return
        setOrders(d.orders)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الطلبات')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [phone, refresh])

  if (!phone) {
    return (
      <div>
        <ScreenBar title="طلباتي" subtitle="سجل طلباتك في واصل نالوت" onBack={onBack} />
        <PhoneGate
          title="سجل طلباتك"
          description="أدخل رقم هاتفك الليبي لعرض كل طلباتك السابقة والحالية — لا تسجيل ولا كلمة مرور."
          ctaLabel="📋 عرض طلباتي"
          onSave={(p) => setCustomerIdentity(savedName || 'زبون واصل', p)}
        />
      </div>
    )
  }

  return (
    <div>
      <ScreenBar title="طلباتي" subtitle={`مرتبطة بالرقم ${phone}`} onBack={onBack} />

      {/* 📊 بطاقة ملف الولاء */}
      {stats && stats.count > 0 && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.25)] bg-gradient-to-l from-[#062319] via-[#0A3324] to-[#062319] p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="ltr-nums font-money text-2xl font-bold text-[#F5D061]">{stats.delivered}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#938E7E]">طلب مُسلّم</p>
            </div>
            <div className="border-x border-[rgba(212,175,55,0.15)]">
              <Ly amount={stats.totalSpent} bold className="text-2xl text-[#F8F5EE]" />
              <p className="mt-0.5 text-[10px] font-semibold text-[#938E7E]">إجمالي إنفاقك</p>
            </div>
            <div>
              <Ly
                amount={stats.totalSaved}
                bold
                className={`text-2xl ${stats.totalSaved > 0 ? 'text-[#10B981]' : 'text-[#F8F5EE]'}`}
              />
              <p className="mt-0.5 text-[10px] font-semibold text-[#938E7E]">وفّرتها بالكوبونات 🎟️</p>
            </div>
          </div>
          {stats.favorite && (
            <p className="mt-3 rounded-xl bg-[rgba(212,175,55,0.08)] px-3 py-2 text-center text-[11px] font-semibold text-[#F5D061]">
              ❤️ متجرك المفضل: {stats.favorite}
              {stats.favoriteCount > 1 && (
                <span className="ltr-nums font-money ms-1 text-[#938E7E]">({stats.favoriteCount} طلبات)</span>
              )}
            </p>
          )}
        </div>
      )}

      {error ? (
        <ErrorBlock message={error} onRetry={() => setRefresh((n) => n + 1)} />
      ) : loading ? (
        <LoadingBlock label="جارٍ تحميل سجل الطلبات…" />
      ) : orders && orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[rgba(212,175,55,0.3)] bg-[#062319]/60 py-14 text-center">
          <p className="text-4xl">🗂️</p>
          <p className="mt-3 text-sm font-bold text-[#F8F5EE]">لا طلبات بعد</p>
          <p className="mt-1 text-xs text-[#938E7E]">أول طلب لك في واصل يظهر هنا فور تأكيده</p>
        </div>
      ) : (
        <div className="wasel-scroll max-h-[70vh] space-y-3 overflow-y-auto pe-1">
          {orders?.map((o) => {
            const isActive = ACTIVE_STATUSES.has(o.status)
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => (isActive ? onTrack(o.id) : onOpenDetail(o.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (isActive) onTrack(o.id)
                    else onOpenDetail(o.id)
                  }
                }}
                className={`cursor-pointer rounded-2xl border bg-[#062319] p-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(245,208,97,0.5)] hover:shadow-lg hover:shadow-[rgba(212,175,55,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                  isActive ? 'border-[rgba(245,208,97,0.45)] shadow-lg shadow-[rgba(212,175,55,0.08)]' : 'border-[rgba(212,175,55,0.18)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <OrderNo no={o.orderNumber} className="text-sm font-bold text-[#F5D061]" />
                  <StatusBadge status={o.status} size="sm" />
                </div>
                <p className="mt-2 text-[11px] text-[#938E7E]">
                  {o.storeEmoji ?? '🏪'} {o.storeName} • {o.items.length} أصناف • {fmtDate(o.createdAt)}
                </p>
                {o.storeStars ? (
                  <p className="mt-1 text-[11px] font-bold text-[#F5D061]">
                    {'★'.repeat(o.storeStars)}
                    <span className="text-[rgba(212,175,55,0.3)]">{'★'.repeat(5 - o.storeStars)}</span>
                    <span className="ms-2 font-normal text-[#938E7E]">تقييمك مسجل — شكراً</span>
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <Ly amount={o.totalLyd} bold className="text-lg text-[#F8F5EE]" />
                  {isActive ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTrack(o.id)
                      }}
                      className="h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-5 text-xs font-extrabold text-[#041710] shadow-md shadow-[rgba(212,175,55,0.2)]"
                    >
                      تتبع حي ←
                    </Button>
                  ) : o.status === 'delivered' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReorder(o)
                        }}
                        className="h-12 rounded-xl border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.1)] px-4 text-xs font-extrabold text-[#10B981] hover:bg-[rgba(16,185,129,0.2)]"
                      >
                        🔁 إعادة الطلب
                      </Button>
                      <span className="text-[10px] font-semibold text-[#D4AF37]">
                        {o.storeStars ? 'الفاتورة ←' : 'التقييم ←'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#D4AF37]">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
