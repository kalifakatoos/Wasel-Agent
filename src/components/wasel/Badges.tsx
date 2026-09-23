'use client'

// كبسولة حالة الطلب + عرض المبالغ بالدينار الليبي
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/wasel/constants'
import type { OrderStatus } from '@/lib/wasel/types'

export function StatusBadge({ status, size = 'md' }: { status: OrderStatus | string; size?: 'sm' | 'md' }) {
  const color = STATUS_COLORS[status] || '#938E7E'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}`}
      style={{ borderColor: `${color}55`, color, background: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

/** عرض مبلغ صريح بالدينار الليبي — أرقام لاتينية واضحة لمنع أي التباس */
export function Ly({
  amount,
  className = '',
  suffix = ' د.ل',
  bold = false,
}: {
  amount: number
  className?: string
  suffix?: string
  bold?: boolean
}) {
  return (
    <span className={`font-money ltr-nums ${bold ? 'font-bold' : ''} ${className}`}>
      {(Number.isFinite(amount) ? amount : 0).toFixed(2)}
      <span className="ms-1 text-[0.72em] opacity-80">{suffix}</span>
    </span>
  )
}

/** رقم طلب بارز */
export function OrderNo({ no, className = '' }: { no: string; className?: string }) {
  return <span className={`font-money ltr-nums tracking-wide ${className}`}>{no}</span>
}
