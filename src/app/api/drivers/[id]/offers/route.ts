import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { haversineKm } from '@/lib/wasel/pricing'
import type { RadarOffer } from '@/lib/wasel/types'

export const dynamic = 'force-dynamic'

/**
 * عروض الرادار المتاحة للكابتن (fallback استقصائي + بعد قطع الاتصال)
 * يُرتب بمعامل هنغاريان: الأقرب للمتجر أولاً
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const driver = await db.driver.findUnique({ where: { id } })
    if (!driver) return NextResponse.json({ error: 'الكابتن غير موجود' }, { status: 404 })

    const pending = await db.order.findMany({
      where: { driverId: null, status: { in: ['preparing', 'accepted', 'ready_for_pickup'] } },
      include: { store: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    })

    const offers: (RadarOffer & { costRank: number })[] = pending.map((order) => {
      const distanceKm = haversineKm(
        driver.currentLatitude ?? 31.8687, driver.currentLongitude ?? 10.9818,
        order.store.latitude, order.store.longitude,
      )
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeName: order.storeName,
        storeEmoji: order.store.emoji,
        district: order.district,
        deliveryFeeLyd: order.deliveryFeeLyd,
        subtotalLyd: order.subtotalLyd,
        totalLyd: order.totalLyd,
        distanceKm: Math.round(distanceKm * 10) / 10,
        prepMinutes: order.prepTimeMinutes,
        paymentMethod: order.paymentMethod,
        expiresInSec: 15,
        offeredAt: new Date().toISOString(),
        costRank: Math.round(distanceKm * 100) / 100,
      }
    }).sort((a, b) => a.costRank - b.costRank)

    return NextResponse.json({ offers })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
