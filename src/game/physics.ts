import { Vector3 } from 'three'
import { BLACK_HOLE, DANGER, DILATION, GRAVITY, PLANETS, SHIP } from './constants'
import type { Planet } from './planets'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS
const DANGER_R = DANGER.DANGER_RADIUS_RS * RS
const LETHAL_R = DANGER.LETHAL_RADIUS_RS * RS
const MIN_R = RS * (1 + DILATION.MIN_R_EPS)
const SOFT2 = GRAVITY.SOFTENING * GRAVITY.SOFTENING

/** Magnitude of gravitational acceleration at distance r: GM / (r^2 + soft^2), capped. */
export function gravityAccel(r: number): number {
  return Math.min(BLACK_HOLE.MASS_GM / (r * r + SOFT2), GRAVITY.MAX_ACCEL)
}

/**
 * Writes the gravitational acceleration vector at `pos` (black hole at origin) into `out`.
 * Allocation-free: safe to call inside useFrame.
 */
export function gravityVector(pos: Vector3, out: Vector3): Vector3 {
  const r = pos.length()
  if (r < 1e-6) return out.set(0, 0, 0)
  const a = gravityAccel(r)
  return out.copy(pos).multiplyScalar(-a / r)
}

const _d = new Vector3()
const _a = new Vector3()

/** 1 inside the sphere of influence, smoothly down to 0 at `reach`. */
function planetFade(d: number, soi: number, reach: number): number {
  if (d <= soi) return 1
  const t = (reach - d) / (reach - soi)
  return t * t * (3 - 2 * t)
}

/** Largest stable sub-step at `pos`: a fraction of the shortest local dynamical time (hole or nearby planet). */
function maxSubstep(pos: Vector3, planets: readonly Planet[]): number {
  const r = Math.max(pos.length(), BLACK_HOLE.SCHWARZSCHILD_RADIUS)
  let t = Math.sqrt((r * r * r) / BLACK_HOLE.MASS_GM)
  for (const p of planets) {
    const d = Math.max(p.position.distanceTo(pos), p.radius)
    if (d > p.soi) continue
    t = Math.min(t, Math.sqrt((d * d * d) / p.gm))
  }
  return GRAVITY.STEP_FACTOR * t
}

/**
 * Integrates `pos`/`vel` over `dt` (ship seconds) under a constant `thrust` acceleration plus gravity
 * from the hole and the planets (semi-implicit Euler, sub-stepped by the local dynamical time).
 * Planet gravity only reaches out to soi * GRAVITY_FADE (see PLANETS).
 * While inside a planet's sphere of influence, the speed that planet's pull adds is accumulated in
 * `planet.assist` (the slingshot gain). Planet surfaces are solid: the ship is pushed out and bounces,
 * which voids the current slingshot pass (resting on a surface would otherwise "gain" speed forever).
 * `timeScale` converts planet velocities (per universe second) to per ship second.
 * Writes the last gravitational acceleration into `gravityOut`. Returns true if a surface was touched.
 */
export function integrateFlight(
  pos: Vector3,
  vel: Vector3,
  thrust: Vector3,
  dt: number,
  planets: readonly Planet[],
  timeScale: number,
  gravityOut: Vector3,
): boolean {
  const n = Math.min(GRAVITY.MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / maxSubstep(pos, planets))))
  const h = dt / n
  let touched = false

  for (let i = 0; i < n; i++) {
    gravityVector(pos, gravityOut)
    const speed = vel.length()
    for (const p of planets) {
      _d.subVectors(p.position, pos)
      const d2 = _d.lengthSq()
      const reach = p.soi * PLANETS.GRAVITY_FADE
      if (d2 < 1e-6 || d2 > reach * reach) continue
      const d = Math.sqrt(d2)
      _a.copy(_d).multiplyScalar((p.gm / (d2 * d)) * planetFade(d, p.soi, reach))
      gravityOut.add(_a)
      if (d < p.soi && speed > 1e-4) p.assist += (_a.dot(vel) / speed) * h
    }
    vel.addScaledVector(gravityOut, h).addScaledVector(thrust, h)
    pos.addScaledVector(vel, h)

    for (const p of planets) {
      _d.subVectors(pos, p.position)
      const d = _d.length()
      const minD = p.radius + SHIP.COLLISION_RADIUS
      if (d >= minD || d < 1e-6) continue
      _d.divideScalar(d)
      pos.copy(p.position).addScaledVector(_d, minD)
      // Velocity relative to the moving surface; remove the inward part and bounce a little.
      _a.copy(vel).addScaledVector(p.velocity, -timeScale)
      const vn = _a.dot(_d)
      if (vn < 0) vel.addScaledVector(_d, -vn * (1 + SHIP.BOUNCE_RESTITUTION))
      p.passVoid = true
      touched = true
    }
  }
  return touched
}

/**
 * Gravitational time dilation factor (universe seconds per ship second):
 * 1 / sqrt(1 - rs/r), clamped to [1, MAX_FACTOR].
 */
export function timeDilation(r: number): number {
  if (r <= MIN_R) return DILATION.MAX_FACTOR
  const f = 1 / Math.sqrt(1 - RS / r)
  return f > DILATION.MAX_FACTOR ? DILATION.MAX_FACTOR : f
}

/** 0 outside the danger radius, rising smoothly to 1 at the lethal radius. */
export function dangerLevel(r: number): number {
  if (r >= DANGER_R) return 0
  if (r <= LETHAL_R) return 1
  const t = (DANGER_R - r) / (DANGER_R - LETHAL_R)
  return t * t * (3 - 2 * t)
}

export function isInsideHorizon(r: number): boolean {
  return r <= RS
}
