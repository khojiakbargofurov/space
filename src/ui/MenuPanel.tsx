import { sectorLabel } from '../game/sectors'
import { useGameStore } from '../game/store'
import { formatPoints } from './format'
import { Shop } from './Shop'

/**
 * Orbit view card: current sector, shard bank and records, plus the upgrade shop (U). The full menus
 * arrive in stage 8.
 */
export function MenuPanel() {
  const menu = useGameStore((s) => s.phase === 'menu')
  const sector = useGameStore((s) => s.sector)
  const bank = useGameStore((s) => s.bank)
  const bestScore = useGameStore((s) => s.bestScore)
  const bestSector = useGameStore((s) => s.bestSector)
  const shopOpen = useGameStore((s) => s.shopOpen)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  if (!menu) return null

  return (
    <>
      <div className="menu-card">
        <div className="menu-title">EVENT HORIZON</div>
        <div className="menu-sector">{sectorLabel(sector)}</div>
        <div className="menu-row">
          <span className="hud-shard-icon">◆</span> {bank} banked
        </div>
        <div className="menu-row menu-dim">
          best {formatPoints(bestScore)} · deepest sector {bestSector + 1}
        </div>
        <div className="menu-keys">
          <span>
            <kbd>Enter</kbd> launch
          </span>
          <span>
            <kbd>U</kbd> upgrades
          </span>
          <span>
            <kbd>N</kbd> new run
          </span>
        </div>
      </div>
      {shopOpen && (
        <div className="panel-screen menu-shop">
          <Shop />
          <div className="panel-actions">
            <button
              type="button"
              className="panel-button"
              onClick={(e) => {
                e.currentTarget.blur()
                setShopOpen(false)
              }}
            >
              CLOSE
            </button>
            <span>
              <kbd>U</kbd> / <kbd>Esc</kbd> close
            </span>
            <span>
              <kbd>1–8</kbd> buy
            </span>
          </div>
        </div>
      )}
    </>
  )
}
