import { Quaternion, Vector3 } from 'three'
import { BLACK_HOLE } from './constants'

/**
 * A small body on a circular, prograde Keplerian orbit around the hole (pickups, debris).
 * Moves along universe time like the planets; `position` / `velocity` are updated in place.
 */
export interface Orbiter {
  radius: number
  /** Angular speed, rad per universe second. */
  omega: number
  phase: number
  /** Orthonormal basis of the orbital plane: p = R (cos θ e1 + sin θ e2). */
  e1: Vector3
  e2: Vector3
  position: Vector3
  /** World velocity in units per UNIVERSE second. */
  velocity: Vector3
}

export function createOrbiter(): Orbiter {
  return { radius: 1, omega: 0, phase: 0, e1: new Vector3(1, 0, 0), e2: new Vector3(0, 0, -1), position: new Vector3(), velocity: new Vector3() }
}

const _q = new Quaternion()
const _axis = new Vector3()
const _up = new Vector3()

/**
 * Puts `o` on a circular orbit of `radius` with a random node and an inclination up to `maxIncl`
 * (radians) against the disk plane, prograde like the planets. Allocation-free.
 */
export function setOrbit(o: Orbiter, rng: () => number, radius: number, maxIncl: number): void {
  const node = rng() * Math.PI * 2
  const incl = (rng() * 2 - 1) * maxIncl
  _axis.set(Math.cos(node), 0, -Math.sin(node))
  _q.setFromAxisAngle(_axis, incl)
  o.e1.copy(_axis).applyQuaternion(_q)
  _up.set(0, 1, 0).applyQuaternion(_q)
  o.e2.crossVectors(_up, o.e1).normalize()
  o.radius = radius
  o.omega = Math.sqrt(BLACK_HOLE.MASS_GM / (radius * radius * radius))
  o.phase = rng() * Math.PI * 2
}

/** Moves `o` to its place at universe time `t`. */
export function updateOrbiter(o: Orbiter, t: number): void {
  const theta = o.phase + o.omega * t
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  o.position.copy(o.e1).multiplyScalar(o.radius * c).addScaledVector(o.e2, o.radius * s)
  const v = o.radius * o.omega
  o.velocity.copy(o.e1).multiplyScalar(-v * s).addScaledVector(o.e2, v * c)
}
