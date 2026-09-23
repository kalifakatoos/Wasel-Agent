// ضمان وجود بيانات نالوت (تلقائي عند أول استعلام)
import { db } from '@/lib/db'
import { SEED_STORES, SEED_DRIVERS } from './seed-data'

let seeding: Promise<void> | null = null

export async function ensureSeed(): Promise<void> {
  if (seeding) return seeding
  seeding = (async () => {
    const count = await db.store.count()
    if (count > 0) return

    for (const s of SEED_STORES) {
      await db.store.create({
        data: {
          id: s.id, name: s.name, vertical: s.vertical, district: s.district,
          latitude: s.latitude, longitude: s.longitude, rating: s.rating,
          emoji: s.emoji, tagline: s.tagline, prepMinutes: s.prepMinutes,
          products: {
            create: s.products.map((p) => ({
              id: p.id, title: p.title, description: p.description,
              basePriceLyd: p.basePriceLyd, emoji: p.emoji, category: p.category,
              isFood: s.vertical === 'food',
            })),
          },
        },
      })
    }
    for (const d of SEED_DRIVERS) {
      await db.driver.create({
        data: {
          id: d.id, fullName: d.fullName, phone: d.phone,
          vehicleType: d.vehicleType, plateNumber: d.plateNumber, rating: d.rating,
          currentLatitude: d.lat, currentLongitude: d.lng,
        },
      })
    }
    await db.wallet.createMany({
      data: [
        { ownerId: 'platform_revenue', walletType: 'platform_revenue', balance: 0 },
        { ownerId: 'platform_escrow', walletType: 'platform_escrow', balance: 0 },
        { ownerId: '0910000001', walletType: 'customer', balance: 150 },
      ],
    })
  })().finally(() => {
    seeding = null
  })
  return seeding
}
