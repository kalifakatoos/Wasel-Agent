import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/wasel/ensure-seed'
import { computeDeliveryFee, haversineKm } from '@/lib/wasel/pricing'
import { computePromoDiscountDb, recordPromoUsage, recordPromoReject } from '@/lib/wasel/promos-server'
import { ensureGiftCardProducts, notifyCustomer, orderNotifyText } from '@/lib/wasel/notifications-server'
import { emitRealtime, generateOtp, generateOrderNumber, isValidLibyanPhone, money } from '@/lib/wasel/server-utils'
import { mapOrder } from '@/lib/wasel/orders-server'
import { DISTRICTS } from '@/lib/wasel/constants'

export const dynamic = 'force-dynamic'

/// إحداثيات الأحياء المرجعية (نقاط تسليم افتراضية لكل حي)
const DISTRICT_GEO: Record<string, { lat: number; lng: number }> = {
  'وسط المدينة': { lat: 31.8687, lng: 10.9818 },
  'حي القلعة': { lat: 31.8668, lng: 10.9848 },
  'سيدي خليفة': { lat: 31.8655, lng: 10.9780 },
  'شارع تونس': { lat: 31.8710, lng: 10.9790 },
  'طريق الحوامد': { lat: 31.8650, lng: 10.9880 },
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeed()
    await ensureGiftCardProducts() // 🎁 بطاقات الشحن تُباع في واصل متاع — تُزرع تلقائياً
    const body = await req.json()
    const {
      store_id, items, customer_name, customer_phone,
      delivery_address, district, payment_method, notes, promo_code,
    } = body as {
      store_id: string
      items: { productId: string; qty: number; notes?: string }[]
      customer_name: string
      customer_phone: string
      delivery_address: string
      district: string
      payment_method: 'cash' | 'wallet'
      notes?: string
      promo_code?: string
    }

    // 🔒 درع الحجب: رقم الزبون محظور بسبب نزاع سابق؟
    const blocked = await db.blockedPhone.findUnique({ where: { phone: customer_phone } })
    if (blocked) {
      return NextResponse.json(
        { error: `رقمك محظور مؤقتاً من الطلب: ${blocked.reason}` },
        { status: 403 },
      )
    }

    // التحقق من رقم الهاتف الليبي
    if (!isValidLibyanPhone(customer_phone)) {
      return NextResponse.json(
        { error: 'رقم الهاتف يجب أن يبدأ بـ 091 أو 092 أو 093 أو 094 ويتكون من 10 أرقام' },
        { status: 400 },
      )
    }
    if (!customer_name?.trim() || !delivery_address?.trim()) {
      return NextResponse.json({ error: 'الاسم وعنوان التوصيل مطلوبان' }, { status: 400 })
    }

    const store = await db.store.findUnique({ where: { id: store_id } })
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })
    if (!store.isOpen) return NextResponse.json({ error: 'المتجر مغلق حالياً' }, { status: 409 })

    if (!items?.length) return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })

    // الأسعار تُحسب من الخادم حصراً (لا نثق بالعميل أبداً)
    const productIds = items.map((i) => i.productId)
    const products = await db.product.findMany({ where: { id: { in: productIds }, storeId: store_id } })
    if (products.length !== new Set(productIds).size) {
      return NextResponse.json({ error: 'أحد الأصناف غير متاح في هذا المتجر' }, { status: 400 })
    }

    const orderItems = items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!
      if (!p.isAvailable) throw new Error(`الصنف «${p.title}» غير متوفر حالياً`)
      const qty = Math.max(1, Math.min(50, Math.floor(i.qty)))
      return { productId: p.id, title: p.title, qty, unitPrice: p.basePriceLyd, notes: (i.notes || '').slice(0, 200) }
    })

    const subtotal = money(orderItems.reduce((s, i) => s + i.unitPrice * i.qty, 0))

    // المسافة والتسعير الديناميكي (سيجمويد بسقف 2.5x)
    const dest = DISTRICT_GEO[district] || DISTRICT_GEO[DISTRICTS[0]]
    const distanceKm = haversineKm(store.latitude, store.longitude, dest.lat, dest.lng)
    const [onlineDrivers, busyDrivers] = await Promise.all([
      db.driver.count({ where: { status: 'online' } }),
      db.driver.count({ where: { status: 'busy' } }),
    ])
    const demand = 1 + busyDrivers
    const { fee } = computeDeliveryFee(distanceKm, demand, Math.max(onlineDrivers, 1))
    const deliveryFee = money(fee)
    const serviceFee = 0 // صفر على الزبون دائماً (الامتثال الشرعي)

    // 🎟️ الخصم: تتحمله المنصة كاملاً — لا يمس حصة المتجر ولا أجرة الكابتن
    // المصدر: جدول الكوبونات المُدار من غرفة العمليات (تحقق خادمي نهائي)
    // 💸 كوبونات الكاش باك: لا خصم من الفاتورة — تُودع محفظة الزبون عند التسليم
    let discount = 0
    let cashbackLyd = 0
    let appliedPromo: string | null = null
    let appliedPromoLabel: string | null = null
    if (promo_code && promo_code.trim()) {
      const pr = await computePromoDiscountDb(promo_code, subtotal)
      if (!pr.ok) {
        // 📉 تحليلات الفرص الضائعة: نوثّق المحاولات المرفوضة لأكواد معروفة (نفدت/معطل/تحت الحد)
        await recordPromoReject(pr.row, pr.reason, subtotal, customer_phone.trim())
        return NextResponse.json({ error: pr.error }, { status: 400 })
      }
      discount = money(pr.discount)
      cashbackLyd = money(pr.cashback ?? 0)
      appliedPromo = pr.promo.code
      appliedPromoLabel = pr.promo.label
    }

    const total = money(Math.max(0, subtotal + deliveryFee + serviceFee - discount))

    // الدفع بالمحفظة: حجز الرصيد في الضمان
    if (payment_method === 'wallet') {
      const wallet = await db.wallet.findUnique({ where: { ownerId: customer_phone } })
      if (!wallet || wallet.balance < total) {
        return NextResponse.json(
          { error: `رصيد محفظتك غير كافٍ. المطلوب ${total.toFixed(2)} د.ل` },
          { status: 402 },
        )
      }
    }

    // إنشاء الطلب
    const seq = (await db.order.count()) + 1
    const orderId = `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const order = await db.order.create({
      data: {
        id: orderId,
        orderNumber: generateOrderNumber(seq),
        customerName: customer_name.trim().slice(0, 80),
        customerPhone: customer_phone.trim(),
        storeId: store.id,
        storeName: store.name,
        status: 'placed',
        itemsJson: JSON.stringify(orderItems),
        subtotalLyd: subtotal,
        deliveryFeeLyd: deliveryFee,
        serviceFeeLyd: serviceFee,
        discountLyd: discount,
        totalLyd: total,
        deliveryAddress: delivery_address.trim().slice(0, 200),
        district: DISTRICTS.includes(district as (typeof DISTRICTS)[number]) ? district : DISTRICTS[0],
        deliveryLat: dest.lat,
        deliveryLng: dest.lng,
        otpCode: generateOtp(),
        paymentMethod: payment_method === 'wallet' ? 'wallet' : 'cash',
        prepTimeMinutes: store.prepMinutes,
        notes: (notes || '').slice(0, 300),
      },
    })

    if (payment_method === 'wallet') {
      await db.wallet.update({
        where: { ownerId: customer_phone },
        data: { balance: { decrement: total } },
      })
      const escrow = await db.wallet.upsert({
        where: { ownerId: 'platform_escrow' },
        create: { ownerId: 'platform_escrow', walletType: 'platform_escrow', balance: total },
        update: { balance: { increment: total } },
      })
      await db.walletTransaction.create({
        data: {
          orderId: order.id,
          fromWalletId: customer_phone,
          toWalletId: escrow.ownerId,
          amount: total,
          type: 'order_placement',
          narration: `دفع بمحفظة واصل وحجز المبلغ بالضمان - ${order.orderNumber}`,
        },
      })
    }

    const dto = mapOrder(order, store)

    // عمود promoCode + cashbackLyd جديدين: كتابة عبر SQL خام (توافق مع عميل Prisma قديم بالذاكرة)
    if (appliedPromo) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "Order" SET "promoCode" = ?, "cashbackLyd" = ? WHERE id = ?`,
          appliedPromo,
          cashbackLyd,
          order.id,
        )
        ;(dto as { promoCode?: string }).promoCode = appliedPromo
      } catch {
        /* العمود موجود لكن تجاهل أي فشل غير متوقع */
      }
      // 📊 إحصائيات الكوبون (الخصم أو الكاش باك — كلاهما على حساب المنصة)
      await recordPromoUsage(appliedPromo, discount > 0 ? discount : cashbackLyd)
      // 📡 بث حدث التسويق للمتجر وغرفة العمليات
      await emitRealtime([`store:${store.id}`, 'admin:fleet'], 'store:promo_applied', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeId: store.id,
        storeName: store.name,
        customerName: dto.customerName,
        promoCode: appliedPromo,
        promoLabel: appliedPromoLabel,
        promoKind: cashbackLyd > 0 ? 'cashback' : 'discount',
        discountLyd: discount,
        cashbackLyd,
        subtotalLyd: subtotal,
        createdAt: dto.createdAt,
      })
    }

    // 🔔 رنين قوي في تابلت المطبخ (غرفة المتجر)
    await emitRealtime([`store:${store.id}`, 'admin:fleet'], 'store:new_order', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: store.id,
      storeName: store.name,
      customerName: dto.customerName,
      district: dto.district,
      items: dto.items,
      totalLyd: total,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      createdAt: dto.createdAt,
    })

    // 🔔 إشعار الزبون: وصل طلبك إلى المطبخ
    const placedText = orderNotifyText('placed', { orderNumber: order.orderNumber, storeName: store.name, totalLyd: total })
    if (placedText) {
      await notifyCustomer(order.customerPhone, {
        id: `order:${order.id}:placed`,
        kind: 'order',
        title: placedText.title,
        body: placedText.body,
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeEmoji: store.emoji,
      })
    }

    return NextResponse.json({ order: dto }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
