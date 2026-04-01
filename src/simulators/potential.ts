import type { Equipment } from '../data/equipment'

export type PotentialTier = 'Rare' | 'Epic' | 'Unique' | 'Legendary'
export type CubeType = 'Glowing Cube' | 'Bright Cube'

export type PotentialLine = {
  label: string
  score: number
  prime: boolean
  tier: PotentialTier
}

export type PotentialResult = {
  tier: PotentialTier
  lines: PotentialLine[]
  score: number
  eligible: boolean
}

export type CubeMeta = {
  cost: number
  itemId: number
  iconUrl: string
  keepChoice: boolean
  extraPrimeChance2: number
  extraPrimeChance3: number
  tierUpChance: Record<'Rare' | 'Epic' | 'Unique', number>
}

type WeightedLine = {
  weight: number
  build: (equip: Equipment, level: number, prime: boolean, rng: () => number) => PotentialLine
}

const CUBE_META: Record<CubeType, CubeMeta> = {
  'Glowing Cube': {
    cost: 12_000_000,
    itemId: 5062028,
    iconUrl: 'https://maplestory.io/api/GMS/245/item/5062028/icon',
    keepChoice: false,
    extraPrimeChance2: 0.04,
    extraPrimeChance3: 0.01,
    tierUpChance: {
      Rare: 0.06,
      Epic: 0.018,
      Unique: 0.003,
    },
  },
  'Bright Cube': {
    cost: 22_000_000,
    itemId: 5062029,
    iconUrl: 'https://maplestory.io/api/GMS/245/item/5062029/icon',
    keepChoice: true,
    extraPrimeChance2: 0.12,
    extraPrimeChance3: 0.04,
    tierUpChance: {
      Rare: 0.15,
      Epic: 0.035,
      Unique: 0.01,
    },
  },
}

const MAIN_STATS = ['STR', 'DEX', 'INT', 'LUK'] as const

function randomStat(rng: () => number): (typeof MAIN_STATS)[number] {
  return MAIN_STATS[Math.floor(rng() * MAIN_STATS.length)]
}

function rankIndex(tier: PotentialTier): number {
  switch (tier) {
    case 'Rare':
      return 0
    case 'Epic':
      return 1
    case 'Unique':
      return 2
    case 'Legendary':
      return 3
  }
}

export function previousPotentialTier(tier: PotentialTier): PotentialTier {
  switch (tier) {
    case 'Legendary':
      return 'Unique'
    case 'Unique':
      return 'Epic'
    case 'Epic':
      return 'Rare'
    case 'Rare':
      return 'Rare'
  }
}

export function nextPotentialTier(tier: PotentialTier): PotentialTier {
  switch (tier) {
    case 'Rare':
      return 'Epic'
    case 'Epic':
      return 'Unique'
    case 'Unique':
      return 'Legendary'
    case 'Legendary':
      return 'Legendary'
  }
}

function statPercentPrime(level: number, tier: PotentialTier): number {
  const table = level >= 151 ? [4, 7, 10, 13] : level >= 71 ? [3, 6, 9, 12] : level >= 31 ? [2, 4, 6, 9] : [1, 2, 3, 6]
  return table[rankIndex(tier)]
}

function statPercentValue(level: number, tier: PotentialTier, prime: boolean): number {
  return statPercentPrime(level, prime ? tier : previousPotentialTier(tier))
}

export function canReceivePotential(equip: Equipment): boolean {
  return !['Pocket Item', 'Badge'].includes(equip.slot)
}

function isWeapon(equip: Equipment): boolean {
  return equip.category === 'Weapon'
}

function isAccessory(equip: Equipment): boolean {
  return equip.category === 'Accessory'
}

function isHeart(equip: Equipment): boolean {
  return equip.slot.includes('Heart')
}

function isGlove(equip: Equipment): boolean {
  return equip.slot.includes('Glove')
}

function canRollDropMeso(equip: Equipment): boolean {
  return isAccessory(equip) && !isHeart(equip) && !equip.slot.includes('Pocket')
}

function linePoolFor(equip: Equipment, tier: PotentialTier): WeightedLine[] {
  const pool: WeightedLine[] = [
    {
      weight: 40,
      build: (_equip, level, prime, rng) => {
        const stat = randomStat(rng)
        const value = statPercentValue(level, tier, prime)
        return {
          label: `${stat}: +${value}%`,
          score: value,
          prime,
            tier: prime ? tier : previousPotentialTier(tier),
        }
      },
    },
  ]

  if (!isWeapon(equip)) {
    pool.push(
      {
        weight: 14,
        build: (_equip, level, prime) => {
          const value = Math.max(1, statPercentValue(level, tier, prime) - 3)
          return {
            label: `All Stats: +${value}%`,
            score: value * 1.7,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
      {
        weight: 16,
        build: (_equip, level, prime) => {
          const value = statPercentValue(level, tier, prime)
          return {
            label: `Max HP: +${value}%`,
            score: value * 0.45,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
    )
  }

  if (isWeapon(equip) || isHeart(equip)) {
    pool.push(
      {
        weight: 18,
        build: (_equip, level, prime) => {
          const value = statPercentValue(level, tier, prime)
          return {
            label: `ATT: +${value}%`,
            score: value * 1.2,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
      {
        weight: 18,
        build: (_equip, level, prime) => {
          const value = statPercentValue(level, tier, prime)
          return {
            label: `MATT: +${value}%`,
            score: value * 1.2,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
    )
  }

  if (isWeapon(equip) && (tier === 'Unique' || tier === 'Legendary')) {
    pool.push(
      {
        weight: 14,
        build: (_equip, _level, prime, rng) => {
          const value =
            tier === 'Legendary' ? (prime || rng() < 0.5 ? 40 : 35) : 30
          return {
            label: `Boss Damage: +${value}%`,
            score: value * 0.7,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
      {
        weight: 14,
        build: (_equip, _level, prime, rng) => {
          const value =
            tier === 'Legendary' ? (prime || rng() < 0.5 ? 40 : 35) : 30
          return {
            label: `Ignore DEF: +${value}%`,
            score: value * 0.65,
            prime,
            tier: prime ? tier : previousPotentialTier(tier),
          }
        },
      },
    )
  }

  if (canRollDropMeso(equip) && tier === 'Legendary') {
    pool.push(
      {
        weight: 8,
        build: (_equip, _level, prime) => ({
          label: 'Meso Obtained: +20%',
          score: 10,
          prime,
          tier: prime ? tier : previousPotentialTier(tier),
        }),
      },
      {
        weight: 8,
        build: (_equip, _level, prime) => ({
          label: 'Item Drop Rate: +20%',
          score: 10,
          prime,
          tier: prime ? tier : previousPotentialTier(tier),
        }),
      },
    )
  }

  if (isGlove(equip) && tier === 'Legendary') {
    pool.push({
      weight: 6,
      build: (_equip, _level, prime) => ({
        label: 'Critical Rate: +8%',
        score: 4,
        prime,
        tier: prime ? tier : previousPotentialTier(tier),
      }),
    })
  }

  return pool
}

function pickWeighted<T>(items: { weight: number; value: T }[], rng: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rng() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return items[items.length - 1].value
}

export function getCubeMeta(cubeType: CubeType): CubeMeta {
  return CUBE_META[cubeType]
}

export function getCubeCost(cubeType: CubeType): number {
  return CUBE_META[cubeType].cost
}

function rollResultTier(
  currentTier: PotentialTier,
  cubeType: CubeType,
  rng: () => number,
): PotentialTier {
  let nextTier = currentTier
  const rates = getCubeMeta(cubeType).tierUpChance

  for (let i = 0; i < 2; i++) {
    if (nextTier === 'Legendary') break
    const chance = rates[nextTier as 'Rare' | 'Epic' | 'Unique']
    if (rng() < chance) nextTier = nextPotentialTier(nextTier)
    else break
  }

  return nextTier
}

export function rollPotential(
  equip: Equipment,
  currentTier: PotentialTier,
  cubeType: CubeType,
  rng: () => number,
): PotentialResult {
  if (!canReceivePotential(equip)) {
    return { tier: currentTier, lines: [], score: 0, eligible: false }
  }

  const meta = getCubeMeta(cubeType)
  const resultTier = rollResultTier(currentTier, cubeType, rng)
  const pool = linePoolFor(equip, resultTier)
  const primeFlags = [
    true,
    rng() < meta.extraPrimeChance2,
    rng() < meta.extraPrimeChance3,
  ]

  const lines = primeFlags.map((prime) =>
    pickWeighted(
      pool.map((entry) => ({
        weight: entry.weight,
        value: entry.build(equip, equip.level, prime, rng),
      })),
      rng,
    ),
  )

  return {
    tier: resultTier,
    lines,
    score: lines.reduce((sum, line) => sum + line.score, 0),
    eligible: true,
  }
}
