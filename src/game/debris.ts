import { Vector3 } from 'three'
import { DEBRIS, DEBRIS_LOOK } from './constants'
import { type Orbiter, createOrbiter, setOrbit, updateOrbiter } from './orbits'
import { type Planet, planets } from './planets'
import { createRng } from './random'

/** A rock in a debris belt. Shattered rocks respawn somewhere else in their belt. */
export interface Rock {
  belt: number
  orbit: Orbiter
  /** Collision radius. */
  size: number
  /** Model squash per axis (visual only). */
  aspect: Vector3
  spinAxis: Vector3
  /** Rad per universe second. */
  spin: number
  active: boolean
  respawnAt: number
}

const rng = createRng(DEBRIS.SEED)

function range([lo, hi]: readonly [number, number]): number {
  return lo + (hi - lo) * rng()
}

function aspect(): number {
  return DEBRIS_LOOK.MIN_ASPECT + (1 - DEBRIS_LOOK.MIN_ASPECT) * rng()
}

/** Rolls a belt orbit that stays clear of every planet's path. */
function rollOrbit(rock: Rock, planets: readonly Planet[]): void {
  const belt = DEBRIS.BELTS[rock.belt]
  let r = belt.radius
  for (let attempt = 0; attempt < 12; attempt++) {
    r = belt.radius + (rng() * 2 - 1) * belt.width
    let clear = true
    for (const p of planets) {
      if (Math.abs(r - p.orbitRadius) < p.radius * DEBRIS.PLANET_CLEARANCE + rock.size) clear = false
    }
    if (clear) break
  }
  setOrbit(rock.orbit, rng, r, belt.inclination)
}

export const rocks: Rock[] = []

export function generateRocks(planets: readonly Planet[]): void {
  rocks.length = 0
  DEBRIS.BELTS.forEach((belt, b) => {
    for (let i = 0; i < belt.count; i++) {
      const rock: Rock = {
        belt: b,
        orbit: createOrbiter(),
        size: range(DEBRIS.SIZE),
        aspect: new Vector3(aspect(), aspect(), aspect()),
        spinAxis: new Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(),
        spin: range(DEBRIS.SPIN),
        active: true,
        respawnAt: 0,
      }
      rollOrbit(rock, planets)
      rocks.push(rock)
    }
  })
}

/** Fresh belts for a new run (same rocks, new places). */
export function resetRocks(planets: readonly Planet[], worldTime: number): void {
  for (const r of rocks) {
    rollOrbit(r, planets)
    r.active = true
    updateOrbiter(r.orbit, worldTime)
  }
}

export function shatterRock(rock: Rock, worldTime: number): void {
  rock.active = false
  rock.respawnAt = worldTime + range(DEBRIS.RESPAWN)
}

/** Moves the rocks to universe time `worldTime`; shattered ones come back away from the ship. */
export function updateRocks(planets: readonly Planet[], worldTime: number, shipPos: Vector3): void {
  for (const r of rocks) {
    if (!r.active && worldTime >= r.respawnAt) {
      rollOrbit(r, planets)
      updateOrbiter(r.orbit, worldTime)
      if (r.orbit.position.distanceTo(shipPos) >= DEBRIS.SPAWN_CLEARANCE) r.active = true
    }
    updateOrbiter(r.orbit, worldTime)
  }
}

generateRocks(planets)

const _n = new Vector3()
const _rel = new Vector3()

/**
 * Ship vs rocks. On contact the ship is pushed out of the rock and bounces off its moving surface.
 * Returns the first rock hit this frame (or null) and writes the relative closing speed into `hit.speed`.
 * `timeScale` converts rock velocities (per universe second) to per ship second.
 */
export function collideRocks(pos: Vector3, vel: Vector3, shipRadius: number, timeScale: number, hit: { speed: number }): Rock | null {
  for (const r of rocks) {
    if (!r.active) continue
    _n.subVectors(pos, r.orbit.position)
    const minD = r.size + shipRadius
    const d2 = _n.lengthSq()
    if (d2 >= minD * minD) continue
    const d = Math.sqrt(d2)
    if (d > 1e-6) _n.divideScalar(d)
    else _n.set(0, 1, 0)
    pos.copy(r.orbit.position).addScaledVector(_n, minD)
    _rel.copy(vel).addScaledVector(r.orbit.velocity, -timeScale)
    const vn = _rel.dot(_n)
    if (vn < 0) vel.addScaledVector(_n, -vn * (1 + DEBRIS.BOUNCE))
    hit.speed = _rel.length()
    return r
  }
  return null
}
