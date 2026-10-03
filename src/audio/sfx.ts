import { DEATH, SFX } from '../game/constants'
import type { AudioCore } from './core'

/**
 * One-shot effects. Web Audio source nodes can only play once, so each effect builds a few short-lived
 * nodes that disconnect themselves when done. They fire on rare game events, never every frame.
 */
export type SfxKind =
  | 'fuel'
  | 'oxygen'
  | 'shard'
  | 'slingshot'
  | 'close-pass'
  | 'impact'
  | 'explosion'
  | 'spaghettified'
  | 'power-down'
  | 'launch'

/** Note frequencies used by the chimes (key of D). */
const D5 = 587.33
const E5 = 659.25
const A5 = 880
const B5 = 987.77
const D6 = 1174.66
const A6 = 1760
const E7 = 2637.02

const MIN = 0.0001

/** Envelope: linear attack to `peak`, exponential fall to silence at t + dur. */
function envelope(g: AudioParam, t: number, attack: number, dur: number, peak: number): void {
  g.setValueAtTime(MIN, t)
  g.linearRampToValueAtTime(peak, t + attack)
  g.exponentialRampToValueAtTime(MIN, t + dur)
}

function cleanup(src: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
  src.onended = () => {
    src.disconnect()
    for (const n of nodes) n.disconnect()
  }
}

/** A tone gliding from f0 to f1 over `dur`. */
function tone(
  core: AudioCore, type: OscillatorType, f0: number, f1: number, t: number, attack: number, dur: number, peak: number,
): void {
  const { ctx } = core
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ctx.createGain()
  envelope(g.gain, t, attack, dur, peak)
  o.connect(g).connect(core.sfx)
  o.start(t)
  o.stop(t + dur + 0.05)
  cleanup(o, g)
}

/** Filtered noise whose filter sweeps from f0 to f1 over `dur`. */
function noise(
  core: AudioCore, type: BiquadFilterType, f0: number, f1: number, q: number, t: number, attack: number, dur: number, peak: number,
): void {
  const { ctx } = core
  const src = ctx.createBufferSource()
  src.buffer = core.noise
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(f0, t)
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ctx.createGain()
  envelope(g.gain, t, attack, dur, peak)
  src.connect(f).connect(g).connect(core.sfx)
  src.start(t, Math.random() * core.noise.duration)
  src.stop(t + dur + 0.05)
  cleanup(src, f, g)
}

/** Inharmonic bell: fundamental plus a partial at 2.76×. */
function bell(core: AudioCore, f: number, t: number, dur: number, peak: number): void {
  tone(core, 'sine', f, f, t, 0.004, dur, peak)
  tone(core, 'sine', f * 2.76, f * 2.76, t, 0.002, dur * 0.45, peak * 0.35)
}

export function playSfx(core: AudioCore, kind: SfxKind): void {
  const t = core.ctx.currentTime + 0.01
  switch (kind) {
    case 'fuel': {
      const v = SFX.PICKUP
      tone(core, 'triangle', D5, D5, t, 0.01, 0.3, v)
      tone(core, 'triangle', A5, A5, t + 0.08, 0.01, 0.45, v)
      tone(core, 'sine', D5 / 2, D5 / 2, t, 0.02, 0.4, v * 0.5)
      break
    }
    case 'oxygen': {
      const v = SFX.PICKUP
      noise(core, 'highpass', 1800, 6000, 0.7, t, 0.08, 0.5, v * 0.5)
      tone(core, 'sine', E5, E5, t + 0.05, 0.02, 0.6, v * 0.8)
      tone(core, 'sine', B5, B5, t + 0.12, 0.02, 0.7, v * 0.6)
      break
    }
    case 'shard': {
      const v = SFX.SHARD
      bell(core, D6, t, 1.4, v)
      bell(core, A6, t + 0.07, 1.3, v * 0.8)
      bell(core, E7, t + 0.14, 1.6, v * 0.6)
      break
    }
    case 'slingshot': {
      const v = SFX.SLINGSHOT
      noise(core, 'bandpass', 250, 3200, 1.5, t, 0.35, 1.1, v)
      tone(core, 'sine', 220, 660, t, 0.3, 1.0, v * 0.4)
      break
    }
    case 'close-pass': {
      const v = SFX.CLOSE_PASS
      tone(core, 'sine', 55, 110, t, 0.6, 2.2, v)
      noise(core, 'lowpass', 200, 1400, 0.8, t, 0.7, 2, v * 0.6)
      bell(core, D6, t + 0.55, 1.8, v * 0.5)
      bell(core, A5, t + 0.62, 1.8, v * 0.4)
      break
    }
    case 'impact': {
      const v = SFX.IMPACT
      noise(core, 'lowpass', 2600, 280, 0.8, t, 0.002, 0.4, v)
      tone(core, 'sine', 95, 34, t, 0.003, 0.55, v * 0.9)
      break
    }
    case 'explosion': {
      const v = SFX.EXPLOSION
      noise(core, 'lowpass', 4200, 110, 0.7, t, 0.004, 3, v)
      noise(core, 'bandpass', 900, 200, 0.6, t + 0.05, 0.01, 1.6, v * 0.5)
      tone(core, 'sine', 70, 22, t, 0.005, 2, v)
      break
    }
    case 'spaghettified': {
      // The hull pulled into a thread: a long falling groan with metal screech over it.
      const v = SFX.SPAGHETTI
      const dur = DEATH.SPAGHETTI_SEC + 0.6
      tone(core, 'triangle', 320, 26, t, 0.15, dur, v)
      tone(core, 'sine', 1900, 180, t, 0.3, dur * 0.85, v * 0.25)
      noise(core, 'bandpass', 600, 60, 6, t, 0.4, dur, v * 0.9)
      break
    }
    case 'power-down': {
      const v = SFX.POWER_DOWN
      const dur = DEATH.POWER_FADE_SEC * 1.6
      tone(core, 'sine', 220, 36, t, 0.02, dur, v)
      tone(core, 'triangle', 110, 20, t, 0.02, dur, v * 0.6)
      break
    }
    case 'launch': {
      const v = SFX.LAUNCH
      noise(core, 'bandpass', 180, 2400, 1.2, t, 0.45, 1.2, v)
      tone(core, 'sine', 70, 140, t, 0.3, 1.1, v * 0.6)
      break
    }
  }
}
