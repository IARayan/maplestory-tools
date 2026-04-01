import { useCallback, useEffect, useState } from 'react'
import { searchEquipment, type Equipment } from '../data/equipment'
import {
  simulateUntilTarget,
  summarizeMonteCarlo,
  type BatchStats,
} from '../starforce/engine'
import { maxStarsForEquipment } from '../starforce/rates'
import { formatInt, formatMeso } from '../utils/format'

export function BatchCalculator() {
  const [equip, setEquip] = useState<Equipment | null>(null)
  const [equipQuery, setEquipQuery] = useState('Golden Clover Belt')
  const [matches, setMatches] = useState<Equipment[]>([])
  const [startStar, setStartStar] = useState(15)
  const [targetStar, setTargetStar] = useState(22)
  const [runs, setRuns] = useState(5000)
  const [stats, setStats] = useState<BatchStats | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const maxStars = equip ? maxStarsForEquipment(equip.level, equip.name) : 30

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      try {
        const found = await searchEquipment(equipQuery, 'All', 100, 250)
        setMatches(found.slice(0, 12))
        if (!equip && found[0]) {
          setEquip(found[0])
          setEquipQuery(found[0].name)
        }
      } catch {
        setMatches([])
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [equip, equipQuery])

  useEffect(() => {
    setStartStar((value) => Math.min(value, Math.max(0, maxStars - 1)))
    setTargetStar((value) => Math.min(Math.max(value, 1), maxStars))
  }, [maxStars])

  const run = useCallback(async () => {
    if (!equip) return
    if (targetStar <= startStar) return
    setRunning(true)
    setProgress(0)
    setStats(null)

    const results: ReturnType<typeof simulateUntilTarget>[] = []
    const chunk = 200
    const total = Math.max(1, Math.min(500_000, runs))

    for (let i = 0; i < total; i += chunk) {
      for (let j = 0; j < chunk && i + j < total; j++) {
        results.push(
          simulateUntilTarget(
            equip.level,
            equip.name,
            startStar,
            targetStar,
            Math.random,
          ),
        )
      }
      setProgress(Math.round(((i + chunk) / total) * 100))
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    }

    setStats(summarizeMonteCarlo(results))
    setProgress(100)
    setRunning(false)
  }, [equip, startStar, targetStar, runs])

  return (
    <div className="calc-wrap">
      <header className="calc-head">
        <h2>Monte Carlo calculator</h2>
        <p>
          Runs repeated Star Force journeys with current GMS-style no-downgrade
          rules for normal equipment and GMS trace recovery stars after boom.
        </p>
      </header>

      <div className="calc-grid">
        <label className="calc-full">
          Equipment lookup
          <input
            value={equipQuery}
            onChange={(e) => setEquipQuery(e.target.value)}
            placeholder="Type to filter…"
          />
          {loading && <span className="calc-inline-note">Searching…</span>}
          {equipQuery.trim() && (
            <ul className="calc-suggest">
              {matches.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="calc-sug-btn"
                    onClick={() => {
                      setEquip(e)
                      setEquipQuery(e.name)
                    }}
                  >
                    {e.name} <small>Lv.{e.level}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        {equip && (
          <div className="calc-pill calc-full">
            Selected: <strong>{equip.name}</strong> · Lv.{equip.level} · max{' '}
            {maxStars}★
          </div>
        )}
        {equip?.isSuperior && (
          <p className="calc-warn calc-full">
            Superior equipment is listed, but this calculator currently models
            normal-equipment rules only.
          </p>
        )}

        <label>
          Start ★
          <input
            type="number"
            min={0}
            max={Math.max(0, maxStars - 1)}
            value={startStar}
            onChange={(e) =>
              setStartStar(
                Math.min(Math.max(0, maxStars - 1), Math.max(0, +e.target.value)),
              )
            }
          />
        </label>
        <label>
          Target ★
          <input
            type="number"
            min={1}
            max={maxStars}
            value={targetStar}
            onChange={(e) =>
              setTargetStar(Math.min(maxStars, Math.max(1, +e.target.value)))
            }
          />
        </label>
        <label className="calc-full">
          Simulation runs (max 500k)
          <input
            type="number"
            min={100}
            max={500_000}
            step={100}
            value={runs}
            onChange={(e) =>
              setRuns(Math.min(500_000, Math.max(100, +e.target.value)))
            }
          />
        </label>

        <div className="calc-actions calc-full">
          <button
            type="button"
            className="calc-run"
            disabled={!equip || equip.isSuperior || running || targetStar <= startStar}
            onClick={run}
          >
            {running ? `Running… ${progress}%` : 'Run simulations'}
          </button>
        </div>
      </div>

      {targetStar <= startStar && (
        <p className="calc-warn">Target must be greater than start.</p>
      )}

      {stats && (
        <section className="calc-results">
          <h3>Aggregate results</h3>
          <p className="calc-results-note">
            Per <strong>finished</strong> run (reached target). Aborted runs:{' '}
            {stats.abortedRuns} (raise max steps in engine if non-zero).
          </p>
          <table className="calc-table">
            <tbody>
              <tr>
                <th>Mean meso per success</th>
                <td>{formatMeso(stats.meanMeso)}</td>
              </tr>
              <tr>
                <th>Median meso per success</th>
                <td>{formatMeso(stats.medianMeso)}</td>
              </tr>
              <tr>
                <th>Mean attempts per success</th>
                <td>{formatInt(stats.meanAttempts)}</td>
              </tr>
              <tr>
                <th>Median attempts per success</th>
                <td>{formatInt(stats.medianAttempts)}</td>
              </tr>
              <tr>
                <th>Mean booms per success</th>
                <td>{stats.meanBooms.toFixed(3)}</td>
              </tr>
              <tr>
                <th>Median booms per success</th>
                <td>{stats.medianBooms}</td>
              </tr>
            </tbody>
          </table>

          <h4>Totals across all attempts in all runs</h4>
          <table className="calc-table minor">
            <tbody>
              <tr>
                <th>Successes (sum)</th>
                <td>{formatInt(stats.totalSuccesses)}</td>
              </tr>
              <tr>
                <th>Fails (sum)</th>
                <td>{formatInt(stats.totalFails)}</td>
              </tr>
              <tr>
                <th>Booms (sum)</th>
                <td>{formatInt(stats.totalBooms)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
