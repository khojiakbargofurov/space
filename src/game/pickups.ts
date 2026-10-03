import type { Vector3 } from 'three'
import { PICKUPS } from './constants'
import { type Orbiter, createOrbiter, setOrbit, updateOrbiter } from './orbits'
import { createRng } from './random'
import type { PickupKind } from './types'

/** A collectible on its own orbit. Collected pickups wait out a respawn delay, then reappear elsewhere. */
export interface Pickup {
  kind: PickupKind
  orbit: Orbiter
  active: boolean
  /** World time at which an inactive pickup tries to reappear. */
  respawnAt: number
  /** Per-pickup spin offset so neighbours don't rotate in lockstep. */
  spinPhase: number
}

export const PICKUP_KINDS: readonly PickupKind[] = ['fuel', 'oxygen', 'shard']

let rng = createRng(1)

function rollOrbit(p: Pickup): void {
  const cfg = PICKUPS[p.kind]
  setOrbit(p.orbit, rng, cfg.MIN_R + (cfg.MAX_R - cfg.MIN_R) * rng(), cfg.MAX_INCLINATION)
}

/** Every pickup of the current sector, grouped by kind in PICKUP_KINDS order. */
export const pickups: Pickup[] = []
/** First index and count of each kind inside `pickups`. */
export const pickupRange: Record<PickupKind, { start: number; count: number }> = {
  fuel: { start: 0, count: 0 },
  oxygen: { start: 0, count: 0 },
  shard: { start: 0, count: 0 },
}

/**
 * New pickups for a sector: PICKUPS[kind].COUNT scaled by `density[kind]` (at least one of each),
 * deterministic per seed.
 */
export function generatePickups(density: Record<PickupKind, number>, seed: number, worldTime: number): void {
  rng = createRng(seed)
  pickups.length = 0
  for (const kind of PICKUP_KINDS) {
    const count = Math.max(1, Math.round(PICKUPS[kind].COUNT * density[kind]))
    pickupRange[kind].start = pickups.length
    pickupRange[kind].count = count
    for (let i = 0; i < count; i++) {
      const p: Pickup = { kind, orbit: createOrbiter(), active: true, respawnAt: 0, spinPhase: rng() * Math.PI * 2 }
      rollOrbit(p)
      updateOrbiter(p.orbit, worldTime)
      pickups.push(p)
    }
  }
}

/** Marks a pickup collected; it comes back after its kind's respawn delay (universe seconds). */
export function collectPickup(p: Pickup, worldTime: number): void {
  const [lo, hi] = PICKUPS[p.kind].RESPAWN
  p.active = false
  p.respawnAt = worldTime + lo + (hi - lo) * rng()
}

/**
 * Moves every pickup to universe time `worldTime` and brings back those whose delay is over,
 * on a new orbit away from the ship (allocation-free).
 */
export function updatePickups(worldTime: number, shipPos: Vector3): void {
  for (const p of pickups) {
    if (!p.active && worldTime >= p.respawnAt) {
      rollOrbit(p)
      updateOrbiter(p.orbit, worldTime)
      if (p.orbit.position.distanceTo(shipPos) >= PICKUPS.SPAWN_CLEARANCE) p.active = true
    }
    updateOrbiter(p.orbit, worldTime)
  }
}

/** Nearest active pickup of `kind` to `pos`, or null. */
export function nearestPickup(kind: PickupKind, pos: Vector3): Pickup | null {
  const { start, count } = pickupRange[kind]
  let best: Pickup | null = null
  let bestD = Infinity
  for (let i = start; i < start + count; i++) {
    const p = pickups[i]
    if (!p.active) continue
    const d = p.orbit.position.distanceToSquared(pos)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}
