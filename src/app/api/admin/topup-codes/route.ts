import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertAdminPin, money } from '@/lib/wasel/server-utils'

export const dynamic = 'force-dynamic'

export interface TopupCodeRow {
  id: string
  code: string
  amountLyd: number
  isActive: number | boolean
  usedByPhone: string | null
  usedAt: string | null
  note: string
  createdAt: string
}

/// 🎁 أكواد شحن المحفظة (بطاقات هدية مسبقة الدفع) — غرفة العمليات
/// GET: الكل | POST: توليد دفعة | PATCH: تعطيل/تفعيل
export async function GET(req: NextRequest) {
  const pinError = assertAdminPin(req)
  if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
  const rows = await db.$queryRawUnsafe<TopupCodeRow[]>(
    `SELECT * FROM "TopupCode" ORDER BY "createdAt" DESC LIMIT 200`,
  )
  return NextResponse.json({
    codes: (rows ?? []).map((r) => ({ ...r, isActive: !!r.isActive, amountLyd: money(r.amountLyd) })),
  })
}

function giftCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `WASL-${s.slice(0, 4)}-${s.slice(4)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })

    const { amountLyd, count, note } = body as { amountLyd?: number; count?: number; note?: string }
    const amount = money(amountLyd ?? 0)
    if (amount < 5 || amount > 500) {
      return NextResponse.json({ error: 'قيمة الكود يجب أن تكون بين 5.00 و 500.00 د.ل' }, { status: 400 })
    }
    const n = Math.max(1, Math.min(20, Math.floor(count ?? 1)))

    const created: string[] = []
    for (let i = 0; i < n; i++) {
      const id = `gift_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${i}`
      let code = giftCode()
      // تجنب تصادم الكود
      for (let tries = 0; tries < 5; tries++) {
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO "TopupCode" ("id","code","amountLyd","isActive","note","createdAt") VALUES (?, ?, ?, 1, ?, ?)`,
            id,
            code,
            amount,
            (note || '').trim().slice(0, 120),
            new Date().toISOString(),
          )
          created.push(code)
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

    return NextResponse.json({ ok: true, codes: created, amountLyd: amount }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const pinError = assertAdminPin(req, body.pin)
    if (pinError) return NextResponse.json({ error: pinError }, { status: 401 })
    const { code, isActive } = body as { code?: string; isActive?: boolean }
    const cleanCode = (code || '').trim().toUpperCase()
    if (!cleanCode || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'الكود والحالة الجديدة مطلوبان' }, { status: 400 })
    }
    const res = await db.$executeRawUnsafe(
      `UPDATE "TopupCode" SET "isActive" = ? WHERE UPPER("code") = UPPER(?) AND "usedByPhone" IS NULL`,
      isActive ? 1 : 0,
      cleanCode,
    )
    if (!res) {
      return NextResponse.json(
        { error: 'الكود غير موجود أو مستخدم مسبقاً (لا يمكن تعديل كود مستهلك)' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, code: cleanCode, isActive })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
