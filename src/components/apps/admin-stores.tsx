'use client'

// ============================================================
// 🏪 المتاجر وصرف المستحقات — غرفة عمليات واصل نالوت (Task 7-d)
// CRON-R9: كشف حساب متجر A4 قابل للطباعة/PDF لكل شريك
// ============================================================
import { useMemo, useState } from 'react'
import { Coins, FileText, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ly } from '@/components/wasel/Badges'
import { api } from '@/lib/wasel/api'
import {
  EmptyHint,
  SectionCard,
  VoucherDocument,
  type PayoutStoreResult,
} from './admin-shared'

interface StoreDues {
  id: string
  name: string
  emoji: string
  dues: number
  payoutPaid: number
}

/// بيانات كشف الحساب من الخادم (CRON-R9)
interface StoreStatement {
  store: { id: string; name: string; emoji: string; district: string }
  days: number
  from: string
  to: string
  rows: {
    orderNumber: string
    at: string
    subtotalLyd: number
    payoutLyd: number
    platformLyd: number
    deliveryFeeLyd: number
    paymentMethod: string
  }[]
  totals: { orders: number; subtotalLyd: number; payoutLyd: number; platformLyd: number }
}

export default function StoresTab({
  stores,
  busyKey,
  pin,
  onPayout,
}: {
  stores: StoreDues[]
  busyKey: string | null
  /** درع الـ PIN — لجلب كشف حساب المتجر من الخادم */
  pin: string
  onPayout: (storeId: string, amount: number) => Promise<PayoutStoreResult | null>
}) {
  const [target, setTarget] = useState<StoreDues | null>(null)
  const [amount, setAmount] = useState('')
  const [working, setWorking] = useState(false)
  const [issued, setIssued] = useState<{ result: PayoutStoreResult; store: StoreDues } | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [statementBusy, setStatementBusy] = useState<string | null>(null)

  const totals = useMemo(
    () => ({
      dues: stores.reduce((s, x) => s + x.dues, 0),
      paid: stores.reduce((s, x) => s + x.payoutPaid, 0),
    }),
    [stores],
  )

  function openPayout(store: StoreDues) {
    setTarget(store)
    setAmount(store.dues.toFixed(2))
    setAmountError(null)
    setIssued(null)
  }

  async function confirmPayout() {
    if (!target) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('أدخل مبلغاً صحيحاً أكبر من صفر')
      return
    }
    if (value > target.dues + 0.001) {
      setAmountError('المبلغ يتجاوز مستحقات المتجر اليوم')
      return
    }
    setWorking(true)
    try {
      const result = await onPayout(target.id, value)
      if (result) setIssued({ result, store: target })
    } finally {
      setWorking(false)
    }
  }

  // ---------- 🧾 كشف حساب المتجر A4 (CRON-R9) ----------
  async function printStatement(store: StoreDues) {
    setStatementBusy(store.id)
    try {
      const st = await api<StoreStatement>(
        `/api/accounting/store-statement?store_id=${encodeURIComponent(store.id)}&days=30`,
        { headers: { 'x-admin-pin': pin } },
      )
      printStatementHtml(st)
    } catch {
      // فشل الجلب — لا شيء يُطبع (التصعيد عبر الواجهة الصامتة مقبول للوثيقة الاختيارية)
    } finally {
      setStatementBusy(null)
    }
  }

  return (
    <>
      <SectionCard
        title="حسابات المتاجر الشريكة"
        icon={<Store className="h-4 w-4" />}
        extra={
          <span className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] px-2 py-1 text-[#F5D061]">
              مستحقات اليوم <Ly amount={totals.dues} bold />
            </span>
            <span className="rounded-full border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-[#10B981]">
              مصروف <Ly amount={totals.paid} bold />
            </span>
          </span>
        }
      >
        {stores.length === 0 ? (
          <EmptyHint text="لا توجد متاجر مسجلة" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((st) => {
              const paying = busyKey === `payout:${st.id}`
              return (
                <article
                  key={st.id}
                  className="flex flex-col rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#062319] p-4"
                >
                  <header className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#041710] text-2xl">
                      {st.emoji || '🏪'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F8F5EE]">{st.name}</p>
                      <p className="text-[11px] text-[#938E7E]">شريك واصل نالوت</p>
                    </div>
                  </header>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-[#041710] p-2">
                      <Coins className="mx-auto h-3.5 w-3.5 text-[#F5D061]" />
                      <Ly amount={st.dues} bold className="mt-1 block text-[15px] text-[#F5D061]" />
                      <p className="text-[10px] text-[#938E7E]">مستحقات اليوم (90%)</p>
                    </div>
                    <div className="rounded-lg bg-[#041710] p-2">
                      <Coins className="mx-auto h-3.5 w-3.5 text-[#10B981]" />
                      <Ly amount={st.payoutPaid} bold className="mt-1 block text-[15px] text-[#10B981]" />
                      <p className="text-[10px] text-[#938E7E]">مصروف سابقاً</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => openPayout(st)}
                    disabled={st.dues <= 0 || paying}
                    className="mt-3 min-h-12 w-full bg-[#0A3324] font-bold text-[#F5D061] hover:bg-[#124532] disabled:opacity-40"
                  >
                    <Coins className="h-4 w-4" />
                    {paying ? 'جارٍ الصرف…' : st.dues <= 0 ? 'لا مستحقات اليوم' : 'صرف المستحقات'}
                  </Button>

                  {/* 🧾 كشف حساب A4 — آخر 30 يوماً (CRON-R9) */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void printStatement(st)}
                    disabled={statementBusy === st.id}
                    className="mt-2 min-h-11 w-full border-[rgba(212,175,55,0.3)] bg-transparent text-[11px] font-bold text-[#C9C4B4] hover:bg-[#0A3324] hover:text-[#F5D061]"
                  >
                    {statementBusy === st.id ? (
                      <>جارٍ تجهيز الكشف…</>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        كشف حساب A4 — آخر 30 يوماً
                      </>
                    )}
                  </Button>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* نافذة إدخال مبلغ الصرف */}
      <Dialog
        open={!!target && !issued}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <DialogContent className="border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F8F5EE] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#F5D061]">صرف مستحقات {target?.name}</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed text-[#938E7E]">
              سيُصدر سند صرف رسمي ويخصم من محفظة المتجر مباشرة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#041710] p-3 text-center">
              <p className="text-[11px] text-[#938E7E]">المستحقات المتاحة اليوم</p>
              <Ly amount={target?.dues ?? 0} bold className="text-2xl text-[#F5D061]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-amount" className="text-[12px] text-[#C9C4B4]">
                مبلغ الصرف (د.ل)
              </Label>
              <Input
                id="payout-amount"
                dir="ltr"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setAmountError(null)
                }}
                className="font-money h-12 border-[rgba(212,175,55,0.3)] bg-[#041710] text-center text-lg text-[#F5D061]"
              />
              {amountError && <p className="text-[11px] font-semibold text-[#EF4444]">{amountError}</p>}
            </div>
            <Button
              type="button"
              onClick={() => void confirmPayout()}
              disabled={working}
              className="min-h-12 w-full bg-gradient-to-l from-[#D4AF37] to-[#F5D061] font-bold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
            >
              {working ? 'جارٍ إصدار السند…' : 'صرف وإصدار السند'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* سند الصرف الرسمي */}
      <Dialog open={!!issued} onOpenChange={(open) => {
        if (!open) {
          setIssued(null)
          setTarget(null)
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[rgba(212,175,55,0.35)] bg-[#062319] wasel-scroll sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#F5D061]">🛡️ سند صرف مستحقات — تم التحويل</DialogTitle>
          </DialogHeader>
          {issued && (
            <>
              <VoucherDocument
                voucher={issued.result.voucher}
                title="سند صرف مستحقات متجر"
                extraNote={`المتبقي في محفظة المتجر بعد الصرف: ${issued.result.remainingDues.toFixed(2)} د.ل`}
              />
              <Button
                type="button"
                onClick={() => window.print()}
                className="min-h-12 w-full border border-[rgba(212,175,55,0.4)] bg-transparent text-[#F5D061] hover:bg-[#0A3324]"
              >
                🖨️ طباعة السند
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// 🧾 كشف حساب متجر شريك — A4 قابل للطباعة/PDF (CRON-R9)
// يُطبع عبر iframe خفي كي لا تتأثر ستايلات الغرفة الداكنة
// ============================================================

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtMoney(n: number): string {
  return n.toFixed(2)
}

function buildStatementHtml(st: StoreStatement): string {
  const fromD = new Date(st.from)
  const toD = new Date(st.to)
  const period = `${fromD.toLocaleDateString('en-GB')} — ${toD.toLocaleDateString('en-GB')}`
  const generated = `${new Date().toLocaleDateString('en-GB')} • ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  const rowsHtml = st.rows.length
    ? st.rows
        .map(
          (r, i) => `<tr>
            <td class="c dim">${i + 1}</td>
            <td class="c mono">${esc(r.orderNumber)}</td>
            <td class="c">${new Date(r.at).toLocaleDateString('en-GB')}</td>
            <td class="c">${r.paymentMethod === 'wallet' ? 'محفظة' : 'كاش'}</td>
            <td class="num">${fmtMoney(r.subtotalLyd)}</td>
            <td class="num gold">${fmtMoney(r.payoutLyd)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="6" class="empty">لا توجد طلبات مسلّمة لهذا المتجر خلال الفترة</td></tr>`

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>كشف حساب — ${esc(st.store.name)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Tajawal', 'Cairo', 'Segoe UI', system-ui, sans-serif;
    color: #171512; background: #fff; font-size: 12.5px;
  }
  .head {
    background: linear-gradient(135deg, #041710 0%, #0A3324 100%);
    color: #F8F5EE; border-radius: 10px; padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .head .brand { font-size: 20px; font-weight: 800; }
  .head .sub { font-size: 10.5px; color: #C9C4B4; margin-top: 3px; }
  .badge {
    border: 1.5px solid rgba(212,175,55,0.65); color: #F5D061;
    border-radius: 8px; padding: 5px 12px; font-size: 11px; font-weight: 800;
  }
  .meta { margin-top: 14px; border: 1px solid #D9D4C5; border-radius: 10px; padding: 12px 14px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 18px; font-size: 11.5px; }
  .meta-grid .lbl { color: #5c584c; font-size: 10px; }
  .meta-grid .val { font-weight: 700; margin-top: 1px; }
  .mono { font-family: 'Outfit', 'Consolas', monospace; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
  thead th {
    background: #F4F1E8; border: 1px solid #D9D4C5; border-bottom: 2px solid #171512;
    padding: 7px 6px; font-size: 10.5px; text-align: center;
  }
  tbody td { border: 1px dotted #D9D4C5; padding: 6px; text-align: center; }
  tbody tr:nth-child(even) { background: #FAF8F2; }
  .num { font-family: 'Outfit', 'Consolas', monospace; font-weight: 700; direction: ltr; }
  .gold { color: #8a6d1c; }
  .c { }
  .dim { color: #8b8676; }
  .empty { padding: 18px; color: #5c584c; font-size: 11.5px; }
  .totals {
    margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }
  .t-box { border: 1.5px solid #171512; border-radius: 10px; padding: 10px; text-align: center; }
  .t-box .lbl { font-size: 10px; color: #5c584c; }
  .t-box .v { font-family: 'Outfit', monospace; font-size: 17px; font-weight: 800; direction: ltr; }
  .t-box.main { background: #041710; color: #F5D061; border-color: #041710; }
  .t-box.main .lbl { color: #C9C4B4; }
  .shariah {
    margin-top: 14px; border: 1.5px dashed #8a6d1c; border-radius: 10px;
    padding: 10px 14px; font-size: 10.5px; color: #5c584c; line-height: 1.8; background: #FBF9F3;
  }
  .shariah b { color: #8a6d1c; }
  .seal {
    margin-top: 14px; text-align: center; font-weight: 800; font-size: 11.5px; color: #0E7A57;
    border-top: 1.5px solid #171512; padding-top: 10px;
  }
  .foot { margin-top: 8px; text-align: center; font-size: 9.5px; color: #8b8676; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">🛡️ واصل نالوت</div>
      <div class="sub">غرفة العمليات والمالية — نالوت • جبل نفوسة</div>
    </div>
    <div class="badge">كشف حساب متجر شريك</div>
  </div>

  <div class="meta">
    <div class="meta-grid">
      <div><div class="lbl">المتجر</div><div class="val">${st.store.emoji} ${esc(st.store.name)}</div></div>
      <div><div class="lbl">الحي</div><div class="val">${esc(st.store.district)}</div></div>
      <div><div class="lbl">الفترة</div><div class="val mono">${esc(period)} (${st.days} يوماً)</div></div>
      <div><div class="lbl">عدد الطلبات المسلّمة</div><div class="val mono">${st.totals.orders}</div></div>
      <div><div class="lbl">تاريخ الإصدار</div><div class="val mono">${esc(generated)}</div></div>
      <div><div class="lbl">العملة</div><div class="val">دينار ليبي (د.ل)</div></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:34px">#</th>
        <th>رقم الطلب</th>
        <th style="width:80px">التاريخ</th>
        <th style="width:70px">الدفع</th>
        <th style="width:100px">قيمة السلة</th>
        <th style="width:110px">مستحق المتجر (90%)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="t-box"><div class="lbl">إجمالي المبيعات (سلال)</div><div class="v">${fmtMoney(st.totals.subtotalLyd)}</div></div>
    <div class="t-box main"><div class="lbl">إجمالي مستحقات المتجر</div><div class="v">${fmtMoney(st.totals.payoutLyd)} د.ل</div></div>
    <div class="t-box"><div class="lbl">نصيب المنصة (10%)</div><div class="v">${fmtMoney(st.totals.platformLyd)}</div></div>
  </div>

  <div class="shariah">
    <b>الإطار الشرعي:</b> علاقة المنصة بالمتجر <b>عقد بيع قطعي</b> — ثمن الطلب ملك للمتجر، وتحصّل المنصة نصيبها
    المتفق عليه (10%) <b>أجرة خدمات مشتركة</b> لا عمولة على الربح، بلا فوائد ولا رسوم خفية.
    أجرة التوصيل <b>إجرة عمل</b> مستحقة للكابتن كاملة لا يمسها هذا الكشف.
  </div>

  <div class="seal">✓ كشف حساب إلكتروني موثق — كل قرش مُساءل</div>
  <div class="foot">واصل نالوت • صُدر آلياً من غرفة العمليات • دينار ليبي حصرياً</div>
</body>
</html>`
}

function printStatementHtml(st: StoreStatement): void {
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
  doc.write(buildStatementHtml(st))
  doc.close()
  iframe.contentWindow?.focus()
  window.setTimeout(() => {
    iframe.contentWindow?.print()
    window.setTimeout(() => iframe.remove(), 1200)
  }, 350)
}
