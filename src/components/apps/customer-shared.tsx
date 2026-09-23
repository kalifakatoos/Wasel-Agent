'use client'

// 🧰 عناصر مشتركة لواجهة تطبيق الزبون — واصل نالوت
import { useState } from 'react'
import { ArrowRight, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LIBYAN_PHONE_PREFIXES } from '@/lib/wasel/constants'

/// نمط الهاتف الليبي المعتمد: 091/092/093/094 + 7 أرقام (مبني من الثوابت الرسمية)
export const LIBYAN_PHONE_RE = new RegExp(`^(${LIBYAN_PHONE_PREFIXES.join('|')})\\d{7}$`)

export function isValidLibyanPhone(phone: string): boolean {
  return LIBYAN_PHONE_RE.test(phone.trim())
}

/// تاريخ مقروء بأرقام لاتينية
export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-LY-u-nu-latn', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/// شريط شاشة داخلي: زر رجوع (48px) + عنوان
export function ScreenBar({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle?: string
  onBack: () => void
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={onBack}
        aria-label="رجوع"
        className="h-12 w-12 shrink-0 rounded-xl border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-[#F5D061] hover:bg-[rgba(212,175,55,0.12)] hover:text-[#F5D061]"
      >
        <ArrowRight className="h-5 w-5" />
      </Button>
      <div className="min-w-0">
        <h2 className="truncate text-lg font-extrabold text-[#F8F5EE]">{title}</h2>
        {subtitle && <p className="truncate text-xs text-[#938E7E]">{subtitle}</p>}
      </div>
    </div>
  )
}

/// حالة تحميل مركزية
export function LoadingBlock({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#938E7E]">
      <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  )
}

/// حالة خطأ مع إعادة محاولة
export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] py-12 text-center">
      <TriangleAlert className="h-8 w-8 text-[#EF4444]" />
      <p className="max-w-sm px-4 text-sm font-semibold text-[#F8F5EE]">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="h-12 rounded-xl bg-[#0A3324] px-6 text-sm font-bold text-[#F5D061] hover:bg-[#124532]"
        >
          إعادة المحاولة
        </Button>
      )}
    </div>
  )
}

/// بوابة الهاتف: شاشة دعوة لإدخال رقم ليبي (وضع الضيوف)
export function PhoneGate({
  title,
  description,
  ctaLabel = 'متابعة',
  onSave,
}: {
  title: string
  description: string
  ctaLabel?: string
  onSave: (phone: string) => void
}) {
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const submit = () => {
    if (!isValidLibyanPhone(phone)) {
      setErr('أدخل رقماً ليبياً صحيحاً يبدأ بـ 091 أو 092 أو 093 أو 094 (10 أرقام)')
      return
    }
    setErr(null)
    onSave(phone.trim())
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[rgba(212,175,55,0.25)] bg-[#062319] p-8 text-center gold-glow">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#0A3324] text-3xl">
        📱
      </div>
      <h3 className="mb-2 text-lg font-extrabold text-[#F8F5EE]">{title}</h3>
      <p className="mb-5 text-xs leading-relaxed text-[#938E7E]">{description}</p>
      <Input
        dir="ltr"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={10}
        placeholder="0910000001"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
          setErr(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="h-12 border-[rgba(212,175,55,0.3)] bg-[#041710] text-center font-money text-lg tracking-widest text-[#F8F5EE] placeholder:text-[#938E7E]/50"
      />
      {err && <p className="mt-2 text-xs font-semibold text-[#EF4444]">{err}</p>}
      <Button
        onClick={submit}
        className="mt-5 h-12 w-full rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-base font-extrabold text-[#041710] shadow-lg shadow-[rgba(212,175,55,0.25)] transition hover:scale-[1.01]"
      >
        {ctaLabel}
      </Button>
      <p className="mt-3 text-[10px] leading-relaxed text-[#938E7E]/80">
        لا تسجيل ولا كلمة مرور — هويتك في واصل هي رقم هاتفك فقط
      </p>
    </div>
  )
}
