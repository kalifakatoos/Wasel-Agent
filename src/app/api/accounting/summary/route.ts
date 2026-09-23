import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, money } from '@/lib/wasel/server-utils'
import type { AccountingSummary, DriverDTO } from '@/lib/wasel/types'

export const dynamic = 'force-dynamic'

/** ملخص الحسابات ومحضر الجرد اليومي Z (يتطلب درع الـ PIN) */
export async function GET(req: NextRequest) {
  try {
    const pinError = assertAdminPin(req)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [todayOrders, stores, drivers, lastAudit, audits, transactions] = await Promise.all([
      db.order.findMany({
        where: { createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
      }),
      db.store.findMany({ include: { orders: { where: { status: 'delivered' } } } }),
      db.driver.findMany({ orderBy: { id: 'asc' } }),
      db.dailyAudit.findFirst({ orderBy: { closedAt: 'desc' } }),
      db.dailyAudit.findMany({ orderBy: { auditDate: 'desc' }, take: 14 }),
      db.walletTransaction.findMany({ where: { createdAt: { gte: todayStart } } }),
    ])

    const delivered = todayOrders.filter((o) => o.status === 'delivered')
    const activeStates = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery']

    const gmv = money(delivered.reduce((s, o) => s + o.totalLyd, 0))
    const cashCollected = money(
      delivered.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalLyd, 0),
    )
    const walletPayments = money(
      delivered.filter((o) => o.paymentMethod === 'wallet').reduce((s, o) => s + o.totalLyd, 0),
    )
    const merchantDues = money(delivered.reduce((s, o) => s + o.subtotalLyd * 0.9, 0))
    const platformNet = money(delivered.reduce((s, o) => s + o.subtotalLyd * 0.1, 0))
    const captainCustody = money(drivers.reduce((s, d) => s + d.custodyCash, 0))
    const captainDues = money(drivers.reduce((s, d) => s + d.earningsTotal, 0))

    // 🎟️ تحليلات الكوبونات اليومية (الخصم تتحمله المنصة 100%)
    const promoDiscountLyd = money(
      todayOrders.filter((o) => o.discountLyd > 0).reduce((s, o) => s + o.discountLyd, 0),
    )
    const promoOrders = todayOrders.filter((o) => o.discountLyd > 0).length
    let promoBreakdown: { code: string; uses: number; discountLyd: number }[] = []
    try {
      // Prisma يخزن التواريخ في SQLite كأرقام epoch millis — نقارن بها مباشرة
      promoBreakdown = (
        await db.$queryRawUnsafe<{ code: string; uses: number; discountLyd: number }[]>(
          `SELECT "promoCode" AS code, COUNT(*) AS uses, ROUND(SUM("discountLyd"), 2) AS discountLyd
           FROM "Order"
           WHERE "createdAt" >= ? AND "discountLyd" > 0 AND "promoCode" IS NOT NULL
           GROUP BY "promoCode" ORDER BY discountLyd DESC`,
          todayStart.getTime(),
        )
      ).map((r) => ({ code: String(r.code), uses: Number(r.uses), discountLyd: Number(r.discountLyd) }))
    } catch {
      promoBreakdown = []
    }

    const storeDues = stores.map((s) => {
      const deliveredOrders = s.orders.filter((o) => o.deliveredAt && o.deliveredAt >= todayStart)
      const dues = money(deliveredOrders.reduce((acc, o) => acc + o.subtotalLyd * 0.9, 0))
      const paidOut = money(
        transactions
          .filter((t) => t.type === 'store_payout_settled' && t.toWalletId === `store:${s.id}`)
          .reduce((acc, t) => acc + t.amount, 0),
      )
      return { id: s.id, name: s.name, emoji: s.emoji, dues, payoutPaid: paidOut }
    })

    const summary: AccountingSummary = {
      date: todayStart.toISOString(),
      totalOrders: todayOrders.length,
      deliveredOrders: delivered.length,
      activeOrders: todayOrders.filter((o) => activeStates.includes(o.status)).length,
      gmvLyd: gmv,
      cashCollectedLyd: cashCollected,
      merchantDuesLyd: merchantDues,
      captainCustodyLyd: captainCustody,
      captainDuesLyd: captainDues,
      platformNetLyd: platformNet,
      walletPaymentsLyd: walletPayments,
      // 🛵 مؤشرات نجاح التوزيع (الرادار): من الطلبات التي قبلها المتجر، كم طلباً وُجّه إليه كابتن؟
      dispatchEligible: todayOrders.filter(
        (o) => ['accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(o.status),
      ).length,
      dispatchAssigned: todayOrders.filter(
        (o) => ['accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(o.status) && o.driverId,
      ).length,
      // 🎟️ تحليلات الكوبونات
      promoDiscountLyd,
      promoOrders,
      promoBreakdown,
      stores: storeDues,
      drivers: drivers.map((d) => ({ ...d, status: d.status as DriverDTO['status'] })),
      lastAudit: lastAudit
        ? {
            auditCode: lastAudit.auditCode,
            auditDate: lastAudit.auditDate.toISOString(),
            gmvLyd: lastAudit.gmvLyd,
            cashCollectedLyd: lastAudit.cashCollectedLyd,
            isClosed: lastAudit.isClosed,
            closedAt: lastAudit.closedAt?.toISOString() ?? null,
          }
        : null,
      audits: audits.map((a) => ({
        auditCode: a.auditCode,
        auditDate: a.auditDate.toISOString(),
        totalOrders: a.totalOrders,
        gmvLyd: a.gmvLyd,
        cashCollectedLyd: a.cashCollectedLyd,
        merchantDuesLyd: a.merchantDuesLyd,
        platformNetLyd: a.platformNetLyd,
        isClosed: a.isClosed,
      })),
    }

    return NextResponse.json(summary)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
