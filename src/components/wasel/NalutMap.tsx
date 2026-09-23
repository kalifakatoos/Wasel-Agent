'use client'

// 🗺️ خريطة نالوت التفاعلية (SVG إسقاطية فاخرة بألوان واصل)
import { useMemo } from 'react'
import { MAP_BOUNDS, COLORS } from '@/lib/wasel/constants'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  kind: 'store' | 'customer' | 'captain' | 'target'
  label?: string
  emoji?: string
  active?: boolean
}

interface NalutMapProps {
  markers: MapMarker[]
  routeFrom?: { lat: number; lng: number } | null
  routeTo?: { lat: number; lng: number } | null
  className?: string
  compact?: boolean
}

/// إسقاط خطي للإحداثيات إلى viewBox 0..1000 x 0..700
function project(lat: number, lng: number): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = MAP_BOUNDS
  const clampedLat = Math.min(maxLat, Math.max(minLat, lat))
  const clampedLng = Math.min(maxLng, Math.max(minLng, lng))
  const x = ((clampedLng - minLng) / (maxLng - minLng)) * 1000
  const y = (1 - (clampedLat - minLat) / (maxLat - minLat)) * 700
  return { x, y }
}

const DISTRICT_LABELS = [
  { name: 'وسط المدينة', lat: 31.8687, lng: 10.9818 },
  { name: 'حي القلعة', lat: 31.8668, lng: 10.9848 },
  { name: 'سيدي خليفة', lat: 31.8655, lng: 10.978 },
  { name: 'شارع تونس', lat: 31.8712, lng: 10.979 },
  { name: 'طريق الحوامد', lat: 31.865, lng: 10.988 },
]

export function NalutMap({ markers, routeFrom, routeTo, className = '', compact = false }: NalutMapProps) {
  const projected = useMemo(
    () =>
      markers.map((m) => ({
        ...m,
        pos: project(m.lat, m.lng),
      })),
    [markers],
  )

  const route = useMemo(() => {
    if (!routeFrom || !routeTo) return null
    const a = project(routeFrom.lat, routeFrom.lng)
    const b = project(routeTo.lat, routeTo.lng)
    // منحنى لطيف بين النقطتين
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 - 40
    return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`
  }, [routeFrom, routeTo])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] ${className}`}
      style={{ background: '#041710' }}
      dir="ltr"
    >
      <svg
        viewBox="0 0 1000 700"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="خريطة نالوت اللحظية"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0A3324" />
            <stop offset="100%" stopColor="#041710" />
          </radialGradient>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#F5D061" />
          </linearGradient>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(212,175,55,0.06)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* الخلفية الجبلية */}
        <rect width="1000" height="700" fill="url(#mapGlow)" />
        <rect width="1000" height="700" fill="url(#grid)" />

        {/* سلسلة جبال نفوسة الشرقية (ديكور) */}
        <path
          d="M 0 130 L 90 80 L 180 140 L 280 70 L 380 150 L 1000 90"
          fill="none"
          stroke="rgba(212,175,55,0.12)"
          strokeWidth="2.5"
        />
        <text x="60" y="60" fill="rgba(147,142,126,0.55)" fontSize="17" fontWeight="600">
          ⛰️ جبل نفوسة
        </text>

        {/* الطرق الرئيسية */}
        <path d="M 120 700 L 300 480 L 420 430 L 560 380 L 720 300 L 850 160" fill="none" stroke="rgba(212,175,55,0.28)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 60 560 L 260 520 L 520 500 L 780 520 L 960 470" fill="none" stroke="rgba(212,175,55,0.22)" strokeWidth="6" strokeLinecap="round" />
        <path d="M 480 700 L 500 520 L 470 300 L 520 120" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="5" strokeLinecap="round" />
        <path d="M 880 700 L 860 480 L 900 260" fill="none" stroke="rgba(212,175,55,0.16)" strokeWidth="5" strokeLinecap="round" />

        {/* أسماء الأحياء */}
        {!compact &&
          DISTRICT_LABELS.map((d) => {
            const p = project(d.lat, d.lng)
            return (
              <text
                key={d.name}
                x={p.x}
                y={p.y - 26}
                fill="rgba(147,142,126,0.75)"
                fontSize="18"
                fontWeight="700"
                textAnchor="middle"
              >
                {d.name}
              </text>
            )
          })}

        {/* مسار التوصيل */}
        {route && (
          <path
            d={route}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="5"
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity="0.9"
          />
        )}

        {/* العلامات */}
        {projected.map((m) => {
          const isCaptain = m.kind === 'captain'
          const isCustomer = m.kind === 'customer'
          const isStore = m.kind === 'store'
          const size = isCaptain ? 26 : isStore ? 22 : 20
          const fill = isCaptain ? COLORS.goldRadiance : isCustomer ? COLORS.emeraldAccent : isStore ? COLORS.goldPrimary : COLORS.warning
          return (
            <g key={m.id} transform={`translate(${m.pos.x}, ${m.pos.y})`}>
              {(isCaptain || m.active) && (
                <circle r={size * 0.7} fill={fill} opacity="0.35" className="marker-pulse" />
              )}
              <circle r={size} fill={fill} stroke="#041710" strokeWidth="3" />
              <text
                y={size * 0.42}
                textAnchor="middle"
                fontSize={size * 0.95}
                role="presentation"
              >
                {m.emoji || (isCaptain ? '🛵' : isCustomer ? '🏠' : isStore ? '🏪' : '📍')}
              </text>
              {m.label && (
                <text
                  y={-size - 8}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="700"
                  fill={isCaptain ? COLORS.goldRadiance : '#F8F5EE'}
                  stroke="#041710"
                  strokeWidth="0.6"
                  paintOrder="stroke"
                >
                  {m.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
