'use client'

// 🧩 عناصر عرض مشتركة صغيرة لتطبيق الكابتن (واصل نالوت)
import type { CSSProperties, ReactNode } from 'react'

export type StatTone = 'gold' | 'emerald' | 'ivory' | 'orange'

const STAT_TONES: Record<StatTone, string> = {
  gold: 'text-[#F5D061]',
  emerald: 'text-[#10B981]',
  ivory: 'text-[#F8F5EE]',
  orange: 'text-[#F59E0B]',
}

/** بلاطة مؤشر (أرباح / رحلات / تقييم / طلبات نشطة) — أهداف لمس مريحة وتناسق ذهبي */
export function StatTile({
  emoji,
  label,
  value,
  tone = 'gold',
}: {
  emoji: string
  label: string
  value: ReactNode
  tone?: StatTone
}) {
  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#062319] px-2 py-3 text-center">
      <div className="mb-1 text-xl leading-none">{emoji}</div>
      <div className={`font-money ltr-nums text-lg font-bold leading-tight ${STAT_TONES[tone]}`}>{value}</div>
      <div className="mt-1 text-[11px] font-semibold leading-tight text-[#938E7E]">{label}</div>
    </div>
  )
}

/** نقطة حالة نابضة (متصل/مشغول/انتظار) */
export function PulseDot({ color, pulsing = true, className = '' }: { color: string; pulsing?: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex h-3 w-3 shrink-0 ${className}`}>
      {pulsing && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: color }} />
    </span>
  )
}

/** حاوية بطاقة موحدة بألوان واصل */
export function WaselCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section
      className={`rounded-3xl border border-[rgba(212,175,55,0.2)] bg-[#062319] p-5 shadow-lg shadow-black/20 ${className}`}
      style={style}
    >
      {children}
    </section>
  )
}
