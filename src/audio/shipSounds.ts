import { ALARM, SHIP_AUDIO } from '../game/constants'
import { type AudioCore, filter, gain, glide, lfo, noiseLoop, oscillator } from './core'

/**
 * Continuous ship and hazard sounds: engine rumble, RCS hiss, tidal groan, disk plasma roar,
 * horizon sub-bass and the warning beeper. Built once; updates only automate parameters.
 */
export interface ShipSounds {
  engineOsc: OscillatorNode
  engineFilter: BiquadFilterNode
  engineGain: GainNode
  rcsGain: GainNode
  tidalGain: GainNode
  heatGain: GainNode
  subGain: GainNode
  alarmOsc: OscillatorNode
  alarmEnv: GainNode
  /** Ship seconds until the next alarm beep group. */
  alarmTimer: number
}

export function createShipSounds(core: AudioCore): ShipSounds {
  const { ctx, ship } = core

  // --- main engine: sawtooth rumble plus noise through one low-pass ---
  const engineGain = gain(ctx, 0, ship)
  const engineFilter = filter(ctx, 'lowpass', SHIP_AUDIO.ENGINE_CUTOFF, 1.2, engineGain)
  const engineOsc = oscillator(ctx, 'sawtooth', SHIP_AUDIO.ENGINE_FREQ, engineFilter)
  noiseLoop(core, gain(ctx, SHIP_AUDIO.ENGINE_NOISE, engineFilter))

  // --- reaction control hiss ---
  const rcsGain = gain(ctx, 0, ship)
  noiseLoop(core, filter(ctx, 'highpass', SHIP_AUDIO.RCS_CUTOFF, 0.7, rcsGain))

  // --- tidal groan: a resonant low band that wobbles like straining metal ---
  const tidalGain = gain(ctx, 0, ship)
  const tidalFilter = filter(ctx, 'bandpass', SHIP_AUDIO.TIDAL_FREQ, SHIP_AUDIO.TIDAL_Q, tidalGain)
  lfo(ctx, SHIP_AUDIO.TIDAL_WOBBLE_RATE, SHIP_AUDIO.TIDAL_WOBBLE_DEPTH, tidalFilter.frequency)
  noiseLoop(core, tidalFilter)

  // --- accretion disk plasma ---
  const heatGain = gain(ctx, 0, ship)
  noiseLoop(core, filter(ctx, 'bandpass', SHIP_AUDIO.HEAT_FREQ, SHIP_AUDIO.HEAT_Q, heatGain))

  // --- horizon sub-bass ---
  const subGain = gain(ctx, 0, ship)
  oscillator(ctx, 'sine', SHIP_AUDIO.SUB_FREQ, subGain)

  // --- warning beeper ---
  const alarmEnv = gain(ctx, 0, ship)
  const alarmOsc = oscillator(ctx, 'square', ALARM.LOW_FREQ, filter(ctx, 'lowpass', 2400, 0.7, alarmEnv))

  return { engineOsc, engineFilter, engineGain, rcsGain, tidalGain, heatGain, subGain, alarmOsc, alarmEnv, alarmTimer: 0 }
}

/** Per-frame inputs for the ship sounds. */
export interface ShipSoundParams {
  /** Ship seconds since the last update. */
  dt: number
  throttle: number
  boost: number
  /** Total reaction-control output (sum of |axes|). */
  rcs: number
  /** 0..1 power to the ship systems (0 when parked, dead or gone). */
  power: number
  tidal: number
  heat: number
  danger: number
  /** 0 = quiet, 1 = warning, 2 = critical. */
  alarm: number
}

export function updateShipSounds(s: ShipSounds, core: AudioCore, p: ShipSoundParams): void {
  const t = core.ctx.currentTime
  const thr = p.throttle * p.power
  const boost = p.boost * p.power

  glide(s.engineOsc.frequency, SHIP_AUDIO.ENGINE_FREQ + SHIP_AUDIO.ENGINE_FREQ_THROTTLE * thr + SHIP_AUDIO.ENGINE_FREQ_BOOST * boost, t)
  glide(s.engineFilter.frequency, SHIP_AUDIO.ENGINE_CUTOFF + SHIP_AUDIO.ENGINE_CUTOFF_THROTTLE * thr + SHIP_AUDIO.ENGINE_CUTOFF_BOOST * boost, t)
  glide(
    s.engineGain.gain,
    SHIP_AUDIO.IDLE_GAIN * p.power + SHIP_AUDIO.ENGINE_GAIN * thr * (1 + SHIP_AUDIO.ENGINE_BOOST_GAIN * boost),
    t,
  )
  glide(s.rcsGain.gain, SHIP_AUDIO.RCS_GAIN * Math.min(1, p.rcs) * p.power, t, 0.05)
  glide(s.tidalGain.gain, SHIP_AUDIO.TIDAL_GAIN * Math.pow(p.tidal, 1.5), t)
  glide(s.heatGain.gain, SHIP_AUDIO.HEAT_GAIN * p.heat, t)
  glide(s.subGain.gain, SHIP_AUDIO.SUB_GAIN * p.danger, t, 0.3)

  // --- alarm: a beep (warning) or a double beep (critical) every interval ---
  if (p.alarm === 0) {
    s.alarmTimer = 0
    return
  }
  s.alarmTimer -= p.dt
  if (s.alarmTimer > 0) return
  const critical = p.alarm === 2
  s.alarmTimer = critical ? ALARM.CRITICAL_INTERVAL : ALARM.LOW_INTERVAL
  const start = t + 0.01
  s.alarmOsc.frequency.setValueAtTime(critical ? ALARM.CRITICAL_FREQ : ALARM.LOW_FREQ, start)
  beep(s.alarmEnv.gain, start)
  if (critical) beep(s.alarmEnv.gain, start + ALARM.BEEP_SEC + ALARM.DOUBLE_GAP)
}

function beep(env: AudioParam, t: number): void {
  env.setValueAtTime(0, t)
  env.linearRampToValueAtTime(ALARM.GAIN, t + 0.006)
  env.setValueAtTime(ALARM.GAIN, t + ALARM.BEEP_SEC)
  env.linearRampToValueAtTime(0, t + ALARM.BEEP_SEC + 0.012)
}
