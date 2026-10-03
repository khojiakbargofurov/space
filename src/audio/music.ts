import { ARP, AUDIO, DRONE, PADS, SHIMMER } from '../game/constants'
import { type AudioCore, filter, gain, glide, lfo, noiseLoop, oscillator } from './core'

/**
 * Generative score: a low drone, a four-voice pad walking a minor progression and a plucked
 * arpeggio over it, plus the "universe shimmer". Every oscillator's detune follows core.pitch,
 * so time dilation bends the whole score at once; the sequencer's tempo slows with dilation too.
 * All nodes are created once; updates only automate parameters (no allocation per frame).
 */
export interface Music {
  droneGain: GainNode
  pads: OscillatorNode[][]
  padGain: GainNode
  arpOscs: OscillatorNode[]
  arpHarmonics: OscillatorNode[]
  arpEnvs: GainNode[]
  arpLevel: GainNode
  shimmerFilter: BiquadFilterNode
  shimmerLfo: OscillatorNode
  shimmerLevel: GainNode
  /** Sequencer: pattern step, current chord, next note time (context seconds), next voice. */
  step: number
  chord: number
  nextNote: number
  voice: number
}

function semis(n: number): number {
  return Math.pow(2, n / 12)
}

export function createMusic(core: AudioCore): Music {
  const { ctx, music, pitch } = core
  const follow = (o: OscillatorNode) => {
    pitch.connect(o.detune)
    return o
  }

  // --- drone ---
  const droneGain = gain(ctx, DRONE.GAIN, music)
  const droneFilter = filter(ctx, 'lowpass', DRONE.CUTOFF, 0.9, droneGain)
  lfo(ctx, DRONE.LFO_RATE, DRONE.LFO_DEPTH, droneFilter.frequency)
  const droneTypes: OscillatorType[] = ['sine', 'sawtooth', 'triangle']
  DRONE.FREQS.forEach((f, i) => follow(oscillator(ctx, droneTypes[i], f, gain(ctx, DRONE.GAINS[i], droneFilter))))

  // --- pads ---
  const padGain = gain(ctx, PADS.GAIN, music)
  lfo(ctx, PADS.SWELL_RATE, PADS.GAIN * PADS.SWELL_DEPTH, padGain.gain)
  const padFilter = filter(ctx, 'lowpass', PADS.CUTOFF, PADS.Q, padGain)
  const pads = PADS.CHORDS[0].map((n) => {
    const voice = gain(ctx, 0.25, padFilter)
    return [-1, 1].map((side) => {
      const o = follow(oscillator(ctx, 'sawtooth', PADS.ROOT * semis(n), voice))
      o.detune.value = side * PADS.DETUNE_CENTS
      return o
    })
  })

  // --- arpeggio with a damped echo ---
  const arpLevel = gain(ctx, ARP.MENU_LEVEL, music)
  const echo = ctx.createDelay(2)
  echo.delayTime.value = ARP.ECHO_SEC
  const echoDamp = filter(ctx, 'lowpass', ARP.ECHO_CUTOFF, 0.5, gain(ctx, ARP.ECHO_WET, music))
  echo.connect(echoDamp)
  gain(ctx, ARP.ECHO_FEEDBACK, echo, echoDamp)
  arpLevel.connect(echo)
  const arpOscs: OscillatorNode[] = []
  const arpHarmonics: OscillatorNode[] = []
  const arpEnvs: GainNode[] = []
  for (let i = 0; i < ARP.VOICES; i++) {
    const env = gain(ctx, 0, arpLevel)
    arpEnvs.push(env)
    arpOscs.push(follow(oscillator(ctx, 'triangle', PADS.ROOT, env)))
    arpHarmonics.push(follow(oscillator(ctx, 'sine', PADS.ROOT * 2, gain(ctx, 0.3, env))))
  }

  // --- universe shimmer: band-passed noise under a tremolo ---
  const shimmerLevel = gain(ctx, 0, music)
  const tremolo = gain(ctx, 0.5, shimmerLevel)
  const shimmerLfo = lfo(ctx, SHIMMER.RATE, 0.5, tremolo.gain)
  const shimmerFilter = filter(ctx, 'bandpass', SHIMMER.FREQ, SHIMMER.Q, tremolo)
  noiseLoop(core, shimmerFilter)

  return {
    droneGain, pads, padGain, arpOscs, arpHarmonics, arpEnvs, arpLevel, shimmerFilter, shimmerLfo, shimmerLevel,
    step: 0, chord: 0, nextNote: 0, voice: 0,
  }
}

/** Per-frame inputs for the score. */
export interface MusicParams {
  dilation: number
  /** 0..1 proximity to the lethal radius. */
  danger: number
  /** Overall music level and arp level for the current phase. */
  level: number
  arp: number
  /** Music low-pass cutoff. */
  cutoff: number
}

/** Pitch factor for the ship's music at `dilation` (1 far away, dropping toward the horizon). */
export function musicPitch(dilation: number): number {
  return Math.max(AUDIO.MIN_PITCH, Math.pow(dilation, -AUDIO.PITCH_EXP))
}

/** Tempo factor at `dilation`. */
export function musicTempo(dilation: number): number {
  return Math.max(AUDIO.MIN_TEMPO, Math.pow(dilation, -AUDIO.TEMPO_EXP))
}

export function updateMusic(m: Music, core: AudioCore, p: MusicParams): void {
  const t = core.ctx.currentTime
  const d = p.dilation

  glide(core.pitch.offset, 1200 * Math.log2(musicPitch(d)), t)
  glide(core.musicOut.gain, AUDIO.MUSIC_GAIN * p.level, t, 0.4)
  glide(core.musicFilter.frequency, p.cutoff, t, 0.5)
  glide(m.droneGain.gain, DRONE.GAIN * (1 + DRONE.DANGER_BOOST * p.danger), t)
  glide(m.arpLevel.gain, p.arp, t, 0.5)

  // Light from outside arrives blueshifted and sped up by the dilation.
  const full = Math.min(1, Math.max(0, (d - 1) / (SHIMMER.FULL_AT - 1)))
  glide(m.shimmerLevel.gain, SHIMMER.GAIN * p.level * (SHIMMER.BASE + (1 - SHIMMER.BASE) * full), t)
  glide(m.shimmerFilter.frequency, SHIMMER.FREQ * Math.min(d, SHIMMER.MAX_SHIFT), t)
  glide(m.shimmerLfo.frequency, Math.min(SHIMMER.MAX_RATE, SHIMMER.RATE * d), t)

  // --- sequencer (look-ahead scheduling on the audio clock) ---
  const tempo = musicTempo(d)
  const step = ARP.STEP_SEC / tempo
  // After a suspend (hidden tab) the schedule would be in the past: restart it just ahead.
  if (m.nextNote < t) m.nextNote = t + 0.05
  while (m.nextNote < t + ARP.LOOKAHEAD) {
    scheduleStep(m, m.nextNote, tempo)
    m.nextNote += step
  }
}

function scheduleStep(m: Music, t: number, tempo: number): void {
  const i = m.step % ARP.PATTERN.length
  if (m.step > 0 && m.step % ARP.STEPS_PER_CHORD === 0) {
    m.chord = (m.chord + 1) % PADS.CHORDS.length
    const chord = PADS.CHORDS[m.chord]
    for (let v = 0; v < m.pads.length; v++) {
      const f = PADS.ROOT * semis(chord[v])
      for (const o of m.pads[v]) o.frequency.setTargetAtTime(f, t, PADS.GLIDE / tempo)
    }
  }
  m.step++

  const f = PADS.ROOT * semis(PADS.CHORDS[m.chord][ARP.PATTERN[i]]) * ARP.OCTAVE[i]
  const v = m.voice
  m.voice = (m.voice + 1) % ARP.VOICES
  m.arpOscs[v].frequency.setValueAtTime(f, t)
  m.arpHarmonics[v].frequency.setValueAtTime(f * 2, t)
  const env = m.arpEnvs[v].gain
  env.setValueAtTime(0, t)
  env.linearRampToValueAtTime(ARP.PEAK, t + ARP.ATTACK)
  env.setTargetAtTime(0, t + ARP.ATTACK, ARP.DECAY / tempo)
}
