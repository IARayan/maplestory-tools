import { mesoCostPerAttempt } from './meso'
import {
  getRates,
  maxStarsForEquipment,
  recoveredStarsAfterDestroy,
  rollEnhance,
} from './rates'
import type { EnhanceOutcome, RunLogEntry, SimulationRunResult } from './types'

export type AttemptResult = {
  outcome: EnhanceOutcome
  starsBefore: number
  starsAfter: number
  mesoSpent: number
}

export type EnhanceOptions = {
  starCatch?: boolean
  safeguard?: boolean
}

export function tryEnhance(
  equipLevel: number,
  itemName: string,
  stars: number,
  rng: () => number,
  options?: EnhanceOptions,
): AttemptResult {
  const mesoSpent = mesoCostPerAttempt(equipLevel, stars, options?.safeguard)
  const outcome = rollEnhance(stars, rng, options)
  const maxStars = maxStarsForEquipment(equipLevel, itemName)
  const starsAfter =
    outcome === 'success'
      ? Math.min(maxStars, stars + 1)
      : outcome === 'destroy'
        ? recoveredStarsAfterDestroy(stars, itemName)
        : stars

  return {
    outcome,
    starsBefore: stars,
    starsAfter,
    mesoSpent,
  }
}

const MAX_STEPS = 25_000_000

export function simulateUntilTarget(
  equipLevel: number,
  itemName: string,
  startStars: number,
  targetStars: number,
  rng: () => number,
  options?: EnhanceOptions,
): SimulationRunResult & { aborted: boolean } {
  const cap = maxStarsForEquipment(equipLevel, itemName)
  let stars = Math.min(cap, Math.max(0, startStars))
  const goal = Math.min(cap, Math.max(0, targetStars))
  let totalMeso = 0
  let attempts = 0
  let successes = 0
  let fails = 0
  let booms = 0

  while (stars < goal && attempts < MAX_STEPS) {
    attempts++
    const r = tryEnhance(equipLevel, itemName, stars, rng, options)
    totalMeso += r.mesoSpent
    if (r.outcome === 'success') successes++
    else if (r.outcome === 'destroy') {
      booms++
      fails++
    } else fails++
    stars = r.starsAfter
  }

  return {
    totalMeso,
    attempts,
    successes,
    fails,
    booms,
    aborted: stars < goal,
  }
}

export function enhanceOneStep(
  equipLevel: number,
  itemName: string,
  stars: number,
  rng: () => number,
  options?: EnhanceOptions,
): RunLogEntry {
  const mesoThisAttempt = mesoCostPerAttempt(equipLevel, stars, options?.safeguard)
  const outcome = rollEnhance(stars, rng, options)
  const maxStars = maxStarsForEquipment(equipLevel, itemName)
  const starsAfter =
    outcome === 'success'
      ? Math.min(maxStars, stars + 1)
      : outcome === 'destroy'
        ? recoveredStarsAfterDestroy(stars, itemName)
        : stars

  return {
    outcome,
    starsAfter,
    mesoThisAttempt,
  }
}

export function getAttemptDisplayRates(
  stars: number,
  options?: EnhanceOptions,
): { success: number; failure: number; destroy: number } {
  const rates = getRates(stars, options)
  return {
    success: rates.success,
    failure: rates.fail,
    destroy: rates.destroy,
  }
}

function medianSorted(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

export type BatchStats = {
  runs: number
  meanMeso: number
  medianMeso: number
  meanAttempts: number
  medianAttempts: number
  meanBooms: number
  medianBooms: number
  totalSuccesses: number
  totalFails: number
  totalBooms: number
  abortedRuns: number
}

export function summarizeMonteCarlo(
  results: (SimulationRunResult & { aborted: boolean })[],
): BatchStats {
  const finished = results.filter((r) => !r.aborted)
  const mesos = finished.map((r) => r.totalMeso).sort((a, b) => a - b)
  const attempts = finished.map((r) => r.attempts).sort((a, b) => a - b)
  const booms = finished.map((r) => r.booms).sort((a, b) => a - b)

  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length

  return {
    runs: results.length,
    meanMeso: mean(mesos),
    medianMeso: medianSorted(mesos),
    meanAttempts: mean(attempts),
    medianAttempts: medianSorted(attempts),
    meanBooms: mean(booms),
    medianBooms: medianSorted(booms),
    totalSuccesses: results.reduce((s, r) => s + r.successes, 0),
    totalFails: results.reduce((s, r) => s + r.fails, 0),
    totalBooms: results.reduce((s, r) => s + r.booms, 0),
    abortedRuns: results.filter((r) => r.aborted).length,
  }
}
