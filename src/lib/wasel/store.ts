'use client'

// مخزن الحالة العامة لواصل نالوت (Zustand + persist)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem, Role, WaselNotification } from './types'

interface WaselState {
  role: Role
  setRole: (r: Role) => void

  // هوية الزبون (وضع الضيوف - تُطلب عند الدفع فقط)
  customerName: string
  customerPhone: string
  setCustomerIdentity: (name: string, phone: string) => void

  // السلة
  cartStoreId: string | null
  cartStoreName: string
  cart: CartItem[]
  addToCart: (store: { id: string; name: string }, item: CartItem) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void

  // الكابتن الحالي (محاكاة)
  driverId: string
  setDriverId: (id: string) => void

  // متجر التاجر الحالي
  merchantStoreId: string
  setMerchantStoreId: (id: string) => void

  // درع الإدارة
  adminUnlocked: boolean
  unlockAdmin: () => void
  lockAdmin: () => void

  // عروض الرادار المرفوضة محلياً
  declinedOffers: string[]
  declineOffer: (orderId: string) => void

  // 🔔 صندوق إشعارات الزبون (حتى 40 إشعاراً، يبقى بعد إغلاق التطبيق)
  notifications: WaselNotification[]
  pushNotification: (n: Omit<WaselNotification, 'read' | 'at'> & { at?: string }) => boolean
  markNotificationsRead: () => void
  clearNotifications: () => void
}

export const useWasel = create<WaselState>()(
  persist(
    (set, get) => ({
      role: 'landing',
      setRole: (role) => set({ role }),

      customerName: '',
      customerPhone: '',
      setCustomerIdentity: (customerName, customerPhone) => set({ customerName, customerPhone }),

      cartStoreId: null,
      cartStoreName: '',
      cart: [],
      addToCart: (store, item) => {
        const st = get()
        // سلة متجر واحد فقط في كل مرة
        if (st.cartStoreId && st.cartStoreId !== store.id) {
          set({ cartStoreId: store.id, cartStoreName: store.name, cart: [item] })
          return
        }
        const existing = st.cart.find((i) => i.productId === item.productId)
        if (existing) {
          set({
            cartStoreId: store.id,
            cartStoreName: store.name,
            cart: st.cart.map((i) =>
              i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i,
            ),
          })
        } else {
          set({
            cartStoreId: store.id,
            cartStoreName: store.name,
            cart: [...st.cart, item],
          })
        }
      },
      updateQty: (productId, qty) => {
        const st = get()
        if (qty <= 0) {
          const next = st.cart.filter((i) => i.productId !== productId)
          set({ cart: next, cartStoreId: next.length ? st.cartStoreId : null })
        } else {
          set({ cart: st.cart.map((i) => (i.productId === productId ? { ...i, qty } : i)) })
        }
      },
      clearCart: () => set({ cart: [], cartStoreId: null, cartStoreName: '' }),

      driverId: 'DRV-01',
      setDriverId: (driverId) => set({ driverId }),

      merchantStoreId: 'qasr-nalut',
      setMerchantStoreId: (merchantStoreId) => set({ merchantStoreId }),

      adminUnlocked: false,
      unlockAdmin: () => set({ adminUnlocked: true }),
      lockAdmin: () => set({ adminUnlocked: false }),

      declinedOffers: [],
      declineOffer: (orderId) =>
        set({
          declinedOffers: [...get().declinedOffers.slice(-30), orderId],
        }),

      notifications: [],
      pushNotification: (n) => {
        const st = get()
        // منع التكرار الصارم بمفتاح الإشعار
        if (st.notifications.some((x) => x.id === n.id)) return false
        const item: WaselNotification = {
          ...n,
          at: n.at ?? new Date().toISOString(),
          read: false,
        }
        set({ notifications: [item, ...st.notifications].slice(0, 40) })
        return true
      },
      markNotificationsRead: () =>
        set({
          notifications: get().notifications.map((n) =>
            n.read ? n : { ...n, read: true },
          ),
        }),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'wasel-nalut-state',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
