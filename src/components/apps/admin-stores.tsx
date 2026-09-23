'use client'

// ============================================================
// 🏪 المتاجر وصرف المستحقات — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useMemo, useState } from 'react'
import { Coins, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ly } from '@/components/wasel/Badges'
import {
  EmptyHint,
  SectionCard,
  VoucherDocument,
  type PayoutStoreResult,
} from './admin-shared'

interface StoreDues {
  id: string
  name: string
  emoji: string
  dues: number
  payoutPaid: number
}

export default function StoresTab({
  stores,
  busyKey,
  onPayout,
}: {
  stores: StoreDues[]
  busyKey: string | null
  onPayout: (storeId: string, amount: number) => Promise<PayoutStoreResult | null>
}) {
  const [target, setTarget] = useState<StoreDues | null>(null)
  const [amount, setAmount] = useState('')
  const [working, setWorking] = useState(false)
  const [issued, setIssued] = useState<{ result: PayoutStoreResult; store: StoreDues } | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const totals = useMemo(
    () => ({
      dues: stores.reduce((s, x) => s + x.dues, 0),
      paid: stores.reduce((s, x) => s + x.payoutPaid, 0),
    }),
    [stores],
  )

  function openPayout(store: StoreDues) {
    setTarget(store)
    setAmount(store.dues.toFixed(2))
    setAmountError(null)
    setIssued(null)
  }

  async function confirmPayout() {
    if (!target) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('أدخل مبلغاً صحيحاً أكبر من صفر')
      return
    }
    if (value > target.dues + 0.001) {
      setAmountError('المبلغ يتجاوز مستحقات المتجر اليوم')
      return
    }
    setWorking(true)
    try {
      const result = await onPayout(target.id, value)
      if (result) setIssued({ result, store: target })
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <SectionCard
        title="حسابات المتاجر الشريكة"
        icon={<Store className="h-4 w-4" />}
        extra={
          <span className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] px-2 py-1 text-[#F5D061]">
              مستحقات اليوم <Ly amount={totals.dues} bold />
            </span>
            <span className="rounded-full border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-[#10B981]">
              مصروف <Ly amount={totals.paid} bold />
            </span>
          </span>
        }
      >
        {stores.length === 0 ? (
          <EmptyHint text="لا توجد متاجر مسجلة" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((st) => {
              const paying = busyKey === `payout:${st.id}`
              return (
                <article
                  key={st.id}
                  className="flex flex-col rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319] p-4"
                >
                  <header className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#041710] text-2xl">
                      {st.emoji || '🏪'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F8F5EE]">{st.name}</p>
                      <p className="text-[11px] text-[#938E7E]">شريك واصل نالوت</p>
                    </div>
                  </header>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-[#041710] p-2">
                      <Coins className="mx-auto h-3.5 w-3.5 text-[#F5D061]" />
                      <Ly amount={st.dues} bold className="mt-1 block text-[15px] text-[#F5D061]" />
                      <p className="text-[10px] text-[#938E7E]">مستحقات اليوم (90%)</p>
                    </div>
                    <div className="rounded-lg bg-[#041710] p-2">
                      <Coins className="mx-auto h-3.5 w-3.5 text-[#10B981]" />
                      <Ly amount={st.payoutPaid} bold className="mt-1 block text-[15px] text-[#10B981]" />
                      <p className="text-[10px] text-[#938E7E]">مصروف سابقاً</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => openPayout(st)}
                    disabled={st.dues <= 0 || paying}
                    className="mt-3 min-h-12 w-full bg-[#0A3324] font-bold text-[#F5D061] hover:bg-[#124532] disabled:opacity-40"
                  >
                    <Coins className="h-4 w-4" />
                    {paying ? 'جارٍ الصرف…' : st.dues <= 0 ? 'لا مستحقات اليوم' : 'صرف المستحقات'}
                  </Button>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* نافذة إدخال مبلغ الصرف */}
      <Dialog
        open={!!target && !issued}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <DialogContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F8F5EE] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#F5D061]">صرف مستحقات {target?.name}</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed text-[#938E7E]">
              سيُصدر سند صرف رسمي ويخصم من محفظة المتجر مباشرة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#041710] p-3 text-center">
              <p className="text-[11px] text-[#938E7E]">المستحقات المتاحة اليوم</p>
              <Ly amount={target?.dues ?? 0} bold className="text-2xl text-[#F5D061]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-amount" className="text-[12px] text-[#C9C4B4]">
                مبلغ الصرف (د.ل)
              </Label>
              <Input
                id="payout-amount"
                dir="ltr"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setAmountError(null)
                }}
                className="font-money h-12 border-[rgba(212,175,55,0.3)] bg-[#041710] text-center text-lg text-[#F5D061]"
              />
              {amountError && <p className="text-[11px] font-semibold text-[#EF4444]">{amountError}</p>}
            </div>
            <Button
              type="button"
              onClick={() => void confirmPayout()}
              disabled={working}
              className="min-h-12 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
            >
              {working ? 'جارٍ إصدار السند…' : 'صرف وإصدار السند'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* سند الصرف الرسمي */}
      <Dialog open={!!issued} onOpenChange={(open) => {
        if (!open) {
          setIssued(null)
          setTarget(null)
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[rgba(212,175,55,0.35)] bg-[#062319] wasel-scroll sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#F5D061]">🛡️ سند صرف مستحقات — تم التحويل</DialogTitle>
          </DialogHeader>
          {issued && (
            <>
              <VoucherDocument
                voucher={issued.result.voucher}
                title="سند صرف مستحقات متجر"
                extraNote={`المتبقي في محفظة المتجر بعد الصرف: ${issued.result.remainingDues.toFixed(2)} د.ل`}
              />
              <Button
                type="button"
                onClick={() => window.print()}
                className="min-h-12 w-full border border-[rgba(212,175,55,0.4)] bg-transparent text-[#F5D061] hover:bg-[#0A3324]"
              >
                🖨️ طباعة السند
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
