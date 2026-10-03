import { Quaternion, Vector3 } from 'three'
import { BLACK_HOLE, BURST, DAMAGE_FX, DEATH } from './constants'
import { resetRocks } from './debris'
import { requestBurst } from './fx'
import { integrateFlight, tidalStress } from './physics'
import { resetPickups } from './pickups'
import { planets } from './planets'
import { decayDamageFx, resetRun, run } from './run'
import { resetShip, ship } from './ship'
import { useGameStore } from './store'
import type { DeathCause } from './types'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS
/** The spaghettified ship ends just inside the horizon (hidden by the lensed shadow). */
const FINAL_R = RS * 0.97

/** Death sequence state, set by killShip. */
const seq = {
  r0: 0,
  /** Angular speed around the hole at death (rad/s) and the orbit-plane normal. */
  omega: 0,
  axis: new Vector3(),
  /** Body-frame tumble of a dead, drifting ship (rad/s). */
  tumble: new Vector3(),
}

const _q = new Quaternion()
const _v = new Vector3()
const NO_THRUST = new Vector3()

/** Ends the run: engines cut, the death sequence for `cause` starts and the store enters 'dead'. */
export function killShip(cause: DeathCause): void {
  run.deathCause = cause
  run.deathTimer = 0
  ship.throttle = 0
  ship.boost = 0
  ship.rcs.set(0, 0, 0)
  ship.localAccel.set(0, 0, 0)
  ship.thrust.set(0, 0, 0)
  ship.angularVelocity.set(0, 0, 0)

  const r = ship.position.length()
  if (cause === 'spaghettified') {
    seq.r0 = Math.max(r, FINAL_R)
    // Angular momentum per mass |r × v| sets the swirl: ω = h / r², spun up as the radius shrinks.
    seq.axis.crossVectors(ship.position, ship.velocity)
    const h = seq.axis.length()
    seq.omega = r > 1e-6 ? h / (r * r) : 0
    if (h > 1e-6) seq.axis.divideScalar(h)
    else seq.axis.set(0, 1, 0)
    if (r > 1e-6) ship.stretchAxis.copy(ship.position).divideScalar(r)
  } else if (cause === 'destroyed' || cause === 'incinerated') {
    ship.hidden = true
    requestBurst(ship.position, ship.velocity, BURST.INHERIT_VELOCITY, BURST.EXPLOSION)
    run.shake = DAMAGE_FX.MAX_SHAKE
  } else {
    seq.tumble.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(DEATH.TUMBLE_RATE)
  }

  useGameStore.getState().endRun({
    cause,
    score: run.score,
    shards: run.shards,
    shipTime: run.shipTime,
    universeTime: run.universeTime,
    peakDilation: run.peakDilation,
    deepestRs: Math.min(run.minR, r) / RS,
  })
}

/**
 * Advances the death sequence by `dt` (seconds):
 * spaghettified → the ship spirals down to the horizon, stretching into a thread;
 * suffocated → the lights die and the hulk drifts and tumbles under gravity;
 * destroyed / incinerated → nothing left to move (the explosion is particles).
 */
export function stepDeath(dt: number, timeScale: number): void {
  run.deathTimer += dt
  decayDamageFx(dt)
  if (ship.hidden) return

  if (run.deathCause === 'spaghettified') {
    const t = Math.min(1, run.deathTimer / DEATH.SPAGHETTI_SEC)
    const e = t * t
    const r = seq.r0 + (FINAL_R - seq.r0) * e
    const w = seq.omega * (seq.r0 / r) * (seq.r0 / r)
    _q.setFromAxisAngle(seq.axis, w * dt)
    ship.stretchAxis.applyQuaternion(_q).normalize()
    ship.position.copy(ship.stretchAxis).multiplyScalar(r)
    ship.quaternion.premultiply(_q)
    ship.stretch = 1 + (DEATH.SPAGHETTI_STRETCH - 1) * e
    if (t >= 1) ship.hidden = true
  } else if (run.deathCause === 'suffocated') {
    ship.power = Math.max(0, 1 - run.deathTimer / DEATH.POWER_FADE_SEC)
    integrateFlight(ship.position, ship.velocity, NO_THRUST, dt, planets, timeScale, ship.gravity)
    const w = seq.tumble.length()
    if (w > 1e-6) {
      _q.setFromAxisAngle(_v.copy(seq.tumble).divideScalar(w), w * dt)
      ship.quaternion.multiply(_q).normalize()
    }
    // A drifting hulk that falls too deep is simply gone.
    if (tidalStress(ship.position.length()) >= 1) ship.hidden = true
  }
}

/** New run from the spawn point: ship, clocks, resources, pickups and debris reset; enters `phase`. */
export function restartRun(phase: 'playing' | 'menu'): void {
  resetShip(ship)
  resetRun(planets)
  resetPickups(run.worldTime)
  resetRocks(planets, run.worldTime)
  run.epoch++
  useGameStore.getState().beginRun(phase)
}
