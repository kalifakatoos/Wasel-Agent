'use client'

// ============================================================
// 📊 لوحة المؤشرات — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Banknote,
  Building2,
  Coins,
  Gift,
  HandCoins,
  PackageCheck,
  PlusCircle,
  Radar,
  Smartphone,
  Store,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { AccountingSummary } from '@/lib/wasel/types'
import { CUSTODY_CAP_LYD } from '@/lib/wasel/constants'
import { NalutMap } from '@/components/wasel/NalutMap'
import { KpiCard, SectionCard, EmptyHint, KpiGridSkeleton, fmtClock, useAnimatedNumber, type FeedEvent, type FleetPos } from './admin-shared'

const FEED_STYLE: Record<FeedEvent['kind'], { icon: ReactNode; color: string; bg: string }> = {
  status: { icon: <Activity className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  radar: { icon: <Radar className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  custody: { icon: <Banknote className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  payout: { icon: <Building2 className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  promo: { icon: <TicketPercent className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  topup: { icon: <Gift className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
}

const REJECT_REASON_LABELS: Record<string, string> = {
  exhausted: 'نفدت الحصة',
  disabled: 'كوبون معطل',
  min_not_met: 'تحت الحد الأدنى',
  unknown: 'أخرى',
}

export default function DashboardTab({
  summary,
  events,
  lastSync,
  positions = {},
  quickRenew,
  renewBusyCode = null,
}: {
  summary: AccountingSummary | null
  events: FeedEvent[]
  lastSync: number | null
  positions?: Record<string, FleetPos>
  /** ⚡ تجديد سريع لحصة كوبون نافد (يُمرر من غرفة العمليات) */
  quickRenew?: (code: string, addUses?: number) => Promise<void>
  renewBusyCode?: string | null
}) {
  const s = summary
  const custodyHot = (s?.captainCustodyLyd ?? 0) > CUSTODY_CAP_LYD
  // 🎈 نقطة السباركلاين المُحوَّم عليها (تلميح تفاعلي بالتاريخ والقيمة)
  const [sparkHover, setSparkHover] = useState<number | null>(null)

  // 🗺️ مواقع الكباتن الحية للخريطة المصغرة
  // البث اللحظي أولاً (تيليمتري الرادار) — وإن لم يصل بث بعد نستخدم آخر إحداثيات معروفة من قاعدة البيانات
  const fleetState = (() => {
    const live = Object.values(positions)
    if (live.length > 0) {
      return live.map((p) => ({
        id: p.driverId,
        lat: p.lat,
        lng: p.lng,
        status: p.status,
        active: p.status === 'busy',
      }))
    }
    return (s?.drivers ?? [])
      .filter((d) => d.currentLatitude != null && d.currentLongitude != null && d.status !== 'offline')
      .map((d) => ({
        id: d.id,
        lat: d.currentLatitude as number,
        lng: d.currentLongitude as number,
        status: d.status,
        active: d.status === 'busy',
      }))
  })()
  const fleetMarkers = fleetState.map((d) => ({
    id: d.id,
    lat: d.lat,
    lng: d.lng,
    kind: 'captain' as const,
    active: d.active,
  }))
  const fleetOnline = fleetState.filter((d) => d.status !== 'offline').length
  const fleetBusy = fleetState.filter((d) => d.status === 'busy').length

  return (
    <div className="space-y-4">
      {/* شبكة المؤشرات — دخول متدرج لكل البطاقات (هيكل عظمي متلألئ أثناء التحميل الأول) */}
      {!s && <KpiGridSkeleton />}
      <div className={s ? 'kpi-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4' : 'hidden'}>
        <KpiCard
          icon={<Coins className="h-5 w-5 text-[#F5D061]" />}
          label="إجمالي التداول GMV"
          hint="قيمة الطلبات المسلّمة اليوم"
          tone="gold"
          amount={s?.gmvLyd ?? 0}
        />
        <KpiCard
          icon={<Banknote className="h-5 w-5 text-[#10B981]" />}
          label="الكاش المحصل"
          hint="نقدية داخل طلبات اليوم المسلّمة"
          tone="emerald"
          amount={s?.cashCollectedLyd ?? 0}
        />
        <KpiCard
          icon={<Store className="h-5 w-5 text-[#F5D061]" />}
          label="مستحقات التجار (90%)"
          hint="نصيب المتاجر من ثمن الوجبات"
          tone="gold"
          amount={s?.merchantDuesLyd ?? 0}
        />
        <KpiCard
          icon={<Building2 className="h-5 w-5 text-[#10B981]" />}
          label="أرباح المنصة (10%)"
          hint="صافي عمولة واصل نالوت"
          tone="emerald"
          amount={s?.platformNetLyd ?? 0}
        />
        <KpiCard
          icon={<HandCoins className="h-5 w-5 text-[#F59E0B]" />}
          label="عهد الكباتن المتراكمة"
          hint={custodyHot ? '⚠️ تجاوزت سقف الأمان 500 د.ل' : 'نقدية بحوزة الأسطول الآن'}
          tone={custodyHot ? 'warn' : 'plain'}
          amount={s?.captainCustodyLyd ?? 0}
        />
        <KpiCard
          icon={<Smartphone className="h-5 w-5 text-[#F5D061]" />}
          label="مدفوعات المحفظة"
          hint="طلبات مسلّمة عبر محفظة واصل"
          tone="gold"
          amount={s?.walletPaymentsLyd ?? 0}
        />
        <KpiCard
          icon={<Activity className="h-5 w-5 text-[#10B981]" />}
          label="أرباح الكباتن المستحقة"
          hint="إجمالي أجور التوصيل والعمل"
          tone="emerald"
          amount={s?.captainDuesLyd ?? 0}
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5 text-[#F5D061]" />}
          label="طلبات نشطة / مسلّمة"
          hint={`من إجمالي ${s?.totalOrders ?? 0} طلباً اليوم`}
          tone="plain"
          text={`${s?.activeOrders ?? 0} نشط • ${s?.deliveredOrders ?? 0} مسلّم`}
        />
        {/* 🛵 بطاقة نجاح التوزيع المخصصة مع شريط تقدم */}
        {(() => {
          const eligible = s?.dispatchEligible ?? 0
          const assigned = s?.dispatchAssigned ?? 0
          const pct = eligible > 0 ? Math.round((assigned / eligible) * 100) : 0
          const good = pct >= 80
          return (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 transition col-span-2 md:col-span-3 xl:col-span-2 ${
                good
                  ? 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.07)]'
                  : 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.07)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#041710]">
                    <Radar className={`h-5 w-5 ${good ? 'text-[#10B981]' : 'text-[#F59E0B]'}`} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#938E7E]">نجاح التوزيع (الرادار)</p>
                    <p className={`ltr-nums font-money text-xl font-bold ${good ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                      {eligible > 0 ? `${pct}%` : '—'}
                    </p>
                  </div>
                </div>
                <span className="ltr-nums font-money text-[11px] font-bold text-[#F8F5EE]">
                  {assigned}/{eligible}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#041710]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${eligible > 0 ? pct : 0}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full ${good ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
                />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[#938E7E]">
                {eligible === 0
                  ? 'لا طلبات مؤهلة للتوزيع بعد اليوم'
                  : good
                    ? 'الأسطول يستوعب الطلبات بكفاءة ممتازة'
                    : 'طلبات بلا كابتن — فعّل المزيد من الكباتن'}
              </p>
            </div>
          )
        })()}
        {/* 🎟️ بطاقة تحليلات الكوبونات اليومية (الخصم تتحمله المنصة) */}
        {(() => {
          const discount = s?.promoDiscountLyd ?? 0
          const cashback = s?.promoCashbackLyd ?? 0
          const cashbackOrders = s?.promoCashbackOrders ?? 0
          const orders = s?.promoOrders ?? 0
          const breakdown = (s?.promoBreakdown ?? []).slice(0, 3)
          const avg = orders > 0 ? Math.round((discount / orders) * 100) / 100 : 0
          return (
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.06)] p-4 col-span-2 md:col-span-3 xl:col-span-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#041710]">
                    <TicketPercent className="h-5 w-5 text-[#F5D061]" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#938E7E]">كوبونات اليوم (تحمّلتها المنصة)</p>
                    <p className="ltr-nums font-money text-xl font-bold text-[#F5D061]">
                      {(discount + cashback).toFixed(2)} <span className="text-xs">د.ل</span>
                    </p>
                  </div>
                </div>
                <span className="ltr-nums font-money text-[11px] font-bold text-[#F8F5EE]">
                  {orders} طلب
                </span>
              </div>
              {breakdown.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {breakdown.map((p) => (
                    <li key={p.code} className="flex items-center justify-between rounded-lg bg-[#041710] px-2.5 py-1.5">
                      <span dir="ltr" className="ltr-nums font-money text-[11px] font-bold tracking-wider text-[#F5D061]">
                        {p.code}
                      </span>
                      <span className="ltr-nums font-money text-[11px] font-semibold text-[#10B981]">
                        {p.uses}× • {p.discountLyd.toFixed(2)} د.ل
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {/* 💸 سطر الكاش باك المودع للمحافظ */}
              {cashback > 0 && (
                <p className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-2.5 py-1.5 text-[10.5px] font-bold text-[#10B981]">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  منها كاش باك وُدع للمحافظ: {cashback.toFixed(2)} د.ل عبر {cashbackOrders} طلباً
                </p>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-[#938E7E]">
                {orders === 0
                  ? 'لا كوبونات مستخدمة اليوم — فكّر بحملة تشويقية مسائية'
                  : `متوسط الوفر للزبون ${avg.toFixed(2)} د.ل بالطلب المخصوم — الكوبونات تبني الولاء وتزيد تكرار الطلب`}
              </p>
            </div>
          )
        })()}
        {/* 📉 بطاقة الفرص الضائعة — محاولات كوبونات مرفوضة اليوم (تحليلات الندرة) */}
        {(() => {
          const rejects = s?.promoRejects
          const count = rejects?.count ?? 0
          const lost = rejects?.lostLyd ?? 0
          const breakdown = (rejects?.breakdown ?? []).slice(0, 3)
          const hot = count >= 5
          return (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 col-span-2 md:col-span-3 xl:col-span-2 transition-colors ${
                count === 0
                  ? 'border-[rgba(147,142,126,0.25)] bg-[#062319]/60'
                  : hot
                    ? 'border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.06)]'
                    : 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.06)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#041710]">
                    <TrendingDown className={`h-5 w-5 ${count === 0 ? 'text-[#938E7E]' : hot ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#938E7E]">فرص ضائعة اليوم (كوبونات مرفوضة)</p>
                    <p className={`ltr-nums font-money text-xl font-bold ${count === 0 ? 'text-[#938E7E]' : hot ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {count === 0 ? '—' : count}
                      {count > 0 && <span className="ms-2 text-xs font-bold">محاولة مرفوضة</span>}
                    </p>
                  </div>
                </div>
                {count > 0 && (
                  <span className="ltr-nums font-money rounded-full border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-[10px] font-bold text-[#EF4444]">
                    خسارة ≈ {lost.toFixed(2)} د.ل
                  </span>
                )}
              </div>
              {count === 0 ? (
                <p className="mt-3 text-[10px] leading-relaxed text-[#938E7E]">
                  لا محاولات مرفوضة بعد — عندما يحاول زبون استخدام كوبون نفدت حصته يُسجّل هنا لتحليل الندرة.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {breakdown.map((r) => (
                    <li key={r.code} className="flex items-center justify-between gap-2 rounded-lg bg-[#041710] px-2.5 py-1.5">
                      <span dir="ltr" className="ltr-nums font-money text-[11px] font-bold tracking-wider text-[#F8F5EE]">
                        {r.code}
                      </span>
                      <span className="ltr-nums font-money flex items-center gap-2 text-[11px] font-semibold text-[#F59E0B]">
                        <span className="rounded-full bg-[rgba(147,142,126,0.15)] px-2 py-0.5 text-[9px] font-bold text-[#938E7E]">
                          {REJECT_REASON_LABELS[r.topReason] ?? r.topReason}
                        </span>
                        {r.count}× ≈ {r.lostLyd.toFixed(2)} د.ل
                      </span>
                      {r.topReason === 'exhausted' && quickRenew && (
                        <button
                          onClick={() => void quickRenew(r.code)}
                          disabled={renewBusyCode === r.code}
                          className="gold-sweep flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-2.5 text-[10px] font-black text-[#041710] transition hover:from-[#C59B27] hover:to-[#D4AF37] disabled:opacity-50"
                        >
                          <PlusCircle className="h-3 w-3" />
                          {renewBusyCode === r.code ? '…' : 'جدّد +10'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-[#938E7E]">
                {count === 0
                  ? 'صحّة حملة ممتازة — الحصص الحالية كافية للطلب'
                  : `زِد حصة أو جدّد كود ${breakdown[0]?.code ?? 'الحملة'} لاستعادة هؤلاء الزبائن — كل محاولة مرفوضة عميل محتمل انسحب`}
              </p>
            </div>
          )
        })()}
        {/* 📈 بطاقة اتجاه GMV الأسبوعي — سباركلاين حي لآخر 7 أيام */}
        {(() => {
          const trend = s?.weeklyTrend ?? []
          if (trend.length === 0) return null
          const W = 320
          const H = 96
          const PAD_X = 8
          const PAD_TOP = 10
          const PAD_BOTTOM = 22
          const maxGmv = Math.max(...trend.map((d) => d.gmvLyd), 1)
          const stepX = (W - PAD_X * 2) / (trend.length - 1)
          const pts = trend.map((d, i) => ({
            x: PAD_X + i * stepX,
            y: PAD_TOP + (1 - d.gmvLyd / maxGmv) * (H - PAD_TOP - PAD_BOTTOM),
            ...d,
          }))
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_BOTTOM} L${pts[0].x.toFixed(1)},${H - PAD_BOTTOM} Z`
          const today = pts[pts.length - 1]
          const yesterday = pts[pts.length - 2]
          const delta = yesterday && yesterday.gmvLyd > 0 ? ((today.gmvLyd - yesterday.gmvLyd) / yesterday.gmvLyd) * 100 : null
          const weekTotal = trend.reduce((acc, d) => acc + d.gmvLyd, 0)
          const bestDay = trend.reduce((b, d) => (d.gmvLyd > b.gmvLyd ? d : b), trend[0])
          const rising = delta != null && delta >= 0
          return (
            <div className="card-lift spark-sheen relative overflow-hidden rounded-2xl border border-[rgba(16,185,129,0.3)] bg-[#062319]/70 p-4 col-span-2 md:col-span-3 xl:col-span-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#041710]">
                    <TrendingUp className="h-5 w-5 text-[#10B981]" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#938E7E]">اتجاه GMV — آخر 7 أيام</p>
                    <p className="ltr-nums font-money text-xl font-bold text-[#10B981]">
                      {weekTotal.toFixed(2)} <span className="text-xs">د.ل</span>
                    </p>
                  </div>
                </div>
                {delta != null && (
                  <span
                    className={`ltr-nums font-money flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      rising
                        ? 'border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                        : 'border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] text-[#EF4444]'
                    }`}
                  >
                    {rising ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% عن أمس
                  </span>
                )}
              </div>
              <div className="relative mt-3">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="رسم بياني لتداول آخر سبعة أيام">
                  <defs>
                    <linearGradient id="gmvSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* خطوط شبكة أفقية خافتة */}
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line
                      key={f}
                      x1={PAD_X}
                      x2={W - PAD_X}
                      y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
                      y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
                      stroke="rgba(212,175,55,0.08)"
                      strokeDasharray="3 5"
                    />
                  ))}
                  <motion.path
                    d={areaPath}
                    fill="url(#gmvSparkFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.9, delay: 0.3 }}
                  />
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                  />
                  {/* 🎈 خط تقاطع ذهبي عند التحويم */}
                  {sparkHover != null && pts[sparkHover] && (
                    <line
                      x1={pts[sparkHover].x}
                      x2={pts[sparkHover].x}
                      y1={PAD_TOP}
                      y2={H - PAD_BOTTOM}
                      stroke="rgba(245,208,97,0.55)"
                      strokeDasharray="3 3"
                    />
                  )}
                  {pts.map((p, i) => (
                    <g key={p.date}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={i === pts.length - 1 ? 4 : sparkHover === i ? 4 : 2.4}
                        fill={i === pts.length - 1 || sparkHover === i ? '#F5D061' : '#10B981'}
                        stroke={i === pts.length - 1 ? 'rgba(245,208,97,0.45)' : '#041710'}
                        strokeWidth={i === pts.length - 1 ? 5 : 1}
                      />
                      {i === pts.length - 1 && (
                        <motion.circle
                          cx={p.x}
                          cy={p.y}
                          r="9"
                          fill="none"
                          stroke="#F5D061"
                          strokeWidth="1"
                          animate={{ r: [7, 13], opacity: [0.7, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                      {/* منطقة لمس عريضة لكل يوم — تلميح حي بالتاريخ والقيمة */}
                      <rect
                        x={p.x - stepX / 2}
                        y={0}
                        width={stepX}
                        height={H}
                        fill="transparent"
                        style={{ cursor: 'crosshair' }}
                        onMouseEnter={() => setSparkHover(i)}
                        onMouseLeave={() => setSparkHover(null)}
                      />
                    </g>
                  ))}
                  {/* تسميات أيام أول وأوسط وآخر */}
                  {[0, Math.floor((pts.length - 1) / 2), pts.length - 1].map((i) => (
                    <text
                      key={`lbl-${i}`}
                      x={pts[i].x}
                      y={H - 6}
                      textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
                      fontSize="9"
                      fontWeight={i === pts.length - 1 ? '800' : '600'}
                      fill={i === pts.length - 1 ? '#F5D061' : '#938E7E'}
                    >
                      {i === pts.length - 1 ? 'اليوم' : trend[i].label}
                    </text>
                  ))}
                </svg>
                {/* 🎈 فقاعة التلميح — التاريخ والقيمة وعدد الطلبات (مُقيَّدة داخل البطاقة) */}
                {sparkHover != null && pts[sparkHover] && (
                  <div
                    className="chart-tip"
                    style={{
                      left: `${Math.min(Math.max((pts[sparkHover].x / W) * 100, 14), 86)}%`,
                      top: `${(pts[sparkHover].y / H) * 100}%`,
                    }}
                  >
                    <p className="text-[10px] font-bold text-[#F5D061]">{pts[sparkHover].label}</p>
                    <p className="ltr-nums font-money text-sm font-extrabold text-[#F8F5EE]">
                      {pts[sparkHover].gmvLyd.toFixed(2)} د.ل
                    </p>
                    <p className="text-[9px] text-[#938E7E]">
                      <span className="ltr-nums font-money">{pts[sparkHover].orders}</span> طلبات مسلّمة
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#938E7E]">
                أفضل يوم: <span className="font-bold text-[#F5D061]">{bestDay.label}</span> بـ{' '}
                <span className="ltr-nums font-money font-bold text-[#F8F5EE]">{bestDay.gmvLyd.toFixed(2)}</span> د.ل
                {' '}• نقطة ذهبية نابضة = اليوم الحي • مرّر فوق الرسم لتفاصيل كل يوم
              </p>
            </div>
          )
        })()}
      </div>

      {/* الخريطة المصغرة الحية + السجل الحي */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 🗺️ خريطة الأسطول المصغرة */}
        <section className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319]/70 p-4 lg:col-span-3">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#F5D061]">
              <Radar className="h-4 w-4" />
              الأسطول الحي على خريطة نالوت
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-[#10B981]">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                <span className="ltr-nums font-money">{fleetOnline}</span> متصل
              </span>
              <span className="rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.08)] px-2.5 py-1 text-[#F5D061]">
                <span className="ltr-nums font-money">{fleetBusy}</span> في مهمة
              </span>
            </div>
          </header>
          <NalutMap markers={fleetMarkers} className="h-[240px] sm:h-[280px]" compact />
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#938E7E]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F5D061]" /> كابتن متاح
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F5D061] ring-2 ring-[rgba(245,208,97,0.4)]" /> كابتن في مهمة
            </span>
            <span className="ms-auto text-[9px]">مواقع لحظية عبر بث الأسطول — تُحدّث كل ثوانٍ</span>
          </div>
        </section>

        {/* 📡 السجل الحي */}
        <SectionCard
          title="سجل الأحداث الحي"
          icon={<Radar className="h-4 w-4" />}
          className="lg:col-span-2"
          extra={
          <span className="text-[11px] text-[#938E7E]">
            {lastSync ? (
              <>
                آخر مزامنة <span className="ltr-nums font-money">{fmtClock(lastSync)}</span>
              </>
            ) : (
              'بانتظار أول مزامنة…'
            )}
          </span>
        }
      >
        <div className="wasel-scroll max-h-[320px] overflow-y-auto pe-1">
          {events.length === 0 ? (
            <EmptyHint text="لا أحداث بعد — سيتدفق بث الأسطول والطلبات والمالية هنا لحظياً" />
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {events.map((ev) => {
                  const st = FEED_STYLE[ev.kind]
                  return (
                    <motion.li
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="flex items-start gap-3 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#041710] p-3"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug text-[#F8F5EE]">{ev.text}</p>
                        {ev.sub && <p className="mt-0.5 text-[11px] text-[#938E7E]">{ev.sub}</p>}
                      </div>
                      <span className="ltr-nums font-money shrink-0 text-[11px] text-[#938E7E]">
                        {fmtClock(ev.at)}
                      </span>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </SectionCard>
      </div>
    </div>
  )
}
