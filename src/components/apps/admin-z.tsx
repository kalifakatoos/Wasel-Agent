'use client'

// ============================================================
// 🏛️ المحاسبة Z — جرد وسندات وحظر — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BadgeAlert, Ban, Landmark, ScrollText, ShieldCheck } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AccountingSummary } from '@/lib/wasel/types'
import { Ly, OrderNo } from '@/components/wasel/Badges'
import {
  EmptyHint,
  KpiCard,
  SectionCard,
  fmtDateTime,
  type AuditRecord,
  type VouchersPayload,
} from './admin-shared'

export default function ZAccountingTab({
  summary,
  vouchersData,
  busy,
  onCloseDay,
}: {
  summary: AccountingSummary | null
  vouchersData: VouchersPayload | null
  busy: boolean
  onCloseDay: () => Promise<AuditRecord | null>
}) {
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const [audit, setAudit] = useState<AuditRecord | null>(null)

  async function confirmClose() {
    setClosing(true)
    try {
      const result = await onCloseDay()
      setConfirming(false)
      if (result) setAudit(result)
    } finally {
      setClosing(false)
    }
  }

  const s = summary

  return (
    <div className="space-y-4">
      {/* ملخص اليوم */}
      <SectionCard
        title="ملخص يومية المحاسبة"
        icon={<Landmark className="h-4 w-4" />}
        extra={
          s?.lastAudit ? (
            <span className="rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.08)] px-3 py-1 text-[11px] text-[#F5D061]">
              آخر محضر <span className="font-money ltr-nums">{s.lastAudit.auditCode}</span>
            </span>
          ) : (
            <span className="text-[11px] text-[#938E7E]">لا يوجد محضر جرد بعد</span>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <KpiCard
            icon={<Landmark className="h-5 w-5 text-[#F5D061]" />}
            label="إجمالي التداول GMV"
            hint="طلبات اليوم المسلّمة"
            tone="gold"
            amount={s?.gmvLyd ?? 0}
          />
          <KpiCard
            icon={<ShieldCheck className="h-5 w-5 text-[#10B981]" />}
            label="الكاش المحصل"
            hint="قابل للتوريد للخزينة"
            tone="emerald"
            amount={s?.cashCollectedLyd ?? 0}
          />
          <KpiCard
            icon={<Landmark className="h-5 w-5 text-[#F5D061]" />}
            label="صافي أرباح المنصة"
            hint="10% من ثمن الوجبات"
            tone="gold"
            amount={s?.platformNetLyd ?? 0}
          />
          <KpiCard
            icon={<BadgeAlert className="h-5 w-5 text-[#F59E0B]" />}
            label="عهد الكباتن"
            hint="نقدية غير موردة بعد"
            tone="warn"
            amount={s?.captainCustodyLyd ?? 0}
          />
        </div>

        <Button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy || closing}
          className="mt-4 min-h-12 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37] sm:w-auto sm:px-6"
        >
          <ScrollText className="h-4 w-4" />
          {closing ? 'جارٍ إصدار المحضر…' : 'تقفيل اليومية وإصدار محضر Z'}
        </Button>
      </SectionCard>

      {/* محاضر الجرد السابقة */}
      <SectionCard title="سجل محاضر الجرد Z" icon={<ScrollText className="h-4 w-4" />}>
        {(s?.audits.length ?? 0) === 0 ? (
          <EmptyHint text="لا توجد محاضر جرد — أقفل أول يومية لتوليد محضر Z" />
        ) : (
          <div className="wasel-scroll max-h-[280px] overflow-y-auto rounded-xl border border-[rgba(212,175,55,0.12)]">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(212,175,55,0.12)]">
                  <TableHead className="text-right text-[#938E7E]">المحضر</TableHead>
                  <TableHead className="text-right text-[#938E7E]">التاريخ</TableHead>
                  <TableHead className="text-right text-[#938E7E]">الطلبات</TableHead>
                  <TableHead className="text-right text-[#938E7E]">GMV</TableHead>
                  <TableHead className="text-right text-[#938E7E]">الكاش</TableHead>
                  <TableHead className="text-right text-[#938E7E]">صافي المنصة</TableHead>
                  <TableHead className="text-right text-[#938E7E]">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(s?.audits ?? []).map((a) => (
                  <TableRow key={a.auditCode} className="border-[rgba(212,175,55,0.08)]">
                    <TableCell>
                      <span className="font-money ltr-nums text-[12px] font-bold text-[#F5D061]">{a.auditCode}</span>
                    </TableCell>
                    <TableCell className="text-[12px] text-[#C9C4B4]">{fmtDateTime(a.auditDate)}</TableCell>
                    <TableCell className="ltr-nums font-money text-[12px] text-[#C9C4B4]">{a.totalOrders}</TableCell>
                    <TableCell><Ly amount={a.gmvLyd} className="text-[12px]" /></TableCell>
                    <TableCell><Ly amount={a.cashCollectedLyd} className="text-[12px]" /></TableCell>
                    <TableCell>
                      <Ly amount={a.platformNetLyd} bold className="text-[12px] text-[#10B981]" />
                    </TableCell>
                    <TableCell>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          color: a.isClosed ? '#10B981' : '#F5D061',
                          background: a.isClosed ? 'rgba(16,185,129,0.12)' : 'rgba(212,175,55,0.12)',
                        }}
                      >
                        {a.isClosed ? 'مقفل' : 'مفتوح'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* دفتر السندات */}
      <SectionCard
        title="دفتر سندات القبض والصرف"
        icon={<ScrollText className="h-4 w-4" />}
        extra={
          <span className="text-[11px] text-[#938E7E]">
            <span className="ltr-nums font-money">{vouchersData?.vouchers.length ?? 0}</span> سنداً
          </span>
        }
      >
        {(vouchersData?.vouchers.length ?? 0) === 0 ? (
          <EmptyHint text="لا توجد سندات بعد — ستُسجل هنا كل حركة قبض وصرف" />
        ) : (
          <div className="wasel-scroll max-h-[300px] overflow-y-auto rounded-xl border border-[rgba(212,175,55,0.12)]">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(212,175,55,0.12)]">
                  <TableHead className="text-right text-[#938E7E]">رقم السند</TableHead>
                  <TableHead className="text-right text-[#938E7E]">النوع</TableHead>
                  <TableHead className="text-right text-[#938E7E]">المستفيد</TableHead>
                  <TableHead className="text-right text-[#938E7E]">المبلغ</TableHead>
                  <TableHead className="text-right text-[#938E7E]">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vouchersData?.vouchers ?? []).map((v) => {
                  const isReceipt = v.type === 'receipt'
                  return (
                    <TableRow key={v.id} className="border-[rgba(212,175,55,0.08)]">
                      <TableCell>
                        <OrderNo no={v.voucherNumber} className="text-[12px] font-bold text-[#F8F5EE]" />
                      </TableCell>
                      <TableCell>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            color: isReceipt ? '#10B981' : '#F5D061',
                            background: isReceipt ? 'rgba(16,185,129,0.12)' : 'rgba(212,175,55,0.12)',
                            border: `1px solid ${isReceipt ? 'rgba(16,185,129,0.4)' : 'rgba(212,175,55,0.4)'}`,
                          }}
                        >
                          {isReceipt ? 'قبض' : 'صرف'}
                        </span>
                      </TableCell>
                      <TableCell className="text-[12px] text-[#C9C4B4]">{v.beneficiaryName}</TableCell>
                      <TableCell><Ly amount={v.amountLyd} bold className="text-[12px]" /></TableCell>
                      <TableCell className="text-[11px] text-[#938E7E]">{fmtDateTime(v.createdAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* الأرقام المحظورة */}
      <SectionCard
        title="أرقام الهواتف المحظورة"
        icon={<Ban className="h-4 w-4" />}
        extra={
          <span className="text-[11px] text-[#938E7E]">
            <span className="ltr-nums font-money">{vouchersData?.blocked.length ?? 0}</span> رقماً
          </span>
        }
      >
        {(vouchersData?.blocked.length ?? 0) === 0 ? (
          <EmptyHint text="لا توجد أرقام محظورة — غرفة فض النزاعات تضيف هنا عند إثبات تعذر الاستلام" />
        ) : (
          <div className="wasel-scroll max-h-[240px] overflow-y-auto rounded-xl border border-[rgba(239,68,68,0.18)]">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(239,68,68,0.12)]">
                  <TableHead className="text-right text-[#938E7E]">الهاتف</TableHead>
                  <TableHead className="text-right text-[#938E7E]">السبب</TableHead>
                  <TableHead className="text-right text-[#938E7E]">تاريخ الحظر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vouchersData?.blocked ?? []).map((b) => (
                  <TableRow key={b.phone} className="border-[rgba(239,68,68,0.08)]">
                    <TableCell>
                      <span className="font-money ltr-nums text-[12px] font-bold text-[#EF4444]">{b.phone}</span>
                    </TableCell>
                    <TableCell className="text-[12px] text-[#C9C4B4]">{b.reason || '—'}</TableCell>
                    <TableCell className="text-[11px] text-[#938E7E]">{fmtDateTime(b.blockedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* تأكيد تقفيل اليومية */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F8F5EE]">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-[#F5D061]">تقفيل اليومية وإصدار محضر Z؟</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px] leading-relaxed text-[#C9C4B4]">
                <p>سيتم تجميد أرقام اليوم في محضر جرد رسمي غير قابل للتعديل:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>إجمالي التداول: <Ly amount={s?.gmvLyd ?? 0} bold className="text-[#F5D061]" /></li>
                  <li>الكاش المحصل: <Ly amount={s?.cashCollectedLyd ?? 0} bold className="text-[#10B981]" /></li>
                  <li>صافي المنصة: <Ly amount={s?.platformNetLyd ?? 0} bold className="text-[#F5D061]" /></li>
                </ul>
                <p className="text-[12px] text-[#938E7E]">تأكد من تسوية عهد الكباتن قبل التقفيل لتطابق النقدية الموردة.</p>
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
                void confirmClose()
              }}
              disabled={closing}
              className="min-h-12 bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
            >
              {closing ? 'جارٍ الإصدار…' : 'إصدار محضر Z'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* محضر Z الرسمي */}
      <Dialog open={!!audit} onOpenChange={(open) => !open && setAudit(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[rgba(212,175,55,0.35)] bg-[#062319] wasel-scroll sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#F5D061]">🏛️ محضر جرد يومي — Z</DialogTitle>
          </DialogHeader>
          {audit && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#041710] p-5"
            >
              <div className="border-b border-[rgba(212,175,55,0.2)] pb-3 text-center">
                <p className="text-lg font-extrabold text-[#F8F5EE]">🛡️ واصل نالوت — غرفة العمليات والمالية</p>
                <p className="font-money ltr-nums mt-1 text-2xl font-bold text-[#F5D061]">{audit.auditCode}</p>
                <p className="mt-1 text-[11px] text-[#938E7E]">{fmtDateTime(audit.auditDate)}</p>
              </div>
              <ul className="mt-4 space-y-3 text-[13px]">
                <ZRow label="إجمالي الطلبات اليوم" value={<span className="ltr-nums font-money">{audit.totalOrders}</span>} />
                <ZRow label="إجمالي التداول GMV" value={<Ly amount={audit.gmvLyd} bold className="text-[#F5D061]" />} />
                <ZRow label="الكاش المحصل" value={<Ly amount={audit.cashCollectedLyd} bold className="text-[#10B981]" />} />
                {audit.merchantDuesLyd !== undefined && (
                  <ZRow label="مستحقات التجار" value={<Ly amount={audit.merchantDuesLyd} className="text-[#F8F5EE]" />} />
                )}
                <ZRow label="صافي أرباح المنصة" value={<Ly amount={audit.platformNetLyd} bold className="text-[#F5D061]" />} />
              </ul>
              <p className="mt-4 rounded-lg border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] p-2 text-center text-[12px] font-bold text-[#10B981]">
                ✓ اليومية مقفلة ومحاسَبة — كل قرش مُساءل
              </p>
              {audit.notes && <p className="mt-2 text-center text-[11px] text-[#938E7E]">{audit.notes}</p>}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ZRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-dotted border-[rgba(212,175,55,0.15)] pb-2">
      <span className="text-[#938E7E]">{label}</span>
      {value}
    </li>
  )
}
