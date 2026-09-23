import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { emitRealtime, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/**
 * ⭐ تقييم الزبون بعد التسليم (تقييم واحد لكل طلب):
 * - نجوم المتجر (جودة الوجبة) ونجوم الكابتن (خدمة التوصيل) من 1 إلى 5
 * - تحديث المتوسط الحي للمتجر والكابتن فوراً وبثّه للمنظومة
 *
 * ملاحظة تقنية: حقول التقييم تُكتب عبر SQL خام ($executeRaw) لضمان التوافق
 * حتى مع عميل Prisma قديم محمّل في الذاكرة قبل تحديث المخطط — والأعمدة موجودة فعلياً.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const starsStore = Math.max(1, Math.min(5, Math.floor(Number(body.stars_store) || 0)))
    const rawDriver = Math.max(1, Math.min(5, Math.floor(Number(body.stars_driver) || 0)))
    const phone: string | undefined = typeof body.phone === 'string' ? body.phone : undefined

    const order = await db.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'لا يمكن التقييم إلا بعد التسليم' }, { status: 409 })
    }
    if (phone && order.customerPhone !== phone) {
      return NextResponse.json({ error: 'هذا الطلب ليس برقمك' }, { status: 403 })
    }

    // سبق التقييم؟ (متوافق مع العميلين — الحقل جديد وقد يكون غائباً في الذاكرة)
    const prior = await db.$queryRawUnsafe<{ ratedAt: string | null }[]>(
      `SELECT ratedAt FROM "Order" WHERE id = ?`,
      order.id,
    )
    if (prior[0]?.ratedAt) {
      return NextResponse.json({ error: 'سبق تقييم هذا الطلب — شكراً لك' }, { status: 409 })
    }

    // من يحتاج تقييم كابتن؟
    let driverId: string | null = null
    try {
      driverId = (order as { driverId?: string | null }).driverId ?? null
    } catch {
      driverId = null
    }
    const starsDriver = driverId ? rawDriver : null

    // 1) تحديث المتجر: مجموع وعدد التقييمات ثم المتوسط
    if (starsStore >= 1) {
      await db.$executeRawUnsafe(
        `UPDATE "Store" SET ratingSum = COALESCE(ratingSum,0) + ?, ratingCount = COALESCE(ratingCount,0) + 1 WHERE id = ?`,
        starsStore,
        order.storeId,
      )
      await db.$executeRawUnsafe(
        `UPDATE "Store" SET rating = ROUND(ratingSum * 10.0 / MAX(ratingCount, 1)) / 10.0 WHERE id = ?`,
        order.storeId,
      )
    }

    // 2) تحديث الكابتن
    if (starsDriver && driverId) {
      await db.$executeRawUnsafe(
        `UPDATE "Driver" SET ratingSum = COALESCE(ratingSum,0) + ?, ratingCount = COALESCE(ratingCount,0) + 1 WHERE id = ?`,
        starsDriver,
        driverId,
      )
      await db.$executeRawUnsafe(
        `UPDATE "Driver" SET rating = ROUND(ratingSum * 10.0 / MAX(ratingCount, 1)) / 10.0 WHERE id = ?`,
        driverId,
      )
    }

    // 3) ختم الطلب بالتقييم
    await db.$executeRawUnsafe(
      `UPDATE "Order" SET ratedAt = ?, storeStars = ?, driverStars = ? WHERE id = ?`,
      new Date().toISOString(),
      starsStore,
      starsDriver,
      order.id,
    )

    await emitRealtime(
      [`store:${order.storeId}`, 'admin:fleet', ...(driverId ? [`driver:${driverId}`] : [])],
      'order:rated',
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeId: order.storeId,
        driverId,
        storeStars: starsStore,
        driverStars: starsDriver,
      },
    )

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      storeStars: starsStore,
      driverStars: starsDriver,
      gmvImpact: money(0),
    })
  } catch (e) {
    const msg = e instanceof Prisma.PrismaClientKnownRequestError ? `خطأ قاعدة بيانات: ${e.code}` : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
