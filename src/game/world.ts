import { SECTOR_CLEAR } from './constants'
import { generateRocks } from './debris'
import { generatePickups } from './pickups'
import { generatePlanets, planets, setPlanets } from './planets'
import { award, resetRun, run } from './run'
import { sectorConfig } from './sectors'
import { resetShip, ship } from './ship'
import { applyUpgrades, shipStats } from './stats'
import { useGameStore } from './store'
import type { Checkpoint } from './types'
import { resetWormhole } from './wormhole'

/**
 * Generates sector `index`'s world (planets, debris belts, pickups, a closed wormhole) at the current
 * universe time and points the run's sector fields at it. Deterministic per sector.
 */
export function loadSector(index: number): void {
  const cfg = sectorConfig(index)
  const t = run.worldTime
  setPlanets(generatePlanets(cfg.seed, cfg.planets), t)
  generateRocks(planets, cfg.debris, cfg.seed + 1, t)
  generatePickups({ fuel: cfg.fuel, oxygen: cfg.oxygen, shard: cfg.shards }, cfg.seed + 2, t)
  resetWormhole(cfg.seed + 3)
  run.sector = index
  run.sectorShards = 0
  run.shardQuota = cfg.shardQuota
  run.scoreMult = cfg.scoreMult
  run.oxygenDrain = cfg.oxygenDrain
  useGameStore.getState().setWorld(index)
}

function checkpoint(): Checkpoint {
  return {
    sector: run.sector,
    score: run.score,
    shards: run.shards,
    shipTime: run.shipTime,
    universeTime: run.universeTime,
    peakDilation: run.peakDilation,
    minR: run.minR,
  }
}

/**
 * The wormhole jump lands: the cleared sector pays its bonus (points at its multiplier, banked shards),
 * the next sector is generated, the ship waits at its spawn with topped-up tanks, the checkpoint is
 * saved and the game enters 'transit'.
 */
export function enterNextSector(): void {
  const cleared = run.sector
  const bonusPoints = award(SECTOR_CLEAR.POINTS + SECTOR_CLEAR.POINTS_PER_SECTOR * (cleared + 1))
  const bonusShards = SECTOR_CLEAR.SHARDS + SECTOR_CLEAR.SHARDS_PER_SECTOR * (cleared + 1)
  const collected = run.sectorShards
  const store = useGameStore.getState()
  store.bankShards(bonusShards)

  loadSector(cleared + 1)
  resetShip(ship)
  run.fuel = Math.max(run.fuel, shipStats.fuelMax * SECTOR_CLEAR.REFILL)
  run.oxygen = Math.max(run.oxygen, shipStats.oxygenMax * SECTOR_CLEAR.REFILL)
  run.hull = Math.max(run.hull, shipStats.hullMax * SECTOR_CLEAR.REFILL)
  run.tidalStress = 0
  run.heat = 0
  run.approaching = false
  run.approachMinR = Infinity
  run.closePassCooldown = 0
  run.hitCooldown = 0
  run.shake = 0
  run.flash = 0
  run.epoch++

  store.reachSector(checkpoint())
  store.arrive({ sector: cleared, collected, bonusPoints, bonusShards })
}

/** Abandons any run in progress: a fresh ship in sector 1, entering `phase`. */
export function startNewRun(phase: 'playing' | 'menu'): void {
  const store = useGameStore.getState()
  store.clearCheckpoint()
  loadSector(0)
  resetShip(ship)
  resetRun(planets)
  run.epoch++
  store.beginRun(phase)
}

/**
 * Boot: applies saved upgrades and either resumes the saved checkpoint (start of the sector the last
 * session reached) or sets up sector 1. Call once before the first render.
 */
export function initGame(): void {
  const store = useGameStore.getState()
  applyUpgrades(store.upgrades)
  const cp = store.checkpoint
  loadSector(cp ? cp.sector : 0)
  resetShip(ship)
  resetRun(planets)
  if (cp) {
    run.score = cp.score
    run.shards = cp.shards
    run.shipTime = cp.shipTime
    run.universeTime = cp.universeTime
    run.peakDilation = cp.peakDilation
    run.minR = cp.minR
  }
}
