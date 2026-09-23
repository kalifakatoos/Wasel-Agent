'use client'

// ============================================================
// 🎟️ تاب التسويق — غرفة عمليات واصل نالوت
// إدارة كوبونات الخصم (إنشاء/تعطيل/إحصائيات) + أكواد شحن المحفظة
// الخصم تتحمله المنصة كاملاً — دينار ليبي حصرياً
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Loader2, Plus, TicketPercent, Gift, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Ly } from '@/components/wasel/Badges'
import { api } from '@/lib/wasel/api'
import { fmtDateTime } from './admin-shared'
import type { PromoAdmin, TopupCodeAdmin } from './admin-shared'

/// 📉 تقرير الفرص الضائعة الشهري (CRON-R9)
interface LostReport {
  days: number
  totals: { count: number; lostLyd: number }
  series: { date: string; label: string; count: number; lostLyd: number }[]
  codes: { code: string; count: number; lostLyd: number; topReason: string; lastAt: string | null }[]
}

const REJECT_REASON_LABELS_MK: Record<string, string> = {
  exhausted: 'نفدت الحصة',
  disabled: 'كوبون معطل',
  min_not_met: 'تحت الحد الأدنى',
  unknown: 'أخرى',
}

export interface CreatePromoInput {
  code: string
  label: string
  description: string
  emoji: string
  kind: 'percent' | 'flat' | 'cashback'
  percent?: number
  flatLyd?: number
  maxDiscountLyd?: number
  minSubtotalLyd: number
  maxUses?: number
}

function promoValueLabel(p: PromoAdmin): string {
  if (p.kind === 'cashback') {
    const cap = p.maxDiscountLyd != null ? ` حتى سقف ${p.maxDiscountLyd.toFixed(2)} د.ل` : ''
    return p.percent != null && p.percent > 0 ? `إيداع ${p.percent}%${cap}` : `إيداع ${(p.flatLyd ?? 0).toFixed(2)} د.ل`
  }
  if (p.kind === 'flat') return `خصم ثابت ${(p.flatLyd ?? 0).toFixed(2)} د.ل`
  const cap = p.maxDiscountLyd != null ? ` حتى سقف ${p.maxDiscountLyd.toFixed(2)} د.ل` : ''
  return `خصم ${p.percent}%${cap}`
}

// ============================================================
// بطاقة كوبون بشكل تذكرة مثقوبة
// ============================================================
function PromoTicket({
  promo,
  busy,
  onToggle,
}: {
  promo: PromoAdmin
  busy: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-dashed p-4 transition-all ${
        promo.isActive
          ? 'border-[rgba(212,175,55,0.5)] bg-gradient-to-bl from-[#0A3324] via-[#062319] to-[#041710]'
          : 'border-[rgba(147,142,126,0.3)] bg-[#041710]/70 opacity-70'
      }`}
    >
      {/* ثقوب التذكرة */}
      <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#041710] ring-1 ring-[rgba(212,175,55,0.25)]" />
      <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#041710] ring-1 ring-[rgba(212,175,55,0.25)]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.3)] bg-[#041710] text-2xl">
            {promo.emoji}
          </span>
          <div className="min-w-0">
            <p className="font-money ltr-nums text-sm font-black tracking-widest text-[#F5D061]" dir="ltr">
              {promo.code}
            </p>
            <p className="mt-0.5 truncate text-xs font-extrabold text-[#F8F5EE]">{promo.label}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[#938E7E]">{promo.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Switch
            checked={promo.isActive}
            disabled={busy}
            onCheckedChange={onToggle}
            aria-label={`${promo.isActive ? 'تعطيل' : 'تفعيل'} الكوبون ${promo.code}`}
          />
          {promo.kind === 'cashback' && (
            <Badge className="border-0 bg-[rgba(16,185,129,0.15)] px-2 py-0.5 text-[9px] font-bold text-[#10B981]">
              💸 كاش باك
            </Badge>
          )}
          <Badge
            className={`border-0 px-2 py-0.5 text-[9px] font-bold ${
              promo.isActive
                ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                : 'bg-[rgba(147,142,126,0.15)] text-[#938E7E]'
            }`}
          >
            {promo.isActive ? 'نشط' : 'مُعطّل'}
          </Badge>
        </div>
      </div>

      {/* خط perforation أفقي */}
      <div className="my-3 border-t border-dashed border-[rgba(212,175,55,0.25)]" />

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-xl bg-[rgba(212,175,55,0.07)] px-2 py-2">
          <p className="text-[10px] font-semibold text-[#938E7E]">{promo.kind === 'cashback' ? 'قيمة الإيداع' : 'قيمة الخصم'}</p>
          <p className="mt-0.5 text-[11px] font-extrabold text-[#F8F5EE]">{promoValueLabel(promo)}</p>
        </div>
        <div className="rounded-xl bg-[rgba(212,175,55,0.07)] px-2 py-2">
          <p className="text-[10px] font-semibold text-[#938E7E]">حد أدنى للطلب</p>
          <p className="mt-0.5 text-[11px] font-extrabold text-[#F8F5EE]">
            {promo.minSubtotalLyd > 0 ? `${promo.minSubtotalLyd.toFixed(2)} د.ل` : 'بلا حد'}
          </p>
        </div>
        <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-2 py-2">
          <p className="text-[10px] font-semibold text-[#938E7E]">مرات الاستخدام</p>
          <p className="font-money ltr-nums mt-0.5 text-[11px] font-extrabold text-[#10B981]">
            {promo.maxUses != null ? `${promo.usedCount} / ${promo.maxUses}` : promo.usedCount}
          </p>
          {promo.maxUses != null && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[rgba(212,175,55,0.15)]">
              <div
                className={`h-full rounded-full ${
                  promo.usedCount >= promo.maxUses
                    ? 'bg-[#EF4444]'
                    : promo.usedCount / promo.maxUses >= 0.75
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#10B981]'
                }`}
                style={{ width: `${Math.min(100, (promo.usedCount / promo.maxUses) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-2 py-2">
          <p className="text-[10px] font-semibold text-[#938E7E]">إجمالي ما وُفّر</p>
          <Ly amount={promo.totalDiscountLyd} bold className="text-[11px] text-[#10B981]" />
        </div>
      </div>
      <p className="font-money ltr-nums mt-2 text-[9px] text-[#938E7E]/60">
        أُنشئ: {fmtDateTime(promo.createdAt)} • الخصم على حساب المنصة (تسويق)
      </p>
    </motion.div>
  )
}

// ============================================================
// صف كود شحن
// ============================================================
function TopupCodeRow({
  code,
  busy,
  onToggle,
}: {
  code: TopupCodeAdmin
  busy: boolean
  onToggle: (next: boolean) => void
}) {
  const { toast } = useToast()
  const used = !!code.usedByPhone
  const stateLabel = used ? 'مستهلك' : code.isActive ? 'نشط' : 'مُعطّل'
  const stateClass = used
    ? 'bg-[rgba(147,142,126,0.15)] text-[#938E7E]'
    : code.isActive
      ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
      : 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.code)
      toast({ title: '📋 نُسخ الكود', description: code.code })
    } catch {
      toast({ title: code.code, description: 'انسخ الكود يدوياً' })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-[#041710] px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3324] text-lg">
        🎁
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-money ltr-nums text-xs font-black tracking-wider text-[#F5D061]" dir="ltr">
          {code.code}
        </p>
        <p className="mt-0.5 text-[10px] text-[#938E7E]">
          {used ? (
            <>
              استهلكه <span dir="ltr" className="font-money">{code.usedByPhone}</span>
            </>
          ) : (
            code.note || 'كود شحن محفظة — يُستخدم مرة واحدة'
          )}
          {' • '}
          <span className="font-money ltr-nums">{fmtDateTime(code.createdAt)}</span>
        </p>
      </div>
      <Ly amount={code.amountLyd} bold className="text-sm text-[#10B981]" />
      <Badge className={`border-0 px-2 py-0.5 text-[9px] font-bold ${stateClass}`}>{stateLabel}</Badge>
      <div className="flex items-center gap-1.5">
        <button
          onClick={copy}
          aria-label={`نسخ الكود ${code.code}`}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#938E7E] transition hover:bg-[rgba(212,175,55,0.12)] hover:text-[#F5D061]"
        >
          <Copy className="h-4 w-4" />
        </button>
        {!used && (
          <Switch
            checked={code.isActive}
            disabled={busy}
            onCheckedChange={onToggle}
            aria-label={`${code.isActive ? 'تعطيل' : 'تفعيل'} كود الشحن ${code.code}`}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// التاب الرئيسي
// ============================================================
export default function MarketingTab({
  promos,
  codes,
  busyKey,
  pin,
  onCreatePromo,
  onTogglePromo,
  onGenerateCodes,
  onToggleCode,
}: {
  promos: PromoAdmin[] | null
  codes: TopupCodeAdmin[] | null
  busyKey: string | null
  /** درع الـ PIN — لجلب تقرير الفرص الضائعة من الخادم */
  pin: string
  onCreatePromo: (data: CreatePromoInput) => Promise<boolean>
  onTogglePromo: (code: string, next: boolean) => Promise<void>
  onGenerateCodes: (amount: number, count: number, note: string) => Promise<boolean>
  onToggleCode: (code: string, next: boolean) => Promise<void>
}) {
  const { toast } = useToast()

  // ---------- 📉 تقرير الفرص الضائعة (30 يوماً) ----------
  const [lostReport, setLostReport] = useState<LostReport | null>(null)
  const [lostLoading, setLostLoading] = useState(true)
  const [lostHover, setLostHover] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    api<LostReport>('/api/admin/promos/report?days=30', {
      headers: { 'x-admin-pin': pin },
    })
      .then((r) => {
        if (alive) setLostReport(r)
      })
      .catch(() => {
        /* التقرير تحليلي — فشله لا يعطّل التاب */
      })
      .finally(() => {
        if (alive) setLostLoading(false)
      })
    return () => {
      alive = false
    }
  }, [pin])

  // ---------- حالة نموذج إنشاء كوبون ----------
  const [createOpen, setCreateOpen] = useState(false)
  const [pCode, setPCode] = useState('')
  const [pLabel, setPLabel] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pEmoji, setPEmoji] = useState('🎟️')
  const [pKind, setPKind] = useState<'percent' | 'flat' | 'cashback'>('percent')
  const [pPercent, setPPercent] = useState('10')
  const [pFlat, setPFlat] = useState('5')
  const [pCap, setPCap] = useState('')
  const [pMin, setPMin] = useState('0')
  const [pMaxUses, setPMaxUses] = useState('')

  const submitPromo = async () => {
    const ok = await onCreatePromo({
      code: pCode,
      label: pLabel,
      description: pDesc,
      emoji: pEmoji || '🎟️',
      kind: pKind,
      percent: pKind === 'percent' ? Number(pPercent) : undefined,
      flatLyd: pKind === 'flat' ? Number(pFlat) : undefined,
      maxDiscountLyd: pCap.trim() ? Number(pCap) : undefined,
      minSubtotalLyd: Number(pMin || '0'),
      maxUses: pMaxUses.trim() ? Number(pMaxUses) : undefined,
    })
    if (ok) {
      setCreateOpen(false)
      setPCode('')
      setPLabel('')
      setPDesc('')
      setPCap('')
      setPMaxUses('')
      setPMin('0')
    }
  }

  // ---------- حالة توليد أكواد شحن ----------
  const [giftOpen, setGiftOpen] = useState(false)
  const [gAmount, setGAmount] = useState('25')
  const [gCount, setGCount] = useState('5')
  const [gNote, setGNote] = useState('')

  const submitGifts = async () => {
    const ok = await onGenerateCodes(Number(gAmount), Number(gCount), gNote)
    if (ok) setGiftOpen(false)
  }

  const activePromos = promos?.filter((p) => p.isActive) ?? []
  const totalUsed = promos?.reduce((n, p) => n + p.usedCount, 0) ?? 0
  const totalDiscount = promos?.reduce((n, p) => n + p.totalDiscountLyd, 0) ?? 0

  // 📉 هندسة سباركلاين الفرص الضائعة
  const lostChart = useMemo(() => {
    const series = lostReport?.series ?? []
    if (series.length === 0) return null
    const W = 640
    const H = 120
    const PAD_X = 10
    const PAD_TOP = 12
    const PAD_BOTTOM = 20
    const maxLost = Math.max(...series.map((d) => d.lostLyd), 1)
    const stepX = (W - PAD_X * 2) / Math.max(1, series.length - 1)
    const pts = series.map((d, i) => ({
      x: PAD_X + i * stepX,
      y: PAD_TOP + (1 - d.lostLyd / maxLost) * (H - PAD_TOP - PAD_BOTTOM),
      ...d,
    }))
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_BOTTOM} L${pts[0].x.toFixed(1)},${H - PAD_BOTTOM} Z`
    return { W, H, pts, linePath, areaPath }
  }, [lostReport])
  const giftStats = (() => {
    const list = codes ?? []
    const used = list.filter((c) => c.usedByPhone).length
    const active = list.filter((c) => !c.usedByPhone && c.isActive).length
    const redeemed = list.filter((c) => c.usedByPhone).reduce((n, c) => n + c.amountLyd, 0)
    return { used, active, redeemed }
  })()

  return (
    <div className="space-y-6">
      {/* ======= 📉 تقرير الفرص الضائعة — آخر 30 يوماً (CRON-R9) ======= */}
      <section className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[#062319] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(239,68,68,0.3)] bg-[#041710] text-xl">
              📉
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8F5EE]">تقرير الفرص الضائعة — آخر 30 يوماً</h3>
              <p className="text-[10px] text-[#938E7E]">
                زبائن حاولوا كوبوناً نفدت حصته أو قِطع شرطه — كل محاولة عميل محتمل انسحب
              </p>
            </div>
          </div>
          {lostReport && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-2.5 py-1 font-bold text-[#EF4444]">
                <span className="ltr-nums font-money">{lostReport.totals.count}</span> محاولة مرفوضة
              </span>
              <span className="rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.08)] px-2.5 py-1 font-bold text-[#F5D061]">
                ≈ <Ly amount={lostReport.totals.lostLyd} bold /> قيمة مهدورة
              </span>
            </div>
          )}
        </div>

        {lostLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل التقرير">
            <span className="shimmer block h-20 w-full rounded-xl" />
            <span className="shimmer block h-10 w-full rounded-xl" />
          </div>
        ) : !lostChart || lostReport?.totals.count === 0 ? (
          <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-[rgba(16,185,129,0.3)] p-4 text-center text-xs text-[#10B981]">
            ✨ لا فرص ضائعة في آخر 30 يوماً — حصص الكوبونات تغطي الطلب بشكل ممتاز
          </div>
        ) : (
          <>
            {/* 📈 السلسلة اليومية للقيمة المهدورة */}
            <div className="relative">
              <svg
                viewBox={`0 0 ${lostChart.W} ${lostChart.H}`}
                className="w-full"
                role="img"
                aria-label="قيمة الفرص الضائعة يومياً خلال ثلاثين يوماً"
              >
                <defs>
                  <linearGradient id="lostSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[0.5].map((f) => (
                  <line
                    key={f}
                    x1="10"
                    x2={lostChart.W - 10}
                    y1={12 + f * (lostChart.H - 32)}
                    y2={12 + f * (lostChart.H - 32)}
                    stroke="rgba(212,175,55,0.08)"
                    strokeDasharray="3 5"
                  />
                ))}
                <path d={lostChart.areaPath} fill="url(#lostSparkFill)" />
                <motion.path
                  d={lostChart.linePath}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
                {lostChart.pts.map((p, i) => (
                  <g key={p.date}>
                    {p.lostLyd > 0 && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={lostHover === i ? 4 : 2.6}
                        fill={lostHover === i ? '#F5D061' : '#EF4444'}
                        stroke="#041710"
                        strokeWidth="1"
                      />
                    )}
                    {/* منطقة لمس عريضة لكل يوم */}
                    <rect
                      x={p.x - (lostChart.W / Math.max(1, lostChart.pts.length - 1)) / 2}
                      y={0}
                      width={lostChart.W / Math.max(1, lostChart.pts.length - 1)}
                      height={lostChart.H}
                      fill="transparent"
                      onMouseEnter={() => setLostHover(i)}
                      onMouseLeave={() => setLostHover(null)}
                    />
                  </g>
                ))}
                {lostHover != null && (
                  <line
                    x1={lostChart.pts[lostHover].x}
                    x2={lostChart.pts[lostHover].x}
                    y1="4"
                    y2={lostChart.H - 18}
                    stroke="rgba(245,208,97,0.55)"
                    strokeDasharray="3 3"
                  />
                )}
              </svg>
              {lostHover != null && lostChart.pts[lostHover] && (
                <div
                  className="chart-tip"
                  style={{
                    left: `${Math.min(Math.max((lostChart.pts[lostHover].x / lostChart.W) * 100, 12), 88)}%`,
                    top: `${(lostChart.pts[lostHover].y / lostChart.H) * 100}%`,
                  }}
                >
                  <p className="text-[10px] font-bold text-[#F5D061]">{lostChart.pts[lostHover].label}</p>
                  <p className="ltr-nums font-money text-sm font-extrabold text-[#F8F5EE]">
                    {lostChart.pts[lostHover].lostLyd.toFixed(2)} د.ل
                  </p>
                  <p className="text-[9px] text-[#938E7E]">
                    <span className="ltr-nums font-money">{lostChart.pts[lostHover].count}</span> محاولة مرفوضة
                  </p>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-[#938E7E]">
              مرّر المؤشر فوق الرسم لعرض تفاصيل كل يوم — القيم تقديرية للخصم الذي كان سيتحمله الكوبون
            </p>

            {/* تفصيل الأكواد */}
            {lostReport && lostReport.codes.length > 0 && (
              <div className="mt-3 space-y-2">
                {lostReport.codes.map((c, i) => (
                  <motion.div
                    key={c.code}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[#041710] px-3 py-2"
                  >
                    <span dir="ltr" className="font-money text-xs font-extrabold tracking-wider text-[#F5D061]">
                      {c.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        c.topReason === 'exhausted'
                          ? 'border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] text-[#EF4444]'
                          : c.topReason === 'disabled'
                            ? 'border border-[rgba(147,142,126,0.4)] bg-[rgba(147,142,126,0.08)] text-[#938E7E]'
                            : 'border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] text-[#F59E0B]'
                      }`}
                    >
                      {REJECT_REASON_LABELS_MK[c.topReason] ?? c.topReason}
                    </span>
                    <span className="ms-auto text-[11px] text-[#C9C4B4]">
                      <span className="ltr-nums font-money font-bold text-[#F8F5EE]">{c.count}</span> محاولات •
                      هدر ≈{' '}
                      <span className="ltr-nums font-money font-bold text-[#EF4444]">
                        {c.lostLyd.toFixed(2)} د.ل
                      </span>
                    </span>
                    {c.lastAt && (
                      <span className="ltr-nums text-[9px] text-[#938E7E]">آخر محاولة {fmtDateTime(c.lastAt)}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ======= كوبونات الخصم ======= */}
      <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.3)] bg-[#041710] text-xl">
              🎟️
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8F5EE]">كوبونات الخصم</h3>
              <p className="text-[10px] text-[#938E7E]">
                الخصم تتحمله المنصة كاملاً — لا يمس حصة المتجر ولا أجرة الكابتن
              </p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gold-sweep min-h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-4 text-xs font-extrabold text-[#041710] shadow-md shadow-[rgba(212,175,55,0.2)]">
                <Plus className="h-4 w-4" />
                كوبون جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="gold-text text-base font-extrabold">🎟️ إنشاء كوبون خصم</DialogTitle>
                <DialogDescription className="text-[11px] text-[#938E7E]">
                  يظهر فوراً على الزبائن في الدفع وصفحة الهبوط — التحقق خادمي بالكامل
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">الكود (إنجليزي)</Label>
                    <Input
                      dir="ltr"
                      value={pCode}
                      onChange={(e) => setPCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="RAMADAN20"
                      maxLength={16}
                      className="h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center font-money text-sm tracking-widest text-[#F8F5EE]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">الاسم العربي</Label>
                    <Input
                      value={pLabel}
                      onChange={(e) => setPLabel(e.target.value)}
                      placeholder="خصم رمضان"
                      maxLength={60}
                      className="h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm text-[#F8F5EE]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-[#938E7E]">الوصف للزبون</Label>
                  <Textarea
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    rows={2}
                    maxLength={140}
                    placeholder="20% على كل الطلبات حتى سقف 12 د.ل — طوال شهر رمضان"
                    className="resize-none rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-xs leading-relaxed text-[#F8F5EE]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">النوع</Label>
                    <Select value={pKind} onValueChange={(v) => setPKind(v as 'percent' | 'flat' | 'cashback')}>
                      <SelectTrigger className="h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-xs font-bold text-[#F8F5EE]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F8F5EE]">
                        <SelectItem value="percent">نسبة %</SelectItem>
                        <SelectItem value="flat">مبلغ ثابت</SelectItem>
                        <SelectItem value="cashback">💸 كاش باك محفظة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {pKind !== 'flat' ? (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-[#938E7E]">
                        {pKind === 'cashback' ? 'نسبة الإيداع %' : 'النسبة %'}
                      </Label>
                      <Input
                        dir="ltr"
                        type="number"
                        min={1}
                        max={90}
                        value={pPercent}
                        onChange={(e) => setPPercent(e.target.value)}
                        className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-[#938E7E]">المبلغ (د.ل)</Label>
                      <Input
                        dir="ltr"
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={pFlat}
                        onChange={(e) => setPFlat(e.target.value)}
                        className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE]"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">السقف (اختياري)</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={pCap}
                      onChange={(e) => setPCap(e.target.value)}
                      placeholder="—"
                      className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE] placeholder:text-[#938E7E]/40"
                    />
                  </div>
                </div>
                {pKind === 'cashback' && (
                  <p className="rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.07)] px-3 py-2.5 text-[10.5px] font-bold leading-relaxed text-[#10B981]">
                    💸 كاش باك: لا يخصم من الفاتورة — عند اكتمال التوصيل تُودع القيمة مباشرة في محفظة الزبون من ميزانية تسويق المنصة (قيد مزدوج موثّق).
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">حد أدنى للطلب (د.ل)</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      min={0}
                      step={1}
                      value={pMin}
                      onChange={(e) => setPMin(e.target.value)}
                      className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">الإيموجي</Label>
                    <Input
                      value={pEmoji}
                      onChange={(e) => setPEmoji(e.target.value)}
                      maxLength={4}
                      className="h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-[#938E7E]">
                    حصة الاستخدام (اختياري) — <span className="text-[#F59E0B]">تنفد عند الاستنفاد</span>
                  </Label>
                  <Input
                    dir="ltr"
                    type="number"
                    min={1}
                    step={1}
                    value={pMaxUses}
                    onChange={(e) => setPMaxUses(e.target.value)}
                    placeholder="مثال: 100 — اتركه فارغاً لغير محدود"
                    className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE] placeholder:text-[#938E7E]/40"
                  />
                  {pMaxUses.trim() && Number(pMaxUses) > 0 && (
                    <p className="text-[10px] font-bold text-[#F59E0B]">
                      🔥 سيظهر للزبائن شارة «متبقٍ {pMaxUses} استخدامات» وتنطفئ تلقائياً عند النفاد
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => void submitPromo()}
                  disabled={busyKey === 'promo:create' || !pCode.trim() || !pLabel.trim()}
                  className="h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710]"
                >
                  {busyKey === 'promo:create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketPercent className="h-4 w-4" />}
                  إنشاء الكوبون ونشره فوراً
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* إحصائيات سريعة */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[rgba(212,175,55,0.08)] px-3 py-2.5 text-center">
            <p className="font-money ltr-nums text-xl font-bold text-[#F5D061]">{activePromos.length}</p>
            <p className="text-[10px] font-semibold text-[#938E7E]">كوبون نشط</p>
          </div>
          <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-3 py-2.5 text-center">
            <p className="font-money ltr-nums text-xl font-bold text-[#10B981]">{totalUsed}</p>
            <p className="text-[10px] font-semibold text-[#938E7E]">مرة استخدام</p>
          </div>
          <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-3 py-2.5 text-center">
            <Ly amount={totalDiscount} bold className="text-xl text-[#10B981]" />
            <p className="text-[10px] font-semibold text-[#938E7E]">وفّرتها المنصة للزبائن</p>
          </div>
        </div>

        {!promos ? (
          <p className="py-8 text-center text-xs text-[#938E7E]">جارٍ تحميل الكوبونات…</p>
        ) : promos.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#938E7E]">لا كوبونات بعد — أنشئ أول كوبون 🎟️</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {promos.map((p) => (
              <PromoTicket
                key={p.code}
                promo={p}
                busy={busyKey === `promo:${p.code}`}
                onToggle={(next) => void onTogglePromo(p.code, next)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ======= أكواد شحن المحفظة ======= */}
      <section className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.35)] bg-[#041710] text-xl">
              🎁
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8F5EE]">أكواد شحن المحفظة</h3>
              <p className="text-[10px] text-[#938E7E]">
                بطاقات هدية مسبقة الدفع — تُشحن نقداً في المقر وتُباع للزبائن
              </p>
            </div>
          </div>
          <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-12 rounded-xl border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] px-4 text-xs font-extrabold text-[#10B981] hover:bg-[rgba(16,185,129,0.2)]">
                <Gift className="h-4 w-4" />
                توليد أكواد
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[rgba(16,185,129,0.35)] bg-[#062319] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold text-[#10B981]">🎁 توليد أكواد شحن</DialogTitle>
                <DialogDescription className="text-[11px] text-[#938E7E]">
                  كود بفئة واحدة يُستخدم مرة واحدة — يشحن محفظة الزبون فور إدخاله
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">قيمة الكود (د.ل)</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      min={5}
                      max={500}
                      step={5}
                      value={gAmount}
                      onChange={(e) => setGAmount(e.target.value)}
                      className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-[#938E7E]">عدد الأكواد (1-20)</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      min={1}
                      max={20}
                      value={gCount}
                      onChange={(e) => setGCount(e.target.value)}
                      className="font-money h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-center text-sm text-[#F8F5EE]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-[#938E7E]">ملاحظة (اختياري)</Label>
                  <Input
                    value={gNote}
                    onChange={(e) => setGNote(e.target.value)}
                    maxLength={120}
                    placeholder="دفعة رمضان — وكالة الحوامد"
                    className="h-11 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-xs text-[#F8F5EE]"
                  />
                </div>
                <Button
                  onClick={() => void submitGifts()}
                  disabled={busyKey === 'gift:create'}
                  className="h-12 w-full rounded-xl bg-gradient-to-l from-[#059669] to-[#10B981] text-sm font-extrabold text-[#041710]"
                >
                  {busyKey === 'gift:create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                  توليد الأكواد
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-3 py-2.5 text-center">
            <p className="font-money ltr-nums text-xl font-bold text-[#10B981]">{giftStats.active}</p>
            <p className="text-[10px] font-semibold text-[#938E7E]">كود جاهز للبيع</p>
          </div>
          <div className="rounded-xl bg-[rgba(212,175,55,0.08)] px-3 py-2.5 text-center">
            <p className="font-money ltr-nums text-xl font-bold text-[#F5D061]">{giftStats.used}</p>
            <p className="text-[10px] font-semibold text-[#938E7E]">كود مستهلك</p>
          </div>
          <div className="rounded-xl bg-[rgba(16,185,129,0.08)] px-3 py-2.5 text-center">
            <Ly amount={giftStats.redeemed} bold className="text-xl text-[#10B981]" />
            <p className="text-[10px] font-semibold text-[#938E7E]">أُعيدت للمحافظ</p>
          </div>
        </div>

        {!codes ? (
          <p className="py-8 text-center text-xs text-[#938E7E]">جارٍ تحميل الأكواد…</p>
        ) : codes.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#938E7E]">
            لا أكواد بعد — ولّد أول دفعة بطاقات هدية 🎁
          </p>
        ) : (
          <div className="wasel-scroll max-h-[52vh] space-y-2 overflow-y-auto pe-1">
            {codes.map((c) => (
              <TopupCodeRow
                key={c.id}
                code={c}
                busy={busyKey === `gift:${c.code}`}
                onToggle={(next) => void onToggleCode(c.code, next)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
