const STAR_COST_RULES: Record<number, { exponent: number; divisor: number }> = {
  10: { exponent: 2.7, divisor: 400 },
  11: { exponent: 2.7, divisor: 220 },
  12: { exponent: 2.7, divisor: 150 },
  13: { exponent: 2.7, divisor: 110 },
  14: { exponent: 2.7, divisor: 75 },
  15: { exponent: 2.7, divisor: 200 },
  16: { exponent: 2.7, divisor: 150 },
  17: { exponent: 2.7, divisor: 110 },
  18: { exponent: 2.7, divisor: 75 },
  19: { exponent: 2.7, divisor: 50 },
  20: { exponent: 2.7, divisor: 200 },
  21: { exponent: 2.7, divisor: 80 },
}

function roundToNearestHundred(value: number): number {
  return Math.round(value / 100) * 100
}

/** Current GMS formula from the Star Force wiki table. */
export function baseMesoCost(equipLevel: number, currentStars: number): number {
  if (currentStars < 0 || currentStars >= 30) return 0

  const nextStar = currentStars + 1
  const levelCube = equipLevel ** 3

  if (currentStars <= 9) {
    return roundToNearestHundred(1000 + (levelCube * nextStar) / 25)
  }

  if (currentStars >= 22) {
    return roundToNearestHundred(
      1000 + (levelCube * nextStar ** 2.7) / 50,
    )
  }

  const rule = STAR_COST_RULES[currentStars]
  if (!rule) return 0

  return roundToNearestHundred(
    1000 + (levelCube * nextStar ** rule.exponent) / rule.divisor,
  )
}

export function mesoCostPerAttempt(
  equipLevel: number,
  currentStars: number,
  safeguardEnabled = false,
): number {
  const base = baseMesoCost(equipLevel, currentStars)
  if (safeguardEnabled && currentStars >= 15 && currentStars <= 17) {
    return base * 3
  }
  return base
}
