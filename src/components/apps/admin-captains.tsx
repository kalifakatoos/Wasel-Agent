'use client'

// ============================================================
// 🛵 الكباتن والعهد النقدية — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useState } from 'react'
import { BadgeCheck, Banknote, Bike, Star, Trophy } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DriverDTO } from '@/lib/wasel/types'
import { CUSTODY_CAP_LYD } from '@/lib/wasel/constants'
import { Ly } from '@/components/wasel/Badges'
import {
  EmptyHint,
  VoucherDocument,
  DRIVER_STATUS_COLORS,
  DRIVER_STATUS_LABELS,
  type SettleResult,
} from './admin-shared'

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'دراجة نارية',
  scooter: 'سكوتر',
  bicycle: 'هوائية',
  car: 'سيارة',
}

export default function CaptainsTab({
  drivers,
  busyKey,
  onSettle,
}: {
  drivers: DriverDTO[]
  busyKey: string | null
  onSettle: (driver: DriverDTO) => Promise<SettleResult | null>
}) {
  const [target, setTarget] = useState<DriverDTO | null>(null)
  const [working, setWorking] = useState(false)
  const [receipt, setReceipt] = useState<SettleResult | null>(null)

  async function confirmSettle() {
    if (!target) return
    setWorking(true)
    try {
      const result = await onSettle(target)
      setTarget(null)
      if (result) setReceipt(result)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      {drivers.length === 0 ? (
        <EmptyHint text="لا يوجد كباتن بعد" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => {
            const color = DRIVER_STATUS_COLORS[d.status]
            const hot = d.custodyCash > CUSTODY_CAP_LYD
            const settling = busyKey === `settle:${d.id}`
            return (
              <article
                key={d.id}
                className="flex flex-col rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319] p-4"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#F8F5EE]">{d.fullName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#938E7E]">
                      <Bike className="h-3.5 w-3.5" />
                      {VEHICLE_LABELS[d.vehicleType] || d.vehicleType} •{' '}
                      <span className="font-money ltr-nums">{d.plateNumber}</span>
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold"
                    style={{ color, background: `${color}1A`, border: `1px solid ${color}55` }}
                  >
                    {DRIVER_STATUS_LABELS[d.status]}
                  </span>
                </header>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-[#041710] p-2">
                    <Star className="mx-auto h-3.5 w-3.5 text-[#F5D061]" />
                    <p className="ltr-nums font-money mt-1 text-[13px] font-bold text-[#F8F5EE]">
                      {d.rating.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-[#938E7E]">التقييم</p>
                  </div>
                  <div className="rounded-lg bg-[#041710] p-2">
                    <Trophy className="mx-auto h-3.5 w-3.5 text-[#10B981]" />
                    <p className="ltr-nums font-money mt-1 text-[13px] font-bold text-[#F8F5EE]">
                      {d.tripsCompleted}
                    </p>
                    <p className="text-[10px] text-[#938E7E]">رحلة</p>
                  </div>
                  <div className="rounded-lg bg-[#041710] p-2">
                    <BadgeCheck className="mx-auto h-3.5 w-3.5 text-[#F5D061]" />
                    <Ly amount={d.earningsTotal} className="text-[13px] font-bold text-[#F8F5EE]" />
                    <p className="text-[10px] text-[#938E7E]">أرباح متراكمة</p>
                  </div>
                </div>

                {/* بطاقة العهدة البارزة */}
                <div
                  className="mt-3 rounded-xl border p-3"
                  style={{
                    borderColor: hot ? 'rgba(245,158,11,0.55)' : 'rgba(212,175,55,0.25)',
                    background: hot ? 'rgba(245,158,11,0.08)' : 'rgba(4,23,16,0.9)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#938E7E]">
                      <Banknote className="h-4 w-4" style={{ color: hot ? '#F59E0B' : '#D4AF37' }} />
                      العهدة النقدية بحوزته
                    </span>
                    {hot && (
                      <span className="rounded bg-[rgba(245,158,11,0.15)] px-1.5 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                        تجاوز السقف 500
                      </span>
                    )}
                  </div>
                  <Ly
                    amount={d.custodyCash}
                    bold
                    className={`mt-1 block text-2xl ${hot ? 'text-[#F59E0B]' : 'text-[#F5D061]'}`}
                  />
                  <Button
                    type="button"
                    onClick={() => setTarget(d)}
                    disabled={d.custodyCash <= 0 || settling}
                    className="mt-3 min-h-12 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
                  >
                    <Banknote className="h-4 w-4" />
                    {settling ? 'جارٍ التسوية…' : 'تسوية العهدة وتوريد النقد'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* تأكيد تسوية العهدة */}
      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F8F5EE]">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-[#F5D061]">تسوية العهدة وتوريد النقد للمقر؟</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px] leading-relaxed text-[#C9C4B4]">
                {target && (
                  <>
                    <p>
                      سيتم تصفير عهدة الكابتن <b className="text-[#F8F5EE]">{target.fullName}</b> وإصدار{' '}
                      <b className="text-[#F5D061]">سند قبض عهدة كاش</b> رسمي بمبلغ:
                    </p>
                    <p className="text-center">
                      <Ly amount={target.custodyCash} bold className="text-2xl text-[#F5D061]" />
                    </p>
                    <p className="text-[12px] text-[#938E7E]">
                      يُسجّل التوريد في دفتر الخزينة فوراً ولا يمكن التراجع — تأكد من استلام النقدية فعلياً.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-12 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F8F5EE] hover:bg-[#0A3324] hover:text-[#F5D061]">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmSettle()
              }}
              disabled={working}
              className="min-h-12 bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
            >
              {working ? 'جارٍ إصدار السند…' : 'توريد وإصدار سند القبض'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* سند القبض الرسمي */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[rgba(212,175,55,0.35)] bg-[#062319] wasel-scroll sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#F5D061]">🛡️ سند قبض عهدة كاش — تم التوريد</DialogTitle>
          </DialogHeader>
          {receipt && (
            <>
              <VoucherDocument voucher={receipt.voucher} title="سند قبض عهدة كاش" />
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
