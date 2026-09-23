'use client'

// ============================================================
// 🧾 الطلبات وفض النزاعات — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { AlertTriangle, ShieldAlert, ShoppingBag } from 'lucide-react'
import type { OrderDTO } from '@/lib/wasel/types'
import { Ly, OrderNo, StatusBadge } from '@/components/wasel/Badges'
import { EmptyHint, SectionCard, fmtDateTime, type ResolveNoShowResult } from './admin-shared'

const ACTIVE_STATES = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery']

export default function OrdersTab({
  orders,
  busyKey,
  onResolveNoShow,
}: {
  orders: OrderDTO[]
  busyKey: string | null
  onResolveNoShow: (order: OrderDTO) => Promise<ResolveNoShowResult | null>
}) {
  const [target, setTarget] = useState<OrderDTO | null>(null)
  const [resolving, setResolving] = useState(false)

  const activeCount = useMemo(() => orders.filter((o) => ACTIVE_STATES.includes(o.status)).length, [orders])
  const disputed = useMemo(() => orders.filter((o) => o.status === 'disputed'), [orders])

  async function confirmResolve() {
    if (!target) return
    setResolving(true)
    try {
      await onResolveNoShow(target)
    } finally {
      setResolving(false)
      setTarget(null)
    }
  }

  return (
    <SectionCard
      title={`الطلبات الحديثة — ${orders.length} طلباً`}
      icon={<ShoppingBag className="h-4 w-4" />}
      extra={
        <span className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-[#10B981]">
            نشطة <span className="ltr-nums font-money">{activeCount}</span>
          </span>
          <span className="rounded-full border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.1)] px-2 py-1 text-[#EF4444]">
            نزاعات <span className="ltr-nums font-money">{disputed.length}</span>
          </span>
        </span>
      }
    >
      {orders.length === 0 ? (
        <EmptyHint text="لا توجد طلبات بعد — سيظهر تدفق الطلبات هنا مباشرة" />
      ) : (
        <div className="wasel-scroll max-h-[560px] space-y-2 overflow-y-auto pe-1">
          {orders.map((o) => {
            const isActive = ACTIVE_STATES.includes(o.status)
            return (
              <article
                key={o.id}
                className="rounded-xl border border-[rgba(212,175,55,0.14)] bg-[#041710] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{o.storeEmoji || '🏪'}</span>
                    <div>
                      <p className="text-[13px] font-bold text-[#F8F5EE]">
                        {o.storeName} <span className="text-[#938E7E]">← {o.customerName}</span>
                      </p>
                      <p className="text-[11px] text-[#938E7E]">
                        هاتف الزبون <span className="ltr-nums font-money">{o.customerPhone}</span>
                        {o.driverName ? <> • الكابتن {o.driverName}</> : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderNo no={o.orderNumber} className="text-[13px] font-bold text-[#F5D061]" />
                    <StatusBadge status={o.status} size="sm" />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#938E7E]">
                  <span>
                    {o.paymentMethod === 'cash' ? '💵 كاش عند التسليم' : '📱 محفظة واصل'} • {fmtDateTime(o.createdAt)}
                  </span>
                  <span className="text-[13px] text-[#F8F5EE]">
                    الإجمالي <Ly amount={o.totalLyd} bold className="text-[#F5D061]" />
                  </span>
                </div>

                {o.disputeNote && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] p-2 text-[11px] leading-relaxed text-[#FCA5A5]">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>ملاحظة النزاع: {o.disputeNote}</span>
                  </div>
                )}

                {isActive && (
                  <Button
                    type="button"
                    onClick={() => setTarget(o)}
                    disabled={busyKey === `noshow:${o.id}`}
                    className="mt-3 min-h-12 w-full bg-[#EF4444] text-white hover:bg-[#DC2626] sm:w-auto sm:px-5"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {busyKey === `noshow:${o.id}` ? 'جارٍ فض النزاع…' : 'فض نزاع عدم استلام'}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* تحذير فض النزاع */}
      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent className="border-[rgba(239,68,68,0.4)] bg-[#062319] text-[#F8F5EE]">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center gap-2 text-[#EF4444]">
              <AlertTriangle className="h-5 w-5" />
              فض نزاع عدم استلام — إجراء نهائي
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px] leading-relaxed text-[#C9C4B4]">
                {target && (
                  <>
                    <p>
                      الطلب <OrderNo no={target.orderNumber} className="font-bold text-[#F5D061]" /> من «{target.storeName}»
                      للزبون <span className="font-money ltr-nums">{target.customerPhone}</span>
                    </p>
                    <p>بالتأكيد سيتم تلقائياً:</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>
                        صرف <b className="text-[#F5D061]">90% من ثمن الوجبة</b> للمتجر بسند صرف فوري
                        (<Ly amount={target.subtotalLyd * 0.9} bold className="text-[#F5D061]" />)
                      </li>
                      <li>
                        توريد <b className="text-[#10B981]">كامل أجرة التوصيل</b> للكابتن
                        (<Ly amount={target.deliveryFeeLyd} bold className="text-[#10B981]" />)
                      </li>
                      <li>
                        <b className="text-[#EF4444]">حظر رقم الزبون نهائياً</b> من منظومة واصل نالوت
                      </li>
                    </ul>
                    <p className="text-[12px] text-[#938E7E]">لا يمكن التراجع عن هذا الإجراء — تأكد من استحالة وصول الزبون.</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-12 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F8F5EE] hover:bg-[#0A3324] hover:text-[#F5D061]">
              رجوع — لم تُستلم بعد
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmResolve()
              }}
              disabled={resolving}
              className="min-h-12 bg-[#EF4444] text-white hover:bg-[#DC2626]"
            >
              {resolving ? 'جارٍ التنفيذ…' : 'تأكيد فض النزاع'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
