import { Quaternion, Vector3 } from 'three'
import { BLACK_HOLE, PLANET_LOOK, PLANET_NAMES, PLANETS, SHIP } from './constants'
import { createRng } from './random'
import type { PlanetKind } from './types'

/**
 * A planet on a circular orbit around the hole. Static fields are fixed at generation;
 * `position`, `velocity` and the slingshot fields are mutated in place every frame.
 */
export interface Planet {
  name: string
  kind: PlanetKind
  radius: number
  /** Gravitational parameter: surfaceGravity * radius^2. */
  gm: number
  /** Sphere of influence: full gravity inside, fading to zero at soi * GRAVITY_FADE; slingshot tracking radius. */
  soi: number
  orbitRadius: number
  /** Angular speed (rad per universe second), Keplerian around the hole. */
  omega: number
  phase: number
  /** Orthonormal basis of the orbital plane: p = R (cos θ e1 + sin θ e2). */
  e1: Vector3
  e2: Vector3
  /** Axial tilt applied to the spin axis (and the ring plane). */
  tilt: Quaternion
  /** Self-rotation (rad per universe second). */
  spin: number
  /** sRGB hex palette: [base, highlight, detail, cap/accent]. */
  palette: readonly [string, string, string, string]
  atmosphere: string
  rings: boolean
  /** Per-planet noise offset so worlds of the same kind look different. */
  seed: number

  position: Vector3
  /** World velocity in units per UNIVERSE second. */
  velocity: Vector3
  /** Spin angle at the current universe time. */
  rotation: number
  /** True while the ship is inside the sphere of influence. */
  inSoi: boolean
  /** Speed the ship gained from this planet's pull during the current pass (can be negative). */
  assist: number
  /** The ship touched the surface during this pass, so it can't score as a slingshot. */
  passVoid: boolean
}

const KINDS: readonly PlanetKind[] = ['rocky', 'gas', 'ice', 'lava']

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

function range(rng: () => number, [lo, hi]: readonly [number, number]): number {
  return lo + (hi - lo) * rng()
}

function pickKind(rng: () => number): PlanetKind {
  const w = PLANETS.KIND_WEIGHTS
  const total = KINDS.reduce((a, k) => a + w[k], 0)
  let x = rng() * total
  for (const k of KINDS) {
    x -= w[k]
    if (x <= 0) return k
  }
  return 'rocky'
}

function makeName(rng: () => number, index: number): string {
  const n = 2 + (rng() < 0.3 ? 1 : 0)
  let s = ''
  for (let i = 0; i < n; i++) s += pick(rng, PLANET_NAMES.SYLLABLES)
  const numeral = PLANET_NAMES.NUMERALS[index % PLANET_NAMES.NUMERALS.length]
  return `${s[0].toUpperCase()}${s.slice(1)} ${numeral}`
}

/** Builds a system of `count` planets for a seed (deterministic). Orbits never cross the spawn radius. */
export function generatePlanets(seed: number, count: number): Planet[] {
  const rng = createRng(seed)
  const spawnR = new Vector3(...SHIP.SPAWN_POSITION).length()
  const yAxis = new Vector3(0, 1, 0)
  const planets: Planet[] = []
  let orbit = PLANETS.MIN_ORBIT

  for (let i = 0; i < count; i++) {
    // The second world is always a gas giant so every system has one big slingshot target.
    const kind = i === 1 ? 'gas' : pickKind(rng)
    const radius = range(rng, PLANETS.RADIUS[kind])
    const gm = range(rng, PLANETS.SURFACE_GRAVITY[kind]) * radius * radius
    const soi = radius * PLANETS.SOI_RADII
    // Keep the planet's pull away from the spawn orbit so the opening coast stays calm.
    const clearance = PLANETS.SPAWN_CLEARANCE + soi * PLANETS.GRAVITY_FADE
    if (Math.abs(orbit - spawnR) < clearance) orbit = spawnR + clearance

    // Orbit plane: start in the disk plane (y = 0), tilt by the inclination around a random node line.
    const node = rng() * Math.PI * 2
    const incl = (rng() * 2 - 1) * PLANETS.MAX_INCLINATION
    const q = new Quaternion().setFromAxisAngle(new Vector3(Math.cos(node), 0, -Math.sin(node)), incl)
    const e1 = new Vector3(Math.cos(node), 0, -Math.sin(node)).applyQuaternion(q)
    const e2 = new Vector3().crossVectors(yAxis.clone().applyQuaternion(q), e1).normalize()

    const tiltAxis = new Vector3(rng() * 2 - 1, 0, rng() * 2 - 1).normalize()
    const ringChance = kind === 'gas' ? PLANETS.GAS_RING_CHANCE : kind === 'ice' ? PLANETS.ICE_RING_CHANCE : 0

    planets.push({
      name: makeName(rng, i),
      kind,
      radius,
      gm,
      soi,
      orbitRadius: orbit,
      omega: Math.sqrt(BLACK_HOLE.MASS_GM / (orbit * orbit * orbit)),
      phase: rng() * Math.PI * 2,
      e1,
      e2,
      tilt: new Quaternion().setFromAxisAngle(tiltAxis, rng() * PLANETS.MAX_TILT),
      spin: PLANETS.SPIN_MIN + (PLANETS.SPIN_MAX - PLANETS.SPIN_MIN) * rng(),
      palette: pick<Planet['palette']>(rng, PLANET_LOOK.PALETTES[kind]),
      atmosphere: PLANET_LOOK.ATMO_COLORS[kind],
      rings: rng() < ringChance,
      seed: rng() * 100,
      position: new Vector3(),
      velocity: new Vector3(),
      rotation: 0,
      inSoi: false,
      assist: 0,
      passVoid: false,
    })

    orbit += PLANETS.ORBIT_GAP_MIN + (PLANETS.ORBIT_GAP_MAX - PLANETS.ORBIT_GAP_MIN) * rng() + radius
  }
  return planets
}

/** Moves every planet to its place at `universeTime` (allocation-free). */
export function updatePlanets(list: readonly Planet[], universeTime: number): void {
  for (const p of list) {
    const theta = p.phase + p.omega * universeTime
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    const r = p.orbitRadius
    p.position.copy(p.e1).multiplyScalar(r * c).addScaledVector(p.e2, r * s)
    const v = r * p.omega
    p.velocity.copy(p.e1).multiplyScalar(-v * s).addScaledVector(p.e2, v * c)
    p.rotation = (p.spin * universeTime) % (Math.PI * 2)
  }
}

/** The current sector's system (filled by loadSector; the array itself is kept, its contents replaced). */
export const planets: Planet[] = []

export function setPlanets(list: readonly Planet[], universeTime: number): void {
  planets.length = 0
  planets.push(...list)
  updatePlanets(planets, universeTime)
}
