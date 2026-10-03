import type { Vector3 } from 'three'
import { WORMHOLE } from './constants'
import { type Orbiter, createOrbiter, setOrbit, updateOrbiter } from './orbits'
import type { Planet } from './planets'
import { createRng } from './random'

/** The way out of the current sector. Closed until the shard quota is met. */
export const wormhole: {
  open: boolean
  orbit: Orbiter
  /** Seconds since it opened (drives the opening animation). */
  age: number
} = {
  open: false,
  orbit: createOrbiter(),
  age: 0,
}

let rng = createRng(1)

/** Closes the wormhole for a new sector; where it opens is deterministic per seed. */
export function resetWormhole(seed: number): void {
  rng = createRng(seed)
  wormhole.open = false
  wormhole.age = 0
}

/**
 * Opens the wormhole on a circular orbit, away from the ship and from planet orbits (best of a few
 * random tries if no spot satisfies both).
 */
export function openWormhole(worldTime: number, shipPos: Vector3, planets: readonly Planet[]): void {
  const [lo, hi] = WORMHOLE.ORBIT_R
  let bestScore = -Infinity
  let bestRadius: number = lo
  let bestState = 0
  for (let attempt = 0; attempt < 24; attempt++) {
    const state = Math.floor(rng() * 0xffffffff)
    const radius = lo + (hi - lo) * rng()
    setOrbit(wormhole.orbit, createRng(state), radius, WORMHOLE.MAX_INCLINATION)
    updateOrbiter(wormhole.orbit, worldTime)
    let planetGap = Infinity
    for (const p of planets) planetGap = Math.min(planetGap, Math.abs(radius - p.orbitRadius) - p.radius * WORMHOLE.PLANET_CLEARANCE)
    const shipGap = wormhole.orbit.position.distanceTo(shipPos) - WORMHOLE.MIN_SHIP_DISTANCE
    const score = Math.min(planetGap, shipGap)
    if (score > bestScore) {
      bestScore = score
      bestRadius = radius
      bestState = state
    }
    if (score >= 0) break
  }
  setOrbit(wormhole.orbit, createRng(bestState), bestRadius, WORMHOLE.MAX_INCLINATION)
  updateOrbiter(wormhole.orbit, worldTime)
  wormhole.open = true
  wormhole.age = 0
}

/** Moves the wormhole along universe time; `dt` (real seconds) ages the opening. */
export function updateWormhole(worldTime: number, dt: number): void {
  if (!wormhole.open) return
  wormhole.age += dt
  updateOrbiter(wormhole.orbit, worldTime)
}

/** 0..1 opening progress (smoothstep). */
export function wormholeOpening(): number {
  const t = Math.min(1, wormhole.age / WORMHOLE.OPEN_SEC)
  return t * t * (3 - 2 * t)
}

/** True when `pos` is inside the capture radius of an open (at least half open) wormhole. */
export function insideWormhole(pos: Vector3): boolean {
  if (!wormhole.open || wormhole.age < WORMHOLE.OPEN_SEC * 0.5) return false
  return wormhole.orbit.position.distanceToSquared(pos) < WORMHOLE.CAPTURE_RADIUS * WORMHOLE.CAPTURE_RADIUS
}
