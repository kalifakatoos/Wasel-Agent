'use client'

// 🏪 شاشة منيو المتجر — أصناف مجمعة بالفئة + نافذة التفاصيل
import { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, ShoppingBag, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Ly } from '@/components/wasel/Badges'
import { apiGet } from '@/lib/wasel/api'
import { useWasel } from '@/lib/wasel/store'
import type { ProductDTO, StoreDTO } from '@/lib/wasel/types'
import { ErrorBlock, LoadingBlock, ScreenBar } from './customer-shared'
import { ProductDetailSheet } from './customer-product-sheet'

export function StoreScreen({
  storeId,
  onBack,
  onGoCart,
}: {
  storeId: string
  onBack: () => void
  onGoCart: () => void
}) {
  const [data, setData] = useState<{ store: StoreDTO; products: ProductDTO[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<ProductDTO | null>(null)

  const cartCount = useWasel((s) => s.cart.reduce((n, i) => n + i.qty, 0))
  const cartTotal = useWasel((s) => s.cart.reduce((n, i) => n + i.qty * i.unitPrice, 0))

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    apiGet<{ store: StoreDTO; products: ProductDTO[] }>(`/api/stores/${storeId}/menu`)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل المنيو')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [storeId, refresh])

  const categories = useMemo(() => {
    if (!data) return [] as { category: string; items: ProductDTO[] }[]
    const map = new Map<string, ProductDTO[]>()
    for (const p of data.products) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }))
  }, [data])

  const store = data?.store

  return (
    <div>
      <ScreenBar
        title={store ? store.name : 'منيو المتجر'}
        subtitle={store ? store.tagline : undefined}
        onBack={onBack}
      />

      {loading ? (
        <MenuSkeleton />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setRefresh((n) => n + 1)} />
      ) : store ? (
        <>
          {/* رأس المتجر */}
          <div
            className={`mb-6 overflow-hidden rounded-3xl border p-5 ${
              store.isOpen
                ? 'border-[rgba(212,175,55,0.25)] bg-gradient-to-bl from-[#0A3324] via-[#062319] to-[#041710]'
                : 'border-[rgba(147,142,126,0.2)] bg-[#062319] opacity-60 grayscale'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-4xl gold-glow">
                {store.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-[#F8F5EE]">{store.name}</h3>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      store.isOpen
                        ? 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                        : 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] text-[#EF4444]'
                    }`}
                  >
                    {store.isOpen ? '● يستقبل الطلبات' : 'مغلق حالياً'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#938E7E]">
                  <span className="flex items-center gap-1 font-bold text-[#F5D061]">
                    <Star className="h-3.5 w-3.5 fill-[#F5D061]" />
                    <span className="font-money ltr-nums">{store.rating.toFixed(1)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {store.district}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-money ltr-nums">{store.prepMinutes}</span> دقيقة تحضير
                  </span>
                  <span>
                    التوصيل من <Ly amount={store.baseDeliveryFee} className="text-[#D4AF37]" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* الأصناف حسب الفئة */}
          {categories.map(({ category, items }) => (
            <section key={category} className="mb-7">
              <h4 className="mb-3 flex items-center gap-3 text-sm font-extrabold text-[#F5D061]">
                {category}
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.35)]" />
                <span className="font-money ltr-nums text-[10px] font-normal text-[#938E7E]">
                  {items.length} صنف
                </span>
              </h4>
              <div className="space-y-2.5">
                {items.map((p) => (
                  <ProductRow key={p.id} product={p} onSelect={() => setSelected(p)} />
                ))}
              </div>
            </section>
          ))}

          {/* شريط السلة العائم */}
          {cartCount > 0 && (
            <button
              onClick={onGoCart}
              className="fixed inset-x-4 bottom-24 z-30 mx-auto flex h-14 max-w-md items-center justify-between rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-5 font-extrabold text-[#041710] shadow-xl shadow-[rgba(212,175,55,0.35)] transition hover:scale-[1.02]"
            >
              <span className="flex items-center gap-2 text-sm">
                <ShoppingBag className="h-5 w-5" />
                عرض السلة
                <span className="font-money ltr-nums rounded-full bg-[#041710] px-2 py-0.5 text-xs text-[#F5D061]">
                  {cartCount}
                </span>
              </span>
              <Ly amount={cartTotal} className="text-[#041710]" bold />
            </button>
          )}
        </>
      ) : null}

      <ProductDetailSheet
        product={selected}
        store={store ? { id: store.id, name: store.name } : null}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  )
}

function ProductRow({ product, onSelect }: { product: ProductDTO; onSelect: () => void }) {
  const available = product.isAvailable
  return (
    <button
      onClick={onSelect}
      disabled={!available}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-[#062319] p-3.5 text-right transition ${
        available
          ? 'border-[rgba(212,175,55,0.18)] hover:border-[rgba(212,175,55,0.5)] hover:bg-[#0A3324] active:scale-[0.99]'
          : 'cursor-not-allowed border-[rgba(147,142,126,0.15)] opacity-55'
      }`}
    >
      <div
        className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#041710] text-2xl ${
          available ? '' : 'grayscale'
        }`}
      >
        {product.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-extrabold text-[#F8F5EE] ${available ? '' : 'line-through'}`}>
          {product.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#938E7E]">
          {product.description || '—'}
        </p>
        {!available && (
          <span className="mt-1 inline-block rounded-full border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
            غير متوفر حالياً
          </span>
        )}
      </div>
      <Ly
        amount={product.basePriceLyd}
        bold
        className={`shrink-0 text-sm ${available ? 'text-[#F5D061]' : 'text-[#938E7E] line-through'}`}
      />
    </button>
  )
}

function MenuSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-3xl bg-[rgba(212,175,55,0.08)]" />
      {[1, 2].map((g) => (
        <div key={g}>
          <Skeleton className="mb-3 h-4 w-28 bg-[rgba(212,175,55,0.12)]" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[#062319] p-3.5">
                <Skeleton className="h-[52px] w-[52px] rounded-xl bg-[rgba(212,175,55,0.1)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2 bg-[rgba(212,175,55,0.1)]" />
                  <Skeleton className="h-3 w-3/4 bg-[rgba(212,175,55,0.07)]" />
                </div>
                <Skeleton className="h-4 w-16 bg-[rgba(212,175,55,0.1)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
