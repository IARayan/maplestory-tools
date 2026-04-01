import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchEquipmentDetails,
  type Equipment,
  type EquipmentDetails,
} from '../data/equipment'
import { enhanceOneStep, getAttemptDisplayRates } from '../starforce/engine'
import type { EnhanceOutcome } from '../starforce/types'
import { mesoCostPerAttempt } from '../starforce/meso'
import { formatMeso, formatMesoFull } from '../utils/format'
import { EquipmentPicker } from './EquipmentPicker'
import { StarRow } from './StarRow'
import { maxStarsForEquipment, recoveredStarsAfterDestroy } from '../starforce/rates'
import { PotentialSimulatorPanel } from './PotentialSimulatorPanel'
import { BonusStatsSimulatorPanel } from './BonusStatsSimulatorPanel'
import type { PotentialLine, PotentialTier } from '../simulators/potential'
import type { FlameLine } from '../simulators/bonusStats'

type LogLine = {
  id: string
  outcome: EnhanceOutcome
  message: string
}

type SimMode = 'starforce' | 'bonus' | 'potential'

type CostBreakdown = {
  starforce: number
  bonus: number
  potential: number
}

type PotentialState = {
  tier: PotentialTier
  lines: PotentialLine[]
}

type ParsedStatSummary = {
  flat: {
    str: number
    dex: number
    int: number
    luk: number
    att: number
    matt: number
    hp: number
    damage: number
    boss: number
    speed: number
    jump: number
  }
  percent: {
    str: number
    dex: number
    int: number
    luk: number
    att: number
    matt: number
    allStat: number
    hp: number
    crit: number
    ignoreDef: number
    meso: number
    drop: number
  }
}

const OUTCOME_LABEL: Record<EnhanceOutcome, string> = {
  success: 'Enhancement success!',
  fail_stay: 'The Star Force did not increase…',
  destroy: 'Equipment destroyed. GMS trace restore assumed.',
}

function emptySummary(): ParsedStatSummary {
  return {
    flat: {
      str: 0,
      dex: 0,
      int: 0,
      luk: 0,
      att: 0,
      matt: 0,
      hp: 0,
      damage: 0,
      boss: 0,
      speed: 0,
      jump: 0,
    },
    percent: {
      str: 0,
      dex: 0,
      int: 0,
      luk: 0,
      att: 0,
      matt: 0,
      allStat: 0,
      hp: 0,
      crit: 0,
      ignoreDef: 0,
      meso: 0,
      drop: 0,
    },
  }
}

function applyLabel(summary: ParsedStatSummary, label: string): ParsedStatSummary {
  const next = emptySummary()
  next.flat = { ...summary.flat }
  next.percent = { ...summary.percent }
  const value = Number(label.match(/([+-]?\d+)/)?.[1] ?? 0)

  if (label.includes('/')) {
    const [left, right] = label.split(':')[0].split('/')
    if (left === 'STR' || right === 'STR') next.flat.str += value
    if (left === 'DEX' || right === 'DEX') next.flat.dex += value
    if (left === 'INT' || right === 'INT') next.flat.int += value
    if (left === 'LUK' || right === 'LUK') next.flat.luk += value
  } else if (label.startsWith('STR: +') && label.includes('%')) next.percent.str += value
  else if (label.startsWith('DEX: +') && label.includes('%')) next.percent.dex += value
  else if (label.startsWith('INT: +') && label.includes('%')) next.percent.int += value
  else if (label.startsWith('LUK: +') && label.includes('%')) next.percent.luk += value
  else if (label.startsWith('STR: +')) next.flat.str += value
  else if (label.startsWith('DEX: +')) next.flat.dex += value
  else if (label.startsWith('INT: +')) next.flat.int += value
  else if (label.startsWith('LUK: +')) next.flat.luk += value
  else if (label.startsWith('ATT: +')) {
    if (label.includes('%')) next.percent.att += value
    else next.flat.att += value
  } else if (label.startsWith('MATT: +')) {
    if (label.includes('%')) next.percent.matt += value
    else next.flat.matt += value
  } else if (label.startsWith('All Stats: +')) {
    next.percent.allStat += value
  } else if (label.startsWith('Max HP: +')) {
    if (label.includes('%')) next.percent.hp += value
    else next.flat.hp += value
  } else if (label.startsWith('Boss Damage: +')) {
    next.flat.boss += value
  } else if (label.startsWith('Damage: +')) {
    next.flat.damage += value
  } else if (label.startsWith('Speed: +')) {
    next.flat.speed += value
  } else if (label.startsWith('Jump: +')) {
    next.flat.jump += value
  } else if (label.startsWith('Critical Rate: +')) {
    next.percent.crit += value
  } else if (label.startsWith('Ignore DEF: +')) {
    next.percent.ignoreDef += value
  } else if (label.startsWith('Meso Obtained: +')) {
    next.percent.meso += value
  } else if (label.startsWith('Item Drop Rate: +')) {
    next.percent.drop += value
  }

  return next
}

export function StarForceSimulator() {
  const [mode, setMode] = useState<SimMode>('starforce')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [equip, setEquip] = useState<Equipment | null>(null)
  const [details, setDetails] = useState<EquipmentDetails | null>(null)
  const [detailsError, setDetailsError] = useState('')
  const [stars, setStars] = useState(0)
  const [costs, setCosts] = useState<CostBreakdown>({
    starforce: 0,
    bonus: 0,
    potential: 0,
  })
  const [starCatch, setStarCatch] = useState(false)
  const [safeguard, setSafeguard] = useState(false)
  const [flash, setFlash] = useState<'idle' | 'tap' | 'ok' | 'warn' | 'boom'>(
    'idle',
  )
  const [log, setLog] = useState<LogLine[]>([])
  const [potentialState, setPotentialState] = useState<PotentialState>({
    tier: 'Rare',
    lines: [],
  })
  const [bonusLines, setBonusLines] = useState<FlameLine[]>([])

  useEffect(() => {
    if (!equip) {
      setDetails(null)
      setDetailsError('')
      return
    }

    let cancelled = false
    fetchEquipmentDetails(equip.itemId)
      .then((data) => {
        if (!cancelled) {
          setDetails(data)
          setDetailsError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(null)
          setDetailsError('Failed to load item stats.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [equip])

  const maxStars = equip ? maxStarsForEquipment(equip.level, equip.name) : 30
  const totalItemCost = costs.starforce + costs.bonus + costs.potential
  const nextCost = equip
    ? mesoCostPerAttempt(equip.level, stars, safeguard)
    : 0
  const rates = getAttemptDisplayRates(stars, {
    starCatch,
    safeguard,
  })
  const nextStar = Math.min(maxStars, stars + 1)
  const recoveredStars = equip
    ? recoveredStarsAfterDestroy(stars, equip.name)
    : 12
  const potentialLines = potentialState.lines
  const parsedPotential = useMemo(
    () =>
      potentialLines.reduce(
        (summary, line) => applyLabel(summary, line.label),
        emptySummary(),
      ),
    [potentialLines],
  )
  const parsedBonus = useMemo(
    () =>
      bonusLines.reduce(
        (summary, line) => applyLabel(summary, line.label),
        emptySummary(),
      ),
    [bonusLines],
  )

  function addCost(kind: keyof CostBreakdown, amount: number): void {
    setCosts((prev) => ({
      ...prev,
      [kind]: prev[kind] + amount,
    }))
  }

  function enhance(): void {
    if (!equip || stars >= maxStars) return
    const step = enhanceOneStep(equip.level, equip.name, stars, Math.random, {
      starCatch,
      safeguard,
    })
    const spent = step.mesoThisAttempt
    addCost('starforce', spent)
    setStars(step.starsAfter)
    if (step.outcome === 'success') setFlash('ok')
    else if (step.outcome === 'destroy') setFlash('boom')
    else setFlash('warn')
    setTimeout(() => setFlash('idle'), 420)
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random()}`
    setLog((prev) => {
      const line: LogLine = {
        id,
        outcome: step.outcome,
        message: OUTCOME_LABEL[step.outcome],
      }
      return [line, ...prev].slice(0, 14)
    })
  }

  const handlePotentialChange = useCallback(
    (result: { tier: PotentialTier; lines: PotentialLine[] }) => {
      setPotentialState(result)
    },
    [],
  )

  return (
    <div className="sf-layout">
      <EquipmentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={equip}
        onSelect={(e) => {
          setEquip(e)
          setMode('starforce')
          setStars(0)
          setCosts({
            starforce: 0,
            bonus: 0,
            potential: 0,
          })
          setLog([])
          setPotentialState({
            tier: 'Rare',
            lines: [],
          })
          setBonusLines([])
          setStarCatch(false)
          setSafeguard(false)
        }}
      />

      <aside className="sf-nav">
        <div className="sf-nav-title">Enhance</div>
        <button
          type="button"
          className={mode === 'starforce' ? 'sf-nav-btn active' : 'sf-nav-btn'}
          onClick={() => setMode('starforce')}
        >
          Star Force
        </button>
        <button
          type="button"
          className={mode === 'bonus' ? 'sf-nav-btn active' : 'sf-nav-btn'}
          onClick={() => setMode('bonus')}
        >
          Bonus Stats
        </button>
        <button
          type="button"
          className={mode === 'potential' ? 'sf-nav-btn active' : 'sf-nav-btn'}
          onClick={() => setMode('potential')}
        >
          Potential
        </button>
        <button type="button" className="sf-nav-btn" disabled>
          Soul Weapon
        </button>
      </aside>

      <section
        className={`sf-panel ${flash !== 'idle' ? `flash-${flash}` : ''}`}
      >
        <header className="sf-panel-header">
          <h1>ITEM BUILDER</h1>
          <button
            type="button"
            className="sf-select-btn"
            onClick={() => setPickerOpen(true)}
          >
            {equip ? 'Change Equipment' : 'Choose Equipment'}
          </button>
        </header>

        <div className="sf-cost-banner">
          <div className="sf-cost-total">
            <span>Total Item Cost</span>
            <strong>{formatMesoFull(totalItemCost)}</strong>
          </div>
          <div className="sf-cost-breakdown">
            <span>Star Force: {formatMeso(costs.starforce)}</span>
            <span>Potential: {formatMeso(costs.potential)}</span>
            <span>Bonus Stats: {formatMeso(costs.bonus)}</span>
          </div>
        </div>

        <div className="sf-item-stage top">
          <div className="sf-item-frame">
            {equip ? (
              <img className="sf-item-art" src={equip.iconUrl} alt={equip.name} />
            ) : (
              <div className="sf-item-empty">Select an item</div>
            )}
          </div>
          <div className="sf-item-pill">
            {equip ? equip.name : 'No equipment selected'}
          </div>
          <div className="sf-item-window">
            <div className="sf-item-window-title">Current item window</div>
            <div className="sf-item-window-section">
              <span className="sf-window-label">Enhancements</span>
              <ul className="sf-window-list compact">
                <li>Star Force: {stars}★ / {maxStars}★</li>
                <li>Potential: {potentialState.tier}</li>
                <li>Bonus stat lines: {bonusLines.length || 0}</li>
              </ul>
            </div>
            <div className="sf-item-window-section">
              <span className="sf-window-label">Base stats</span>
              {details ? (
                <ul className="sf-window-list">
                  {details.baseStats.str > 0 && <li>STR +{details.baseStats.str}</li>}
                  {details.baseStats.dex > 0 && <li>DEX +{details.baseStats.dex}</li>}
                  {details.baseStats.int > 0 && <li>INT +{details.baseStats.int}</li>}
                  {details.baseStats.luk > 0 && <li>LUK +{details.baseStats.luk}</li>}
                  {details.baseStats.hp > 0 && <li>MaxHP +{details.baseStats.hp}</li>}
                  {details.baseStats.mp > 0 && <li>MaxMP +{details.baseStats.mp}</li>}
                  {details.baseStats.att > 0 && <li>ATT +{details.baseStats.att}</li>}
                  {details.baseStats.matt > 0 && <li>MATT +{details.baseStats.matt}</li>}
                  {details.baseStats.def > 0 && <li>Defense +{details.baseStats.def}</li>}
                  {details.baseStats.str === 0 &&
                    details.baseStats.dex === 0 &&
                    details.baseStats.int === 0 &&
                    details.baseStats.luk === 0 &&
                    details.baseStats.hp === 0 &&
                    details.baseStats.mp === 0 &&
                    details.baseStats.att === 0 &&
                    details.baseStats.matt === 0 &&
                    details.baseStats.def === 0 && <li>No flat base stats found.</li>}
                </ul>
              ) : (
                <div className="sf-rate-foot">
                  {equip ? detailsError || 'Loading item stats…' : 'Select an item first.'}
                </div>
              )}
            </div>
            <div className="sf-item-window-section">
              <span className="sf-window-label">Potential</span>
              <ul className="sf-window-list">
                {potentialLines.length > 0 ? (
                  potentialLines.map((line, index) => (
                    <li key={`${line.label}-${index}`}>
                      <span
                        className={`potential-rank-badge potential-rank-badge-${line.tier.toLowerCase()}`}
                      >
                        {line.tier.charAt(0)}
                      </span>
                      <span>{line.label}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span
                      className={`potential-rank-badge potential-rank-badge-${potentialState.tier.toLowerCase()}`}
                    >
                      {potentialState.tier.charAt(0)}
                    </span>
                    <span>No potential rolled yet.</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="sf-item-window-section">
              <span className="sf-window-label">Bonus stats</span>
              <ul className="sf-window-list">
                {bonusLines.length > 0 ? (
                  bonusLines.map((line, index) => <li key={`${line.label}-${index}`}>{line.label}</li>)
                ) : (
                  <li>No bonus stats rolled yet.</li>
                )}
              </ul>
            </div>
            <div className="sf-item-window-section">
              <span className="sf-window-label">Rolled totals</span>
              <ul className="sf-window-list compact">
                {parsedPotential.percent.str > 0 && (
                  <li>Potential STR +{parsedPotential.percent.str}%</li>
                )}
                {parsedPotential.percent.dex > 0 && (
                  <li>Potential DEX +{parsedPotential.percent.dex}%</li>
                )}
                {parsedPotential.percent.int > 0 && (
                  <li>Potential INT +{parsedPotential.percent.int}%</li>
                )}
                {parsedPotential.percent.luk > 0 && (
                  <li>Potential LUK +{parsedPotential.percent.luk}%</li>
                )}
                {parsedPotential.percent.allStat > 0 && (
                  <li>Potential All Stat +{parsedPotential.percent.allStat}%</li>
                )}
                {parsedPotential.percent.att > 0 && (
                  <li>Potential ATT +{parsedPotential.percent.att}%</li>
                )}
                {parsedPotential.percent.matt > 0 && (
                  <li>Potential MATT +{parsedPotential.percent.matt}%</li>
                )}
                {parsedPotential.flat.boss > 0 && (
                  <li>Potential Boss Damage +{parsedPotential.flat.boss}%</li>
                )}
                {parsedPotential.percent.ignoreDef > 0 && (
                  <li>Potential Ignore DEF +{parsedPotential.percent.ignoreDef}%</li>
                )}
                {parsedPotential.percent.meso > 0 && (
                  <li>Potential Meso +{parsedPotential.percent.meso}%</li>
                )}
                {parsedPotential.percent.drop > 0 && (
                  <li>Potential Drop Rate +{parsedPotential.percent.drop}%</li>
                )}
                {parsedBonus.flat.str > 0 && <li>Flame STR +{parsedBonus.flat.str}</li>}
                {parsedBonus.flat.dex > 0 && <li>Flame DEX +{parsedBonus.flat.dex}</li>}
                {parsedBonus.flat.int > 0 && <li>Flame INT +{parsedBonus.flat.int}</li>}
                {parsedBonus.flat.luk > 0 && <li>Flame LUK +{parsedBonus.flat.luk}</li>}
                {parsedBonus.flat.att > 0 && <li>Flame ATT +{parsedBonus.flat.att}</li>}
                {parsedBonus.flat.matt > 0 && <li>Flame MATT +{parsedBonus.flat.matt}</li>}
                {parsedBonus.percent.allStat > 0 && (
                  <li>Flame All Stat +{parsedBonus.percent.allStat}%</li>
                )}
                {parsedBonus.flat.boss > 0 && (
                  <li>Flame Boss Damage +{parsedBonus.flat.boss}%</li>
                )}
                {parsedBonus.flat.damage > 0 && (
                  <li>Flame Damage +{parsedBonus.flat.damage}%</li>
                )}
                {parsedBonus.flat.hp > 0 && <li>Flame MaxHP +{parsedBonus.flat.hp}</li>}
                {parsedBonus.flat.speed > 0 && <li>Flame Speed +{parsedBonus.flat.speed}</li>}
                {parsedBonus.flat.jump > 0 && <li>Flame Jump +{parsedBonus.flat.jump}</li>}
                {parsedPotential.percent.str === 0 &&
                  parsedPotential.percent.dex === 0 &&
                  parsedPotential.percent.int === 0 &&
                  parsedPotential.percent.luk === 0 &&
                  parsedPotential.percent.allStat === 0 &&
                  parsedPotential.percent.att === 0 &&
                  parsedPotential.percent.matt === 0 &&
                  parsedPotential.flat.boss === 0 &&
                  parsedPotential.percent.ignoreDef === 0 &&
                  parsedPotential.percent.meso === 0 &&
                  parsedPotential.percent.drop === 0 &&
                  parsedBonus.flat.str === 0 &&
                  parsedBonus.flat.dex === 0 &&
                  parsedBonus.flat.int === 0 &&
                  parsedBonus.flat.luk === 0 &&
                  parsedBonus.flat.att === 0 &&
                  parsedBonus.flat.matt === 0 &&
                  parsedBonus.percent.allStat === 0 &&
                  parsedBonus.flat.boss === 0 &&
                  parsedBonus.flat.damage === 0 &&
                  parsedBonus.flat.hp === 0 &&
                  parsedBonus.flat.speed === 0 &&
                  parsedBonus.flat.jump === 0 && <li>No rolled stats yet.</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="sf-mode-title">
          {mode === 'starforce'
            ? 'STARFORCE'
            : mode === 'bonus'
              ? 'BONUS STATS'
              : 'POTENTIAL'}
        </div>

        {mode === 'starforce' ? (
          <div className="sf-stars-panel">
            <StarRow stars={stars} max={maxStars} />
            <div className="sf-stars-transition">
              <span className="cur">★ {stars}</span>
              <span className="arrow">≫≫</span>
              <span className="next">★ {nextStar}</span>
            </div>
          </div>
        ) : (
          <div className="sf-mode-banner">
            {mode === 'potential'
              ? 'Cube the selected item and track the total spend.'
              : 'Roll bonus stats on the selected item and compare flame scores.'}
          </div>
        )}

        <div className="sf-info-grid">
          <section className="sf-info-card">
            <div className="sf-info-title">Attempt info</div>
            <div className="sf-stat-line">
              <span>Item</span>
              <strong>
                {equip ? `Lv.${equip.level} ${equip.slot}` : '—'}
              </strong>
            </div>
            <div className="sf-stat-line">
              <span>Max stars</span>
              <strong>{maxStars}★</strong>
            </div>
            {equip?.isSuperior && (
              <div className="sf-rate-foot">
                Superior equipment uses different failure behavior and is not
                simulated yet.
              </div>
            )}
            <div className="sf-stat-line">
              <span>Mode spend</span>
              <strong>
                {mode === 'starforce'
                  ? formatMesoFull(costs.starforce)
                  : mode === 'potential'
                    ? formatMesoFull(costs.potential)
                    : formatMesoFull(costs.bonus)}
              </strong>
            </div>
            <div className="sf-stat-line">
              <span>Next action cost</span>
              <strong>
                {mode === 'starforce' && equip
                  ? formatMesoFull(nextCost)
                  : mode === 'potential'
                    ? 'Varies by selected cube'
                    : 'Varies by selected flame'}
              </strong>
            </div>
          </section>

          <section className="sf-info-card">
            <div className="sf-info-title">
              {mode === 'starforce' ? 'Success rate' : 'Mode notes'}
            </div>
            {mode === 'starforce' ? (
              <>
                <div className="sf-rate-line">
                  <span>Success</span>
                  <strong>{rates.success.toFixed(2)}%</strong>
                </div>
                <div className="sf-rate-line">
                  <span>Failure</span>
                  <strong>{rates.failure.toFixed(2)}%</strong>
                </div>
                <div className="sf-rate-line">
                  <span>Destroy</span>
                  <strong>{rates.destroy.toFixed(2)}%</strong>
                </div>
                <div className="sf-rate-foot">
                  Boom recovery in current GMS resumes at ★{recoveredStars}.
                </div>
              </>
            ) : mode === 'potential' ? (
              <div className="sf-rate-foot">
                Cubes now reroll from the current item rank. Prime lines stay at
                the item rank, while extra lines roll one rank lower unless Rare.
              </div>
            ) : (
              <div className="sf-rate-foot">
                Roll flames to generate fresh bonus lines and compare flame score
                while total item cost keeps accumulating above.
              </div>
            )}
          </section>
        </div>

        {mode === 'starforce' ? (
          <>
            <div className="sf-toggle-row">
              <label className="sf-toggle">
                <span>Star Catching</span>
                <input
                  type="checkbox"
                  checked={starCatch}
                  onChange={(e) => setStarCatch(e.target.checked)}
                />
              </label>
              <label className="sf-toggle">
                <span>Safeguard</span>
                <input
                  type="checkbox"
                  checked={safeguard}
                  disabled={stars < 15 || stars > 17}
                  onChange={(e) => setSafeguard(e.target.checked)}
                />
              </label>
              <label className="sf-jump">
                Jump ★
                <input
                  type="number"
                  min={0}
                  max={maxStars}
                  value={stars}
                  disabled={!equip}
                  onChange={(e) =>
                    setStars(
                      Math.min(maxStars, Math.max(0, Math.round(+e.target.value))),
                    )
                  }
                />
              </label>
            </div>

            <div className="sf-bottom-row">
              <button
                type="button"
                className="sf-enhance"
                disabled={!equip || equip.isSuperior || stars >= maxStars}
                onClick={enhance}
              >
                <span className="sf-enhance-glow" />
                <span className="sf-enhance-label">Enhance</span>
              </button>

              <div className="sf-log">
                <div className="sf-log-title">Recent result</div>
                <ul className="sf-log-lines">
                  {log.length === 0 ? (
                    <li className="sf-log-empty">No attempts yet.</li>
                  ) : (
                    log.map((l) => (
                      <li key={l.id} className={`sf-log-line outcome-${l.outcome}`}>
                        {l.message}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : mode === 'potential' ? (
          <PotentialSimulatorPanel
            key={`potential-${equip?.id ?? 'none'}`}
            equip={equip}
            spent={costs.potential}
            onSpend={(amount) => addCost('potential', amount)}
            onPotentialChange={handlePotentialChange}
          />
        ) : (
          <BonusStatsSimulatorPanel
            key={`bonus-${equip?.id ?? 'none'}`}
            equip={equip}
            details={details}
            spent={costs.bonus}
            onSpend={(amount) => addCost('bonus', amount)}
            onLinesChange={setBonusLines}
          />
        )}
      </section>
    </div>
  )
}
