import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, emitRealtime, generateVoucherNumber, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

/**
 * 🏛️ غرفة فض النزاعات — تعذر الوصول للزبون (No-Show):
 * - إصدار سند صرف فوري للمتجر بقيمة 90% من ثمن الوجبة
 * - صرف أجرة الكابتن كاملة (تعويضاً عن عمله دون إرباح ربوي)
 * - وضع رقم هاتف الزبون في القائمة المحظورة
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const { order_id, reason } = body as { order_id: string; reason?: string }
    const order = await db.order.findUnique({ where: { id: order_id } })
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    const activeStates = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery']
    if (!activeStates.includes(order.status)) {
      return NextResponse.json({ error: 'هذا الطلب ليس في حالة نشطة' }, { status: 409 })
    }

    const storePayout = money(order.subtotalLyd * 0.9)
    const deliveryFee = money(order.deliveryFeeLyd)

    // 1) الطلب يدخل حالة النزاع (محسوم)
    await db.order.update({
      where: { id: order_id },
      data: {
        status: 'disputed',
        disputeNote: `تعذر الوصول للزبون وعدم رده — صرف 90% للمتجر وكامل أجرة الكابتن${reason ? ' — ' + reason : ''}`,
      },
    })

    // 2) سند صرف فوري للمتجر 90%
    const seq = (await db.voucher.count()) + 1
    const voucher = await db.voucher.create({
      data: {
        voucherNumber: generateVoucherNumber('disbursement', seq),
        type: 'disbursement',
        beneficiaryName: order.storeName,
        beneficiaryRole: 'store',
        amountLyd: storePayout,
        orderId: order.id,
        notes: `تعويض نزاع عدم استلام الزبون 90% من ثمن الوجبة — ${order.orderNumber}`,
      },
    })

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
        type: 'dispute',
        narration: `تعويض المتجر 90% بعد نزاع no-show — ${order.orderNumber}`,
      },
    })

    // 3) أجرة الكابتن كاملة (وليس هناك كاش محصل لأن التسليم لم يتم)
    if (order.driverId) {
      await db.driver.update({
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
      // الكابتن يعود متاحاً
      const drv = await db.driver.findUnique({ where: { id: order.driverId } })
      if (drv && drv.activeOrdersCount <= 0) {
        await db.driver.update({ where: { id: drv.id }, data: { status: 'online' } })
      }
    }

    // 4) حظر رقم هاتف الزبون
    await db.blockedPhone.upsert({
      where: { phone: order.customerPhone },
      create: { phone: order.customerPhone, reason: `نزاع no-show على الطلب ${order.orderNumber}` },
      update: { reason: `نزاع no-show على الطلب ${order.orderNumber}` },
    })

    // 5) إن كان الدفع بمحفظة → أعد المبلغ للزبون من الضمان (عدم استلام = استرداد حقه)
    if (order.paymentMethod === 'wallet') {
      const escrow = await db.wallet.findUnique({ where: { ownerId: 'platform_escrow' } })
      if (escrow && escrow.balance >= order.totalLyd) {
        await db.wallet.update({
          where: { ownerId: 'platform_escrow' },
          data: { balance: { decrement: order.totalLyd } },
        })
        await db.wallet.upsert({
          where: { ownerId: order.customerPhone },
          create: { ownerId: order.customerPhone, walletType: 'customer', balance: order.totalLyd },
          update: { balance: { increment: order.totalLyd } },
        })
        await db.walletTransaction.create({
          data: {
            orderId: order.id,
            fromWalletId: 'platform_escrow',
            toWalletId: order.customerPhone,
            amount: order.totalLyd,
            type: 'dispute',
            narration: `استرداد مبلغ محفظة الزبون بعد نزاع no-show — ${order.orderNumber}`,
          },
        })
      }
    }

    await emitRealtime(
      [`order:${order.id}`, `store:${order.storeId}`, 'admin:fleet'],
      'order:status_changed',
      { orderId: order.id, status: 'disputed', orderNumber: order.orderNumber },
    )

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      storeVoucher: voucher,
      storePayout,
      captainFee: deliveryFee,
      captainPaid: Boolean(order.driverId),
      blockedPhone: order.customerPhone,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
