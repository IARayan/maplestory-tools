export function formatMeso(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2).replace(/\.?0+$/, '')}T`
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(Math.round(n))
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString()
}

export function formatMesoFull(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n).toLocaleString()} mesos`
}
