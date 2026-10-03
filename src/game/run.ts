import type { Vector3 } from 'three'
import { BLACK_HOLE, CLOSE_PASS, DAMAGE_FX, DANGER, RESOURCES, SCORE, SLINGSHOT } from './constants'
import { timeDilation } from './physics'
import type { Planet } from './planets'
import type { DamageSource, DeathCause } from './types'

/**
 * Clocks and score of the current run. Mutated in place every frame (never through React or
 * Zustand) so the loop stays allocation-free; the HUD reads it on its own refresh interval.
 */
export interface RunState {
  /** Ephemeris time that drives planet motion. Always runs (at 1x outside flight), never resets. */
  worldTime: number
  /** Proper time aboard the ship since launch. */
  shipTime: number
  /** Time elapsed far from the hole since launch. */
  universeTime: number
  /** Current dilation factor (universe seconds per ship second). */
  dilation: number
  peakDilation: number
  score: number
  /** Close-pass tracking: falling toward the hole, deepest radius so far, seconds until the next pass can score. */
  approaching: boolean
  approachMinR: number
  closePassCooldown: number

  fuel: number
  oxygen: number
  hull: number
  /** Chrono shards collected this run. */
  shards: number
  /** Tidal stress 0..1 and disk heating 0..1 at the ship this frame. */
  tidalStress: number
  heat: number
  /** What hurt the hull last (decides how a hull failure reads). */
  lastDamage: DamageSource
  /** Ship seconds since the hull last took damage (drives self-repair). */
  sinceDamage: number
  /** Grace time left after a collision. */
  hitCooldown: number
  /** Decaying camera shake (units) and red screen flash (0..1) from damage. */
  shake: number
  flash: number
  /** Closest approach to the hole this run. */
  minR: number

  /** Bumped on every new run (cameras use it to restart their intro). */
  epoch: number
  deathCause: DeathCause | null
  /** Seconds since death (drives the death sequence). */
  deathTimer: number
}

export const run: RunState = {
  worldTime: 0,
  shipTime: 0,
  universeTime: 0,
  dilation: 1,
  peakDilation: 1,
  score: 0,
  approaching: false,
  approachMinR: Infinity,
  closePassCooldown: 0,
  fuel: RESOURCES.FUEL_MAX,
  oxygen: RESOURCES.OXYGEN_MAX,
  hull: RESOURCES.HULL_MAX,
  shards: 0,
  tidalStress: 0,
  heat: 0,
  lastDamage: 'impact',
  sinceDamage: 0,
  hitCooldown: 0,
  shake: 0,
  flash: 0,
  minR: Infinity,
  epoch: 0,
  deathCause: null,
  deathTimer: 0,
}

export type RunEventKind = 'slingshot' | 'close-pass' | 'fuel' | 'oxygen' | 'shard' | 'impact'

export interface RunEvent {
  kind: RunEventKind
  title: string
  detail: string
  points: number
}

type RunListener = (e: RunEvent) => void
const listeners = new Set<RunListener>()

/** Subscribes to notable run events (bonuses, pickups, impacts). Returns an unsubscribe function. */
export function onRunEvent(fn: RunListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitRunEvent(e: RunEvent): void {
  for (const fn of listeners) fn(e)
}

/** Starts a fresh run: clocks, score, resources and bonus tracking reset (world time keeps flowing). */
export function resetRun(planets: readonly Planet[]): void {
  run.shipTime = 0
  run.universeTime = 0
  run.dilation = 1
  run.peakDilation = 1
  run.score = 0
  run.approaching = false
  run.approachMinR = Infinity
  run.closePassCooldown = 0
  run.fuel = RESOURCES.FUEL_MAX
  run.oxygen = RESOURCES.OXYGEN_MAX
  run.hull = RESOURCES.HULL_MAX
  run.shards = 0
  run.tidalStress = 0
  run.heat = 0
  run.lastDamage = 'impact'
  run.sinceDamage = 0
  run.hitCooldown = 0
  run.shake = 0
  run.flash = 0
  run.minR = Infinity
  run.deathCause = null
  run.deathTimer = 0
  for (const p of planets) {
    p.inSoi = false
    p.assist = 0
    p.passVoid = false
  }
}

/**
 * Takes `amount` hull points from `source`. Every hit flashes the screen; `impulse` hits
 * (collisions) also kick the camera.
 */
export function damageHull(amount: number, source: DamageSource, impulse: boolean): void {
  if (amount <= 0) return
  run.hull = Math.max(0, run.hull - amount)
  run.lastDamage = source
  run.sinceDamage = 0
  run.flash = Math.min(DAMAGE_FX.MAX_FLASH, run.flash + amount * DAMAGE_FX.FLASH_PER_DAMAGE)
  if (impulse) run.shake = Math.min(DAMAGE_FX.MAX_SHAKE, run.shake + amount * DAMAGE_FX.SHAKE_PER_DAMAGE)
}

/** Fades the damage shake and flash. */
export function decayDamageFx(dt: number): void {
  run.shake *= Math.exp(-DAMAGE_FX.SHAKE_DECAY * dt)
  run.flash *= Math.exp(-DAMAGE_FX.FLASH_DECAY * dt)
}

/**
 * Advances clocks by `dt` ship seconds at `dilation`. In flight the ship clock, universe clock and
 * score advance; score accrues from TIME DEBT (universe seconds gained beyond ship seconds).
 */
export function advanceClocks(dt: number, dilation: number, flying: boolean): void {
  run.worldTime += dt * dilation
  run.dilation = dilation
  if (!flying) return
  run.shipTime += dt
  run.universeTime += dt * dilation
  run.score += (dilation - 1) * dt * SCORE.POINTS_PER_DEBT_SEC
  if (dilation > run.peakDilation) run.peakDilation = dilation
}

/**
 * Bonus checks after the ship moved: a slingshot scores when the ship leaves a planet's sphere of
 * influence with speed gained from that planet's pull (and no surface contact); a close pass scores
 * at each periapsis below CLOSE_PASS.MAX_RS, scaled by the dilation there.
 */
export function updateBonuses(pos: Vector3, vel: Vector3, dt: number, planets: readonly Planet[]): void {
  for (const p of planets) {
    const inside = pos.distanceTo(p.position) < p.soi
    if (inside === p.inSoi) continue
    p.inSoi = inside
    if (inside) continue
    if (!p.passVoid && p.assist >= SLINGSHOT.MIN_GAIN) {
      const points = Math.round(p.assist * SLINGSHOT.POINTS_PER_SPEED)
      run.score += points
      emitRunEvent({ kind: 'slingshot', title: `SLINGSHOT · ${p.name}`, detail: `+${p.assist.toFixed(1)} u/s`, points })
    }
    p.assist = 0
    p.passVoid = false
  }

  run.closePassCooldown = Math.max(0, run.closePassCooldown - dt)
  const r = pos.length()
  const approaching = pos.dot(vel) < 0
  if (approaching) {
    if (r < run.approachMinR) run.approachMinR = r
  } else if (run.approaching) {
    const minR = run.approachMinR
    const rs = BLACK_HOLE.SCHWARZSCHILD_RADIUS
    // A periapsis inside the lethal radius never counts (the run is lost there anyway).
    if (minR < CLOSE_PASS.MAX_RS * rs && minR > DANGER.LETHAL_RADIUS_RS * rs && run.closePassCooldown <= 0) {
      const d = timeDilation(minR)
      const points = Math.round(CLOSE_PASS.POINTS * (d - 1))
      run.score += points
      run.closePassCooldown = CLOSE_PASS.COOLDOWN
      emitRunEvent({ kind: 'close-pass', title: 'CLOSE PASS', detail: `${(minR / rs).toFixed(2)} rs · ×${d.toFixed(2)}`, points })
    }
    run.approachMinR = Infinity
  }
  run.approaching = approaching
}
