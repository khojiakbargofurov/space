export type QualityLevel = 'low' | 'medium' | 'high'

export type GamePhase = 'menu' | 'playing' | 'paused' | 'dead'

export interface QualityPreset {
  /** Max device pixel ratio for the renderer. */
  dpr: number
  antialias: boolean
  starCount: number
  /** Ray-march steps for the lensing shader (stage 2). */
  lensingSteps: number
  bloom: boolean
  /** Max live thrust/debris particles (stage 3+). */
  particles: number
  /** fbm octaves for accretion disk turbulence. */
  diskOctaves: number
  /** Cube map face size for the baked nebula background. */
  nebulaResolution: number
}
