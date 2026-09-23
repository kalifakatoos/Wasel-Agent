'use client'

// ============================================================
// 🖨️ فاتورة حرارية 80mm — معاينة وطباعة (نسخة المتجر)
// عرض 302px، خلفية بيضاء، خط monospace، طباعة معزولة @media print
// ============================================================
import { LEDGER_RATES } from '@/lib/wasel/constants'
import { Ly, OrderNo } from '@/components/wasel/Badges'
import type { OrderDTO } from '@/lib/wasel/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatStamp(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 text-end">{children}</span>
    </div>
  )
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-black/60" />
}

export function ThermalReceiptDialog({
  order,
  storeName,
  storeEmoji,
  open,
  onOpenChange,
}: {
  order: OrderDTO | null
  storeName: string
  storeEmoji: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!order) return null

  const merchantNet = order.subtotalLyd * LEDGER_RATES.merchantShare
  const platformCut = order.subtotalLyd * LEDGER_RATES.platformShare

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(94vw,380px)] overflow-y-auto border-[rgba(212,175,55,0.35)] bg-[#062319] wasel-scroll">
        {/* أسلوب الطباعة المعزولة: يُخفي كل شيء عدا الفاتورة نفسها */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .wasel-receipt-print, .wasel-receipt-print * { visibility: visible !important; }
            .wasel-receipt-print {
              position: absolute !important;
              right: 0 !important;
              left: 0 !important;
              top: 0 !important;
              margin: 0 auto !important;
              width: 302px !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { margin: 4mm; size: 80mm auto; }
          }
        `}</style>

        <DialogHeader className="text-start">
          <DialogTitle className="text-base text-[#F5D061]">🖨️ معاينة الفاتورة الحرارية 80mm</DialogTitle>
          <DialogDescription className="text-xs text-[#938E7E]">
            نسخة المتجر — تُطبع بالأبيض والأسود على ورق حراري بعرض 80mm
          </DialogDescription>
        </DialogHeader>

        {/* ورقة الفاتورة */}
        <div
          className="wasel-receipt-print mx-auto w-[302px] rounded-lg bg-white p-4 text-[13px] leading-relaxed text-black shadow-xl"
          style={{ fontFamily: '"Courier New", ui-monospace, SFMono-Regular, monospace' }}
          dir="rtl"
        >
          {/* الترويسة */}
          <div className="text-center">
            <div className="text-3xl">{storeEmoji || '🏪'}</div>
            <div className="mt-1 text-base font-bold">{storeName}</div>
            <div className="mt-0.5 text-[12px] font-bold">— واصل نالوت —</div>
            <div className="text-[10px] tracking-[0.2em]">WASEL NALUT • MERCHANT COPY • LYD</div>
          </div>

          <Divider />

          {/* بيانات الطلب */}
          <Row label="رقم الطلب:">
            <OrderNo no={order.orderNumber} className="font-bold" />
          </Row>
          <Row label="التاريخ:">
            <span className="ltr-nums font-money">{formatStamp(order.createdAt)}</span>
          </Row>
          <Row label="الزبون:">{order.customerName}</Row>
          <Row label="الحي:">{order.district}</Row>
          <Row label="الدفع:">
            {order.paymentMethod === 'wallet' ? '👛 مدفوع مسبقاً (محفظة)' : '💵 كاش عند الاستلام'}
          </Row>

          <Divider />

          {/* الأصناف */}
          <div className="font-bold">الأصناف:</div>
          <div className="mt-1 space-y-1">
            {order.items.map((it, idx) => (
              <div key={`${it.productId}-${idx}`}>
                <Row label={`${it.qty} × ${it.title}`}>
                  <Ly amount={it.qty * it.unitPrice} className="text-black" />
                </Row>
                {it.notes ? (
                  <div className="ps-4 text-[11px] text-[#8a4a00]">✏️ {it.notes}</div>
                ) : null}
              </div>
            ))}
          </div>

          {order.notes ? (
            <>
              <Divider />
              <div className="text-[12px]">
                <span className="font-bold">ملاحظات الزبون:</span> {order.notes}
              </div>
            </>
          ) : null}

          <Divider />

          {/* المبالغ */}
          <Row label="مجموع الوجبات:">
            <Ly amount={order.subtotalLyd} className="text-black" />
          </Row>
          <Row label="أجرة التوصيل (للكابتن):">
            <Ly amount={order.deliveryFeeLyd} className="text-black" />
          </Row>
          <Row label="رسوم الخدمة:">
            <Ly amount={0} className="text-black" />
          </Row>
          <Row label="الإجمالي المطلوب من الزبون:">
            <Ly amount={order.totalLyd} className="text-base text-black" bold />
          </Row>

          <Divider />

          <Row label="عمولة المنصة 10%:">
            <Ly amount={platformCut} className="text-black" />
          </Row>
          <div className="mt-1 rounded border-2 border-black px-2 py-1">
            <Row label="الصافي المستحق لكم (90%):">
              <Ly amount={merchantNet} className="text-base text-black" bold />
            </Row>
          </div>

          <Divider />

          <div className="text-center text-[12px] font-bold">شكراً لشراكتكم — واصل نالوت 🐪</div>
          <div className="mt-0.5 text-center text-[9px] tracking-[0.18em]">NALUT • JEBAL NAFUSA • LIBYA</div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 flex-1 border-[rgba(212,175,55,0.3)] bg-transparent text-[#F8F5EE] hover:bg-[rgba(212,175,55,0.08)]"
          >
            إغلاق
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            className="h-12 flex-1 bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:opacity-90"
          >
            🖨️ طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
