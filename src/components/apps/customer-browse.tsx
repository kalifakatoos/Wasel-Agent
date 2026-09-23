'use client'

// 🧭 شاشة الاستكشاف — وضع ضيوف بلا تسجيل: فلاتر + بحث + بطاقات متاجر فاخرة
import { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Ly } from '@/components/wasel/Badges'
import { apiGet } from '@/lib/wasel/api'
import { DISTRICTS, VERTICAL_EMOJI, VERTICAL_LABELS } from '@/lib/wasel/constants'
import type { StoreDTO, StoreVertical } from '@/lib/wasel/types'
import { ErrorBlock } from './customer-shared'

type VerticalFilter = StoreVertical | 'all'

const VERTICALS: { key: VerticalFilter; label: string; emoji: string; hint: string }[] = [
  { key: 'all', label: 'كل المتاجر', emoji: '🌟', hint: 'كل ما يوصلك في نالوت' },
  { key: 'food', label: VERTICAL_LABELS.food, emoji: VERTICAL_EMOJI.food, hint: 'مطاعم ومشويات' },
  { key: 'grocery', label: VERTICAL_LABELS.grocery, emoji: VERTICAL_EMOJI.grocery, hint: 'بقالة سريعة' },
  { key: 'marketplace', label: VERTICAL_LABELS.marketplace, emoji: VERTICAL_EMOJI.marketplace, hint: 'إلكترونيات وعطور' },
]

export function BrowseScreen({ onOpenStore }: { onOpenStore: (storeId: string) => void }) {
  const [vertical, setVertical] = useState<VerticalFilter>('all')
  const [district, setDistrict] = useState<string>('')
  const [query, setQuery] = useState('')
  const [stores, setStores] = useState<StoreDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    const params = new URLSearchParams()
    if (vertical !== 'all') params.set('vertical', vertical)
    if (district) params.set('district', district)
    apiGet<{ stores: StoreDTO[] }>(`/api/stores?${params.toString()}`)
      .then((d) => {
        if (cancelled) return
        setStores(d.stores)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل المتاجر')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vertical, district, refresh])

  const filtered = useMemo(() => {
    const needle = query.trim()
    if (!needle) return stores
    return stores.filter(
      (s) => s.name.includes(needle) || s.tagline.includes(needle) || s.district.includes(needle),
    )
  }, [stores, query])

  return (
    <div>
      {/* ترحيب مصغر */}
      <div className="mb-5 overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.22)] bg-gradient-to-bl from-[#0A3324] via-[#062319] to-[#041710] p-5">
        <h2 className="text-xl font-black text-[#F8F5EE]">
          شنو <span className="gold-text">تبي اليوم</span>؟ 🐪
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#938E7E]">
          وجبات من مطاعم جبل نفوسة، بقالة، وسوق محلي — توصيل سريع بالدينار الليبي وبلا رسوم خدمة.
        </p>
      </div>

      {/* فلاتر الأقسام */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {VERTICALS.map((v) => {
          const active = vertical === v.key
          return (
            <button
              key={v.key}
              onClick={() => setVertical(v.key)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2.5 text-center transition ${
                active
                  ? 'border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.12)] shadow-lg shadow-[rgba(212,175,55,0.12)]'
                  : 'border-[rgba(212,175,55,0.18)] bg-[#062319] hover:border-[rgba(212,175,55,0.4)]'
              }`}
            >
              <span className="text-2xl">{v.emoji}</span>
              <span className={`text-xs font-extrabold ${active ? 'text-[#F5D061]' : 'text-[#F8F5EE]'}`}>
                {v.label}
              </span>
              <span className="text-[10px] text-[#938E7E]">{v.hint}</span>
            </button>
          )
        })}
      </div>

      {/* بحث + أحياء */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#938E7E]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن متجر أو صنف…"
            className="h-12 rounded-xl border-[rgba(212,175,55,0.25)] bg-[#062319] ps-9 text-sm text-[#F8F5EE] placeholder:text-[#938E7E]/60"
          />
        </div>
      </div>
      <div className="wasel-scroll mb-6 flex gap-2 overflow-x-auto pb-2">
        <DistrictChip label="كل الأحياء" active={district === ''} onClick={() => setDistrict('')} />
        {DISTRICTS.map((d) => (
          <DistrictChip key={d} label={d} active={district === d} onClick={() => setDistrict(d)} />
        ))}
      </div>

      {/* النتائج */}
      {error ? (
        <ErrorBlock message={error} onRetry={() => setRefresh((n) => n + 1)} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#062319] p-4">
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-2xl bg-[rgba(212,175,55,0.1)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-[rgba(212,175,55,0.1)]" />
                  <Skeleton className="h-3 w-1/2 bg-[rgba(212,175,55,0.08)]" />
                </div>
              </div>
              <Skeleton className="h-3 w-full bg-[rgba(212,175,55,0.08)]" />
              <Skeleton className="mt-2 h-3 w-4/5 bg-[rgba(212,175,55,0.08)]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[rgba(212,175,55,0.3)] bg-[#062319]/60 py-14 text-center">
          <p className="text-4xl">🕳️</p>
          <p className="mt-3 text-sm font-bold text-[#F8F5EE]">لا توجد متاجر مطابقة</p>
          <p className="mt-1 text-xs text-[#938E7E]">جرّب قسماً آخر أو حياً مختلفاً في نالوت</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StoreCard key={s.id} store={s} onOpen={() => onOpenStore(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function DistrictChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition ${
        active
          ? 'border-[rgba(212,175,55,0.65)] bg-[rgba(212,175,55,0.15)] text-[#F5D061]'
          : 'border-[rgba(212,175,55,0.2)] bg-[#062319] text-[#938E7E] hover:border-[rgba(212,175,55,0.45)] hover:text-[#F8F5EE]'
      }`}
    >
      📍 {label}
    </button>
  )
}

function StoreCard({ store, onOpen }: { store: StoreDTO; onOpen: () => void }) {
  const open = store.isOpen
  return (
    <button
      onClick={onOpen}
      disabled={!open}
      aria-label={`${store.name} — ${open ? 'مفتوح' : 'مغلق'}`}
      className={`group relative overflow-hidden rounded-2xl border bg-[#062319] p-4 text-right transition-all duration-300 ${
        open
          ? 'border-[rgba(212,175,55,0.2)] hover:-translate-y-1 hover:border-[rgba(212,175,55,0.5)] hover:shadow-xl hover:shadow-[rgba(212,175,55,0.1)]'
          : 'cursor-not-allowed border-[rgba(147,142,126,0.15)] opacity-55 grayscale'
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.3)] bg-[#0A3324] text-3xl transition group-hover:scale-110">
          {store.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-extrabold text-[#F8F5EE]">{store.name}</h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                open
                  ? 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                  : 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] text-[#EF4444]'
              }`}
            >
              {open ? '● مفتوح' : 'مغلق حالياً'}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#938E7E]">{store.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#938E7E]">
        <span className="flex items-center gap-1 font-bold text-[#F5D061]">
          <Star className="h-3.5 w-3.5 fill-[#F5D061] text-[#F5D061]" />
          <span className="font-money ltr-nums">{store.rating.toFixed(1)}</span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {store.district}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-money ltr-nums">{store.prepMinutes}</span> دقيقة تحضير
        </span>
        <span className="ms-auto rounded-full border border-[rgba(212,175,55,0.25)] bg-[#041710] px-2.5 py-1 text-[10px] font-semibold text-[#D4AF37]">
          التوصيل من <Ly amount={store.baseDeliveryFee} className="text-[#F5D061]" />
        </span>
      </div>
    </button>
  )
}
