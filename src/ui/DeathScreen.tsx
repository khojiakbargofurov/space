import { DEATH } from '../game/constants'
import { useGameStore } from '../game/store'
import type { DeathCause } from '../game/types'
import { formatClock, formatDuration, formatPoints } from './format'

const EPITAPHS: Record<DeathCause, { title: string; line: string }> = {
  spaghettified: { title: 'SPAGHETTIFIED', line: 'Tidal forces drew the hull out into a thread of atoms.' },
  incinerated: { title: 'INCINERATED', line: 'The accretion disk burned through the hull.' },
  destroyed: { title: 'HULL BREACH', line: 'The ship broke apart on impact.' },
  suffocated: { title: 'LIFE SUPPORT FAILED', line: 'The oxygen ran out. The ship drifts on, silent.' },
}

/** End-of-run summary, faded in after the death sequence has had a moment to play. */
export function DeathScreen() {
  const death = useGameStore((s) => (s.phase === 'dead' ? s.death : null))
  const bank = useGameStore((s) => s.bank)
  if (!death) return null
  const { title, line } = EPITAPHS[death.cause]

  const rows: [string, string][] = [
    ['SCORE', formatPoints(death.score)],
    ['SECTOR', `${death.sector + 1} · ${death.sectorName}`],
    ['CHRONO SHARDS', `${death.shards} (◆ ${bank} banked)`],
    ['SHIP TIME', formatClock(death.shipTime)],
    ['UNIVERSE TIME', formatClock(death.universeTime)],
    ['TIME DEBT', `+${formatDuration(death.universeTime - death.shipTime)}`],
    ['PEAK DILATION', `×${death.peakDilation.toFixed(3)}`],
    ['DEEPEST', `${death.deepestRs.toFixed(2)} rs`],
  ]

  return (
    <div className="death" data-cause={death.cause} style={{ animationDelay: `${DEATH.SCREEN_DELAY}s` }}>
      <div className="death-title">{title}</div>
      <div className="death-line">{line}</div>
      <div className="death-stats">
        {rows.map(([label, value]) => (
          <div key={label} className="death-row">
            <span className="hud-label">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <div className="death-keys">
        <span><kbd>R</kbd> new run</span>
        <span><kbd>Enter</kbd> orbit view · upgrades</span>
      </div>
    </div>
  )
}
