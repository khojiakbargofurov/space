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
  START_POSITION: [0, 55, 300] as const,
} as const

/** Free orbit camera around the black hole (stage 1 viewer; later the menu / spectator view). */
export const ORBIT = {
  /** Never let the camera inside this distance (units of rs). */
  MIN_DISTANCE_RS: 2.5,
  MAX_DISTANCE: 1500,
  /** Fraction of remaining motion removed per 1/60 s; rescaled by delta each frame. */
  DAMPING: 0.06,
  ROTATE_SPEED: 0.6,
  ZOOM_SPEED: 0.8,
  /** Radians per second of idle auto-orbit (stops once the user drags). */
  AUTO_ROTATE_RAD_PER_SEC: 0.04,
} as const

/** Ray-traced gravitational lensing (null geodesics in the Schwarzschild metric). */
export const LENSING = {
  /** Rays passing closer than this are integrated numerically; outside, weak-field deflection 2rs/b is analytic. */
  NUMERIC_RADIUS_RS: 30,
  /** Step length = r * STEP_BUDGET / lensingSteps (adaptive: small near the hole, large far away). */
  STEP_BUDGET: 7.7,
} as const

/** Accretion disk: thin, semi-transparent, Keplerian, Doppler-beamed. Ray-traced inside the lensing shader. */
export const DISK = {
  /** Inner edge, in units of rs (defaults to the ISCO). */
  INNER_RS: BLACK_HOLE.ISCO_RS,
  OUTER_RS: 14,
  /** Angular speed at the inner edge (rad/s); falls off as r^-1.5. */
  INNER_OMEGA: 0.55,
  /** Seconds per turbulence flow cycle (two cross-faded layers stop infinite wind-up). */
  FLOW_PERIOD: 9,
  /** Noise features around the circumference (lower = longer filaments). */
  ANGULAR_FREQ: 2.6,
  /** Noise features per e-fold of radius. */
  RADIAL_FREQ: 5.5,
  /** Fine concentric striations. */
  RING_FREQ: 42,
  RING_CONTRAST: 0.22,
  /** Domain warp amount (turbulence). */
  WARP: 0.9,
  /** Scales orbital velocity used for Doppler (1 = Keplerian Schwarzschild speed). */
  DOPPLER_STRENGTH: 0.85,
  /** Relativistic beaming: intensity ~ g^BEAMING_EXP. */
  BEAMING_EXP: 3,
  /** Temperature falloff exponent: T ~ (r_in / r)^TEMP_FALLOFF. */
  TEMP_FALLOFF: 0.85,
  /** Multiplies observed temperature before the color ramp. */
  TEMP_SCALE: 1.0,
  BRIGHTNESS: 5,
  /** Face-on optical depth at full density; grows as 1/cos(i) at grazing angles. */
  OPACITY: 0.7,
  /** Color ramp from cool outer gas to blue-shifted hot gas (sRGB hex). */
  COLOR_COOL: '#b8320c',
  COLOR_WARM: '#ff8a2e',
  COLOR_HOT: '#ffe2b8',
  COLOR_BLUE: '#b9d4ff',
} as const

/**
 * Procedural stars, evaluated per pixel from the (lensed) view direction so they bend around the hole.
 * Each layer is a grid on the six cube faces with at most one star per cell.
 */
export const STARFIELD = {
  /** Fraction of stars concentrated in the galactic band. */
  BAND_FRACTION: 0.4,
  /** Thickness of the band (gaussian sigma of dot(dir, bandNormal)). */
  BAND_SIGMA: 0.13,
  /** Per layer: grid cells per cube-face edge, share of starCount, HDR gain, gaussian radius in pixels. */
  LAYERS: [
    { grid: 160, share: 0.72, gain: 0.9, sizePx: 0.85 },
    { grid: 80, share: 0.25, gain: 2.2, sizePx: 1.1 },
    { grid: 36, share: 0.03, gain: 7, sizePx: 1.6 },
  ],
  /** Higher = more faint stars relative to bright ones within a layer. */
  BRIGHTNESS_POWER: 3,
  TWINKLE: 0.1,
  /** Star colors (sRGB hex) and their relative weights. */
  COLORS: ['#9db4ff', '#cdd9ff', '#f6f4ff', '#fff1df', '#ffd4a3', '#ffb173'],
  COLOR_WEIGHTS: [0.08, 0.17, 0.3, 0.22, 0.15, 0.08],
} as const

/** Shared orientation of the galactic plane (stars + nebula band). Normalized at use. */
export const GALAXY_BAND_NORMAL = [0.32, 0.88, 0.35] as const

/** Procedural nebula, baked once per quality change into a cube map sampled by the lensing shader. */
export const NEBULA = {
  SEED: 4.2,
  /** Base noise frequency on the unit sphere. */
  SCALE: 2.1,
  WARP: 1.4,
  INTENSITY: 0.22,
  /** Angular thickness of the bright band (dot with band normal). */
  BAND_WIDTH: 0.24,
  BAND_STRENGTH: 0.55,
  DUST_STRENGTH: 0.75,
  COLOR_A: '#1b3a6b',
  COLOR_B: '#5b1f6e',
  COLOR_C: '#a8552a',
  COLOR_BAND: '#d8c3a5',
} as const

/** Post-processing (HDR, before tone mapping for bloom). */
export const POST = {
  BLOOM_THRESHOLD: 0.75,
  BLOOM_SMOOTHING: 0.3,
  BLOOM_INTENSITY: 0.85,
  BLOOM_RADIUS: 0.72,
  BLOOM_LEVELS: 7,
  /** Chromatic aberration offset in UV units, scaled up toward the screen edges. */
  CA_OFFSET: 0.0011,
  /** Radius (0..1) inside which there is no aberration. */
  CA_MODULATION_OFFSET: 0.25,
  VIGNETTE_OFFSET: 0.32,
  VIGNETTE_DARKNESS: 0.68,
  GRAIN_OPACITY: 0.07,
} as const

export const DEBUG = {
  /** How often the FPS readout refreshes, in seconds. */
  FPS_SAMPLE_INTERVAL: 0.5,
} as const

export const DEFAULT_QUALITY: QualityLevel = 'medium'

export const QUALITY_ORDER: readonly QualityLevel[] = ['low', 'medium', 'high']

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    dpr: 1, msaa: 0, starCount: 3000, lensingSteps: 48, bloom: false, particles: 200,
    diskOctaves: 3, nebulaResolution: 256,
  },
  medium: {
    dpr: 1.5, msaa: 4, starCount: 7000, lensingSteps: 96, bloom: true, particles: 600,
    diskOctaves: 4, nebulaResolution: 512,
  },
  high: {
    dpr: 2, msaa: 4, starCount: 15000, lensingSteps: 160, bloom: true, particles: 1500,
    diskOctaves: 6, nebulaResolution: 768,
  },
}
