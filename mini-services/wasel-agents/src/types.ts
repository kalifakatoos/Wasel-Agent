export type AgentTypes =
  | 'sales'
  | 'procurement'
  | 'dispatch'
  | 'accounting'
  | 'revenue'
  | 'customer_intel'
  | 'ops_monitor'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

export interface AgentTaskInput {
  type: string
  [key: string]: any
}

export interface AgentTaskOutput {
  status: string
  [key: string]: any
}

export interface SalesContext {
  orderId: string
  customerPhone: string
  storeId: string
  items: Array<{
    productId: string
    title: string
    qty: number
  }>
}

export interface ProcurementContext {
  storeId?: string
  productId?: string
  productName: string
  requiredQty: number
  maxCostLyd?: number
}

export interface DispatchContext {
  orderId: string
  storeLat: number
  storeLng: number
  customerLat: number
  customerLng: number
}

export interface AccountingContext {
  orderId: string
  totalLyd: number
  paymentMethod: 'cash' | 'wallet'
}

export interface RevenueContext {
  code: string
  subtotal: number
  reason: string
}

export interface CustomerIntelContext {
  customerPhone: string
  orderValue: number
  storeId: string
}

export interface OpsMonitorContext {
  metric: string
  threshold: number
}
