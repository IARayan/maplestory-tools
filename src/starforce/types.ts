export type EnhanceOutcome =
  | 'success'
  | 'fail_stay'
  | 'destroy'

export type RunLogEntry = {
  outcome: EnhanceOutcome
  starsAfter: number
  mesoThisAttempt: number
}

export type SimulationRunResult = {
  totalMeso: number
  attempts: number
  successes: number
  fails: number
  booms: number
}
