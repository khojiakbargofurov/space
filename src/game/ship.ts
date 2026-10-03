import { Matrix4, Quaternion, Vector3 } from 'three'
import { BLACK_HOLE, SHIP } from './constants'
import { integrateFlight } from './physics'
import type { Planet } from './planets'
import type { FlightInput } from './types'

/**
 * Live ship state. Mutated in place every frame (never through React or Zustand) so the
 * flight loop stays allocation-free. Read it from any useFrame.
 */
export interface ShipState {
  position: Vector3
  velocity: Vector3
  quaternion: Quaternion
  /** Body-frame angular velocity (x = pitch, y = yaw, z = roll), rad/s. */
  angularVelocity: Vector3
  /** Spooled main engine output, 0..1 (boost not included). */
  throttle: number
  /** 0..1, eases in/out with the engine while boosting. */
  boost: number
  /** Reaction-control thrust direction this frame, ship-local, each axis -1..1 (exhaust leaves the opposite way). */
  rcs: Vector3
  /** Ship-local linear acceleration applied this frame (thrust + brake), units/s^2. */
  localAccel: Vector3
  /** World-space engine acceleration this frame (brake excluded: it acts on velocity directly). */
  thrust: Vector3
  /** World-space gravitational acceleration at the ship (hole + planets), units/s^2. */
  gravity: Vector3
  /** True if the hull touched a planet surface this frame. */
  contact: boolean
}

export function createShipState(): ShipState {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    quaternion: new Quaternion(),
    angularVelocity: new Vector3(),
    throttle: 0,
    boost: 0,
    rcs: new Vector3(),
    localAccel: new Vector3(),
    thrust: new Vector3(),
    gravity: new Vector3(),
    contact: false,
  }
}

/** The player's ship. */
export const ship = createShipState()

export function createFlightInput(): FlightInput {
  return { thrust: 0, strafeX: 0, strafeY: 0, pitch: 0, yaw: 0, roll: 0, boost: false, brake: false }
}

const _m = new Matrix4()
const _up = new Vector3(0, 1, 0)
const _a = new Vector3()
const _b = new Vector3()
const _q = new Quaternion()
const _qInv = new Quaternion()

/**
 * Puts the ship at the spawn point facing SPAWN_LOOK_AT, coasting on a circular orbit around the hole
 * (scaled by SPAWN_ORBIT_FRACTION) in the same direction as the planets.
 */
export function resetShip(s: ShipState): void {
  s.position.set(...SHIP.SPAWN_POSITION)
  _a.set(...SHIP.SPAWN_LOOK_AT)
  // Matrix4.lookAt(eye, target, up) points +Z from target to eye, so -Z (our forward) faces the target.
  _m.lookAt(s.position, _a, _up)
  s.quaternion.setFromRotationMatrix(_m)
  const r = s.position.length()
  const vCirc = Math.sqrt(BLACK_HOLE.MASS_GM / r) * SHIP.SPAWN_ORBIT_FRACTION
  s.velocity.crossVectors(_up, s.position).normalize().multiplyScalar(vCirc)
  s.angularVelocity.set(0, 0, 0)
  s.throttle = 0
  s.boost = 0
  s.rcs.set(0, 0, 0)
  s.localAccel.set(0, 0, 0)
  s.thrust.set(0, 0, 0)
  s.gravity.set(0, 0, 0)
  s.contact = false
}

resetShip(ship)

/** Fraction of the way to a target covered in dt by an exponential approach at `rate` (1/s). */
function approach(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt)
}

/**
 * Advances the ship by dt (ship seconds) under pilot input and gravity. Newtonian: thrust and gravity
 * change velocity, nothing slows the ship except its own thrusters. Attitude thrusters hold the
 * commanded rotation rate (and stop rotation when the stick is released).
 * `timeScale` = universe seconds per ship second (the planets move that much faster).
 */
export function stepShip(
  s: ShipState,
  input: FlightInput,
  rawDt: number,
  planets: readonly Planet[],
  timeScale: number,
): void {
  const dt = Math.min(rawDt, SHIP.MAX_DT)
  if (dt <= 0) return

  // --- attitude ---
  _a.set(input.pitch * SHIP.MAX_PITCH_RATE, input.yaw * SHIP.MAX_YAW_RATE, input.roll * SHIP.MAX_ROLL_RATE)
  s.angularVelocity.lerp(_a, approach(SHIP.ANGULAR_RESPONSE, dt))
  const w = s.angularVelocity.length()
  if (w > 1e-6) {
    _q.setFromAxisAngle(_b.copy(s.angularVelocity).divideScalar(w), w * dt)
    s.quaternion.multiply(_q).normalize()
  }

  // --- engines ---
  const forward = input.thrust > 0 ? input.thrust : 0
  const reverse = input.thrust < 0 ? -input.thrust : 0
  const spool = approach(SHIP.ENGINE_SPOOL, dt)
  s.throttle += (forward - s.throttle) * spool
  s.boost += ((input.boost && forward > 0 ? 1 : 0) - s.boost) * spool

  const main = s.throttle * SHIP.MAIN_THRUST * (1 + (SHIP.BOOST_MULTIPLIER - 1) * s.boost)
  s.localAccel.set(
    input.strafeX * SHIP.STRAFE_THRUST,
    input.strafeY * SHIP.STRAFE_THRUST,
    -main + reverse * SHIP.REVERSE_THRUST,
  )
  s.rcs.set(input.strafeX, input.strafeY, reverse)

  s.thrust.copy(s.localAccel).applyQuaternion(s.quaternion)

  // --- brake: retro thrust straight against velocity, never overshooting to zero ---
  if (input.brake) {
    const speed = s.velocity.length()
    if (speed > 1e-4) {
      const dv = Math.min(speed, SHIP.BRAKE_THRUST * dt)
      s.velocity.multiplyScalar(1 - dv / speed)
      // Report the brake as ship-local acceleration so the camera and RCS puffs react.
      _qInv.copy(s.quaternion).invert()
      _b.copy(s.velocity).normalize().negate().applyQuaternion(_qInv)
      s.localAccel.addScaledVector(_b, SHIP.BRAKE_THRUST)
      s.rcs.add(_b).clampScalar(-1, 1)
    }
  }

  s.contact = integrateFlight(s.position, s.velocity, s.thrust, dt, planets, timeScale, s.gravity)
  s.velocity.clampLength(0, SHIP.MAX_SPEED)
}
