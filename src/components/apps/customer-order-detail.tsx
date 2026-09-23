'use client'

// 🧾 تفاصيل الطلب (فاتورة) + ⭐ تقييم ما بعد التسليم — واصل نالوت
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Printer, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Ly, OrderNo, StatusBadge } from '@/components/wasel/Badges'
import { apiGet, apiPost } from '@/lib/wasel/api'
import { useWasel } from '@/lib/wasel/store'
import { LEDGER_RATES } from '@/lib/wasel/constants'
import type { OrderDTO } from '@/lib/wasel/types'
import { ErrorBlock, fmtDate, LoadingBlock, ScreenBar } from './customer-shared'

function StarRow({
  label,
  emoji,
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  label: string
  emoji: string
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#041710]/60 p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-sm font-extrabold text-[#F8F5EE]">{label}</p>
          <p className="text-[10px] text-[#938E7E]">
            {readOnly ? 'شكراً لتقييمك 🌟' : 'اضغط النجوم للتقييم'}
          </p>
        </div>
      </div>
      <div className="flex flex-row-reverse items-center gap-1" dir="ltr">
        {[5, 4, 3, 2, 1].map((n) => {
          const active = n <= value
          const btn = (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(n)}
              aria-label={`${label}: ${n} من 5`}
              className={`rounded-lg p-1.5 transition-transform ${
                readOnly ? 'cursor-default' : 'hover:scale-125 active:scale-95'
              }`}
            >
              <Star
                className={`${size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'} transition-colors ${
                  active ? 'fill-[#F5D061] text-[#F5D061]' : 'text-[rgba(212,175,55,0.35)]'
                }`}
              />
            </button>
          )
          return btn
        })}
      </div>
    </div>
  )
}

export function OrderDetailScreen({
  orderId,
  onTrack,
  onReorder,
  onBack,
}: {
  orderId: string
  onTrack: (orderId: string) => void
  onReorder: (order: OrderDTO) => void
  onBack: () => void
}) {
  const phone = useWasel((s) => s.customerPhone)
  const [order, setOrder] = useState<OrderDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeStars, setStoreStars] = useState(0)
  const [driverStars, setDriverStars] = useState(0)
  const [sending, setSending] = useState(false)
  const [rated, setRated] = useState(false)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })
    apiGet<{ order: OrderDTO }>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((d) => {
        if (cancelled) return
        setOrder(d.order)
        setRated(!!d.order.ratedAt)
        setStoreStars(d.order.storeStars ?? 0)
        setDriverStars(d.order.driverStars ?? 0)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'تعذر تحميل تفاصيل الطلب')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, rated])

  const submitRating = async () => {
    if (!order || !storeStars) return
    setSending(true)
    try {
      await apiPost(`/api/orders/${encodeURIComponent(order.id)}/rate`, {
        stars_store: storeStars,
        stars_driver: order.driverId ? driverStars || storeStars : undefined,
        phone,
      })
      setRated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال التقييم')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingBlock label="جارٍ فتح تفاصيل الطلب…" />
  if (error && !order)
    return (
      <div>
        <ScreenBar title="تفاصيل الطلب" onBack={onBack} />
        <ErrorBlock message={error} onRetry={onBack} />
      </div>
    )
  if (!order) return null

  const isActive = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status)
  const merchantNet = order.subtotalLyd * LEDGER_RATES.merchantShare

  return (
    <div>
      <ScreenBar title="تفاصيل الطلب" subtitle={order.orderNumber} onBack={onBack} />

      <div className="mx-auto max-w-xl space-y-4">
        {/* رأس الطلب */}
        <div className="rounded-3xl border border-[rgba(212,175,55,0.25)] bg-[#062319] p-5 gold-glow">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{order.storeEmoji ?? '🏪'}</span>
              <div>
                <p className="text-sm font-extrabold text-[#F8F5EE]">{order.storeName}</p>
                <OrderNo no={order.orderNumber} className="text-[11px] text-[#938E7E]" />
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#938E7E]">
            🧾 أُنشئ {fmtDate(order.createdAt)}
            {order.deliveredAt ? ` • 🎉 سُلّم ${fmtDate(order.deliveredAt)}` : ''}
          </p>
          {isActive && (
            <Button
              onClick={() => onTrack(order.id)}
              className="mt-4 h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)]"
            >
              📍 فتح التتبع الحي
            </Button>
          )}
          {order.status === 'delivered' && (
            <Button
              onClick={() => onReorder(order)}
              className="mt-4 h-12 w-full rounded-xl border border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.1)] text-sm font-extrabold text-[#10B981] shadow-md shadow-[rgba(16,185,129,0.12)] transition hover:bg-[rgba(16,185,129,0.2)]"
            >
              🔁 إعادة طلب نفس الأصناف من {order.storeName}
            </Button>
          )}
        </div>

        {/* الأصناف */}
        <div className="rounded-3xl border border-[rgba(212,175,55,0.18)] bg-[#062319] p-5">
          <p className="mb-3 text-xs font-extrabold tracking-wide text-[#D4AF37]">🛒 أصناف الطلب</p>
          <div className="space-y-2.5">
            {order.items.map((it, idx) => {
              const isGiftCard = it.productId.startsWith('giftcard-')
              return (
                <div key={`${it.productId}-${idx}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#F8F5EE]">
                      <span className="font-money text-[#F5D061]">{it.qty}×</span> {it.title}
                      {isGiftCard && (
                        <span className="ms-2 inline-block rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] px-1.5 py-0.5 align-middle text-[8px] font-black text-[#041710]">
                          💳 بطاقة شحن
                        </span>
                      )}
                    </p>
                    {isGiftCard ? (
                      <p className="mt-0.5 text-[11px] font-bold text-[#10B981]">
                        🔐 الكود أُصدر آلياً عند التسليم — تجده في صندوق الإشعارات
                      </p>
                    ) : it.notes ? (
                      <p className="mt-0.5 text-[11px] text-[#F59E0B]">📝 {it.notes}</p>
                    ) : null}
                  </div>
                  <Ly amount={it.unitPrice * it.qty} className="shrink-0 text-sm text-[#F8F5EE]" />
                </div>
              )
            })}
          </div>

          <Separator className="my-4 bg-[rgba(212,175,55,0.15)]" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#938E7E]">
              <span>قيمة الأصناف</span>
              <Ly amount={order.subtotalLyd} />
            </div>
            <div className="flex justify-between text-[#938E7E]">
              <span>أجرة التوصيل (عقد إجارة عمل)</span>
              <Ly amount={order.deliveryFeeLyd} />
            </div>
            <div className="flex justify-between text-[#10B981]">
              <span>رسوم خدمة واصل</span>
              <Ly amount={0} />
            </div>
            {order.discountLyd > 0 && (
              <div className="flex justify-between text-[#10B981]">
                <span>
                  🎟️ خصم{' '}
                  {order.promoCode ? (
                    <span dir="ltr" className="font-money font-bold">
                      {order.promoCode}
                    </span>
                  ) : (
                    ''
                  )}
                </span>
                <Ly amount={-order.discountLyd} />
              </div>
            )}
            <Separator className="my-2 bg-[rgba(212,175,55,0.15)]" />
            <div className="flex justify-between text-base font-extrabold text-[#F8F5EE]">
              <span>الإجمالي {order.paymentMethod === 'wallet' ? '(مدفوع بالمحفظة)' : '(كاش عند الاستلام)'}</span>
              <Ly amount={order.totalLyd} bold />
            </div>
          </div>

          {/* 🖨️ طباعة الفاتورة / حفظها PDF — A5 */}
          <Button
            onClick={() => printInvoice(order)}
            variant="outline"
            className="mt-4 h-11 w-full rounded-xl border-[rgba(212,175,55,0.4)] bg-[#041710] text-[12.5px] font-extrabold text-[#F5D061] transition hover:bg-[rgba(212,175,55,0.08)] hover:text-[#F5D061]"
          >
            <Printer className="h-4 w-4" />
            طباعة الفاتورة / حفظها PDF
          </Button>
        </div>

        {/* نزاع/إلغاء */}
        {order.disputeNote && (
          <div className="rounded-2xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] p-4">
            <p className="text-xs font-extrabold text-[#EF4444]">⚖️ ملاحظة فض النزاع</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#938E7E]">{order.disputeNote}</p>
          </div>
        )}

        {/* تقييم ما بعد التسليم */}
        {order.status === 'delivered' && (
          <div className="rounded-3xl border border-[rgba(245,208,97,0.3)] bg-[#062319] p-5">
            <p className="mb-1 text-sm font-extrabold text-[#F5D061]">⭐ قيّم تجربتك</p>
            <p className="mb-4 text-[11px] text-[#938E7E]">
              تقييمك يساعد مطاعم نالوت وكباتنها على التميّز — تجربة واحدة، تقييم واحد لكل طلب
            </p>
            <div className="space-y-3">
              <StarRow
                label="جودة الوجبة (المتجر)"
                emoji={order.storeEmoji ?? '🍽️'}
                value={storeStars}
                onChange={rated ? undefined : setStoreStars}
                readOnly={rated}
                size="lg"
              />
              {order.driverId && (
                <StarRow
                  label={`خدمة الكابتن ${order.driverName ?? ''}`}
                  emoji="🛵"
                  value={driverStars}
                  onChange={rated ? undefined : setDriverStars}
                  readOnly={rated}
                  size="lg"
                />
              )}
              {!rated ? (
                <Button
                  onClick={submitRating}
                  disabled={!storeStars || sending}
                  className="h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-sm font-extrabold text-[#041710] disabled:opacity-40"
                >
                  {sending ? 'جارٍ الإرسال…' : 'إرسال التقييم 🌟'}
                </Button>
              ) : (
                <motion.p
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] py-3 text-center text-xs font-extrabold text-[#10B981]"
                >
                  ✅ تم تسجيل تقييمك — شكراً لمساهمتك في رقي منظومة نالوت
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* شفافية الشريك */}
        <p className="pb-2 text-center text-[10px] leading-relaxed text-[#938E7E]">
          صافي حصة المتجر من هذا الطلب: <Ly amount={merchantNet} className="text-[#D4AF37]" /> • كامل أجرة التوصيل
          ملك للكابتن 🛵
        </p>
      </div>
    </div>
  )
}

// ============================================================
// 🖨️ طباعة فاتورة الطلب — A5 عربي RTL (حفظ PDF أو ورق)
// عبر iframe خفي كي لا تتأثر ستايلات التطبيق الداكنة
// ============================================================
function buildInvoiceHtml(o: OrderDTO): string {
  const fmt = (n: number) => n.toFixed(2)
  const created = new Date(o.createdAt).toLocaleString('ar-LY', { dateStyle: 'long', timeStyle: 'short' })
  const delivered = o.deliveredAt
    ? new Date(o.deliveredAt).toLocaleString('ar-LY', { dateStyle: 'long', timeStyle: 'short' })
    : null
  const payment = o.paymentMethod === 'wallet' ? 'محفظة واصل (مدفوع مقدماً)' : 'نقداً عند الاستلام'

  const itemRows = o.items
    .map((it) => {
      const isGift = it.productId.startsWith('giftcard-')
      return `<tr>
        <td class="q">${it.qty}×</td>
        <td>
          ${it.title}
          ${isGift ? '<span class="gift">💳 بطاقة شحن — يُصدر الكود آلياً عند التسليم</span>' : ''}
          ${it.notes ? `<span class="note">📝 ${it.notes}</span>` : ''}
        </td>
        <td class="v">${fmt(it.unitPrice * it.qty)} د.ل</td>
      </tr>`
    })
    .join('\n')

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>فاتورة طلب ${o.orderNumber} — واصل نالوت</title>
<style>
  @page { size: A5; margin: 11mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    color: #1a1a1a;
    background: #fff;
    padding: 18px;
  }
  .sheet { max-width: 100%; }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 2px solid #0a5c3c;
    border-radius: 10px;
    padding: 12px 14px;
    background: #f2faf6;
  }
  .head .brand { font-size: 17px; font-weight: 800; color: #0a5c3c; }
  .head .sub { font-size: 10.5px; color: #556; margin-top: 2px; }
  .head .code { font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #b8860b; font-variant-numeric: tabular-nums; }
  .head .badge { display: inline-block; margin-top: 4px; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 999px; border: 1px solid #0a5c3c; color: #0a5c3c; }
  .meta { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 11.5px; }
  .meta div { border-bottom: 1px dotted #bbb; padding-bottom: 4px; }
  .meta b { color: #0a5c3c; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  thead th { font-size: 10.5px; color: #0a5c3c; border-bottom: 1.5px solid #0a5c3c; padding: 6px 4px; text-align: right; }
  thead th.v { text-align: left; }
  tbody td { padding: 7px 4px; border-bottom: 1px dotted #999; font-size: 12px; vertical-align: top; }
  td.q { width: 34px; font-weight: 800; color: #b8860b; font-variant-numeric: tabular-nums; }
  td.v { text-align: left; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td .gift { display: block; margin-top: 2px; font-size: 9.5px; font-weight: 800; color: #8a6d1c; }
  td .note { display: block; margin-top: 2px; font-size: 9.5px; color: #8a5a11; }
  .totals { margin-top: 10px; font-size: 12px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 2px; border-bottom: 1px dotted #ccc; }
  .totals .off { color: #0E7A57; font-weight: 700; }
  .totals .grand { border-bottom: 2px solid #0a5c3c; border-top: 1.5px solid #0a5c3c; font-size: 14.5px; font-weight: 800; color: #0a5c3c; margin-top: 2px; padding: 8px 2px; }
  .legal {
    margin-top: 12px;
    border: 1.5px dashed #0a5c3c;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 10px;
    line-height: 1.7;
    color: #234;
    background: #f2faf6;
  }
  .seal {
    margin-top: 10px; text-align: center; font-size: 10.5px; font-weight: 800; color: #0a5c3c;
  }
  .foot { margin-top: 10px; text-align: center; font-size: 9.5px; color: #888; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand">🛡️ واصل نالوت — فاتورة طلب</div>
        <div class="sub">منظومة التوصيل الفائقة — نالوت • جبل نفوسة • ليبيا</div>
        <div class="badge">نسخة الزبون</div>
      </div>
      <div style="text-align:left">
        <div class="code">${o.orderNumber}</div>
        <div class="sub">${created}</div>
      </div>
    </div>

    <div class="meta">
      <div><b>المتجر:</b> ${o.storeEmoji ?? '🏪'} ${o.storeName}</div>
      <div><b>الزبون:</b> ${o.customerName}</div>
      <div><b>الحي:</b> ${o.district}</div>
      <div><b>الهاتف:</b> <span style="font-variant-numeric:tabular-nums">${o.customerPhone}</span></div>
      <div style="grid-column: 1 / -1;"><b>عنوان التوصيل:</b> ${o.deliveryAddress}</div>
      ${o.driverName ? `<div><b>كابتن التوصيل:</b> ${o.driverName}</div>` : ''}
      <div><b>طريقة الدفع:</b> ${payment}</div>
      ${delivered ? `<div style="grid-column: 1 / -1;"><b>سُلّم في:</b> ${delivered}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr><th>الكمية</th><th>الصنف</th><th class="v">السعر</th></tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div><span>قيمة الأصناف (عقد بيع قطعي)</span><span>${fmt(o.subtotalLyd)} د.ل</span></div>
      <div><span>أجرة التوصيل (عقد إجارة عمل)</span><span>${fmt(o.deliveryFeeLyd)} د.ل</span></div>
      <div><span>رسوم خدمة واصل</span><span>0.00 د.ل</span></div>
      ${o.discountLyd > 0 ? `<div class="off"><span>🎟️ خصم الكوبون ${o.promoCode ?? ''} (يتحمله واصل)</span><span>- ${fmt(o.discountLyd)} د.ل</span></div>` : ''}
      <div class="grand"><span>الإجمالي المستحق</span><span>${fmt(o.totalLyd)} د.ل</span></div>
    </div>

    <div class="legal">
      📜 <b>الإطار الشرعي:</b> ثمن الأصناف عقد <b>بيع قطعي</b> بين الزبون والمتجر، وأجرة التوصيل عقد <b>إجارة عمل</b>
      بين الزبون والكابتن — واصل نالوت وسيط شفاف بأجر 10% من ثمن البضاعة فقط، <b>بلا رسوم خفية وبلا فوائد</b>.
      المبالغ النقدية تُقبض وتُورّد بموجب سندات موثقة في غرفة العمليات.
    </div>
    <div class="seal">✓ فاتورة إلكترونية موثقة — كل قرش مُساءل</div>
    <div class="foot">واصل نالوت • بالدينار الليبي حصرياً • خدمة الزبائن داخل التطبيق</div>
  </div>
</body>
</html>`
}

function printInvoice(o: OrderDTO): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(buildInvoiceHtml(o))
  doc.close()
  iframe.contentWindow?.focus()
  window.setTimeout(() => {
    iframe.contentWindow?.print()
    window.setTimeout(() => iframe.remove(), 1200)
  }, 350)
}
