import type { Equipment, EquipmentDetails } from '../data/equipment'

export type FlameType = 'Powerful Flame' | 'Eternal Flame'

export type FlameLine = {
  label: string
  score: number
}

export type FlameMeta = {
  cost: number
  itemId: number
  iconUrl: string
}

type FlameKind =
  | 'singleStat'
  | 'dualStat'
  | 'allStat'
  | 'att'
  | 'matt'
  | 'hp'
  | 'boss'
  | 'damage'
  | 'speed'
  | 'jump'

const FLAME_META: Record<FlameType, FlameMeta> = {
  'Powerful Flame': {
    cost: 9_500_000,
    itemId: 2048716,
    iconUrl: 'https://maplestory.io/api/GMS/245/item/2048716/icon',
  },
  'Eternal Flame': {
    cost: 22_000_000,
    itemId: 2048717,
    iconUrl: 'https://maplestory.io/api/GMS/245/item/2048717/icon',
  },
}

const MAIN_STATS = ['STR', 'DEX', 'INT', 'LUK'] as const

function pickFrom<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function pickDistinctStats(rng: () => number): [(typeof MAIN_STATS)[number], (typeof MAIN_STATS)[number]] {
  const first = pickFrom(MAIN_STATS, rng)
  let second = pickFrom(MAIN_STATS, rng)
  while (second === first) second = pickFrom(MAIN_STATS, rng)
  return [first, second]
}

function isWeapon(equip: Equipment): boolean {
  return equip.category === 'Weapon'
}

function canReceiveBonusStats(equip: Equipment): boolean {
  return !['Ring', 'Shoulder', 'Emblem', 'Android Heart', 'Shield'].includes(
    equip.slot,
  )
}

function isFlameAdvantage(details: EquipmentDetails | null): boolean {
  return Boolean(details?.bossReward)
}

function rollLineCount(rng: () => number, flameAdvantage: boolean): number {
  if (flameAdvantage) return 4
  const roll = rng()
  if (roll < 0.4) return 1
  if (roll < 0.8) return 2
  if (roll < 0.96) return 3
  return 4
}

function randomTier(
  flameType: FlameType,
  flameAdvantage: boolean,
  rng: () => number,
): number {
  const roll = rng()

  if (flameType === 'Powerful Flame') {
    if (flameAdvantage) {
      if (roll < 0.2) return 3
      if (roll < 0.5) return 4
      if (roll < 0.86) return 5
      return 6
    }
    if (roll < 0.2) return 1
    if (roll < 0.5) return 2
    if (roll < 0.86) return 3
    return 4
  }

  if (flameAdvantage) {
    if (roll < 0.29) return 4
    if (roll < 0.74) return 5
    if (roll < 0.99) return 6
    return 7
  }
  if (roll < 0.29) return 2
  if (roll < 0.74) return 3
  if (roll < 0.99) return 4
  return 5
}

function mainStatValue(level: number, tier: number): number {
  return Math.ceil(level / 20) * tier
}

function buildLine(
  kind: FlameKind,
  equip: Equipment,
  tier: number,
  rng: () => number,
): FlameLine {
  const { level } = equip

  switch (kind) {
    case 'singleStat': {
      const stat = pickFrom(MAIN_STATS, rng)
      const value = mainStatValue(level, tier)
      return {
        label: `${stat}: +${value}`,
        score: value,
      }
    }
    case 'dualStat': {
      const [a, b] = pickDistinctStats(rng)
      const value = Math.ceil(mainStatValue(level, tier) * 0.45)
      return {
        label: `${a}/${b}: +${value}`,
        score: value * 0.95,
      }
    }
    case 'allStat':
      return {
        label: `All Stats: +${tier}%`,
        score: tier * 8,
      }
    case 'att':
      return {
        label: `ATT: +${isWeapon(equip) ? tier * 2 : tier}`,
        score: isWeapon(equip) ? tier * 12 : tier * 6,
      }
    case 'matt':
      return {
        label: `MATT: +${isWeapon(equip) ? tier * 2 : tier}`,
        score: isWeapon(equip) ? tier * 12 : tier * 6,
      }
    case 'hp': {
      const value = Math.ceil(level / 10) * tier
      return {
        label: `Max HP: +${value}`,
        score: value * 0.03,
      }
    }
    case 'boss':
      return {
        label: `Boss Damage: +${tier * 2}%`,
        score: tier * 7,
      }
    case 'damage':
      return {
        label: `Damage: +${tier}%`,
        score: tier * 5,
      }
    case 'speed':
      return {
        label: `Speed: +${tier}`,
        score: tier,
      }
    case 'jump':
      return {
        label: `Jump: +${tier}`,
        score: tier,
      }
  }
}

function poolFor(equip: Equipment): FlameKind[] {
  if (isWeapon(equip)) {
    return ['singleStat', 'dualStat', 'allStat', 'att', 'matt', 'boss', 'damage']
  }
  return ['singleStat', 'dualStat', 'allStat', 'att', 'matt', 'hp', 'speed', 'jump']
}

export function getFlameMeta(flameType: FlameType): FlameMeta {
  return FLAME_META[flameType]
}

export function getFlameCost(flameType: FlameType): number {
  return FLAME_META[flameType].cost
}

export function rollBonusStats(
  equip: Equipment,
  details: EquipmentDetails | null,
  flameType: FlameType,
  rng: () => number,
): { lines: FlameLine[]; score: number; eligible: boolean } {
  if (!canReceiveBonusStats(equip)) {
    return { lines: [], score: 0, eligible: false }
  }

  const flameAdvantage = isFlameAdvantage(details)
  const kinds = [...poolFor(equip)]
  const lineCount = rollLineCount(rng, flameAdvantage)
  const lines: FlameLine[] = []

  while (lines.length < lineCount && kinds.length > 0) {
    const index = Math.floor(rng() * kinds.length)
    const kind = kinds.splice(index, 1)[0]
    lines.push(buildLine(kind, equip, randomTier(flameType, flameAdvantage, rng), rng))
  }

  return {
    lines,
    score: lines.reduce((sum, line) => sum + line.score, 0),
    eligible: true,
  }
}
