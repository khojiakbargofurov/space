import type { Vector3 } from 'three'
import { BLACK_HOLE, CLOSE_PASS, DANGER, SCORE, SLINGSHOT } from './constants'
import { timeDilation } from './physics'
import type { Planet } from './planets'

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
}

export type RunEventKind = 'slingshot' | 'close-pass' | 'lost'

export interface RunEvent {
  kind: RunEventKind
  title: string
  detail: string
  points: number
}

type RunListener = (e: RunEvent) => void
const listeners = new Set<RunListener>()

/** Subscribes to notable run events (bonuses, loss). Returns an unsubscribe function. */
export function onRunEvent(fn: RunListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitRunEvent(e: RunEvent): void {
  for (const fn of listeners) fn(e)
}

/** Starts a fresh run: clocks, score and bonus tracking back to zero (world time keeps flowing). */
export function resetRun(planets: readonly Planet[]): void {
  run.shipTime = 0
  run.universeTime = 0
  run.dilation = 1
  run.peakDilation = 1
  run.score = 0
  run.approaching = false
  run.approachMinR = Infinity
  run.closePassCooldown = 0
  for (const p of planets) {
    p.inSoi = false
    p.assist = 0
    p.passVoid = false
  }
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
