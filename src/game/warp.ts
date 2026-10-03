import { Vector3 } from 'three'
import { WARP } from './constants'
import { ship } from './ship'
import { useGameStore } from './store'
import { wormhole } from './wormhole'
import { enterNextSector } from './world'

/**
 * The wormhole jump. While `active`: the ship is drawn into the core and stretched (PULL_SEC), the
 * sector swaps under a white-out, then the tunnel fades over the new sector (FADE_SEC).
 * `tunnel` and `flash` (0..1) drive the tunnel overlay and the camera.
 */
export const warp = {
  active: false,
  /** Seconds since capture. */
  t: 0,
  swapped: false,
  tunnel: 0,
  flash: 0,
  from: new Vector3(),
}

function smooth(x: number): number {
  const t = x <= 0 ? 0 : x >= 1 ? 1 : x
  return t * t * (3 - 2 * t)
}

/** The ship crossed the capture radius: controls lock and the jump starts ('warp' phase). */
export function startWarp(): void {
  warp.active = true
  warp.t = 0
  warp.swapped = false
  warp.from.copy(ship.position)
  // Stretch along the fall into the core.
  ship.stretchAxis.subVectors(wormhole.orbit.position, ship.position)
  if (ship.stretchAxis.lengthSq() > 1e-8) ship.stretchAxis.normalize()
  else ship.stretchAxis.copy(ship.velocity).normalize()
  useGameStore.getState().setPhase('warp')
}

/** Advances the jump by `dt` real seconds (allocation-free). */
export function stepWarp(dt: number): void {
  if (!warp.active) return
  warp.t += dt

  if (!warp.swapped) {
    const k = Math.min(1, warp.t / WARP.PULL_SEC)
    const e = k * k
    ship.position.lerpVectors(warp.from, wormhole.orbit.position, e)
    ship.stretch = 1 + (WARP.STRETCH - 1) * e
    warp.tunnel = smooth(k)
    warp.flash = smooth((warp.t - (WARP.PULL_SEC - WARP.FLASH_LEAD)) / WARP.FLASH_LEAD)
    if (k >= 1) {
      warp.swapped = true
      enterNextSector()
    }
    return
  }

  const f = Math.min(1, (warp.t - WARP.PULL_SEC) / WARP.FADE_SEC)
  warp.tunnel = 1 - smooth(f)
  warp.flash = 1 - smooth(f * 2.5)
  if (f >= 1) {
    warp.active = false
    warp.tunnel = 0
    warp.flash = 0
  }
}

/** Drops any jump in progress (new run / restart). */
export function cancelWarp(): void {
  warp.active = false
  warp.tunnel = 0
  warp.flash = 0
}
