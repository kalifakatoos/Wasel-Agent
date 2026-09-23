// ============================================================
// أدوات الخادم - Server Utilities (بث لحظي، معرفات، درع PIN)
// ============================================================
import { NextRequest } from 'next/server'
import { ADMIN_PINS } from './constants'

const EMIT_URL = 'http://localhost:3013/emit'

/// بث حدث لحظي عبر محرك socket.io الداخلي
export async function emitRealtime(
  rooms: string[],
  event: string,
  data: unknown,
): Promise<void> {
  try {
    await fetch(EMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms, event, data }),
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    // البث فاشل لا يعني فشل العملية التجارية
  }
}

/// كود تسليم رباعي OTP
export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/// رقم طلب واصل: WSL-YYMMDD-XXXX
export function generateOrderNumber(seq: number): string {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `WSL-${ymd}-${String(seq).padStart(4, '0')}`
}

/// رقم سند: RV- (قبض) / DV- (صرف)
export function generateVoucherNumber(type: 'receipt' | 'disbursement', seq: number): string {
  const prefix = type === 'receipt' ? 'RV' : 'DV'
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${prefix}-${ymd}-${String(seq).padStart(3, '0')}`
}

/// كود محضر جرد Z
export function generateAuditCode(seq: number): string {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `Z-${ymd}-${String(seq).padStart(2, '0')}`
}

/// درع الأمان الإداري: التحقق من PIN من الهيدر أو الجسم
export function assertAdminPin(req: NextRequest, bodyPin?: string): string | null {
  const pin = req.headers.get('x-admin-pin') || bodyPin || ''
  if (ADMIN_PINS.includes(pin)) return null
  return 'رمز المرور الإداري غير صحيح'
}

/// التحقق من رقم الهاتف الليبي (091/092/093/094)
export function isValidLibyanPhone(phone: string): boolean {
  return /^09[1-4]\d{7}$/.test(phone.trim())
}

/// تقريب مالي بدقة دينار
export function money(n: number): number {
  return Math.round(n * 100) / 100
}
