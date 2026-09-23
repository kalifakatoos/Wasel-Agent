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
} from 'lucide-react'
import type { AccountingSummary } from '@/lib/wasel/types'
import { CUSTODY_CAP_LYD } from '@/lib/wasel/constants'
import { KpiCard, SectionCard, EmptyHint, fmtClock, type FeedEvent } from './admin-shared'

const FEED_STYLE: Record<FeedEvent['kind'], { icon: ReactNode; color: string; bg: string }> = {
  status: { icon: <Activity className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  radar: { icon: <Radar className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  custody: { icon: <Banknote className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  payout: { icon: <Building2 className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  promo: { icon: <TicketPercent className="h-4 w-4" />, color: '#F5D061', bg: 'rgba(212,175,55,0.12)' },
  topup: { icon: <Gift className="h-4 w-4" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
}

export default function DashboardTab({
  summary,
  events,
  lastSync,
}: {
  summary: AccountingSummary | null
  events: FeedEvent[]
  lastSync: number | null
}) {
  const s = summary
  const custodyHot = (s?.captainCustodyLyd ?? 0) > CUSTODY_CAP_LYD

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
              className={`relative overflow-hidden rounded-2xl border p-4 transition ${
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
          const orders = s?.promoOrders ?? 0
          const breakdown = (s?.promoBreakdown ?? []).slice(0, 3)
          const avg = orders > 0 ? Math.round((discount / orders) * 100) / 100 : 0
          return (
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.06)] p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#041710]">
                    <TicketPercent className="h-5 w-5 text-[#F5D061]" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#938E7E]">كوبونات اليوم (تحمّلتها المنصة)</p>
                    <p className="ltr-nums font-money text-xl font-bold text-[#F5D061]">
                      {discount.toFixed(2)} <span className="text-xs">د.ل</span>
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
              <p className="mt-2 text-[10px] leading-relaxed text-[#938E7E]">
                {orders === 0
                  ? 'لا كوبونات مستخدمة اليوم — فكّر بحملة تشويقية مسائية'
                  : `متوسط الوفر للزبون ${avg.toFixed(2)} د.ل بالطلب المخصوم — الكوبونات تبني الولاء وتزيد تكرار الطلب`}
              </p>
            </div>
          )
        })()}
      </div>

      {/* السجل الحي */}
      <SectionCard
        title="سجل الأحداث الحي"
        icon={<Radar className="h-4 w-4" />}
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
  )
}
