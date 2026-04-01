import { useEffect, useState } from 'react'
import {
  searchEquipment,
  type Equipment,
  type EquipmentCategory,
} from '../data/equipment'

type Props = {
  open: boolean
  onClose: () => void
  selected: Equipment | null
  onSelect: (e: Equipment) => void
}

const LEVEL_MIN = 100
const LEVEL_MAX = 250

export function EquipmentPicker({
  open,
  onClose,
  selected,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<EquipmentCategory | 'All'>('All')
  const [minL, setMinL] = useState(LEVEL_MIN)
  const [maxL, setMaxL] = useState(LEVEL_MAX)
  const [rows, setRows] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const found = await searchEquipment(query, category, minL, maxL)
        setRows(found)
      } catch {
        setRows([])
        setError('Live item search failed.')
      } finally {
        setLoading(false)
      }
    }, query.trim() ? 220 : 0)

    return () => window.clearTimeout(timeoutId)
  }, [category, maxL, minL, open, query])

  if (!open) return null

  return (
    <div className="picker-backdrop" role="dialog" aria-modal="true">
      <div className="picker-panel">
        <header className="picker-head">
          <div>
            <h2>Select equipment</h2>
            <p className="picker-sub">
              Live GMS item search via MapleStory.io. Real item names, real icons.
            </p>
          </div>
          <button type="button" className="picker-x" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="picker-filters">
          <input
            className="picker-search"
            placeholder="Search name, slot, level…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="picker-row">
            <label>
              Category
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as EquipmentCategory | 'All')
                }
              >
                <option value="All">All</option>
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Accessory">Accessory</option>
              </select>
            </label>
            <label>
              Level min
              <input
                type="number"
                min={LEVEL_MIN}
                max={maxL}
                value={minL}
                onChange={(e) =>
                  setMinL(Math.min(maxL, Math.max(LEVEL_MIN, +e.target.value)))
                }
              />
            </label>
            <label>
              Level max
              <input
                type="number"
                min={minL}
                max={LEVEL_MAX}
                value={maxL}
                onChange={(e) =>
                  setMaxL(Math.max(minL, Math.min(LEVEL_MAX, +e.target.value)))
                }
              />
            </label>
          </div>
        </div>

        <div className="picker-list-wrap">
          {loading && <p className="picker-status">Searching…</p>}
          {error && <p className="picker-status picker-error">{error}</p>}
          <ul className="picker-list">
            {rows.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={
                    selected?.id === e.id ? 'picker-item active' : 'picker-item'
                  }
                  onClick={() => {
                    onSelect(e)
                    onClose()
                  }}
                >
                  <img className="pi-icon" src={e.iconUrl} alt="" loading="lazy" />
                  <span className="pi-copy">
                  <span className="pi-name">{e.name}</span>
                  <span className="pi-meta">
                    Lv.{e.level} · {e.category} · {e.slot}
                  </span>
                  </span>
                  {e.isSuperior && <span className="pi-flag">Superior</span>}
                </button>
              </li>
            ))}
          </ul>
          {!loading && !error && rows.length === 0 && (
            <p className="picker-more">No matching equipment found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
