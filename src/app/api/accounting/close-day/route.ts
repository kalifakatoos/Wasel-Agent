import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, generateAuditCode, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/** تقفيل اليومية المالية: إنشاء محضر جرد Z مطابق للكاش المورد (02:00 صباحاً) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [todayOrders, drivers] = await Promise.all([
      db.order.findMany({ where: { createdAt: { gte: todayStart } } }),
      db.driver.findMany(),
    ])

    const delivered = todayOrders.filter((o) => o.status === 'delivered')
    const seq = (await db.dailyAudit.count()) + 1

    const audit = await db.dailyAudit.create({
      data: {
        auditCode: generateAuditCode(seq),
        auditDate: todayStart,
        totalOrders: todayOrders.length,
        gmvLyd: money(delivered.reduce((s, o) => s + o.totalLyd, 0)),
        cashCollectedLyd: money(
          delivered.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalLyd, 0),
        ),
        merchantDuesLyd: money(delivered.reduce((s, o) => s + o.subtotalLyd * 0.9, 0)),
        captainDuesLyd: money(drivers.reduce((s, d) => s + d.custodyCash, 0)),
        platformNetLyd: money(delivered.reduce((s, o) => s + o.subtotalLyd * 0.1, 0)),
        isClosed: true,
        closedAt: new Date(),
        notes: (body.notes || 'تقفيل يومية واصل نالوت').slice(0, 300),
      },
    })

    return NextResponse.json({ audit })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
