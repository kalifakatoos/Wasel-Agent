// ============================================================
// محرك التسعير والمسافات - Pricing & Geo Engine (نسخة TS من logistics/)
// ============================================================
import { PRICING } from './constants'

/// المسافة الجغرافية الحقيقية (هافرساين) بالكيلومتر
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/// دالة سيجمويد لمعامل الذروة - لا تتجاوز أبداً سقف 2.5x
export function surgeFactor(demand: number, supply: number): number {
  if (supply <= 0) return Math.min(PRICING.surgeCap, 1.5)
  const ratio = demand / supply
  // S(x) = 1 + 0.5 * sigmoid(x - 1.2)  حيث sigmoid(z)=1/(1+e^-6z)
  const sigmoid = 1 / (1 + Math.exp(-6 * (ratio - 1.2)))
  const s = 1 + 0.6 * sigmoid
  return Math.min(PRICING.surgeCap, Math.max(1, Math.round(s * 20) / 20))
}

/**
 * تسعيرة التوصيل الديناميكية لنالوت (د.ل):
 * DeliveryFee = max(5.00, (5.00 + 1.20 × DistanceKm) × S(Demand, Supply))
 */
export function computeDeliveryFee(
  distanceKm: number,
  demand = 0,
  supply = 1,
): { fee: number; surge: number } {
  const surge = surgeFactor(demand, supply)
  const raw = (PRICING.baseFee + PRICING.perKm * Math.max(0.4, distanceKm)) * surge
  const fee = Math.max(PRICING.minFee, Math.round(raw * 20) / 20) // تقريب لأقرب 0.05
  return { fee, surge }
}

/// وقت وصول الكابتن التقريبي للمتجر (دقائق) بمتوسط 22 كم/س داخل المدينة
export function etaMinutesToStore(distanceKm: number): number {
  return Math.max(2, Math.round((distanceKm / 22) * 60) + 1)
}

/**
 * مصفوفة تكلفة التوزيع (صيغة هنغاريان المبسطة):
 * C = w_dist·D + w_dwell·max(0, ETA - P) + w_wait·max(0, P - ETA)
 * w_dwell = 1.5 لتقليل بقاء الطعام بارداً في المطبخ
 */
export function dispatchCost(distanceKm: number, prepRemainingMin: number): number {
  const eta = etaMinutesToStore(distanceKm)
  const dwell = Math.max(0, eta - prepRemainingMin)
  const wait = Math.max(0, prepRemainingMin - eta)
  return 1.0 * distanceKm + 1.5 * dwell + 0.4 * wait
}
