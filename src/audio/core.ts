import { AUDIO } from '../game/constants'

/**
 * The audio graph shared by every sound layer:
 *
 *   music ─► musicFilter ─► musicOut ─┐
 *   ship ──────────────────────────────┼─► master ─► compressor ─► speakers
 *   sfx ───────────────────────────────┤
 *   (music, sfx) ─► reverb sends ─► reverb ┘
 *
 * `pitch` is a constant source (cents) wired into the detune of every music oscillator, so one
 * automation shifts the whole score with time dilation.
 */
export interface AudioCore {
  ctx: AudioContext
  master: GainNode
  music: GainNode
  musicFilter: BiquadFilterNode
  musicOut: GainNode
  ship: GainNode
  sfx: GainNode
  pitch: ConstantSourceNode
  /** Looped white noise shared by every noise layer and effect. */
  noise: AudioBuffer
}

export function createCore(): AudioCore {
  const ctx = new AudioContext({ latencyHint: 'interactive' })

  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -16
  compressor.knee.value = 12
  compressor.ratio.value = 4
  compressor.attack.value = 0.01
  compressor.release.value = 0.25
  compressor.connect(ctx.destination)

  const master = gain(ctx, AUDIO.MASTER_GAIN, compressor)

  const reverb = ctx.createConvolver()
  reverb.buffer = impulseResponse(ctx, AUDIO.REVERB_SEC, AUDIO.REVERB_DECAY)
  reverb.connect(master)

  const musicOut = gain(ctx, AUDIO.MUSIC_GAIN, master)
  gain(ctx, AUDIO.REVERB_SEND, reverb, musicOut)
  const musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = AUDIO.MUSIC_CUTOFF
  musicFilter.Q.value = 0.5
  musicFilter.connect(musicOut)
  const music = gain(ctx, 1, musicFilter)

  const ship = gain(ctx, AUDIO.SHIP_GAIN, master)
  const sfx = gain(ctx, AUDIO.SFX_GAIN, master)
  gain(ctx, AUDIO.REVERB_SEND, reverb, sfx)

  const pitch = ctx.createConstantSource()
  pitch.offset.value = 0
  pitch.start()

  return { ctx, master, music, musicFilter, musicOut, ship, sfx, pitch, noise: whiteNoise(ctx, AUDIO.NOISE_SEC) }
}

/** A gain node at `value`, optionally fed from `source` and feeding `dest`. */
export function gain(ctx: BaseAudioContext, value: number, dest?: AudioNode | AudioParam, source?: AudioNode): GainNode {
  const g = ctx.createGain()
  g.gain.value = value
  if (dest) connect(g, dest)
  source?.connect(g)
  return g
}

export function connect(node: AudioNode, dest: AudioNode | AudioParam): void {
  if (dest instanceof AudioNode) node.connect(dest)
  else node.connect(dest)
}

export function oscillator(ctx: BaseAudioContext, type: OscillatorType, freq: number, dest: AudioNode | AudioParam): OscillatorNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  connect(o, dest)
  o.start()
  return o
}

export function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q: number, dest: AudioNode): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  f.connect(dest)
  return f
}

/** Endless looped noise from the shared buffer, started at a random point so layers don't correlate. */
export function noiseLoop(core: AudioCore, dest: AudioNode): AudioBufferSourceNode {
  const src = core.ctx.createBufferSource()
  src.buffer = core.noise
  src.loop = true
  src.connect(dest)
  src.start(0, Math.random() * core.noise.duration)
  return src
}

/** Low-frequency oscillator modulating `param` by ±depth around its own value. */
export function lfo(ctx: BaseAudioContext, rate: number, depth: number, param: AudioParam): OscillatorNode {
  const depthGain = gain(ctx, depth, param)
  return oscillator(ctx, 'sine', rate, depthGain)
}

/** Smoothly moves a parameter toward `value` (exponential approach, AUDIO.SMOOTH time constant). */
export function glide(param: AudioParam, value: number, t: number, smooth: number = AUDIO.SMOOTH): void {
  param.setTargetAtTime(value, t, smooth)
}

function whiteNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** Stereo decaying noise: a dark, wide procedural hall. */
function impulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      // One-pole low-pass darkens the tail; the envelope fades it out.
      lp += 0.35 * (Math.random() * 2 - 1 - lp)
      data[i] = lp * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}
