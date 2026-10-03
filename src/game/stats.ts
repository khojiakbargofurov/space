import { RESOURCES, UPGRADES } from './constants'
import type { UpgradeLevels } from './types'

/**
 * The ship's effective numbers after permanent upgrades. Mutated in place by `applyUpgrades`; read
 * by flight, survival and the HUD.
 */
export const shipStats = {
  fuelMax: RESOURCES.FUEL_MAX as number,
  oxygenMax: RESOURCES.OXYGEN_MAX as number,
  hullMax: RESOURCES.HULL_MAX as number,
  /** Multipliers. */
  thrust: 1,
  fuelFlow: 1,
  tidalDamage: 1,
  heatDamage: 1,
  pickupReach: 1,
}

export function applyUpgrades(levels: UpgradeLevels): void {
  shipStats.fuelMax = RESOURCES.FUEL_MAX * (1 + levels.fuelTank * UPGRADES.fuelTank.perLevel)
  shipStats.oxygenMax = RESOURCES.OXYGEN_MAX * (1 + levels.oxygen * UPGRADES.oxygen.perLevel)
  shipStats.hullMax = RESOURCES.HULL_MAX * (1 + levels.hull * UPGRADES.hull.perLevel)
  shipStats.thrust = 1 + levels.thrust * UPGRADES.thrust.perLevel
  shipStats.fuelFlow = 1 - levels.injectors * UPGRADES.injectors.perLevel
  shipStats.tidalDamage = 1 - levels.tidal * UPGRADES.tidal.perLevel
  shipStats.heatDamage = 1 - levels.heat * UPGRADES.heat.perLevel
  shipStats.pickupReach = 1 + levels.collector * UPGRADES.collector.perLevel
}
