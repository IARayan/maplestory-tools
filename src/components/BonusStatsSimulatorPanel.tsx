import { useState } from 'react'
import type { Equipment, EquipmentDetails } from '../data/equipment'
import {
  getFlameMeta,
  rollBonusStats,
  type FlameLine,
  type FlameType,
} from '../simulators/bonusStats'
import { formatMesoFull } from '../utils/format'

type Props = {
  equip: Equipment | null
  details: EquipmentDetails | null
  spent: number
  onSpend: (amount: number) => void
  onLinesChange: (lines: FlameLine[]) => void
}

const FLAMES: FlameType[] = ['Powerful Flame', 'Eternal Flame']

export function BonusStatsSimulatorPanel({
  equip,
  details,
  spent,
  onSpend,
  onLinesChange,
}: Props) {
  const [flameType, setFlameType] = useState<FlameType>('Powerful Flame')
  const [lines, setLines] = useState<FlameLine[]>([])
  const [score, setScore] = useState(0)

  const flameMeta = getFlameMeta(flameType)
  const canRoll = Boolean(equip)
  const eligible = equip
    ? rollBonusStats(equip, details, flameType, Math.random).eligible
    : true

  function rollOnce(): void {
    if (!equip) return
    const result = rollBonusStats(equip, details, flameType, Math.random)
    if (!result.eligible) return
    setLines(result.lines)
    setScore(result.score)
    onLinesChange(result.lines)
    onSpend(flameMeta.cost)
  }

  return (
    <div className="sim-subpanel">
      <div className="cube-choice-grid">
        {FLAMES.map((value) => {
          const meta = getFlameMeta(value)
          return (
            <button
              key={value}
              type="button"
              className={flameType === value ? 'cube-card active' : 'cube-card'}
              onClick={() => setFlameType(value)}
            >
              <img className="cube-card-icon" src={meta.iconUrl} alt={value} />
              <span className="cube-card-name">{value}</span>
              <span className="cube-card-cost">{formatMesoFull(meta.cost)}</span>
              <span className="cube-card-note">
                {value === 'Eternal Flame'
                  ? 'Higher flame tiers. Better odds for stronger lines.'
                  : 'Lower-cost reroll for bonus stats.'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="sim-stats-grid">
        <div className="sf-info-card">
          <div className="sf-info-title">Flame info</div>
          <div className="sf-stat-line">
            <span>Flame cost</span>
            <strong>{formatMesoFull(flameMeta.cost)}</strong>
          </div>
          <div className="sf-stat-line">
            <span>Bonus stat spend</span>
            <strong>{formatMesoFull(spent)}</strong>
          </div>
          <div className="sf-rate-foot">
            Lines are random and item-type-aware. Weapon-only lines like Boss
            Damage and Damage no longer appear on armor/accessories.
          </div>
          {!eligible && (
            <div className="sf-rate-foot danger">
              This equipment type cannot receive bonus stats from flames.
            </div>
          )}
        </div>

        <div className="sf-info-card">
          <div className="sf-info-title">Bonus stats</div>
          <ul className="sim-lines">
            {lines.length > 0 ? (
              lines.map((line, index) => <li key={`${line.label}-${index}`}>{line.label}</li>)
            ) : (
              <li>No applied bonus stats yet.</li>
            )}
          </ul>
          <div className="sf-stat-line">
            <span>Estimated flame score</span>
            <strong>{score.toFixed(1)}</strong>
          </div>
        </div>
      </div>

      <div className="sim-bottom-row">
        <button
          type="button"
          className="sf-enhance"
          disabled={!canRoll || !eligible}
          onClick={rollOnce}
        >
          <span className="sf-enhance-glow" />
          <span className="sf-enhance-label">Flame</span>
        </button>
      </div>
    </div>
  )
}
