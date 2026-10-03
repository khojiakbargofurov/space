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

/** Event horizon sphere and the thin glow hugging its silhouette. */
export const HORIZON_VISUAL = {
  SEGMENTS: 64,
  /** Glow ring radius, in units of rs. */
  RING_RS: 1.1,
  /** Gaussian width of the bright ring (units of rs). */
  RING_WIDTH_RS: 0.07,
  /** Exponential falloff of the soft halo beyond the ring (units of rs). */
  HALO_FALLOFF_RS: 0.5,
  HALO_STRENGTH: 0.18,
  /** Billboard half-size (units of rs). */
  EXTENT_RS: 3,
  INTENSITY: 1.6,
  COLOR: '#ffb978',
} as const

/** Accretion disk: thin, optically thin, Keplerian, Doppler-beamed. */
export const DISK = {
  /** Inner edge, in units of rs (defaults to the ISCO). */
  INNER_RS: BLACK_HOLE.ISCO_RS,
  OUTER_RS: 14,
  THETA_SEGMENTS: 192,
  RADIAL_SEGMENTS: 12,
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
  BRIGHTNESS: 2.6,
  /** Cap on the 1/cos(i) brightening when viewed edge-on. */
  MAX_GRAZING_BOOST: 3,
  /** Color ramp from cool outer gas to blue-shifted hot gas (sRGB hex). */
  COLOR_COOL: '#b8320c',
  COLOR_WARM: '#ff8a2e',
  COLOR_HOT: '#ffe2b8',
  COLOR_BLUE: '#b9d4ff',
} as const

/** Background stars: points on a camera-locked shell (no parallax, they are "at infinity"). */
export const STARFIELD = {
  SEED: 1337,
  RADIUS: 9000,
  /** Fraction of stars concentrated in the galactic band. */
  BAND_FRACTION: 0.4,
  /** Angular thickness of the band (radians, gaussian sigma). */
  BAND_SIGMA: 0.13,
  MIN_SIZE_PX: 1.2,
  MAX_SIZE_PX: 4.5,
  /** Higher = more faint stars relative to bright ones. */
  BRIGHTNESS_POWER: 5,
  /** HDR multiplier for the brightest stars (feeds bloom in stage 2). */
  MAX_INTENSITY: 3,
  TWINKLE: 0.12,
  /** Star colors (sRGB hex) and their relative weights. */
  COLORS: ['#9db4ff', '#cdd9ff', '#f6f4ff', '#fff1df', '#ffd4a3', '#ffb173'],
  COLOR_WEIGHTS: [0.08, 0.17, 0.3, 0.22, 0.15, 0.08],
} as const

/** Shared orientation of the galactic plane (stars + nebula band). Normalized at use. */
export const GALAXY_BAND_NORMAL = [0.32, 0.88, 0.35] as const

/** Procedural nebula, baked once per quality change into a cube map (scene background). */
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

export const DEBUG = {
  /** How often the FPS readout refreshes, in seconds. */
  FPS_SAMPLE_INTERVAL: 0.5,
} as const

export const DEFAULT_QUALITY: QualityLevel = 'medium'

export const QUALITY_ORDER: readonly QualityLevel[] = ['low', 'medium', 'high']

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    dpr: 1, antialias: false, starCount: 2000, lensingSteps: 48, bloom: false, particles: 200,
    diskOctaves: 3, nebulaResolution: 256,
  },
  medium: {
    dpr: 1.5, antialias: true, starCount: 6000, lensingSteps: 96, bloom: true, particles: 600,
    diskOctaves: 4, nebulaResolution: 512,
  },
  high: {
    dpr: 2, antialias: true, starCount: 15000, lensingSteps: 160, bloom: true, particles: 1500,
    diskOctaves: 6, nebulaResolution: 768,
  },
}
