'use client'

// ============================================================
// 📊 لوحة المؤشرات — غرفة عمليات واصل نالوت (Task 7-d)
// ============================================================
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
  Radar,
  Smartphone,
  Store,
  TicketPercent,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import type { AccountingSummary } from '@/lib/wasel/types'
import { CUSTODY_CAP_LYD } from '@/lib/wasel/constants'
import { NalutMap } from '@/components/wasel/NalutMap'
import { KpiCard, SectionCard, EmptyHint, fmtClock, useAnimatedNumber, type FeedEvent, type FleetPos } from './admin-shared'

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
}: {
  summary: AccountingSummary | null
  events: FeedEvent[]
  lastSync: number | null
  positions?: Record<string, FleetPos>
}) {
  const s = summary
  const custodyHot = (s?.captainCustodyLyd ?? 0) > CUSTODY_CAP_LYD

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
      {/* شبكة المؤشرات */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
                    <li key={r.code} className="flex items-center justify-between rounded-lg bg-[#041710] px-2.5 py-1.5">
                      <span dir="ltr" className="ltr-nums font-money text-[11px] font-bold tracking-wider text-[#F8F5EE]">
                        {r.code}
                      </span>
                      <span className="ltr-nums font-money flex items-center gap-2 text-[11px] font-semibold text-[#F59E0B]">
                        <span className="rounded-full bg-[rgba(147,142,126,0.15)] px-2 py-0.5 text-[9px] font-bold text-[#938E7E]">
                          {REJECT_REASON_LABELS[r.topReason] ?? r.topReason}
                        </span>
                        {r.count}× ≈ {r.lostLyd.toFixed(2)} د.ل
                      </span>
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
