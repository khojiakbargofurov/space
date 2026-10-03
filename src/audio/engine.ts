import { AUDIO } from '../game/constants'
import { type AudioCore, createCore, glide } from './core'
import { type Music, type MusicParams, createMusic, updateMusic } from './music'
import { type SfxKind, playSfx } from './sfx'
import { type ShipSoundParams, type ShipSounds, createShipSounds, updateShipSounds } from './shipSounds'

/**
 * The game's single audio engine. Browsers only allow sound after a user gesture, so the context
 * is created lazily by `startAudio` (called from the first key press / click). Before that, and
 * after `disposeAudio`, every call is a silent no-op.
 */
interface Engine {
  core: AudioCore
  music: Music
  ship: ShipSounds
  /** Seconds since parameters were last pushed. */
  sinceParams: number
}

let engine: Engine | null = null
let muted = false

function onVisibility(): void {
  if (!engine) return
  // A hidden tab stops the render loop; suspend so sound doesn't drone on unattended.
  if (document.hidden) void engine.core.ctx.suspend()
  else void engine.core.ctx.resume()
}

/** Creates (first call) or resumes the audio context. Call from a user gesture. */
export function startAudio(): void {
  if (engine) {
    if (engine.core.ctx.state === 'suspended' && !document.hidden) void engine.core.ctx.resume()
    return
  }
  const core = createCore()
  core.master.gain.value = muted ? 0 : AUDIO.MASTER_GAIN
  engine = { core, music: createMusic(core), ship: createShipSounds(core), sinceParams: AUDIO.PARAM_INTERVAL }
  document.addEventListener('visibilitychange', onVisibility)
  void core.ctx.resume()
  // Dev-only handle for inspecting the graph from the console (window.__audio.core / music / ship).
  if (import.meta.env.DEV) Object.assign(window, { __audio: engine })
}

/** Closes the context and releases every node. */
export function disposeAudio(): void {
  if (!engine) return
  document.removeEventListener('visibilitychange', onVisibility)
  void engine.core.ctx.close()
  engine = null
}

export function setMuted(value: boolean): void {
  muted = value
  if (!engine) return
  glide(engine.core.master.gain, value ? 0 : AUDIO.MASTER_GAIN, engine.core.ctx.currentTime, AUDIO.MUTE_FADE)
}

export function playSound(kind: SfxKind): void {
  // A context still resuming from the unlock gesture plays these as soon as it runs.
  if (!engine || muted) return
  playSfx(engine.core, kind)
}

/**
 * Pushes the frame's state to the score and ship sounds, at most every AUDIO.PARAM_INTERVAL.
 * `ship.dt` is filled in here (the time since the last push).
 */
export function updateAudio(dt: number, music: MusicParams, ship: ShipSoundParams): void {
  if (!engine) return
  engine.sinceParams += dt
  if (engine.sinceParams < AUDIO.PARAM_INTERVAL) return
  ship.dt = engine.sinceParams
  engine.sinceParams = 0
  updateMusic(engine.music, engine.core, music)
  updateShipSounds(engine.ship, engine.core, ship)
}
