import { sectorConfig, sectorLabel } from '../game/sectors'
import { useGameStore } from '../game/store'
import { formatPoints } from './format'
import { Shop } from './Shop'

/**
 * Arrival screen after a wormhole jump: what the cleared sector paid, what the next one asks, the
 * upgrade shop, and launch (Enter).
 */
export function TransitPanel() {
  const clear = useGameStore((s) => (s.phase === 'transit' ? s.clear : null))
  const sector = useGameStore((s) => s.sector)
  const setPhase = useGameStore((s) => s.setPhase)
  if (!clear) return null

  const next = sectorConfig(sector)
  const prev = sectorConfig(clear.sector)
  const rows: [string, string][] = [
    ['WORMHOLE QUOTA', `◆ ${next.shardQuota}`],
    ['SCORE MULTIPLIER', `×${next.scoreMult.toFixed(2)}`],
    ['DEBRIS DENSITY', `×${next.debris.toFixed(2)}`],
    ['O₂ CONSUMPTION', `×${next.oxygenDrain.toFixed(2)}`],
    ['PLANETS', `${next.planets}`],
  ]

  return (
    <div className="panel-screen transit">
      <div className="transit-title">SECTOR {clear.sector + 1} CLEARED</div>
      <div className="transit-sub">{prev.name}</div>
      <div className="transit-columns">
        <div className="panel-stats">
          <div className="panel-row">
            <span className="hud-label">SHARDS COLLECTED</span>
            <span>◆ {clear.collected}</span>
          </div>
          <div className="panel-row">
            <span className="hud-label">CLEAR BONUS</span>
            <span>+{formatPoints(clear.bonusPoints)}</span>
          </div>
          <div className="panel-row">
            <span className="hud-label">BONUS SHARDS</span>
            <span>+◆ {clear.bonusShards}</span>
          </div>
          <div className="panel-row">
            <span className="hud-label">TANKS &amp; HULL</span>
            <span>restored</span>
          </div>
        </div>
        <div className="panel-stats panel-next">
          <div className="panel-next-title">NEXT · {sectorLabel(sector)}</div>
          {rows.map(([label, value]) => (
            <div key={label} className="panel-row">
              <span className="hud-label">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <Shop />
      <div className="panel-actions">
        <button
          type="button"
          className="panel-button"
          onClick={(e) => {
            e.currentTarget.blur()
            setPhase('playing')
          }}
        >
          LAUNCH
        </button>
        <span>
          <kbd>Enter</kbd> launch
        </span>
        <span>
          <kbd>1–8</kbd> buy
        </span>
      </div>
    </div>
  )
}
