'use client'

// ============================================================
// 🛰️ الأسطول الحي — خريطة نالوت اللحظية + سجل الكباتن (Task 7-d)
// ============================================================
import { useMemo } from 'react'
import { Bike, Clock3, HandCoins } from 'lucide-react'
import type { DriverDTO } from '@/lib/wasel/types'
import { CUSTODY_CAP_LYD } from '@/lib/wasel/constants'
import { NalutMap, type MapMarker } from '@/components/wasel/NalutMap'
import { Ly } from '@/components/wasel/Badges'
import {
  EmptyHint,
  SectionCard,
  DRIVER_STATUS_COLORS,
  DRIVER_STATUS_LABELS,
  fmtClock,
  type FleetPos,
} from './admin-shared'

export default function FleetTab({
  drivers,
  positions,
}: {
  drivers: DriverDTO[]
  positions: Record<string, FleetPos>
}) {
  const markers = useMemo<MapMarker[]>(() => {
    return drivers
      .map((d): MapMarker | null => {
        const live = positions[d.id]
        const lat = live?.lat ?? d.currentLatitude
        const lng = live?.lng ?? d.currentLongitude
        if (lat == null || lng == null) return null
        return {
          id: `captain-${d.id}`,
          lat,
          lng,
          kind: 'captain',
          label: d.fullName,
          active: (live?.status ?? d.status) !== 'offline',
        }
      })
      .filter((m): m is MapMarker => m !== null)
  }, [drivers, positions])

  const counts = useMemo(() => {
    const c = { online: 0, busy: 0, offline: 0 }
    for (const d of drivers) c[d.status] += 1
    return c
  }, [drivers])

  const totalCustody = drivers.reduce((s, d) => s + d.custodyCash, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* الخريطة الكبيرة */}
      <SectionCard
        title="الخريطة اللحظية لنالوت"
        icon={<Bike className="h-4 w-4" />}
        extra={
          <span className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-[#10B981]">
              متصل <span className="ltr-nums font-money">{counts.online}</span>
            </span>
            <span className="rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] px-2 py-1 text-[#F5D061]">
              مشغول <span className="ltr-nums font-money">{counts.busy}</span>
            </span>
            <span className="rounded-full border border-[rgba(147,142,126,0.4)] bg-[rgba(147,142,126,0.1)] px-2 py-1 text-[#938E7E]">
              خارج الخدمة <span className="ltr-nums font-money">{counts.offline}</span>
            </span>
          </span>
        }
      >
        {markers.length === 0 ? (
          <EmptyHint text="لا توجد إشارات موقع بعد — سينضم الكباتن للبث تلقائياً عند بدء وردياتهم" />
        ) : (
          <NalutMap markers={markers} className="h-[380px] md:h-[480px]" />
        )}
      </SectionCard>

      {/* قائمة الكباتن الجانبية */}
      <SectionCard
        title="كباتن الأسطول"
        icon={<HandCoins className="h-4 w-4" />}
        extra={
          <span className="text-[11px] text-[#938E7E]">
            العهد المجمعة <Ly amount={totalCustody} bold className="text-[#F5D061]" />
          </span>
        }
      >
        <div className="wasel-scroll max-h-[480px] space-y-2 overflow-y-auto pe-1">
          {drivers.length === 0 && <EmptyHint text="لا يوجد كباتن مسجلون" />}
          {drivers.map((d) => {
            const live = positions[d.id]
            const color = DRIVER_STATUS_COLORS[d.status]
            const hot = d.custodyCash > CUSTODY_CAP_LYD
            return (
              <div
                key={d.id}
                className="rounded-xl border border-[rgba(212,175,55,0.14)] bg-[#041710] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <p className="truncate text-[13px] font-bold text-[#F8F5EE]">{d.fullName}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold" style={{ color }}>
                    {DRIVER_STATUS_LABELS[d.status]}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#938E7E]">
                  <span>
                    العهدة{' '}
                    <Ly
                      amount={d.custodyCash}
                      bold
                      className={hot ? 'text-[#F59E0B]' : 'text-[#F8F5EE]'}
                    />
                  </span>
                  <span className="ltr-nums font-money">
                    {d.tripsCompleted} رحلة
                  </span>
                  {live ? (
                    <span className="flex items-center gap-1 text-[#10B981]">
                      <Clock3 className="h-3 w-3" />
                      <span className="ltr-nums font-money">{fmtClock(live.updatedAt)}</span>
                    </span>
                  ) : (
                    <span className="text-[#938E7E]/70">بلا إشارة حية</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
