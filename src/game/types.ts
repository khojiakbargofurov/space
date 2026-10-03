export type QualityLevel = 'low' | 'medium' | 'high'

export type GamePhase = 'menu' | 'playing' | 'paused' | 'dead'

export interface QualityPreset {
  /** Max device pixel ratio for the renderer. */
  dpr: number
  /** MSAA samples for the post-processing frame buffer (0 = off). */
  msaa: number
  starCount: number
  /** Max geodesic integration steps per pixel in the lensing shader. */
  lensingSteps: number
  bloom: boolean
  /** Max live thrust/debris particles (stage 3+). */
  particles: number
  /** fbm octaves for accretion disk turbulence. */
  diskOctaves: number
  /** Cube map face size for the baked nebula background. */
  nebulaResolution: number
}
