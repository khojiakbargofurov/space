function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** hh:mm:ss.t (hours keep growing past 99). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const tenths = Math.floor((s * 10) % 10)
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}.${tenths}`
}

/** Short duration: "12.4 s", "3 m 07 s", "2 h 05 m". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds)
  if (s < 60) return `${s.toFixed(1)} s`
  if (s < 3600) return `${Math.floor(s / 60)} m ${pad2(Math.floor(s % 60))} s`
  return `${Math.floor(s / 3600)} h ${pad2(Math.floor((s % 3600) / 60))} m`
}

const pointsFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatPoints(n: number): string {
  return pointsFormat.format(Math.floor(n))
}

export function formatDistance(units: number): string {
  return units >= 1000 ? `${(units / 1000).toFixed(2)} ku` : `${units.toFixed(0)} u`
}
