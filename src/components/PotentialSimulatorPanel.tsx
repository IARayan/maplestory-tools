import { useEffect, useState } from 'react'
import type { Equipment } from '../data/equipment'
import {
  canReceivePotential,
  getCubeMeta,
  previousPotentialTier,
  rollPotential,
  type CubeType,
  type PotentialLine,
  type PotentialResult,
  type PotentialTier,
} from '../simulators/potential'
import { formatMesoFull } from '../utils/format'

type Props = {
  equip: Equipment | null
  spent: number
  onSpend: (amount: number) => void
  onPotentialChange: (result: { tier: PotentialTier; lines: PotentialLine[] }) => void
}

const TIERS: PotentialTier[] = ['Rare', 'Epic', 'Unique', 'Legendary']
const CUBES: CubeType[] = ['Glowing Cube', 'Bright Cube']

export function PotentialSimulatorPanel({
  equip,
  spent,
  onSpend,
  onPotentialChange,
}: Props) {
  const [tier, setTier] = useState<PotentialTier>('Rare')
  const [cubeType, setCubeType] = useState<CubeType>('Glowing Cube')
  const [current, setCurrent] = useState<PotentialResult | null>(null)
  const [pending, setPending] = useState<PotentialResult | null>(null)

  const cubeMeta = getCubeMeta(cubeType)
  const canRoll = Boolean(equip)
  const eligible = equip ? canReceivePotential(equip) : true
  const currentTier = current?.tier ?? tier
  const shownLines = current?.lines ?? []
  const shownScore = current?.score ?? 0

  useEffect(() => {
    setCurrent(null)
    setPending(null)
    setTier('Rare')
    onPotentialChange({ tier: 'Rare', lines: [] })
  }, [equip, onPotentialChange])

  function rollOnce(): void {
    if (!equip) return
    const result = rollPotential(equip, tier, cubeType, Math.random)
    if (!result.eligible) return

    onSpend(cubeMeta.cost)
    if (cubeMeta.keepChoice) {
      setPending(result)
    } else {
      setCurrent(result)
      setPending(null)
      setTier(result.tier)
      onPotentialChange({ tier: result.tier, lines: result.lines })
    }
  }

  function applyPending(): void {
    if (!pending) return
    setCurrent(pending)
    setTier(pending.tier)
    onPotentialChange({ tier: pending.tier, lines: pending.lines })
    setPending(null)
  }

  function keepCurrent(): void {
    setPending(null)
  }

  return (
    <div className="sim-subpanel">
      <div className="sim-controls">
        <label>
          Current Potential
          <select
            value={tier}
            onChange={(e) => {
              const nextTier = e.target.value as PotentialTier
              setTier(nextTier)
              setCurrent(null)
              setPending(null)
              onPotentialChange({ tier: nextTier, lines: [] })
            }}
          >
            {TIERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cube-choice-grid">
        {CUBES.map((value) => {
          const meta = getCubeMeta(value)
          return (
            <button
              key={value}
              type="button"
              className={cubeType === value ? 'cube-card active' : 'cube-card'}
              onClick={() => setCubeType(value)}
            >
              <img className="cube-card-icon" src={meta.iconUrl} alt={value} />
              <span className="cube-card-name">{value}</span>
              <span className="cube-card-cost">{formatMesoFull(meta.cost)}</span>
              <span className="cube-card-note">
                {value === 'Bright Cube'
                  ? 'Higher tier-up and double/triple-prime odds, plus apply/keep.'
                  : 'Standard reroll with lower tier-up and extra-prime odds.'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="sim-stats-grid">
        <div className="sf-info-card">
          <div className="sf-info-title">Cube info</div>
          <div className="sf-stat-line">
            <span>Current tier</span>
            <strong>{currentTier}</strong>
          </div>
          <div className="sf-stat-line">
            <span>Cube cost</span>
            <strong>{formatMesoFull(cubeMeta.cost)}</strong>
          </div>
          <div className="sf-stat-line">
            <span>Potential spend</span>
            <strong>{formatMesoFull(spent)}</strong>
          </div>
          <div className="sf-rate-foot">
            {cubeType === 'Bright Cube'
              ? 'Bright Cube lets you compare your current potential against the new roll before applying.'
              : 'Glowing Cube applies the new result immediately.'}
          </div>
          <div className="sf-rate-foot">
            Prime lines keep the item rank. Extra lines roll one tier lower:
            Legendary {'->'} Unique, Unique {'->'} Epic, Epic {'->'} Rare, Rare
            {'->'} Rare.
          </div>
          {!eligible && (
            <div className="sf-rate-foot danger">
              This equipment type cannot receive normal Potential.
            </div>
          )}
        </div>

        <div className={`sf-info-card potential-card potential-card-${currentTier.toLowerCase()}`}>
          <div className="sf-info-title">
            {pending ? 'Current Potential' : `${currentTier} Potential`}
          </div>
          <ul className="sim-lines">
            {shownLines.length > 0 ? (
              shownLines.map((line, index) => (
                <li key={`${line.label}-${index}`}>
                  <PotentialRankBadge tier={line.tier} />
                  <span>{line.label}</span>
                </li>
              ))
            ) : (
              <li>
                <PotentialRankBadge tier={currentTier} />
                <span>No applied potential yet.</span>
              </li>
            )}
          </ul>
          <div className="sf-stat-line">
            <span>Estimated score</span>
            <strong>{shownScore.toFixed(1)}</strong>
          </div>
        </div>
      </div>

      {pending && (
        <div className="cube-compare">
          <div className={`cube-compare-panel potential-card potential-card-${pending.tier.toLowerCase()}`}>
            <div className="sf-info-title">New Bright Cube Result</div>
            <ul className="sim-lines">
              {pending.lines.map((line, index) => (
                <li key={`${line.label}-${index}`}>
                  <PotentialRankBadge tier={line.tier} />
                  <span>{line.label}</span>
                </li>
              ))}
            </ul>
            <div className="sf-stat-line">
              <span>Result tier</span>
              <strong>{pending.tier}</strong>
            </div>
            <div className="sf-stat-line">
              <span>Estimated score</span>
              <strong>{pending.score.toFixed(1)}</strong>
            </div>
          </div>
          <div className="cube-actions">
            <button type="button" className="sim-action-btn primary" onClick={applyPending}>
              Apply New Result
            </button>
            <button type="button" className="sim-action-btn" onClick={keepCurrent}>
              Keep Previous
            </button>
          </div>
        </div>
      )}

      <div className="sim-bottom-row">
        <button
          type="button"
          className="sf-enhance"
          disabled={!canRoll || !eligible}
          onClick={rollOnce}
        >
          <span className="sf-enhance-glow" />
          <span className="sf-enhance-label">Cube</span>
        </button>
      </div>
    </div>
  )
}

function PotentialRankBadge({ tier }: { tier: PotentialTier }) {
  const label = tier.charAt(0)
  return (
    <span
      className={`potential-rank-badge potential-rank-badge-${tier.toLowerCase()}`}
      title={`${tier} line${tier !== 'Rare' ? ` (${previousPotentialTier(tier)} on non-prime rerolls)` : ''}`}
    >
      {label}
    </span>
  )
}
