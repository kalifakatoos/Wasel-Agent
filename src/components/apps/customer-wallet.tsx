'use client'

// 👛 محفظة واصل — رصيد ضخم + حالة الحظر + آخر الحركات (دينار ليبي حصرياً)
import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Ly } from '@/components/wasel/Badges'
import { apiGet } from '@/lib/wasel/api'
import { useWasel } from '@/lib/wasel/store'
import { ErrorBlock, fmtDate, LoadingBlock, PhoneGate } from './customer-shared'

interface WalletTxn {
  id: string
  orderId: string | null
  fromWalletId: string | null
  toWalletId: string | null
  amount: number
  type: string
  narration: string
  createdAt: string
}

interface WalletData {
  balance: number
  walletType: string
  blocked: boolean
  blockedReason: string | null
  transactions: WalletTxn[]
}

const TXN_LABELS: Record<string, { label: string; emoji: string }> = {
  order_placement: { label: 'دفع طلب (ضمان)', emoji: '🔒' },
  order_delivered: { label: 'تحرير ضمان', emoji: '🔓' },
  custody_collect: { label: 'قبض نقدي', emoji: '💵' },
  settlement: { label: 'تسوية كابتن', emoji: '🛵' },
  store_payout: { label: 'صرف متجر', emoji: '🏪' },
  dispute: { label: 'نزاع', emoji: '⚖️' },
  platform_commission: { label: 'عمولة منصة', emoji: '🏛️' },
}

export function WalletScreen() {
  const phone = useWasel((s) => s.customerPhone)
  const savedName = useWasel((s) => s.customerName)
  const setCustomerIdentity = useWasel((s) => s.setCustomerIdentity)

  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!phone) return
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    apiGet<WalletData>(`/api/wallet/${encodeURIComponent(phone)}`)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل المحفظة')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [phone, refresh])

  if (!phone || changing) {
    return (
      <div>
        <div className="mb-5 text-center">
          <h2 className="text-lg font-extrabold text-[#F8F5EE]">👛 محفظة واصل</h2>
          <p className="mt-1 text-xs text-[#938E7E]">رصيدك وحركاتك بالدينار الليبي حصرياً</p>
        </div>
        <PhoneGate
          title={changing ? 'تغيير رقم المحفظة' : 'افتح محفظتك'}
          description="أدخل رقم هاتفك الليبي المعرف في واصل لعرض الرصيد وآخر الحركات."
          ctaLabel="👛 عرض المحفظة"
          onSave={(p) => {
            setCustomerIdentity(savedName || 'زبون واصل', p)
            setChanging(false)
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-[#F8F5EE]">👛 محفظة واصل</h2>
          <p dir="ltr" className="font-money ltr-nums mt-0.5 text-xs text-[#938E7E]">
            {phone}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setChanging(true)}
          className="h-12 rounded-xl border-[rgba(212,175,55,0.35)] bg-transparent px-4 text-xs font-bold text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
        >
          🔄 تغيير الهاتف
        </Button>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={() => setRefresh((n) => n + 1)} />
      ) : loading ? (
        <LoadingBlock label="جارٍ جلب رصيدك…" />
      ) : data ? (
        <>
          {/* بطاقة الرصيد */}
          <div className="relative mb-5 overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.35)] bg-gradient-to-bl from-[#0A3324] via-[#062319] to-[#041710] p-7 text-center gold-glow">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[rgba(212,175,55,0.1)] blur-3xl" />
            <p className="text-xs font-bold tracking-wide text-[#938E7E]">الرصيد المتاح</p>
            <Ly amount={data.balance} bold className="mt-2 text-5xl text-[#F5D061]" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-3 py-1 text-[10px] font-bold text-[#10B981]">
                {data.walletType === 'customer' ? 'محفظة زبون' : data.walletType}
              </span>
              <span className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[#041710] px-3 py-1 text-[10px] font-bold text-[#D4AF37]">
                دينار ليبي حصرياً
              </span>
            </div>
          </div>

          {/* الحظر */}
          {data.blocked && (
            <Alert variant="destructive" className="mb-5 border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.08)]">
              <AlertTitle>🚫 محفظتك محظورة مؤقتاً</AlertTitle>
              <AlertDescription>
                {data.blockedReason ?? 'نزاع سابق غير محسوم — تواصل مع دعم واصل نالوت لرفع الحظر.'}
              </AlertDescription>
            </Alert>
          )}

          {/* الحركات */}
          <div className="rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#062319] p-4">
            <h4 className="mb-3 text-sm font-extrabold text-[#F8F5EE]">
              آخر الحركات <span className="font-money ltr-nums text-[10px] font-normal text-[#938E7E]">({data.transactions.length})</span>
            </h4>
            {data.transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#938E7E]">
                لا حركات بعد — رصيدك ينتظر أول طلب 👛
              </p>
            ) : (
              <div className="wasel-scroll max-h-[46vh] space-y-2 overflow-y-auto pe-1">
                {data.transactions.map((t) => {
                  const incoming = t.toWalletId === phone
                  const meta = TXN_LABELS[t.type] ?? { label: t.type, emoji: '💠' }
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#041710] px-3 py-2.5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3324] text-lg">
                        {meta.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-[#F8F5EE]">{meta.label}</p>
                        <p className="truncate text-[10px] leading-relaxed text-[#938E7E]" title={t.narration}>
                          {t.narration}
                        </p>
                        <p className="font-money ltr-nums mt-0.5 text-[9px] text-[#938E7E]/70">
                          {fmtDate(t.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`font-money ltr-nums shrink-0 text-sm font-bold ${
                          incoming ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {incoming ? '+' : '−'}
                        <Ly amount={t.amount} className={incoming ? 'text-[#10B981]' : 'text-[#EF4444]'} bold suffix="" />
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[10px] leading-relaxed text-[#938E7E]">
            رصيد محفظتك يُحجز بالضمان عند الدفع به ويُصرف للمتجر عند التسليم — بلا ربا وبلا غرر.
          </p>
        </>
      ) : null}
    </div>
  )
}
