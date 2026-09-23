'use client'

// 📡 رادار الطلبات الفوري — نافذة عرض غير قابلة للإغلاق بعداد 15 ثانية
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Ly, OrderNo } from '@/components/wasel/Badges'
import type { RadarOffer } from '@/lib/wasel/types'

interface OrderRadarDialogProps {
  offer: RadarOffer | null
  secondsLeft: number
  accepting: boolean
  onAccept: () => void
  onDecline: () => void
}

const RING_R = 88
const RING_C = 2 * Math.PI * RING_R

/** نص طريقة الدفع بصيغة موحدة بلا أي عملات أجنبية */
function payLabel(method: string): { icon: string; text: string } {
  return method === 'wallet' ? { icon: '👛', text: 'محفظة' } : { icon: '💵', text: 'كاش' }
}

export function OrderRadarDialog({ offer, secondsLeft, accepting, onAccept, onDecline }: OrderRadarDialogProps) {
  const total = offer?.expiresInSec || 15
  const frac = Math.max(0, Math.min(1, secondsLeft / total))
  const pay = payLabel(offer?.paymentMethod ?? 'cash')

  return (
    <Dialog
      open={!!offer}
      onOpenChange={() => {
        /* 🔐 النافذة تُغلق فقط عبر القبول/الرفض/انتهاء العداد — يُمنع الإغلاق بالنقر خارجها */
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-[calc(100%-1.5rem)] max-w-md gap-0 rounded-3xl border-[rgba(212,175,55,0.45)] bg-[#062319] p-6 gold-glow sm:max-w-md"
      >
        {offer && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="rounded-full border border-[rgba(245,208,97,0.4)] bg-[rgba(245,208,97,0.1)] px-4 py-1.5 text-xs font-extrabold tracking-wide text-[#F5D061]">
              📡 عرض توصيل فوري — أول من يقبل يفوز
            </span>

            {/* حلقة العداد الدائرية */}
            <div className="relative">
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[rgba(16,185,129,0.08)]" />
              <svg viewBox="0 0 200 200" className="h-52 w-52" role="img" aria-label="عدّاد العرض التنازلي">
                <circle cx="100" cy="100" r={RING_R} fill="none" stroke="rgba(212,175,55,0.14)" strokeWidth="10" />
                <motion.circle
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  stroke="#F5D061"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  transform="rotate(-90 100 100)"
                  initial={false}
                  animate={{ strokeDashoffset: RING_C * (1 - frac) }}
                  transition={{ duration: 0.95, ease: 'linear' }}
                />
                {/* الأجرة في وسط الحلقة */}
                <foreignObject x="30" y="55" width="140" height="90">
                  <div className="flex h-[90px] flex-col items-center justify-center">
                    <Ly amount={offer.deliveryFeeLyd} bold className="text-3xl text-[#F5D061]" />
                    <span className="mt-0.5 text-[11px] font-bold text-[#938E7E]">أجرة التوصيل كاملة لك</span>
                  </div>
                </foreignObject>
                <text
                  x="100"
                  y="160"
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="800"
                  fill="#10B981"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {secondsLeft}
                </text>
              </svg>
            </div>

            {/* تفاصيل العرض */}
            <div className="w-full rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#041710]/70 p-3">
              <div className="flex items-center gap-2 border-b border-[rgba(212,175,55,0.12)] pb-2">
                <span className="text-2xl">{offer.storeEmoji || '🏪'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#F8F5EE]">{offer.storeName}</p>
                  <p className="text-[11px] text-[#938E7E]">📍 {offer.district}</p>
                </div>
                <OrderNo no={offer.orderNumber} className="rounded-lg bg-[#0A3324] px-2 py-1 text-xs text-[#F5D061]" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div>
                  <p className="font-money ltr-nums text-sm font-bold text-[#F8F5EE]">{offer.distanceKm} كم</p>
                  <p className="text-[10px] text-[#938E7E]">المسافة</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#F8F5EE]">
                    {pay.icon} {pay.text}
                  </p>
                  <p className="text-[10px] text-[#938E7E]">طريقة الدفع</p>
                </div>
                <div>
                  <p className="font-money ltr-nums text-sm font-bold text-[#F8F5EE]">{offer.prepMinutes} د</p>
                  <p className="text-[10px] text-[#938E7E]">زمن التحضير</p>
                </div>
              </div>
            </div>

            <DialogDescription className="text-center text-[11px] leading-relaxed text-[#938E7E]">
              بانتهاء العدّاد يُعرض الطلب على كباتن آخرين — قرر الآن أيها الكابتن
            </DialogDescription>

            {/* زرا القرار الضخمان (هدف لمس ≥ 48px) */}
            <div className="grid w-full grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={accepting}
                onClick={onAccept}
                className="h-16 rounded-2xl bg-[#10B981] text-base font-black text-[#041710] shadow-lg shadow-[rgba(16,185,129,0.3)] transition hover:bg-[#0DB27A] disabled:opacity-60"
              >
                {accepting ? 'جارٍ القبول…' : 'قبول العرض ✅'}
              </motion.button>
              <button
                onClick={onDecline}
                disabled={accepting}
                className="h-16 rounded-2xl border border-[rgba(147,142,126,0.35)] bg-[#0A3324] text-base font-extrabold text-[#938E7E] transition hover:bg-[#124532] disabled:opacity-60"
              >
                رفض ❌
              </button>
            </div>
          </motion.div>
        )}
        <DialogTitle className="sr-only">عرض توصيل فوري من رادار واصل</DialogTitle>
      </DialogContent>
    </Dialog>
  )
}
