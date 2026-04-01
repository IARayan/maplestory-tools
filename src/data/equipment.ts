export type EquipmentCategory = 'Weapon' | 'Armor' | 'Accessory'

type MapleItemSearchResult = {
  id: number
  isCash: boolean
  name: string
  requiredGender?: number
  requiredJobs?: string[]
  requiredLevel?: number
  typeInfo?: {
    overallCategory?: string
    category?: string
    subCategory?: string
  }
}

export type Equipment = {
  id: string
  itemId: number
  name: string
  slot: string
  category: EquipmentCategory
  level: number
  iconUrl: string
  isSuperior: boolean
}

export type EquipmentStats = {
  str: number
  dex: number
  int: number
  luk: number
  att: number
  matt: number
  hp: number
  mp: number
  def: number
}

export type EquipmentDetails = {
  itemId: number
  description: string
  bossReward: boolean
  baseStats: EquipmentStats
}

const API_ROOT = 'https://maplestory.io/api/GMS/245'

const STARFORCEABLE_SLOTS = new Set([
  'Accessory',
  'Armor',
  'Weapon',
])

function isSuperiorEquipment(name: string): boolean {
  return (
    name.includes('Superior ') ||
    name.includes('Tyrant ') ||
    name.includes('Nova ') ||
    name.includes('Elite Heliseum ')
  )
}

function toEquipment(item: MapleItemSearchResult): Equipment | null {
  const typeInfo = item.typeInfo
  const category = typeInfo?.category
  const slot = typeInfo?.subCategory
  const level = item.requiredLevel ?? 0

  if (!typeInfo || !category || !slot) return null
  if (item.isCash) return null
  if (!STARFORCEABLE_SLOTS.has(category)) return null
  if (level <= 0) return null

  return {
    id: String(item.id),
    itemId: item.id,
    name: item.name,
    slot,
    category: category as EquipmentCategory,
    level,
    iconUrl: `${API_ROOT}/item/${item.id}/icon`,
    isSuperior: isSuperiorEquipment(item.name),
  }
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function getEquipmentCatalog(): Equipment[] {
  return []
}

export async function fetchEquipmentDetails(
  itemId: number,
): Promise<EquipmentDetails> {
  const response = await fetch(`${API_ROOT}/item/${itemId}`)
  if (!response.ok) {
    throw new Error(`Item detail lookup failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    description?: { description?: string }
    metaInfo?: Record<string, unknown>
  }
  const meta = data.metaInfo ?? {}

  return {
    itemId,
    description: data.description?.description ?? '',
    bossReward: Boolean(meta.bossReward),
    baseStats: {
      str: toNumber(meta.incSTR),
      dex: toNumber(meta.incDEX),
      int: toNumber(meta.incINT),
      luk: toNumber(meta.incLUK),
      att: toNumber(meta.incPAD),
      matt: toNumber(meta.incMAD),
      hp: toNumber(meta.incMHP),
      mp: toNumber(meta.incMMP),
      def: toNumber(meta.incPDD),
    },
  }
}

export async function searchEquipment(
  query: string,
  category: EquipmentCategory | 'All',
  minLevel: number,
  maxLevel: number,
): Promise<Equipment[]> {
  const params = new URLSearchParams({
    startPosition: '0',
    count: query.trim() ? '80' : '120',
    overallCategoryFilter: 'Equip',
    minLevelFilter: String(minLevel),
    maxLevelFilter: String(maxLevel),
  })

  if (query.trim()) {
    params.set('searchFor', query.trim())
  }

  if (category !== 'All') {
    params.set('categoryFilter', category)
  }

  const response = await fetch(`${API_ROOT}/item?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Item lookup failed: ${response.status}`)
  }

  const data = (await response.json()) as MapleItemSearchResult[]
  return data
    .map(toEquipment)
    .filter((item): item is Equipment => item !== null)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
}
