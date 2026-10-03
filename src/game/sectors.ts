import { ENDLESS, SECTORS } from './constants'
import { createRng } from './random'
import type { SectorConfig } from './types'

const LIST = SECTORS.LIST
const LAST = LIST[LIST.length - 1]
const cache = new Map<number, SectorConfig>()

function endlessSector(index: number): SectorConfig {
  const k = index - LIST.length + 1
  const rng = createRng(ENDLESS.SEED + index * 7919)
  const look = LIST[index % LIST.length]
  // A fresh band orientation: random unit vector, kept away from the disk plane so the band crosses the sky.
  const theta = rng() * Math.PI * 2
  const y = 0.35 + 0.6 * rng()
  const xz = Math.sqrt(1 - y * y)
  const pickups = (base: number) => Math.max(ENDLESS.PICKUP_MIN, base + k * ENDLESS.PICKUP_STEP)
  const [minPlanets, maxPlanets] = ENDLESS.PLANETS
  return {
    index,
    endless: true,
    name: `${ENDLESS.NAME} ${k}`,
    seed: Math.floor(rng() * 1e9),
    planets: minPlanets + Math.floor(rng() * (maxPlanets - minPlanets + 1)),
    shardQuota: Math.min(ENDLESS.QUOTA_MAX, LAST.shardQuota + k * ENDLESS.QUOTA_STEP),
    debris: Math.min(ENDLESS.DEBRIS_MAX, LAST.debris + k * ENDLESS.DEBRIS_STEP),
    fuel: pickups(LAST.fuel),
    oxygen: pickups(LAST.oxygen),
    shards: LAST.shards,
    oxygenDrain: Math.min(ENDLESS.OXYGEN_DRAIN_MAX, LAST.oxygenDrain + k * ENDLESS.OXYGEN_DRAIN_STEP),
    scoreMult: LAST.scoreMult + k * ENDLESS.SCORE_STEP,
    nebula: { ...look.nebula, seed: look.nebula.seed + 100 * rng(), bandNormal: [xz * Math.cos(theta), y, xz * Math.sin(theta)] },
    disk: look.disk,
  }
}

/**
 * Configuration of sector `index` (0-based): the hand-made list first, then endless generated sectors.
 * Deterministic and cached, so the same index always returns the same object.
 */
export function sectorConfig(index: number): SectorConfig {
  let cfg = cache.get(index)
  if (!cfg) {
    cfg = index < LIST.length ? { ...LIST[index], index, endless: false } : endlessSector(index)
    cache.set(index, cfg)
  }
  return cfg
}

/** "SECTOR 3 · THE QUIET FOLD" style label. */
export function sectorLabel(index: number): string {
  return `SECTOR ${index + 1} · ${sectorConfig(index).name.toUpperCase()}`
}
