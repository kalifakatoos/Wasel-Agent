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

export function OrdersScreen({ onTrack, onBack }: { onTrack: (orderId: string) => void; onBack: () => void }) {
  const phone = useWasel((s) => s.customerPhone)
  const savedName = useWasel((s) => s.customerName)
  const setCustomerIdentity = useWasel((s) => s.setCustomerIdentity)

  const [orders, setOrders] = useState<OrderDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

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
                className={`rounded-2xl border bg-[#062319] p-4 ${
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
                <div className="mt-3 flex items-center justify-between">
                  <Ly amount={o.totalLyd} bold className="text-lg text-[#F8F5EE]" />
                  {isActive ? (
                    <Button
                      onClick={() => onTrack(o.id)}
                      className="h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-5 text-xs font-extrabold text-[#041710] shadow-md shadow-[rgba(212,175,55,0.2)]"
                    >
                      تتبع حي ←
                    </Button>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#938E7E]">
                      {o.status === 'delivered' ? `سُلّم ${o.deliveredAt ? fmtDate(o.deliveredAt) : ''}` : '—'}
                    </span>
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
