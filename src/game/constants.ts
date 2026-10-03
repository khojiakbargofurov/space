import type { QualityLevel, QualityPreset } from './types'

/**
 * Every tunable number in the game lives here.
 * World units are arbitrary "game units"; the black hole sits at the origin.
 */

export const BLACK_HOLE = {
  /** Schwarzschild radius rs: the event horizon. */
  SCHWARZSCHILD_RADIUS: 10,
  /** Gravitational parameter G*M used for the Newtonian pull. Tuned for gameplay, not realism. */
  MASS_GM: 4000,
  /** Photon sphere, in units of rs. */
  PHOTON_SPHERE_RS: 1.5,
  /** Innermost stable circular orbit, in units of rs. */
  ISCO_RS: 3,
} as const

export const GRAVITY = {
  /** Plummer softening length so acceleration stays finite near r = 0. */
  SOFTENING: 0.5,
  /** Hard cap on gravitational acceleration magnitude (units/s^2). */
  MAX_ACCEL: 400,
} as const

export const DILATION = {
  /** Dilation factor 1/sqrt(1 - rs/r) is clamped to [1, MAX_FACTOR]. */
  MAX_FACTOR: 25,
  /** Radii below rs * (1 + MIN_R_EPS) are treated as MAX_FACTOR (avoids the singularity). */
  MIN_R_EPS: 0.0016,
} as const

export const DANGER = {
  /** Danger starts ramping up inside this radius (units of rs). */
  DANGER_RADIUS_RS: 4,
  /** Danger reaches 1 (certain death) at this radius (units of rs). */
  LETHAL_RADIUS_RS: 1.05,
} as const

/** Resource drain rates, per second of SHIP time (used from stage 5). */
export const DRAIN = {
  FUEL_PER_THRUST_SEC: 2.5,
  OXYGEN_PER_SEC: 0.4,
} as const

export const CAMERA = {
  FOV: 55,
  NEAR: 0.1,
  FAR: 20000,
  START_POSITION: [0, 30, 120] as const,
} as const

export const DEBUG = {
  /** How often the FPS readout refreshes, in seconds. */
  FPS_SAMPLE_INTERVAL: 0.5,
} as const

export const DEFAULT_QUALITY: QualityLevel = 'medium'

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { dpr: 1, antialias: false, starCount: 2000, lensingSteps: 48, bloom: false, particles: 200 },
  medium: { dpr: 1.5, antialias: true, starCount: 6000, lensingSteps: 96, bloom: true, particles: 600 },
  high: { dpr: 2, antialias: true, starCount: 15000, lensingSteps: 160, bloom: true, particles: 1500 },
}
