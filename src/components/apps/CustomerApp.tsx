'use client'

// 🐪 واصل نالوت — تطبيق الزبون
// هيكل رئيسي: رأس لاصق + تبويب حالة داخلي (browse/store/cart/checkout/tracking/orders/wallet)
// + تنقل سفلي + تذييل لاصق. تصفح ضيوف بلا تسجيل، دينار ليبي حصرياً.
import { useEffect, useState } from 'react'
import { Compass, LogOut, ReceiptText, ShoppingBag, Wallet as WalletIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP } from '@/lib/wasel/constants'
import { useWasel } from '@/lib/wasel/store'
import type { OrderDTO } from '@/lib/wasel/types'
import { BrowseScreen } from './customer-browse'
import { CartScreen } from './customer-cart'
import { CheckoutScreen } from './customer-checkout'
import { OrdersScreen } from './customer-orders'
import { StoreScreen } from './customer-store'
import { TrackingScreen } from './customer-tracking'
import { WalletScreen } from './customer-wallet'

type Tab = 'browse' | 'store' | 'cart' | 'checkout' | 'tracking' | 'orders' | 'wallet'

export default function CustomerApp({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('browse')
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  const cartCount = useWasel((s) => s.cart.reduce((n, i) => n + i.qty, 0))
  const cartStoreId = useWasel((s) => s.cartStoreId)

  // تمرير لأعلى عند كل تنقل
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const openStore = (storeId: string) => {
    setActiveStoreId(storeId)
    setTab('store')
  }

  const trackOrder = (orderId: string) => {
    setActiveOrderId(orderId)
    setTab('tracking')
  }

  const onPlaced = (order: OrderDTO) => {
    setActiveOrderId(order.id)
    setTab('tracking')
  }

  // التبويب النشط في شريط التنقل السفلي
  const activeNavKey: 'browse' | 'orders' | 'wallet' =
    tab === 'tracking' ? 'orders' : tab === 'orders' ? 'orders' : tab === 'wallet' ? 'wallet' : 'browse'

  const NAV: { key: 'browse' | 'orders' | 'wallet'; label: string; icon: LucideIcon }[] = [
    { key: 'browse', label: 'استكشاف', icon: Compass },
    { key: 'orders', label: 'طلباتي', icon: ReceiptText },
    { key: 'wallet', label: 'المحفظة', icon: WalletIcon },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== الرأس اللاصق ===== */}
      <header className="sticky top-0 z-40 border-b border-[rgba(212,175,55,0.15)] bg-[#041710]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <button onClick={() => setTab('browse')} className="flex min-w-0 items-center gap-3 text-right" aria-label="واصل نالوت — استكشاف">
            <span className="gold-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.4)] bg-[#0A3324] text-2xl">
              🐪
            </span>
            <span className="min-w-0">
              <span className="gold-text block text-base font-extrabold leading-tight">{APP.nameAr}</span>
              <span className="block text-[10px] font-semibold text-[#938E7E]">تطبيق الزبون • اطلب وتتبّع</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {/* السلة */}
            <button
              onClick={() => setTab('cart')}
              aria-label={`السلة — ${cartCount} أصناف`}
              className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.12)]"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="font-money ltr-nums absolute -left-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-1 text-[11px] font-bold text-[#041710]">
                  {cartCount}
                </span>
              )}
            </button>
            {/* خروج */}
            <Button
              variant="outline"
              onClick={onExit}
              className="h-12 gap-1.5 rounded-xl border-[rgba(239,68,68,0.35)] bg-transparent px-3.5 text-xs font-bold text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444]"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-5">
        {tab === 'browse' && <BrowseScreen onOpenStore={openStore} />}

        {tab === 'store' && activeStoreId && (
          <StoreScreen
            storeId={activeStoreId}
            onBack={() => setTab('browse')}
            onGoCart={() => setTab('cart')}
          />
        )}

        {tab === 'cart' && (
          <CartScreen
            onBack={() => setTab(cartStoreId ? 'store' : 'browse')}
            onCheckout={() => setTab('checkout')}
            onBrowse={() => setTab('browse')}
          />
        )}

        {tab === 'checkout' && <CheckoutScreen onBack={() => setTab('cart')} onPlaced={onPlaced} />}

        {tab === 'tracking' && activeOrderId && (
          <TrackingScreen orderId={activeOrderId} onBrowse={() => setTab('browse')} />
        )}

        {tab === 'orders' && <OrdersScreen onTrack={trackOrder} onBack={() => setTab('browse')} />}

        {tab === 'wallet' && <WalletScreen />}
      </main>

      {/* ===== التنقل السفلي اللاصق ===== */}
      <nav className="sticky bottom-0 z-40 border-t border-[rgba(212,175,55,0.18)] bg-[#041710]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-3">
          {NAV.map((t) => {
            const Icon = t.icon
            const active = activeNavKey === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
                  active ? 'text-[#F5D061]' : 'text-[#938E7E] hover:text-[#F8F5EE]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-16 rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061]" />
                )}
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ===== التذييل اللاصق ===== */}
      <footer className="mt-auto border-t border-[rgba(212,175,55,0.12)] bg-[#041710]/90 py-4 text-center backdrop-blur">
        <p className="text-xs text-[#938E7E]">
          🐪 <b className="text-[#D4AF37]">واصل نالوت</b> — من قلب جبل نفوسة • بالدينار الليبي حصرياً
        </p>
      </footer>
    </div>
  )
}
