import { UPGRADES } from './constants'
import { run } from './run'
import { applyUpgrades, shipStats } from './stats'
import { useGameStore } from './store'
import type { UpgradeId, UpgradeLevels } from './types'

/** Shard cost of the next level of `id`, or null when it is maxed out. */
export function upgradeCost(levels: UpgradeLevels, id: UpgradeId): number | null {
  const costs = UPGRADES[id].costs
  return levels[id] < costs.length ? costs[levels[id]] : null
}

/**
 * Buys the next level of `id` with banked shards. Takes effect at once: a bigger tank or hull in the
 * current run comes with the extra capacity filled. Returns false if maxed out or unaffordable.
 */
export function purchaseUpgrade(id: UpgradeId): boolean {
  const store = useGameStore.getState()
  const cost = upgradeCost(store.upgrades, id)
  if (cost === null || store.bank < cost) return false

  const fuelMax = shipStats.fuelMax
  const oxygenMax = shipStats.oxygenMax
  const hullMax = shipStats.hullMax
  const upgrades = { ...store.upgrades, [id]: store.upgrades[id] + 1 }
  applyUpgrades(upgrades)
  run.fuel += shipStats.fuelMax - fuelMax
  run.oxygen += shipStats.oxygenMax - oxygenMax
  run.hull += shipStats.hullMax - hullMax
  store.setUpgrades(upgrades, cost)
  return true
}
