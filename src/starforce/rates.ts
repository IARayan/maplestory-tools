import type { EnhanceOutcome } from './types'

type RateRow = {
  success: number
  fail: number
  destroy: number
}

export const NORMAL_STAR_RATES: Record<number, RateRow> = {
  0: { success: 95, fail: 5, destroy: 0 },
  1: { success: 90, fail: 10, destroy: 0 },
  2: { success: 85, fail: 15, destroy: 0 },
  3: { success: 85, fail: 15, destroy: 0 },
  4: { success: 80, fail: 20, destroy: 0 },
  5: { success: 75, fail: 25, destroy: 0 },
  6: { success: 70, fail: 30, destroy: 0 },
  7: { success: 65, fail: 35, destroy: 0 },
  8: { success: 60, fail: 40, destroy: 0 },
  9: { success: 55, fail: 45, destroy: 0 },
  10: { success: 50, fail: 50, destroy: 0 },
  11: { success: 45, fail: 55, destroy: 0 },
  12: { success: 40, fail: 60, destroy: 0 },
  13: { success: 35, fail: 65, destroy: 0 },
  14: { success: 30, fail: 70, destroy: 0 },
  15: { success: 30, fail: 67.9, destroy: 2.1 },
  16: { success: 30, fail: 67.9, destroy: 2.1 },
  17: { success: 15, fail: 78.2, destroy: 6.8 },
  18: { success: 15, fail: 78.2, destroy: 6.8 },
  19: { success: 15, fail: 76.5, destroy: 8.5 },
  20: { success: 30, fail: 59.5, destroy: 10.5 },
  21: { success: 15, fail: 72.25, destroy: 12.75 },
  22: { success: 15, fail: 68, destroy: 17 },
  23: { success: 10, fail: 72, destroy: 18 },
  24: { success: 10, fail: 72, destroy: 18 },
  25: { success: 10, fail: 72, destroy: 18 },
  26: { success: 7, fail: 74.4, destroy: 18.6 },
  27: { success: 5, fail: 76, destroy: 19 },
  28: { success: 3, fail: 77.6, destroy: 19.4 },
  29: { success: 1, fail: 79.2, destroy: 19.8 },
}

function isSuperiorEquipment(name: string): boolean {
  return (
    name.includes('Superior ') ||
    name.includes('Tyrant ') ||
    name.includes('Nova ') ||
    name.includes('Elite Heliseum ')
  )
}

export function maxStarsForEquipment(level: number, name: string): number {
  if (name === 'Ghost Ship Exorcist' || name === 'Sengoku Hakase Badge') {
    return 22
  }

  if (
    name === 'Sweetwater Shoes' ||
    name === 'Sweetwater Gloves' ||
    name === 'Sweetwater Cape'
  ) {
    return 15
  }

  if (name.includes('Elite Heliseum ')) return 3
  if (name.includes('Nova ')) return 8
  if (name.includes('Tyrant ')) return 15

  if (level <= 94) return 5
  if (level <= 107) return 8
  if (level <= 117) return 10
  if (level <= 127) return 15
  if (level <= 137) return 20
  return 30
}

export function recoveredStarsAfterDestroy(
  starsBeforeDestroy: number,
  itemName: string,
): number {
  if (isSuperiorEquipment(itemName)) return 0
  if (starsBeforeDestroy <= 19) return 12
  if (starsBeforeDestroy === 20) return 15
  if (starsBeforeDestroy <= 22) return 17
  if (starsBeforeDestroy <= 25) return 19
  return 20
}

export function getRates(
  currentStars: number,
  options?: { starCatch?: boolean; safeguard?: boolean },
): RateRow {
  const base = NORMAL_STAR_RATES[currentStars] ?? { success: 0, fail: 100, destroy: 0 }
  let success = base.success
  let fail = base.fail
  let destroy = base.destroy

  if (options?.starCatch) {
    const boostedSuccess = success * 1.05
    const remaining = 100 - boostedSuccess
    const penaltyPool = fail + destroy
    if (penaltyPool > 0) {
      const scale = remaining / penaltyPool
      fail *= scale
      destroy *= scale
    }
    success = boostedSuccess
  }

  if (options?.safeguard && currentStars >= 15 && currentStars <= 17) {
    fail += destroy
    destroy = 0
  }

  return { success, fail, destroy }
}

export function rollEnhance(
  currentStars: number,
  rng: () => number,
  options?: { starCatch?: boolean; safeguard?: boolean },
): EnhanceOutcome {
  const rates = getRates(currentStars, options)
  const roll = rng() * 100

  if (roll < rates.success) return 'success'
  if (roll < rates.success + rates.fail) return 'fail_stay'
  return 'destroy'
}
