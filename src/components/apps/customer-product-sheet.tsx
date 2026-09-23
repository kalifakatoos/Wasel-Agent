'use client'

// 🍽️ نافذة تفاصيل الصنف — عداد كمية + ملاحظات حرة للمطبخ + إضافة للسلة
import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Ly } from '@/components/wasel/Badges'
import { useWasel } from '@/lib/wasel/store'
import { useToast } from '@/hooks/use-toast'
import type { ProductDTO } from '@/lib/wasel/types'

export function ProductDetailSheet({
  product,
  store,
  open,
  onOpenChange,
}: {
  product: ProductDTO | null
  store: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const addToCart = useWasel((s) => s.addToCart)
  const cartStoreId = useWasel((s) => s.cartStoreId)
  const { toast } = useToast()

  // تصفير الاختيار كل مرة تُفتح فيها النافذة
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setQty(1)
        setNotes('')
      })
    }
  }, [open, product?.id])

  if (!product || !store) return null

  const total = product.basePriceLyd * qty
  const willReplaceCart = cartStoreId !== null && cartStoreId !== store.id

  const handleAdd = () => {
    const replacing = willReplaceCart
    addToCart(store, {
      productId: product.id,
      title: product.title,
      qty,
      unitPrice: product.basePriceLyd,
      emoji: product.emoji,
      notes: notes.trim() || undefined,
    })
    toast({
      title: '✅ أُضيف إلى السلة',
      description: replacing
        ? `استبدلنا سلتك السابقة بأصناف ${store.name}`
        : `${product.title} × ${qty}`,
      className: 'border-[rgba(212,175,55,0.5)] bg-[#0A3324] text-[#F5D061]',
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="wasel-scroll max-h-[88vh] overflow-y-auto rounded-t-3xl border-[rgba(212,175,55,0.35)] bg-[#062319] p-6"
      >
        <SheetHeader className="p-0 text-right">
          <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-[rgba(212,175,55,0.35)]" />
        </SheetHeader>

        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-5xl gold-glow">
            {product.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-extrabold text-[#F8F5EE]">{product.title}</SheetTitle>
            <SheetDescription className="mt-1 text-xs leading-relaxed text-[#938E7E]">
              {product.description || 'صنف مميز من مطبخ واصل نالوت'}
            </SheetDescription>
            <div className="mt-2 flex items-center gap-2">
              <Ly amount={product.basePriceLyd} bold className="text-lg text-[#F5D061]" />
              {!product.isAvailable && (
                <span className="rounded-full border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
                  غير متوفر حالياً
                </span>
              )}
            </div>
          </div>
        </div>

        {/* عداد الكمية */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold text-[#938E7E]">الكمية</p>
          <div className="flex items-center justify-between rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[#0A3324] p-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="إنقاص الكمية"
              className="h-12 w-12 rounded-xl border-[rgba(212,175,55,0.35)] bg-[#062319] text-[#F5D061] hover:bg-[rgba(212,175,55,0.12)]"
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="font-money ltr-nums w-14 text-center text-3xl font-bold text-[#F8F5EE]">
              {qty}
            </span>
            <Button
              size="icon"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              aria-label="زيادة الكمية"
              className="h-12 w-12 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-[#041710] hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ملاحظات حرة للمطبخ */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold text-[#938E7E]">
            ملاحظات للمطبخ <span className="font-normal">(اختياري)</span>
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="مثال: بدون مايونيز، تغليف محكم، بصل مشوي زيادة…"
            className="resize-none rounded-xl border-[rgba(212,175,55,0.25)] bg-[#041710] text-sm leading-relaxed text-[#F8F5EE] placeholder:text-[#938E7E]/50"
          />
        </div>

        {willReplaceCart && (
          <p className="mt-4 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-[#F59E0B]">
            ⚠️ سلتك تحوي أصناف من متجر آخر — الإضافة تستبدلها بأصناف {store.name}
          </p>
        )}

        {/* زر الإضافة */}
        <Button
          onClick={handleAdd}
          disabled={!product.isAvailable}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {product.isAvailable ? (
            <>
              أضف إلى السلة • <Ly amount={total} className="text-[#041710]" />
            </>
          ) : (
            'الصنف غير متوفر'
          )}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
