'use client'

// ============================================================
// 🏛️ المحاسبة Z — جرد وسندات وحظر — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BadgeAlert, Ban, Landmark, Printer, ScrollText, ShieldCheck, TrendingUp } from 'lucide-react'
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

// ============================================================
// 📈 سباركلاين المبيعات الشهرية (R11) — GMV آخر 30 يوماً بتفاعل تحويم حي
// ============================================================
function MonthlySalesSparkline({
  trend,
}: {
  trend: { date: string; label: string; gmvLyd: number; orders: number }[]
}) {
  const [hover, setHover] = useState<number | null>(null)

  const chart = useMemo(() => {
    if (trend.length === 0) return null
    const W = 660
    const H = 130
    const PAD_X = 10
    const PAD_TOP = 14
    const PAD_BOTTOM = 22
    const maxGmv = Math.max(...trend.map((d) => d.gmvLyd), 1)
    const stepX = (W - PAD_X * 2) / Math.max(1, trend.length - 1)
    const pts = trend.map((d, i) => ({
      x: PAD_X + i * stepX,
      y: PAD_TOP + (1 - d.gmvLyd / maxGmv) * (H - PAD_TOP - PAD_BOTTOM),
      ...d,
    }))
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_BOTTOM} L${pts[0].x.toFixed(1)},${H - PAD_BOTTOM} Z`
    const total = trend.reduce((s, d) => s + d.gmvLyd, 0)
    const totalOrders = trend.reduce((s, d) => s + d.orders, 0)
    const best = trend.reduce((b, d) => (d.gmvLyd > b.gmvLyd ? d : b), trend[0])
    return { W, H, PAD_BOTTOM, pts, linePath, areaPath, total, totalOrders, best, activeDays: trend.filter((d) => d.gmvLyd > 0).length }
  }, [trend])

  if (!chart) {
    return <EmptyHint text="لا بيانات مبيعات بعد — أول يوم توصيل سيلون الخط" />
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10.5px]">
        <span className="rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.08)] px-2.5 py-1 font-bold text-[#F5D061]">
          إجمالي 30 يوماً ≈ <Ly amount={chart.total} bold />
        </span>
        <span className="rounded-full border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.08)] px-2.5 py-1 font-bold text-[#10B981]">
          <span className="ltr-nums font-money">{chart.totalOrders}</span> طلب مسلّم
        </span>
        <span className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.05)] px-2.5 py-1 font-bold text-[#C9C4B4]">
          🏆 أفضل يوم: {chart.best.label} ≈ <Ly amount={chart.best.gmvLyd} bold />
        </span>
        <span className="rounded-full border border-[rgba(147,142,126,0.3)] bg-[rgba(147,142,126,0.06)] px-2.5 py-1 font-bold text-[#938E7E]">
          <span className="ltr-nums font-money">{chart.activeDays}</span> يوم نشط
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          className="w-full"
          role="img"
          aria-label="اتجاه المبيعات اليومية خلال ثلاثين يوماً"
        >
          <defs>
            <linearGradient id="zSalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.5].map((f) => (
            <line
              key={f}
              x1="10"
              x2={chart.W - 10}
              y1={14 + f * (chart.H - 36)}
              y2={14 + f * (chart.H - 36)}
              stroke="rgba(212,175,55,0.08)"
              strokeDasharray="3 5"
            />
          ))}
          <path d={chart.areaPath} fill="url(#zSalesFill)" />
          <motion.path
            d={chart.linePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
          {chart.pts.map((p, i) => (
            <g key={p.date}>
              {p.gmvLyd > 0 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hover === i ? 4.2 : 2.4}
                  fill={hover === i ? '#F5D061' : '#10B981'}
                  stroke="#041710"
                  strokeWidth="1"
                />
              )}
              <rect
                x={p.x - chart.W / Math.max(1, chart.pts.length - 1) / 2}
                y={0}
                width={chart.W / Math.max(1, chart.pts.length - 1)}
                height={chart.H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
          {hover != null && (
            <line
              x1={chart.pts[hover].x}
              x2={chart.pts[hover].x}
              y1="4"
              y2={chart.H - 20}
              stroke="rgba(245,208,97,0.55)"
              strokeDasharray="3 3"
            />
          )}
        </svg>
        {hover != null && chart.pts[hover] && (
          <div
            className="chart-tip"
            style={{
              left: `${Math.min(Math.max((chart.pts[hover].x / chart.W) * 100, 12), 88)}%`,
              top: `${(chart.pts[hover].y / chart.H) * 100}%`,
            }}
          >
            <p className="text-[10px] font-bold text-[#F5D061]">
              {chart.pts[hover].label} • {new Date(chart.pts[hover].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
            <p className="ltr-nums font-money text-sm font-extrabold text-[#F8F5EE]">
              {chart.pts[hover].gmvLyd.toFixed(2)} د.ل
            </p>
            <p className="text-[9px] text-[#938E7E]">
              <span className="ltr-nums font-money">{chart.pts[hover].orders}</span> طلب مسلّم
            </p>
          </div>
        )}
      </div>
      <p className="mt-1 text-[10px] text-[#938E7E]">مرّر المؤشر فوق الخط لعرض مبيعات كل يوم — الطلبات المسلّمة فقط</p>
    </div>
  )
}

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

      {/* 📈 R11: سباركلاين المبيعات الشهرية */}
      <SectionCard
        title="اتجاه المبيعات — آخر 30 يوماً"
        icon={<TrendingUp className="h-4 w-4" />}
        extra={
          <span className="rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-3 py-1 text-[11px] font-bold text-[#10B981]">
            طلبات مسلّمة فقط
          </span>
        }
      >
        <MonthlySalesSparkline trend={s?.monthlyTrend ?? []} />
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
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            color: a.isClosed ? '#10B981' : '#F5D061',
                            background: a.isClosed ? 'rgba(16,185,129,0.12)' : 'rgba(212,175,55,0.12)',
                          }}
                        >
                          {a.isClosed ? 'مقفل' : 'مفتوح'}
                        </span>
                        <button
                          onClick={() => printZReport(a)}
                          aria-label={`طباعة محضر ${a.auditCode}`}
                          title="طباعة / حفظ PDF"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#938E7E] transition hover:bg-[rgba(212,175,55,0.12)] hover:text-[#F5D061]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                {audit.cashbackCreditedLyd != null && audit.cashbackCreditedLyd > 0 && (
                  <ZRow
                    label="💸 كاش باك وُدع للمحافظ"
                    value={<Ly amount={audit.cashbackCreditedLyd} className="text-[#10B981]" />}
                  />
                )}
                {audit.promoRejectsCount != null && audit.promoRejectsCount > 0 && (
                  <ZRow
                    label="📉 فرص ضائعة (كوبونات مرفوضة)"
                    value={
                      <span className="ltr-nums font-money text-[#F59E0B]">
                        {audit.promoRejectsCount} × ≈ {(audit.promoRejectsLossLyd ?? 0).toFixed(2)} د.ل
                      </span>
                    }
                  />
                )}
              </ul>
              <p className="mt-4 rounded-lg border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] p-2 text-center text-[12px] font-bold text-[#10B981]">
                ✓ اليومية مقفلة ومحاسَبة — كل قرش مُساءل
              </p>
              {audit.notes && <p className="mt-2 text-center text-[11px] text-[#938E7E]">{audit.notes}</p>}

              {/* 🖨️ طباعة المحضر / حفظه PDF */}
              <Button
                onClick={() => printZReport(audit)}
                className="mt-4 h-12 w-full rounded-xl border border-[rgba(212,175,55,0.45)] bg-[#041710] text-sm font-extrabold text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.1)]"
              >
                <Printer className="h-4 w-4" />
                طباعة المحضر / حفظه PDF
              </Button>
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

// ============================================================
// 🖨️ طباعة محضر Z — A4 عربي RTL جاهز للحفظ PDF أو الورق
// عبر iframe خفي كي لا تتأثر ستايلات التطبيق الداكنة
// ============================================================
function buildZPrintHtml(a: AuditRecord): string {
  const fmt = (n: number) => n.toFixed(2)
  const rows: [string, string][] = [
    ['إجمالي الطلبات اليوم', String(a.totalOrders)],
    ['إجمالي التداول GMV', `${fmt(a.gmvLyd)} د.ل`],
    ['الكاش المحصل', `${fmt(a.cashCollectedLyd)} د.ل`],
  ]
  if (a.merchantDuesLyd !== undefined) rows.push(['مستحقات التجار', `${fmt(a.merchantDuesLyd)} د.ل`])
  rows.push(['صافي أرباح المنصة', `${fmt(a.platformNetLyd)} د.ل`])

  const dateText = new Date(a.auditDate).toLocaleString('ar-LY', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  // صفوف تحليلية إضافية (كاش باك + فرص ضائعة) — تظهر فقط عند توفر بيانات
  const analyticsRows: string[] = []
  if (a.cashbackCreditedLyd != null && a.cashbackCreditedLyd > 0) {
    analyticsRows.push(`<tr><td>كاش باك وُدع للمحافظ (كوبونات)</td><td class="v">${fmt(a.cashbackCreditedLyd)} د.ل</td></tr>`)
  }
  if (a.promoRejectsCount != null && a.promoRejectsCount > 0) {
    analyticsRows.push(
      `<tr><td>فرص ضائعة — كوبونات مرفوضة</td><td class="v">${a.promoRejectsCount} محاولة ≈ ${fmt(a.promoRejectsLossLyd ?? 0)} د.ل</td></tr>`,
    )
  }

  // 🔏 الختم الإلكتروني SVG — دائري مائل بختم واصل المعتمد
  const sealSvg = `<svg class="seal-svg" viewBox="0 0 160 160" width="128" height="128" aria-hidden="true">
    <defs>
      <path id="sealArcTop" d="M 80,80 m -56,0 a 56,56 0 1,1 112,0" />
      <path id="sealArcBottom" d="M 80,80 m -56,0 a 56,56 0 1,0 112,0" />
    </defs>
    <circle cx="80" cy="80" r="74" fill="none" stroke="#0a5c3c" stroke-width="3" opacity="0.75" />
    <circle cx="80" cy="80" r="64" fill="none" stroke="#0a5c3c" stroke-width="1.2" opacity="0.55" />
    <circle cx="80" cy="80" r="42" fill="none" stroke="#0a5c3c" stroke-width="1.2" opacity="0.55" />
    <text font-size="13.5" font-weight="800" fill="#0a5c3c" opacity="0.85" letter-spacing="2">
      <textPath href="#sealArcTop" startOffset="50%" text-anchor="middle">واصل نالوت • غرفة العمليات</textPath>
    </text>
    <text font-size="11.5" font-weight="700" fill="#0a5c3c" opacity="0.85" letter-spacing="1">
      <textPath href="#sealArcBottom" startOffset="50%" text-anchor="middle">NALUT • LIBYA • LYD</textPath>
    </text>
    <text x="80" y="74" text-anchor="middle" font-size="15" font-weight="800" fill="#0a5c3c" opacity="0.9">معتمد</text>
    <text x="80" y="92" text-anchor="middle" font-size="10.5" font-weight="700" fill="#b8860b" opacity="0.95">${a.auditCode}</text>
    <text x="80" y="106" text-anchor="middle" font-size="9" font-weight="700" fill="#0a5c3c" opacity="0.7">كل قرش مُساءل</text>
  </svg>`

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>محضر جرد يومي Z — ${a.auditCode}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    color: #1a1a1a;
    background: #fff;
    padding: 24px;
  }
  .sheet { max-width: 640px; margin: 0 auto; }
  .head {
    text-align: center;
    border: 2px solid #0a5c3c;
    border-radius: 12px;
    padding: 18px 16px;
    background: #f2faf6;
  }
  .head .brand { font-size: 20px; font-weight: 800; color: #0a5c3c; }
  .head .code { font-size: 26px; font-weight: 800; letter-spacing: 1px; margin-top: 6px; color: #b8860b; font-variant-numeric: tabular-nums; }
  .head .date { font-size: 12px; color: #555; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; }
  td { padding: 12px 10px; border-bottom: 1px dotted #999; font-size: 14px; }
  td.v { text-align: left; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.total td { border-bottom: 2px solid #0a5c3c; color: #0a5c3c; font-size: 15px; }
  .seal {
    margin-top: 24px;
    border: 1.5px dashed #0a5c3c;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #0a5c3c;
    background: #f2faf6;
  }
  .seal-svg {
    display: block;
    margin: 18px auto 0;
    transform: rotate(-8deg);
    opacity: 0.88;
  }
  .notes { margin-top: 14px; font-size: 12px; color: #444; text-align: center; }
  .sign { margin-top: 42px; display: flex; justify-content: space-between; }
  .sign div { width: 44%; border-top: 1.5px solid #333; padding-top: 8px; text-align: center; font-size: 12px; color: #333; }
  .foot { margin-top: 34px; text-align: center; font-size: 11px; color: #888; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">🛡️ واصل نالوت — غرفة العمليات والمالية</div>
      <div style="font-size:13px;color:#555;margin-top:4px">محضر جرد يومي رسمي — Z Report</div>
      <div class="code">${a.auditCode}</div>
      <div class="date">${dateText}</div>
    </div>
    <table>
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td>${k}</td><td class="v">${v}</td></tr>`,
        )
        .join('\n      ')}
      ${analyticsRows.join('\n      ')}
      <tr class="total"><td>حالة اليومية</td><td class="v">${a.isClosed ? 'مقفلة ومعتمدة ✓' : 'مفتوحة'}</td></tr>
    </table>
    <div class="seal">✓ اليومية مقفلة ومحاسَبة — كل قرش مُساءل بموجب ميثاق واصل الشرعي</div>
    ${sealSvg}
    ${a.notes ? `<div class="notes">ملاحظات: ${a.notes}</div>` : ''}
    <div class="sign">
      <div>توقيع أمين الصندوق</div>
      <div>توقيع مدير العمليات</div>
    </div>
    <div class="foot">واصل نالوت • نالوت، ليبيا • بالدينار الليبي حصرياً • لا رسوم خفية</div>
  </div>
</body>
</html>`
}

function printZReport(a: AuditRecord): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(buildZPrintHtml(a))
  doc.close()
  // مهلة قصيرة لرندر الخطوط والجداول قبل فتح حوار الطباعة
  iframe.contentWindow?.focus()
  window.setTimeout(() => {
    iframe.contentWindow?.print()
    window.setTimeout(() => iframe.remove(), 1200)
  }, 350)
}
