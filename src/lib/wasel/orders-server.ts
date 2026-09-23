// ============================================================
// منطق الطلبات الخادمي المشترك (Mapper + Ledger + Dispatch)
// ============================================================
import { db } from '@/lib/db'
import { emitRealtime, money } from './server-utils'
import { haversineKm, dispatchCost } from './pricing'
import { LEDGER_RATES, CUSTODY_CAP_LYD } from './constants'
import type { OrderDTO, OrderItem, RadarOffer } from './types'

type OrderRow = {
  id: string; orderNumber: string; customerName: string; customerPhone: string
  storeId: string; storeName: string; driverId: string | null; driverName: string | null
  status: string; itemsJson: string; subtotalLyd: number; deliveryFeeLyd: number
  serviceFeeLyd: number; discountLyd: number; totalLyd: number; deliveryAddress: string
  district: string; deliveryLat: number; deliveryLng: number; otpCode: string
  paymentMethod: string; prepTimeMinutes: number; dispatchAt: Date | null
  readyAt: Date | null; handoverAt: Date | null; deliveredAt: Date | null
  notes: string; disputeNote: string | null
  ratedAt: Date | null; storeStars: number | null; driverStars: number | null
  createdAt: Date
}

/// ترقيع حقول التقييم الجديدة عبر SQL خام (متوافق مع عميل Prisma قديم محمّل في الذاكرة)
export async function patchNewOrderFields<T extends { id: string }>(orders: T[]): Promise<T[]> {
  if (orders.length === 0) return orders
  try {
    const ids = orders.map((o) => o.id)
    const placeholders = ids.map(() => '?').join(',')
    const rows = await db.$queryRawUnsafe<{
      id: string; ratedAt: string | null; storeStars: number | null; driverStars: number | null
    }[]>(
      `SELECT id, ratedAt, storeStars, driverStars FROM "Order" WHERE id IN (${placeholders})`,
      ...ids,
    )
    const byId = new Map(rows.map((r) => [r.id, r]))
    return orders.map((o) => {
      const patch = byId.get(o.id)
      if (!patch) return o
      return {
        ...o,
        ratedAt: (o as { ratedAt?: unknown }).ratedAt ?? patch.ratedAt ?? null,
        storeStars: (o as { storeStars?: unknown }).storeStars ?? patch.storeStars ?? null,
        driverStars: (o as { driverStars?: unknown }).driverStars ?? patch.driverStars ?? null,
      }
    })
  } catch {
    // إن فشل الترقيع (مثلاً عميل حديث يملك الحقول أصلاً) نعيد كما هو
    return orders
  }
}

export function mapOrder(o: OrderRow, store?: { latitude: number; longitude: number; emoji: string } | null): OrderDTO {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    storeId: o.storeId,
    storeName: o.storeName,
    driverId: o.driverId,
    driverName: o.driverName,
    status: o.status as OrderDTO['status'],
    items: JSON.parse(o.itemsJson || '[]') as OrderItem[],
    subtotalLyd: o.subtotalLyd,
    deliveryFeeLyd: o.deliveryFeeLyd,
    serviceFeeLyd: o.serviceFeeLyd,
    discountLyd: o.discountLyd,
    totalLyd: o.totalLyd,
    deliveryAddress: o.deliveryAddress,
    district: o.district,
    deliveryLat: o.deliveryLat,
    deliveryLng: o.deliveryLng,
    otpCode: o.otpCode,
    paymentMethod: o.paymentMethod as 'cash' | 'wallet',
    prepTimeMinutes: o.prepTimeMinutes,
    dispatchAt: o.dispatchAt?.toISOString() ?? null,
    readyAt: o.readyAt?.toISOString() ?? null,
    handoverAt: o.handoverAt?.toISOString() ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    notes: o.notes,
    disputeNote: o.disputeNote,
    ratedAt: o.ratedAt?.toISOString() ?? null,
    storeStars: o.storeStars,
    driverStars: o.driverStars,
    createdAt: o.createdAt.toISOString(),
    storeLatitude: store?.latitude,
    storeLongitude: store?.longitude,
    storeEmoji: store?.emoji,
  }
}

/// إشعال رادار التوزيع لبث العروض للكباتن المتصلين (خوارزمية هنغاريان مبسطة)
export async function dispatchRadar(orderId: string): Promise<number> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { store: true } })
  if (!order) return 0
  if (order.driverId || !['preparing', 'accepted', 'ready_for_pickup'].includes(order.status)) return 0

  const onlineDrivers = await db.driver.findMany({ where: { status: 'online' } })
  if (onlineDrivers.length === 0) return 0

  const prepRemaining = Math.max(
    2,
    Math.round((order.readyAt ? order.readyAt.getTime() : Date.now() + order.prepTimeMinutes * 60000 - Date.now()) / 60000),
  )

  const ranked = onlineDrivers
    .map((d) => {
      const dist = haversineKm(d.currentLatitude ?? 31.8687, d.currentLongitude ?? 10.9818, order.store.latitude, order.store.longitude)
      return { driver: d, dist, cost: dispatchCost(dist, prepRemaining) }
    })
    .sort((a, b) => a.cost - b.cost)

  let offered = 0
  for (const r of ranked) {
    const offer: RadarOffer = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeName: order.storeName,
      storeEmoji: order.store.emoji,
      district: order.district,
      deliveryFeeLyd: order.deliveryFeeLyd,
      subtotalLyd: order.subtotalLyd,
      totalLyd: order.totalLyd,
      distanceKm: Math.round(r.dist * 10) / 10,
      prepMinutes: order.prepTimeMinutes,
      paymentMethod: order.paymentMethod,
      expiresInSec: 15,
      offeredAt: new Date().toISOString(),
    }
    await emitRealtime([`driver:${r.driver.id}`, 'admin:fleet'], 'order:radar_offer', offer)
    offered++
  }
  await emitRealtime(['admin:fleet'], 'order:radar_broadcast', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeName: order.storeName,
    candidates: ranked.length,
  })
  return offered
}

/// تقييد القيد المزدوج عند التسليم الناجح (Delivered)
export async function settleLedgerOnDelivered(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || order.status !== 'delivered') return

  // حماية من التقييد المزدوج (idempotency)
  const alreadySettled = await db.walletTransaction.findFirst({
    where: { orderId, type: 'store_payout' },
  })
  if (alreadySettled) return

  const storePayout = money(order.subtotalLyd * LEDGER_RATES.merchantShare)
  const platformCut = money(order.subtotalLyd * LEDGER_RATES.platformShare)
  const deliveryFee = money(order.deliveryFeeLyd)
  const total = money(order.totalLyd)

  // 1) الكاش النقدي: يدخل عهدة الكابتن (COD فقط)
  if (order.paymentMethod === 'cash' && order.driverId) {
    await db.driver.update({
      where: { id: order.driverId },
      data: { custodyCash: { increment: total } },
    })
    await db.walletTransaction.create({
      data: {
        orderId: order.id,
        fromWalletId: `customer:${order.customerPhone}`,
        toWalletId: `custody:${order.driverId}`,
        amount: total,
        type: 'custody_collect',
        narration: `قبض كاش من الزبون ${order.customerName} - الطلب ${order.orderNumber} (عهدة الكابتن)`,
      },
    })
  }

  // 2) الدفع بالمحفظة: تحرير الضمان من الحجز
  if (order.paymentMethod === 'wallet') {
    const escrow = await db.wallet.findUnique({ where: { ownerId: 'platform_escrow' } })
    if (escrow) {
      await db.wallet.update({
        where: { id: escrow.id },
        data: { balance: { decrement: total } },
      })
      await db.walletTransaction.create({
        data: {
          orderId: order.id,
          fromWalletId: 'platform_escrow',
          toWalletId: `store:${order.storeId}`,
          amount: total,
          type: 'order_delivered',
          narration: `صرف ضمان محفظة الزبون وتوزيعه - ${order.orderNumber}`,
        },
      })
    }
  }

  // 3) استحقاق المتجر 90% من ثمن الوجبة
  const storeWallet = await db.wallet.upsert({
    where: { ownerId: `store:${order.storeId}` },
    create: { ownerId: `store:${order.storeId}`, walletType: 'store', balance: storePayout },
    update: { balance: { increment: storePayout } },
  })
  await db.walletTransaction.create({
    data: {
      orderId: order.id,
      fromWalletId: `order:${order.id}`,
      toWalletId: storeWallet.ownerId,
      amount: storePayout,
      type: 'store_payout',
      narration: `استحقاق المتجر 90% من ثمن الطلب ${order.orderNumber}`,
    },
  })

  // 4) أرباح المنصة 10%
  const platformWallet = await db.wallet.upsert({
    where: { ownerId: 'platform_revenue' },
    create: { ownerId: 'platform_revenue', walletType: 'platform_revenue', balance: platformCut },
    update: { balance: { increment: platformCut } },
  })
  await db.walletTransaction.create({
    data: {
      orderId: order.id,
      fromWalletId: `order:${order.id}`,
      toWalletId: platformWallet.ownerId,
      amount: platformCut,
      type: 'platform_commission',
      narration: `أرباح المنصة 10% من ثمن الطلب ${order.orderNumber}`,
    },
  })

  // 5) استحقاق أجرة التوصيل الكاملة للكابتن
  if (order.driverId) {
    const driver = await db.driver.update({
      where: { id: order.driverId },
      data: {
        earningsTotal: { increment: deliveryFee },
        tripsCompleted: { increment: 1 },
        activeOrdersCount: { decrement: 1 },
      },
    })
    await db.wallet.upsert({
      where: { ownerId: `driver:${order.driverId}` },
      create: { ownerId: `driver:${order.driverId}`, walletType: 'driver_earnings', balance: deliveryFee },
      update: { balance: { increment: deliveryFee } },
    })
    await db.walletTransaction.create({
      data: {
        orderId: order.id,
        fromWalletId: `order:${order.id}`,
        toWalletId: `driver:${order.driverId}`,
        amount: deliveryFee,
        type: 'settlement',
        narration: `أجرة توصيل مستحقة للكابتن ${order.driverName} - ${order.orderNumber}`,
      },
    })

    // تنبيه تجاوز سقف العهدة (500 د.ل)
    if (driver.custodyCash > CUSTODY_CAP_LYD) {
      await emitRealtime([`driver:${driver.id}`, 'admin:fleet'], 'driver:custody_alert', {
        driverId: driver.id,
        custody: driver.custodyCash,
        cap: CUSTODY_CAP_LYD,
      })
    }

    // إنهاء الانشغال إن لا طلبات نشطة
    if (driver.activeOrdersCount <= 0) {
      await db.driver.update({ where: { id: driver.id }, data: { status: 'online' } })
      await emitRealtime([`driver:${driver.id}`], 'driver:shift', { status: 'online' })
    }
  }

  // بث التسليم لكل الأطراف
  await emitRealtime(
    [`order:${order.id}`, `store:${order.storeId}`, 'admin:fleet'],
    'order:status_changed',
    { orderId: order.id, status: 'delivered', orderNumber: order.orderNumber, totalLyd: total },
  )
}
