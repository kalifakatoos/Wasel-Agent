import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/// 🧾 كشف حساب متجر شريك (CRON-R9) — سجل الطلبات المسلّمة ومستحقات 90%
/// GET /api/accounting/store-statement?store_id=...&days=30 — يتطلب درع الـ PIN
export async function GET(req: NextRequest) {
  try {
    const pinError = assertAdminPin(req)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const storeId = req.nextUrl.searchParams.get('store_id') ?? ''
    const daysParam = Number(req.nextUrl.searchParams.get('days') ?? '30')
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(365, Math.floor(daysParam)) : 30

    if (!storeId) {
      return NextResponse.json({ error: 'معرّف المتجر مطلوب' }, { status: 400 })
    }
    const store = await db.store.findUnique({ where: { id: storeId } })
    if (!store) {
      return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })
    }

    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))

    const orders = await db.order.findMany({
      where: {
        storeId,
        status: 'delivered',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        orderNumber: true,
        createdAt: true,
        deliveredAt: true,
        subtotalLyd: true,
        deliveryFeeLyd: true,
        paymentMethod: true,
      },
    })

    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      at: (o.deliveredAt ?? o.createdAt).toISOString(),
      subtotalLyd: money(o.subtotalLyd),
      payoutLyd: money(o.subtotalLyd * 0.9),
      platformLyd: money(o.subtotalLyd * 0.1),
      deliveryFeeLyd: money(o.deliveryFeeLyd),
      paymentMethod: o.paymentMethod,
    }))

    return NextResponse.json({
      store: { id: store.id, name: store.name, emoji: store.emoji, district: store.district },
      days,
      from: since.toISOString(),
      to: new Date().toISOString(),
      rows,
      totals: {
        orders: rows.length,
        subtotalLyd: money(rows.reduce((s, r) => s + r.subtotalLyd, 0)),
        payoutLyd: money(rows.reduce((s, r) => s + r.payoutLyd, 0)),
        platformLyd: money(rows.reduce((s, r) => s + r.platformLyd, 0)),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
