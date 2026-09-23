// ============================================================
// واصل نالوت - الأنواع المشتركة (Shared Types)
// ============================================================

export type Role = 'landing' | 'customer' | 'captain' | 'merchant' | 'admin'

export type StoreVertical = 'food' | 'grocery' | 'marketplace'

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'disputed'

export interface StoreDTO {
  id: string
  name: string
  vertical: StoreVertical
  district: string
  latitude: number
  longitude: number
  rating: number
  isOpen: boolean
  baseDeliveryFee: number
  emoji: string
  tagline: string
  prepMinutes: number
}

export interface ProductDTO {
  id: string
  storeId: string
  title: string
  description: string
  basePriceLyd: number
  emoji: string
  category: string
  isAvailable: boolean
  stockQuantity: number
  isFood: boolean
}

export interface DriverDTO {
  id: string
  fullName: string
  phone: string
  vehicleType: string
  plateNumber: string
  status: 'offline' | 'online' | 'busy'
  currentLatitude: number | null
  currentLongitude: number | null
  rating: number
  activeOrdersCount: number
  custodyCash: number
  earningsTotal: number
  tripsCompleted: number
}

export interface OrderItem {
  productId: string
  title: string
  qty: number
  unitPrice: number
  notes?: string
}

export interface OrderDTO {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  storeId: string
  storeName: string
  driverId: string | null
  driverName: string | null
  status: OrderStatus
  items: OrderItem[]
  subtotalLyd: number
  deliveryFeeLyd: number
  serviceFeeLyd: number
  discountLyd: number
  totalLyd: number
  deliveryAddress: string
  district: string
  deliveryLat: number
  deliveryLng: number
  otpCode: string
  paymentMethod: 'cash' | 'wallet'
  prepTimeMinutes: number
  dispatchAt: string | null
  readyAt: string | null
  handoverAt: string | null
  deliveredAt: string | null
  notes: string
  disputeNote: string | null
  createdAt: string
  storeLatitude?: number
  storeLongitude?: number
  storeEmoji?: string
}

export interface RadarOffer {
  orderId: string
  orderNumber: string
  storeName: string
  storeEmoji: string
  district: string
  deliveryFeeLyd: number
  subtotalLyd: number
  totalLyd: number
  distanceKm: number
  prepMinutes: number
  paymentMethod: string
  expiresInSec: number
  offeredAt: string
}

export interface VoucherDTO {
  id: string
  voucherNumber: string
  type: 'receipt' | 'disbursement'
  beneficiaryName: string
  beneficiaryRole: string
  amountLyd: number
  orderId: string | null
  notes: string
  createdAt: string
}

export interface AccountingSummary {
  date: string
  totalOrders: number
  deliveredOrders: number
  activeOrders: number
  gmvLyd: number
  cashCollectedLyd: number
  merchantDuesLyd: number
  captainCustodyLyd: number
  captainDuesLyd: number
  platformNetLyd: number
  walletPaymentsLyd: number
  stores: { id: string; name: string; emoji: string; dues: number; payoutPaid: number }[]
  drivers: DriverDTO[]
  lastAudit: { auditCode: string; auditDate: string; gmvLyd: number; cashCollectedLyd: number; isClosed: boolean; closedAt: string | null } | null
  audits: { auditCode: string; auditDate: string; totalOrders: number; gmvLyd: number; cashCollectedLyd: number; merchantDuesLyd: number; platformNetLyd: number; isClosed: boolean }[]
}

export interface CartItem {
  productId: string
  title: string
  qty: number
  unitPrice: number
  emoji: string
  notes?: string
}

/// حالة توصيل الكابتن الرباعية
export type DeliveryStage = 'to_store' | 'pickup_locked' | 'to_customer' | 'verify_cash'
