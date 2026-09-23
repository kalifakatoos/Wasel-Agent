'use client'

// ============================================================
// 🧩 مكونات وأنواع مشتركة لغرفة عمليات واصل نالوت (Task 7-d)
// زمرد + ذهبي فقط — دينار ليبي حصرياً عبر <Ly/>
// ============================================================
import type { ReactNode } from 'react'
import type { DriverDTO, VoucherDTO } from '@/lib/wasel/types'
import { Ly } from '@/components/wasel/Badges'

// ---------- أنواع حالة غرفة العمليات ----------

/// موقع كابتن من التيليمتري اللحظي (fleet:driver_location / fleet:snapshot)
export interface FleetPos {
  driverId: string
  lat: number
  lng: number
  heading?: number
  status: DriverDTO['status']
  updatedAt: string
}

/// حدث في السجل الحي لغرفة العمليات
export interface FeedEvent {
  id: string
  at: number
  kind: 'status' | 'radar' | 'custody' | 'payout'
  text: string
  sub?: string
}

/// حمولة GET /api/vouchers
export interface VouchersPayload {
  vouchers: VoucherDTO[]
  blocked: { phone: string; reason: string; blockedAt: string }[]
  transactions: { id: string; amount: number; type: string; narration: string; createdAt: string }[]
}

/// نتيجة POST /api/disputes/resolve-noshow
export interface ResolveNoShowResult {
  ok: boolean
  orderNumber: string
  storeVoucher: VoucherDTO
  storePayout: number
  captainFee: number
  blockedPhone: string
}

/// نتيجة POST /api/drivers/{id}/settle
export interface SettleResult {
  driver: DriverDTO
  voucher: VoucherDTO
}

/// نتيجة POST /api/accounting/payout-store
export interface PayoutStoreResult {
  voucher: VoucherDTO
  remainingDues: number
}

/// سجل محضر جرد Z
export interface AuditRecord {
  auditCode: string
  auditDate: string
  totalOrders: number
  gmvLyd: number
  cashCollectedLyd: number
  merchantDuesLyd?: number
  platformNetLyd: number
  isClosed: boolean
  closedAt?: string | null
  notes?: string
}

// ---------- تسميات محلية ----------

export const DRIVER_STATUS_LABELS: Record<DriverDTO['status'], string> = {
  offline: 'غير متصل',
  online: 'متصل',
  busy: 'مشغول في مهمة',
}

export const DRIVER_STATUS_COLORS: Record<DriverDTO['status'], string> = {
  offline: '#938E7E',
  online: '#10B981',
  busy: '#D4AF37',
}

export function beneficiaryRoleLabel(role: string): string {
  if (role === 'driver') return 'كابتن أسطول واصل'
  if (role === 'store') return 'متجر شريك'
  return role
}

export function fmtDateTime(iso: string | number | Date): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB')} • ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function fmtClock(iso: string | number | Date): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ---------- بطاقة مؤشر KPI ----------

const TONES = {
  gold: { value: '#F5D061', chip: 'rgba(212,175,55,0.14)', ring: 'rgba(212,175,55,0.3)' },
  emerald: { value: '#10B981', chip: 'rgba(16,185,129,0.13)', ring: 'rgba(16,185,129,0.35)' },
  warn: { value: '#F59E0B', chip: 'rgba(245,158,11,0.13)', ring: 'rgba(245,158,11,0.4)' },
  plain: { value: '#F8F5EE', chip: 'rgba(248,245,238,0.08)', ring: 'rgba(147,142,126,0.4)' },
} as const

export function KpiCard({
  icon,
  label,
  hint,
  tone = 'gold',
  amount,
  text,
  suffix,
}: {
  icon: ReactNode
  label: string
  hint?: string
  tone?: keyof typeof TONES
  amount?: number
  text?: string
  suffix?: string
}) {
  const t = TONES[tone]
  return (
    <div
      className="rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319] p-4 transition-colors hover:border-[rgba(212,175,55,0.35)]"
      style={{ boxShadow: `inset 0 0 0 1px rgba(212,175,55,0.04)` }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: t.chip, boxShadow: `0 0 0 1px ${t.ring}` }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#F8F5EE]">{label}</p>
          {hint && <p className="truncate text-[11px] text-[#938E7E]">{hint}</p>}
        </div>
      </div>
      <div className="mt-3">
        {amount !== undefined ? (
          <span className="block" style={{ color: t.value }}>
            <Ly amount={amount} bold className="text-[22px] leading-none" suffix={suffix ?? ' د.ل'} />
          </span>
        ) : (
          <p className="font-money text-[22px] font-bold leading-none" style={{ color: t.value }}>
            {text ?? '—'}
          </p>
        )}
      </div>
    </div>
  )
}

/// بطاقة قسم بعنوان ذهبي
export function SectionCard({
  title,
  icon,
  extra,
  children,
  className = '',
}: {
  title: string
  icon?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319]/70 p-4 ${className}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#F5D061]">
          {icon}
          {title}
        </h3>
        {extra}
      </header>
      {children}
    </section>
  )
}

/// حالة فراغ موحدة
export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[rgba(212,175,55,0.2)] p-4 text-center text-xs text-[#938E7E]">
      {text}
    </div>
  )
}

// ---------- السند المالي الرسمي (نمط ورقي أبيض نظيف قابل للطباعة) ----------

export function VoucherDocument({
  voucher,
  title,
  extraNote,
}: {
  voucher: VoucherDTO
  title: string
  extraNote?: string
}) {
  const isReceipt = voucher.type === 'receipt'
  return (
    <div className="print-area mx-auto w-full max-w-md rounded-xl border border-[#D9D4C5] bg-white p-5 text-[#171512] shadow-xl" dir="rtl">
      {/* رأس الورقة */}
      <div className="flex items-start justify-between border-b-2 border-[#171512] pb-3">
        <div>
          <p className="text-base font-extrabold">🛡️ واصل نالوت</p>
          <p className="mt-0.5 text-[11px] text-[#5c584c]">غرفة العمليات والمالية — نالوت • جبل نفوسة</p>
        </div>
        <span
          className="rounded-md border px-2 py-1 text-[11px] font-bold"
          style={{
            borderColor: isReceipt ? '#0E7A57' : '#8a6d1c',
            color: isReceipt ? '#0E7A57' : '#8a6d1c',
            background: isReceipt ? 'rgba(16,185,129,0.08)' : 'rgba(212,175,55,0.12)',
          }}
        >
          {isReceipt ? 'سند قبض' : 'سند صرف'}
        </span>
      </div>

      {/* العنوان ورقم السند */}
      <p className="mt-4 text-center text-lg font-extrabold">{title}</p>
      <p className="mt-1 text-center text-[11px] text-[#5c584c]">رقم السند</p>
      <p className="text-center">
        <span className="font-money ltr-nums text-2xl font-bold tracking-wider">{voucher.voucherNumber}</span>
      </p>

      {/* بيانات السند */}
      <div className="mt-4 space-y-2 text-[13px]">
        <Row label="التاريخ" value={fmtDateTime(voucher.createdAt)} />
        <Row label="المستفيد" value={voucher.beneficiaryName} />
        <Row label="الصفة" value={beneficiaryRoleLabel(voucher.beneficiaryRole)} />
        <Row
          label="مرتبط بطلب"
          value={voucher.orderId ? <span className="font-money ltr-nums">{voucher.orderId.slice(-8).toUpperCase()}</span> : '—'}
        />
      </div>

      {/* صندوق المبلغ */}
      <div className="mt-4 rounded-lg border-2 border-[#171512] p-3 text-center">
        <p className="text-[11px] text-[#5c584c]">المبلغ الإجمالي</p>
        <Ly amount={voucher.amountLyd} bold className="text-3xl text-[#171512]" />
      </div>

      {/* ملاحظات */}
      <div className="mt-4">
        <p className="text-[11px] text-[#5c584c]">البيان</p>
        <p className="mt-1 rounded-md bg-[#F4F1E8] p-2 text-[12px] leading-relaxed">{voucher.notes || '—'}</p>
      </div>
      {extraNote && <p className="mt-2 text-[11px] text-[#8a6d1c]">{extraNote}</p>}

      {/* التوقيعان */}
      <div className="mt-6 grid grid-cols-2 gap-6 text-center text-[11px] text-[#5c584c]">
        <div>
          <div className="mx-auto border-t border-[#171512] pt-1" style={{ width: '85%' }}>
            توقيع المستفيد
          </div>
        </div>
        <div>
          <div className="mx-auto border-t border-[#171512] pt-1" style={{ width: '85%' }}>
            أمين الصندوق
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-dashed border-[#D9D4C5] pt-2 text-center text-[10px] text-[#8b8676]">
        إثبات مالي رسمي داخل منظومة واصل نالوت — كل قرش مُساءل
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dotted border-[#D9D4C5] pb-1">
      <span className="text-[#5c584c]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
