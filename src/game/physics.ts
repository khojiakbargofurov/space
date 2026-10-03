import type { Vector3 } from 'three'
import { BLACK_HOLE, DANGER, DILATION, GRAVITY } from './constants'

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

/** Semi-implicit Euler step: updates `vel` then `pos` in place under gravity. `scratch` is reused. */
export function applyGravity(pos: Vector3, vel: Vector3, dt: number, scratch: Vector3): void {
  gravityVector(pos, scratch)
  vel.addScaledVector(scratch, dt)
  pos.addScaledVector(vel, dt)
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
