import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, money } from '@/lib/wasel/server-utils'
import { getPromoRejectStats, getCashbackStats } from '@/lib/wasel/promos-server'
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

    // 💸 كاش باك الكوبونات المودع للمحافظ اليوم (طلبات بعمود cashbackLyd)
    const cashback = await getCashbackStats(todayStart.getTime())
    // 📉 الفرص الضائعة: محاولات كوبونات مرفوضة اليوم (نفدت الحصة/معطل/تحت الحد)
    const promoRejects = await getPromoRejectStats(todayStart.getTime())

    // 📈 اتجاه GMV آخر 7 أيام (لسباركلاين الداشبورد) — نجمع طلبات الأيام السبعة الماضية محلياً
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 6)
    const weekOrders = await db.order.findMany({
      where: { status: 'delivered', createdAt: { gte: weekStart } },
      select: { totalLyd: true, createdAt: true },
    })
    const DAY_MS = 86_400_000
    const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(weekStart.getTime() + i * DAY_MS)
      const dayEnd = new Date(dayStart.getTime() + DAY_MS)
      const dayOrders = weekOrders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
      return {
        date: dayStart.toISOString(),
        label: DAY_LABELS[dayStart.getDay()],
        gmvLyd: money(dayOrders.reduce((s, o) => s + o.totalLyd, 0)),
        orders: dayOrders.length,
      }
    })

    // 📈 R11: اتجاه GMV آخر 30 يوماً — سباركلاين المبيعات الشهرية في تاب Z
    // (نستخدم نفس قائمة طلبات الأسبوع ونجلب إضافياً الـ 30 يوماً — استعلام واحد خفيف)
    const monthStart = new Date(todayStart)
    monthStart.setDate(monthStart.getDate() - 29)
    const monthOrders = await db.order.findMany({
      where: { status: 'delivered', createdAt: { gte: monthStart } },
      select: { totalLyd: true, createdAt: true },
    })
    const monthlyTrend = Array.from({ length: 30 }, (_, i) => {
      const dayStart = new Date(monthStart.getTime() + i * DAY_MS)
      const dayEnd = new Date(dayStart.getTime() + DAY_MS)
      const dayOrders = monthOrders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
      return {
        date: dayStart.toISOString(),
        label: DAY_LABELS[dayStart.getDay()],
        gmvLyd: money(dayOrders.reduce((s, o) => s + o.totalLyd, 0)),
        orders: dayOrders.length,
      }
    })

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
      // 💸 كاش باك الكوبونات المودع للمحافظ
      promoCashbackLyd: cashback.total,
      promoCashbackOrders: cashback.orders,
      // 📉 الفرص الضائعة (محاولات كوبونات مرفوضة)
      promoRejects,
      // 📈 اتجاه GMV الأسبوعي
      weeklyTrend,
      // 📈 اتجاه GMV الشهري (R11)
      monthlyTrend,
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
