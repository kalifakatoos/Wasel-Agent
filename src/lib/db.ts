import { PrismaClient } from '@prisma/client'

// مفتاح إصدار لتجديد العميل في dev بعد تغييرات المخطط (HMR-safe)
const GLOBAL_KEY = '__waselPrismaClient_v2'

const globalForPrisma = globalThis as unknown as {
  [GLOBAL_KEY]?: PrismaClient
}

function createClient(): PrismaClient {
  return new PrismaClient({
    log: ['query'],
  })
}

export const db = globalForPrisma[GLOBAL_KEY] ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma[GLOBAL_KEY] = db