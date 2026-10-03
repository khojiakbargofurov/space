import { playSound } from '../audio/engine'
import { UPGRADE_ORDER, UPGRADES } from '../game/constants'
import { useGameStore } from '../game/store'
import type { UpgradeId } from '../game/types'
import { purchaseUpgrade, upgradeCost } from '../game/upgrades'

/** Buys the next level of `id` if affordable (with a chime). */
export function buyUpgrade(id: UpgradeId): void {
  if (purchaseUpgrade(id)) playSound('purchase')
}

/** Upgrade grid: one card per upgrade with its level pips and next cost. Keys 1–8 buy too. */
export function Shop() {
  const bank = useGameStore((s) => s.bank)
  const upgrades = useGameStore((s) => s.upgrades)

  return (
    <div className="shop">
      <div className="shop-head">
        <span className="hud-label">SHIP UPGRADES</span>
        <span className="shop-bank">
          <span className="hud-shard-icon">◆</span> {bank} banked
        </span>
      </div>
      <div className="shop-grid">
        {UPGRADE_ORDER.map((id, i) => {
          const spec = UPGRADES[id]
          const level = upgrades[id]
          const cost = upgradeCost(upgrades, id)
          return (
            <button
              key={id}
              type="button"
              className="shop-item"
              data-maxed={cost === null}
              disabled={cost === null || bank < cost}
              onClick={(e) => {
                buyUpgrade(id)
                // Drop focus so Enter (launch) doesn't re-press the button.
                e.currentTarget.blur()
              }}
            >
              <span className="shop-key">{i + 1}</span>
              <span className="shop-name">{spec.name}</span>
              <span className="shop-detail">{spec.detail}</span>
              <span className="shop-pips">
                {spec.costs.map((_, l) => (
                  <i key={l} className={l < level ? 'on' : ''} />
                ))}
              </span>
              <span className="shop-cost">{cost === null ? 'MAX' : `◆ ${cost}`}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
