'use client'

// 🌟 واصل نالوت — الهيكل الرئيسي وبوابة الأدوار الأربعة
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useWasel } from '@/lib/wasel/store'
import { APP } from '@/lib/wasel/constants'
import { PROMOS, type PromoDef } from '@/lib/wasel/promos'
import { apiGet } from '@/lib/wasel/api'
import type { Role } from '@/lib/wasel/types'

const CustomerApp = dynamic(() => import('@/components/apps/CustomerApp'), {
  ssr: false,
  loading: () => <PortalLoader label="جارٍ فتح تطبيق الزبون…" />,
})
const CaptainApp = dynamic(() => import('@/components/apps/CaptainApp'), {
  ssr: false,
  loading: () => <PortalLoader label="جارٍ فتح تطبيق الكابتن…" />,
})
const MerchantApp = dynamic(() => import('@/components/apps/MerchantApp'), {
  ssr: false,
  loading: () => <PortalLoader label="جارٍ فتح شاشة المطبخ…" />,
})
const AdminApp = dynamic(() => import('@/components/apps/AdminApp'), {
  ssr: false,
  loading: () => <PortalLoader label="جارٍ فتح غرفة العمليات…" />,
})

function PortalLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="shimmer h-14 w-14 rounded-full border border-[rgba(212,175,55,0.3)]" />
      <p className="text-sm text-[#938E7E]">{label}</p>
    </div>
  )
}

const PORTALS: {
  role: Exclude<Role, 'landing'>
  emoji: string
  title: string
  desc: string
  tag: string
}[] = [
  {
    role: 'customer',
    emoji: '🛍️',
    title: 'تطبيق الزبون',
    desc: 'تصفح متاجر نالوت واطلب وجبتك أو بقالتك مع تتبع حي وكود تسليم آمن',
    tag: 'واصل إيت • مارت • متاع',
  },
  {
    role: 'captain',
    emoji: '🛵',
    title: 'تطبيق الكابتن',
    desc: 'شغّل وردية، استقبل عروض الرادار، وأكمل دورة التوصيل الرباعية الصارمة',
    tag: 'أسطول واصل',
  },
  {
    role: 'merchant',
    emoji: '👨‍🍳',
    title: 'شريك واصل / المطبخ',
    desc: 'شاشة KDS لاستقبال الطلبات، تحديد زمن الطهي، وإدارة توفر الأصناف لحظياً',
    tag: 'نظام عرض المطبخ',
  },
  {
    role: 'admin',
    emoji: '🛡️',
    title: 'غرفة العمليات والمالية',
    desc: 'درع PIN أمني، رادار الأسطول الحي، تسوية العهد، ومحضر الجرد اليومي Z',
    tag: 'الإدارة العليا',
  },
]

interface HealthData {
  db: { stores: number; drivers: number }
  realtime: string
  live?: {
    ordersToday: number
    deliveredToday: number
    gmvToday: number
    onlineDrivers: number
    activeOrders: number
  }
}

export default function WaselMain() {
  const { role, setRole } = useWasel()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [promos, setPromos] = useState<PromoDef[]>(PROMOS) // 🎟️ حية من غرفة العمليات
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const load = () =>
      apiGet<HealthData & { ok: boolean }>('/api/health')
        .then(setHealth)
        .catch(() => setHealth(null))
        .finally(() => setBooting(false))
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    apiGet<{ promos: PromoDef[] }>('/api/promos')
      .then((d) => {
        if (Array.isArray(d.promos) && d.promos.length > 0) setPromos(d.promos)
      })
      .catch(() => {
        /* تبقى الكوبونات الرسمية الافتراضية */
      })
  }, [])

  if (booting) return <PortalLoader label="جارٍ تشغيل منظومة واصل نالوت…" />

  if (role === 'customer') return <CustomerApp onExit={() => setRole('landing')} />
  if (role === 'captain') return <CaptainApp onExit={() => setRole('landing')} />
  if (role === 'merchant') return <MerchantApp onExit={() => setRole('landing')} />
  if (role === 'admin') return <AdminApp onExit={() => setRole('landing')} />

  // ============ بوابة الهبوط ============
  return (
    <div className="flex min-h-screen flex-col bg-[#041710]">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-40 border-b border-[rgba(212,175,55,0.15)] bg-[#041710]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.4)] bg-[#0A3324] text-2xl gold-glow">
              🐪
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight gold-text">{APP.nameAr}</h1>
              <p className="font-money text-[10px] uppercase tracking-[0.25em] text-[#938E7E]">
                Wasel Nalut • LYD
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            </span>
            <span className="text-xs font-semibold text-[#10B981]">
              {health?.realtime === 'connected' ? 'المنظومة حية' : 'اتصال محدود'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8">
        {/* البطل — بصورة جبل نفوسة المولّدة */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative mb-10 overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.25)] p-8 text-center gold-glow md:p-12"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/images/hero.png)' }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(4,23,16,0.82) 0%, rgba(4,23,16,0.88) 55%, rgba(4,23,16,0.96) 100%)',
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[rgba(212,175,55,0.12)] blur-3xl" />
          <div className="relative">
            <p className="mb-3 text-xs font-bold tracking-[0.3em] text-[#D4AF37]">
              نالوت • جبل نفوسة • ليبيا
            </p>
            <h2 className="mb-4 text-4xl font-black leading-snug text-[#F8F5EE] md:text-6xl">
              <span className="gold-text">واصل</span> يوصّل لك كل شيء
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-[#F8F5EE]/75 md:text-base">
              منظومة التجارة والتوصيل الفائقة لمدينة نالوت — وجبات المطاعم، بقالة 15-30 دقيقة،
              وسوق محلي للإلكترونيات والعطور. بالدينار الليبي حصرياً، بلا رسوم خدمة، وبميثاق شرعي واضح.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setRole('customer')}
                className="h-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-8 text-base font-bold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)] transition hover:scale-[1.02]"
              >
                🚀 اطلب الآن
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setRole('captain')}
                className="h-12 rounded-xl border-[rgba(212,175,55,0.4)] bg-transparent px-8 text-base font-bold text-[#F5D061] hover:bg-[rgba(212,175,55,0.08)]"
              >
                🛵 انضم كابتن
              </Button>
            </div>
            {/* شريط الثقة المصغر */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#938E7E]">
              <span className="flex items-center gap-1.5">🔒 كود تسليم OTP رباعي</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#D4AF37] sm:block" />
              <span className="flex items-center gap-1.5">⏱️ بقالة خلال 15-30 دقيقة</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#D4AF37] sm:block" />
              <span className="flex items-center gap-1.5">🧾 فواتير رسمية وسندات قبض</span>
            </div>
          </div>
        </motion.section>

        {/* الأدوات الأربعة */}
        <section className="mb-10">
          <h3 className="mb-5 flex items-center gap-3 text-lg font-extrabold text-[#F8F5EE]">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.4)]" />
            بوابات المنظومة
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.4)]" />
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map((p, i) => (
              <motion.button
                key={p.role}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: 'easeOut' }}
                onClick={() => setRole(p.role)}
                className="group relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(212,175,55,0.5)] hover:shadow-xl hover:shadow-[rgba(212,175,55,0.1)]"
              >
                <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[rgba(212,175,55,0.07)] blur-2xl transition group-hover:bg-[rgba(212,175,55,0.15)]" />
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.3)] bg-[#0A3324] text-3xl transition group-hover:scale-110">
                  {p.emoji}
                </div>
                <h4 className="mb-1 text-base font-extrabold text-[#F8F5EE]">{p.title}</h4>
                <p className="mb-3 min-h-[3.5rem] text-xs leading-relaxed text-[#938E7E]">{p.desc}</p>
                <span className="inline-block rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-[10px] font-bold text-[#10B981]">
                  {p.tag}
                </span>
                <span className="absolute bottom-4 left-4 text-[#D4AF37] opacity-0 transition-all duration-300 group-hover:opacity-100">
                  ←
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* 🎟️ كوبونات الموسم */}
        <section className="mb-10">
          <h3 className="mb-5 flex items-center gap-3 text-lg font-extrabold text-[#F8F5EE]">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.4)]" />
            كوبونات واصل النشطة 🎟️
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.4)]" />
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {promos.map((promo, i) => (
              <motion.div
                key={promo.code}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="card-lift relative w-full overflow-hidden rounded-2xl border border-dashed border-[rgba(212,175,55,0.45)] bg-gradient-to-br from-[#062319] to-[#0A3324] p-5 hover:border-[rgba(212,175,55,0.8)] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
              >
                {/* لمعان التذكرة — سحب ضوئي بطيء */}
                <span className="ticket-sheen" aria-hidden="true" />
                {/* ثقبة التذكرة الجانبية */}
                <span className="absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-[#041710]" aria-hidden="true" />
                <span className="absolute -left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-[#041710]" aria-hidden="true" />
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{promo.emoji}</span>
                  <span
                    dir="ltr"
                    className="ltr-nums rounded-lg border border-[rgba(212,175,55,0.4)] bg-[#041710] px-2.5 py-1 font-money text-xs font-bold tracking-widest text-[#F5D061]"
                  >
                    {promo.code}
                  </span>
                </div>
                <p className="mt-3 text-sm font-extrabold text-[#F8F5EE]">{promo.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#938E7E]">{promo.description}</p>
                {(() => {
                  const remaining = promo.remainingUses ?? null
                  if (remaining == null) return null
                  const scarce = remaining <= 3
                  return (
                    <span
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                        remaining <= 1
                          ? 'animate-pulse bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                          : scarce
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                            : 'bg-[rgba(16,185,129,0.12)] text-[#10B981]'
                      }`}
                    >
                      🔥 {remaining <= 1 ? 'آخر استخدام متبقٍ!' : `متبقٍ ${remaining} استخدامات فقط`}
                    </span>
                  )
                })()}
              </motion.div>
            ))}
          </div>
        </section>

        {/* المؤشرات الحية */}
        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5 text-center">
            <span className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#D4AF37] to-transparent" aria-hidden="true" />
            <p className="font-money text-3xl font-bold text-[#F5D061]">
              {health?.live ? `${health.live.ordersToday}` : '—'}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#938E7E]">طلب اليوم في المنظومة</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5 text-center">
            <span className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#10B981] to-transparent" aria-hidden="true" />
            <p className="font-money text-3xl font-bold text-[#10B981]">
              {health?.live ? health.live.gmvToday.toFixed(2) : '—.—'}
              <span className="ms-1 text-sm">د.ل</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[#938E7E]">حجم التداول اليومي GMV</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5 text-center">
            <span className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#D4AF37] to-transparent" aria-hidden="true" />
            <p className="font-money text-3xl font-bold text-[#F5D061]">
              {health?.live ? health.live.onlineDrivers : '—'}
              <span className="ms-1 text-sm text-[#938E7E]">/ {health?.db.drivers ?? '—'}</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[#938E7E]">كباتن متصلون الآن 🛵</p>
          </div>
        </section>

        {/* الميثاق الشرعي المختصر */}
        <section className="rounded-2xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.05)] p-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#10B981]">
            ☪️ ميثاق واصل الشرعي
          </h4>
          <ul className="grid gap-2 text-xs leading-relaxed text-[#938E7E] sm:grid-cols-3">
            <li className="rounded-xl bg-[#062319]/60 p-3">
              أجرة التوصيل عقد <b className="text-[#F8F5EE]">إجارة عمل</b> معلنة، لا رسوم خفية ولا عمولات مبهمة على الزبون.
            </li>
            <li className="rounded-xl bg-[#062319]/60 p-3">
              شراء الوجبات والسلع <b className="text-[#F8F5EE]">عقد بيع قطعي</b> — السلع معلومة الثمن والوصف، بلا غرر.
            </li>
            <li className="rounded-xl bg-[#062319]/60 p-3">
              لا غرامات تأخير ربوية — التعويض عند الرفض <b className="text-[#F8F5EE]">عن الضرر الفعلي</b> فقط.
            </li>
          </ul>
        </section>
      </main>

      {/* التذييل اللاصق */}
      <footer className="mt-auto border-t border-[rgba(212,175,55,0.15)] bg-[#041710]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-right">
          <p className="text-xs text-[#938E7E]">
            🐪 <b className="text-[#D4AF37]">واصل نالوت</b> — كل شيء يوصلك، من قلب جبل نفوسة
          </p>
          <p className="font-money text-[10px] tracking-widest text-[#938E7E]">
            WASAL NALUT ECOSYSTEM v2.0 • NALUT, LIBYA • 31.8687N 10.9818E
          </p>
        </div>
      </footer>
    </div>
  )
}
