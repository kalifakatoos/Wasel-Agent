// ============================================================
// إشعارات الزبون + بطاقات الشحن المباعة في واصل متاع
// Server-side helpers: بث إشعارات لحظية + إصدار أكواد هدية عند التسليم
// ============================================================
import { db } from '@/lib/db'
import { emitRealtime, money } from './server-utils'

/// معرفات منتجات بطاقات الشحن (تُباع في متجر واصل متاع للإلكترونيات)
export const GIFT_CARD_STORE_ID = 'mataa-electronics'
export const GIFT_CARD_PREFIX = 'giftcard-'
export const GIFT_CARD_PRODUCTS = [
  { id: 'giftcard-25', title: 'بطاقة شحن واصل — 25 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 25.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 25, emoji: '🎁' },
  { id: 'giftcard-50', title: 'بطاقة شحن واصل — 50 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 50.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 50, emoji: '🎁' },
  { id: 'giftcard-100', title: 'بطاقة شحن واصل — 100 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 100.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 100, emoji: '🎁' },
] as const

let giftCardsEnsured: Promise<void> | null = null

/// زرع بطاقات الشحن في متجر واصل متاع (idempotent — مرة واحدة لكل عملية خادم)
export async function ensureGiftCardProducts(): Promise<void> {
  if (giftCardsEnsured) return giftCardsEnsured
  giftCardsEnsured = (async () => {
    try {
      const store = await db.store.findUnique({ where: { id: GIFT_CARD_STORE_ID } })
      if (!store) return
      for (const p of GIFT_CARD_PRODUCTS) {
        await db.product.upsert({
          where: { id: p.id },
          create: {
            id: p.id, storeId: GIFT_CARD_STORE_ID, title: p.title, description: p.description,
            basePriceLyd: p.basePriceLyd, emoji: p.emoji, category: 'بطاقات شحن واصل', isFood: false,
          },
          update: { title: p.title, description: p.description, basePriceLyd: p.basePriceLyd },
        })
      }
    } catch {
      giftCardsEnsured = null // أعد المحاولة في الطلب القادم
    }
  })()
  return giftCardsEnsured
}

function giftCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `WASL-${s.slice(0, 4)}-${s.slice(4)}`
}

export interface CustomerNotifyPayload {
  id: string // مفتاح منع التكرار (مثلاً order:ID:ready_for_pickup)
  kind: 'order' | 'wallet' | 'gift'
  title: string
  body: string
  orderId?: string
  orderNumber?: string
  storeEmoji?: string
  codes?: string[]
  amountLyd?: number
  at: string
}

/// بث إشعار لحظي لزبون محدد (غرفة customer:{phone})
export async function notifyCustomer(phone: string, payload: Omit<CustomerNotifyPayload, 'at'>): Promise<void> {
  if (!phone) return
  await emitRealtime([`customer:${phone}`], 'customer:notify', {
    ...payload,
    at: new Date().toISOString(),
  })
}

/// صياغة نص إشعار حسب حالة الطلب
export function orderNotifyText(status: string, order: { orderNumber: string; storeName: string; driverName?: string | null; totalLyd: number }): { title: string; body: string } | null {
  switch (status) {
    case 'placed':
      return {
        title: '🔔 وصل طلبك إلى المطبخ',
        body: `${order.storeName} استلم طلبك ${order.orderNumber} وسيتأكد منه حالاً`,
      }
    case 'preparing':
      return {
        title: '👨‍🍳 المطبخ بدأ تحضير طلبك',
        body: `${order.storeName} يجهز طلبك الآن — يمكنك متابعة الحالة لحظياً`,
      }
    case 'ready_for_pickup':
      return {
        title: '✅ وجبتك جاهزة الآن',
        body: `${order.storeName} أعدت طلبك — بانتظار وصول الكابتن لاستلامه`,
      }
    case 'out_for_delivery':
      return {
        title: '🛵 الكابتن في الطريق إليك',
        body: `${order.driverName || 'الكابتن'} استلم طلبك من ${order.storeName} — جهّز كود التسليم الرباعي`,
      }
    case 'delivered':
      return {
        title: '🎉 اكتمل التوصيل — بالهناء والشفاء',
        body: `سلّم الكابتن طلبك ${order.orderNumber}. لا تنسَ تقييم التجربة من «طلباتي»`,
      }
    case 'cancelled':
      return {
        title: '😔 عذراً، أُلغي طلبك',
        body: `${order.storeName} لم يتمكن من تنفيذ الطلب ${order.orderNumber} — يمكنك الطلب مجدداً في أي وقت`,
      }
    case 'disputed':
      return {
        title: '⚠️ نزاع مفتوح على طلبك',
        body: `الطلب ${order.orderNumber} قيد فض النزاع من غرفة العمليات — سنتواصل معك`,
      }
    default:
      return null
  }
}

/// إصدار أكواد بطاقات الشحن عند تسليم طلب يحوي بطاقات (يُستدعى بعد نجاح التسليم)
/// يعيد الأكواد المُصدرة لبثها في الإشعارات
export async function issueGiftCardsForOrder(order: {
  id: string
  orderNumber: string
  customerPhone: string
  customerName: string
  itemsJson: string
}): Promise<string[]> {
  let items: { productId: string; title: string; qty: number; unitPrice: number }[] = []
  try {
    items = JSON.parse(order.itemsJson || '[]')
  } catch {
    return []
  }

  const giftItems = items.filter((i) => i.productId?.startsWith(GIFT_CARD_PREFIX))
  if (giftItems.length === 0) return []

  const issued: string[] = []
  let totalValue = 0

  for (const gi of giftItems) {
    const qty = Math.max(1, Math.min(10, Math.floor(gi.qty)))
    for (let i = 0; i < qty; i++) {
      const id = `gift_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${issued.length}`
      let code = giftCode()
      for (let tries = 0; tries < 5; tries++) {
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO "TopupCode" ("id","code","amountLyd","isActive","note","createdAt") VALUES (?, ?, ?, 1, ?, ?)`,
            id,
            code,
            money(gi.unitPrice),
            `بطاقة شحن مباعة في واصل متاع — طلب ${order.orderNumber}`,
            new Date().toISOString(),
          )
          issued.push(code)
          totalValue += gi.unitPrice
          break
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.includes('UNIQUE')) {
            code = giftCode()
            continue
          }
          throw e
        }
      }
    }
  }

  if (issued.length > 0) {
    // قيد مزدوج توضيحي: إصدار بطاقات هدية (التزام على المنصة)
    await db.walletTransaction.create({
      data: {
        orderId: order.id,
        fromWalletId: 'platform_escrow',
        toWalletId: `customer:${order.customerPhone}`,
        amount: money(totalValue),
        type: 'gift_card_issued',
        narration: `إصدار ${issued.length} بطاقة شحن واصل — طلب ${order.orderNumber}`,
      },
    }).catch(() => {}) // لا نفشل التسليم بسبب القيد التوضيحي

    // بث إشعار الزبون بالأكواد + حدث تسويقي للمتجر والإدارة
    await notifyCustomer(order.customerPhone, {
      id: `gift:${order.id}`,
      kind: 'gift',
      title: '🎁 بطاقات الشحن جاهزة!',
      body: `أكواد بطاقات الشحن الخاصة بطلبك ${order.orderNumber} — استخدمها من شاشة المحفظة «شحن بكود هدية»`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      codes: issued,
      amountLyd: money(totalValue),
    })
    await emitRealtime(['admin:fleet'], 'store:giftcard_sold', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone.slice(0, 4) + '****',
      codesCount: issued.length,
      totalValueLyd: money(totalValue),
    })
  }

  return issued
}
