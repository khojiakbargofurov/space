import type { QualityLevel, QualityPreset } from './types'

/**
 * Every tunable number in the game lives here.
 * World units are arbitrary "game units"; the black hole sits at the origin.
 */

export const BLACK_HOLE = {
  /** Schwarzschild radius rs: the event horizon. */
  SCHWARZSCHILD_RADIUS: 10,
  /**
   * Gravitational parameter G*M used for the Newtonian pull. Tuned for gameplay, not realism:
   * gravity beats full boost thrust inside ~1.7 rs, so hovering there is impossible (orbit instead).
   */
  MASS_GM: 16000,
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
  /** Integration sub-step is at most this fraction of the local dynamical time sqrt(r^3 / GM). */
  STEP_FACTOR: 0.02,
  MAX_SUBSTEPS: 16,
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

/** Ship consumables and hull integrity. */
export const RESOURCES = {
  FUEL_MAX: 100,
  OXYGEN_MAX: 100,
  HULL_MAX: 100,
  /** Below this fraction of the max a LOW warning shows. */
  LOW_FRACTION: 0.2,
  /** Below this fraction the warning turns critical. */
  CRITICAL_FRACTION: 0.1,
} as const

/** Resource drain rates, per second of SHIP time. */
export const DRAIN = {
  /** Fuel per second at full main throttle without boost. */
  FUEL_PER_THRUST_SEC: 1.2,
  /** Boost multiplies main-engine fuel flow by this (more than its thrust gain: boosting is wasteful). */
  BOOST_FUEL_MULTIPLIER: 3.2,
  /** Fuel per second per fully open RCS axis (strafe, reverse, brake). */
  FUEL_PER_RCS_SEC: 0.35,
  OXYGEN_PER_SEC: 0.4,
} as const

/** Hull damage rules shared by every hazard. */
export const HULL = {
  /** Seconds without damage before the hull starts repairing itself. */
  REGEN_DELAY: 5,
  REGEN_PER_SEC: 0.6,
  /** Seconds of grace after a collision so one contact can't hit every frame. */
  HIT_COOLDOWN: 0.4,
  /** Planet contact: no damage below this impact speed, then DAMAGE_PER_SPEED per extra u/s. */
  SAFE_IMPACT_SPEED: 6,
  PLANET_DAMAGE_PER_SPEED: 1.2,
} as const

/**
 * Tidal stretching across the hull: Δa = 2·GM·L / r³. Stress is 0 at ONSET_RS and reaches 1 at
 * DANGER.LETHAL_RADIUS_RS, where the ship is spaghettified. In between the hull takes DAMAGE_PER_SEC · stress².
 */
export const TIDAL = {
  /** Ship length used for the tidal difference (units). */
  SHIP_LENGTH: 4.3,
  ONSET_RS: 2.4,
  DAMAGE_PER_SEC: 60,
  /** Extra length of the ship model along the radial axis at stress 1 (in flight). */
  VISUAL_STRETCH: 0.35,
  /** Camera shake amplitude (units) at stress 1. */
  SHAKE: 0.12,
} as const

/** Flying through the accretion disk: the hull heats up inside its half-thickness, hottest at the inner edge. */
export const DISK_HEAT = {
  HALF_THICKNESS: 3.5,
  /** Damage per second in the mid-plane at the inner edge. */
  DAMAGE_PER_SEC: 45,
  /** Heat falls off as (r_in / r)^FALLOFF. */
  FALLOFF: 1.5,
  /** Heat fades out over this outer fraction of the disk. */
  EDGE_FADE: 0.15,
} as const

/**
 * Collectibles on circular prograde orbits around the hole (they move along UNIVERSE time, like planets).
 * Orbit radii in units. Chrono shards live deep in the well and pay POINTS · dilation^SHARD_DILATION_EXP.
 * Respawn delays are [min, max] universe seconds.
 */
export const PICKUPS = {
  SEED: 2024,
  fuel: { COUNT: 10, MIN_R: 60, MAX_R: 420, MAX_INCLINATION: 0.35, AMOUNT: 30, POINTS: 50, RADIUS: 3.5, RESPAWN: [25, 45] },
  oxygen: { COUNT: 8, MIN_R: 60, MAX_R: 420, MAX_INCLINATION: 0.35, AMOUNT: 35, POINTS: 50, RADIUS: 3.5, RESPAWN: [25, 45] },
  shard: { COUNT: 14, MIN_R: 16, MAX_R: 45, MAX_INCLINATION: 0.6, AMOUNT: 1, POINTS: 300, RADIUS: 3, RESPAWN: [12, 25] },
  SHARD_DILATION_EXP: 2,
  /** A respawning pickup waits until its new spot is at least this far from the ship. */
  SPAWN_CLEARANCE: 60,
} as const

/** Pickup look. Colors are sRGB hex; glow values are HDR multipliers (feed the bloom). */
export const PICKUP_LOOK = {
  fuel: { COLOR: '#ffaa3d', GLOW: 5, SIZE: 1.3 },
  oxygen: { COLOR: '#5fe0ff', GLOW: 5, SIZE: 1.2 },
  shard: { COLOR: '#c48cff', GLOW: 8, SIZE: 1.1 },
  /** Self-rotation, rad per real second. */
  SPIN: 1.3,
  /** Distant-glow sprite: world size, pixel clamp. Keeps far pickups visible as dots. */
  HALO_SIZE: 5,
  HALO_MIN_PX: 3,
  HALO_MAX_PX: 64,
  HALO_INTENSITY: 1.2,
} as const

/**
 * Debris belts: rubble on shearing circular orbits. Hitting a rock costs hull
 * (DAMAGE_BASE + DAMAGE_PER_SPEED per u/s of relative speed above SAFE_SPEED) and shatters it.
 */
export const DEBRIS = {
  SEED: 9917,
  /** Center radius, radial half-width, rock count and max inclination per belt. */
  BELTS: [
    { radius: 75, width: 18, count: 40, inclination: 0.12 },
    { radius: 215, width: 35, count: 55, inclination: 0.3 },
  ],
  /** Rock collision radius range (units). */
  SIZE: [1.2, 4.2],
  /** Self-rotation, rad per universe second. */
  SPIN: [0.2, 1.4],
  /** Rocks keep at least this many planet radii away from planet orbits. */
  PLANET_CLEARANCE: 2,
  SAFE_SPEED: 4,
  DAMAGE_BASE: 6,
  DAMAGE_PER_SPEED: 0.9,
  /** Fraction of the inward relative speed bounced back. */
  BOUNCE: 0.4,
  RESPAWN: [15, 30],
  /** A respawning rock waits until its new spot is at least this far from the ship. */
  SPAWN_CLEARANCE: 60,
} as const

export const DEBRIS_LOOK = {
  COLOR: '#776c62',
  ROUGHNESS: 0.95,
  METALNESS: 0.05,
  /** Surface lumpiness (fraction of radius). */
  JITTER: 0.32,
  /** Random squash per axis (min scale factor). */
  MIN_ASPECT: 0.65,
} as const

/** One-shot particle bursts (explosions, impact sparks, pickup sparkles). Kind 0 = fire, 1 = sparkle. */
export const BURST = {
  /** Pool size as a share of the quality preset's particle budget (at least MIN_CAPACITY). */
  CAPACITY_SHARE: 0.6,
  MIN_CAPACITY: 128,
  /** Bursts inherit this fraction of the source velocity. */
  INHERIT_VELOCITY: 0.3,
  EXPLOSION: { COUNT: 500, SPEED: 20, LIFE: 1.5, SIZE: 0.3, KIND: 0 },
  IMPACT: { COUNT: 40, SPEED: 9, LIFE: 0.8, SIZE: 0.35, KIND: 0 },
  PICKUP: { COUNT: 36, SPEED: 6, LIFE: 0.7, SIZE: 0.3, KIND: 1 },
  FIRE_HOT: '#fff1c9',
  FIRE_COOL: '#ff4a12',
  FIRE_INTENSITY: 3,
  SPARKLE_HOT: '#ffffff',
  SPARKLE_COOL: '#7f6bff',
  SPARKLE_INTENSITY: 2.4,
  GROWTH: 1.8,
  MAX_POINT_PX: 24,
} as const

/** Screen feedback on damage. */
export const DAMAGE_FX = {
  /** Camera shake (units) per hull point of instant damage, its cap and decay rate (1/s). */
  SHAKE_PER_DAMAGE: 0.025,
  MAX_SHAKE: 0.6,
  SHAKE_DECAY: 4,
  /** Red flash opacity per hull point, cap and decay rate (1/s). */
  FLASH_PER_DAMAGE: 0.05,
  MAX_FLASH: 0.6,
  FLASH_DECAY: 3,
} as const

/** Death sequences and the death screen. */
export const DEATH = {
  /** Spaghettification: seconds to fall from the death point to the horizon, final length factor. */
  SPAGHETTI_SEC: 2.6,
  SPAGHETTI_STRETCH: 6,
  /** Life support failure: seconds for the ship's lights to die, tumble rate (rad/s). */
  POWER_FADE_SEC: 1.6,
  TUMBLE_RATE: 0.35,
  /** Camera turn-to-follow rate (1/s) while it watches the wreck. */
  CAMERA_FOLLOW: 3,
  /** The watching camera backs out to at least this radius (units of rs) so it never sits inside the horizon. */
  CAMERA_MIN_RS: 2.5,
  /** Seconds before the death screen fades in. */
  SCREEN_DELAY: 1.8,
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

/**
 * Player ship flight model: Newtonian thrust plus gravity from the hole and the planets.
 * Ship axes: forward = -Z, up = +Y, right = +X. Accelerations in units/s^2, rates in rad/s.
 */
export const SHIP = {
  /** Spawn point and the point the ship faces at spawn. */
  SPAWN_POSITION: [0, 18, 320] as const,
  SPAWN_LOOK_AT: [0, 0, 0] as const,
  /** Spawn velocity as a fraction of the circular orbit speed there (0 = drop straight in). */
  SPAWN_ORBIT_FRACTION: 1,
  /** Collision radius against planet surfaces. */
  COLLISION_RADIUS: 1.6,
  /** Fraction of the inward speed kept (bounced back) on touching a planet. */
  BOUNCE_RESTITUTION: 0.3,
  MAIN_THRUST: 22,
  /** Main thrust multiplier while boosting. */
  BOOST_MULTIPLIER: 2.6,
  REVERSE_THRUST: 9,
  STRAFE_THRUST: 8,
  /** Auto-retro brake acceleration against current velocity. */
  BRAKE_THRUST: 16,
  /** Speed cap (safety rail against runaway velocity). */
  MAX_SPEED: 380,
  /** Commanded max rotation rates (body axes). */
  MAX_PITCH_RATE: 1.5,
  MAX_YAW_RATE: 1.1,
  MAX_ROLL_RATE: 2.4,
  /** How fast the attitude thrusters reach the commanded rate (1/s). Also stops spin on release. */
  ANGULAR_RESPONSE: 6,
  /** Main engine spool-up / spool-down rate (1/s). */
  ENGINE_SPOOL: 5,
  /** Frame delta is clamped to this before integrating (tab switches, hitches). */
  MAX_DT: 0.05,
  /** Engine nozzle positions (ship-local), exhaust leaves along +Z. */
  NOZZLES: [
    [-0.62, -0.06, 2.15],
    [0.62, -0.06, 2.15],
  ] as const,
} as const

export const CONTROLS = {
  /** Mouse (pointer lock): rad of rotation per pixel of mouse travel. */
  MOUSE_SENSITIVITY: 0.0022,
  INVERT_Y: false,
} as const

/** Third-person chase camera. Offsets are ship-local. */
export const CHASE_CAM = {
  FOV: 62,
  OFFSET: [0, 1.35, 7.2] as const,
  /** Camera looks at this ship-local point (ahead of the nose). */
  LOOK_AHEAD: [0, 0.55, -8] as const,
  /** Orientation follow rate (1/s): lower = camera swings more lazily behind turns. */
  ROTATION_FOLLOW: 7,
  /** Ship-local acceleration shifts the camera back by this many units per (unit/s^2). */
  ACCEL_PULLBACK: 0.045,
  ACCEL_FOLLOW: 4,
  /** Extra distance per unit/s of speed, capped. */
  SPEED_PULLBACK: 0.006,
  SPEED_PULLBACK_MAX: 2.2,
  /** FOV widening at full boost. */
  BOOST_FOV_KICK: 9,
  /** Shake amplitude (units) at full boost. */
  BOOST_SHAKE: 0.035,
  MIN_DISTANCE: 3,
  MAX_DISTANCE: 22,
  /** Distance change per wheel notch (multiplicative). */
  ZOOM_STEP: 1.1,
  /** Seconds of the swoop from the orbit view into the chase position. */
  INTRO_SEC: 1.6,
} as const

/** First-person view from the cockpit. */
export const COCKPIT_CAM = {
  FOV: 72,
  /** Eye position, ship-local. */
  EYE: [0, 0.46, -0.5] as const,
  BOOST_FOV_KICK: 6,
  BOOST_SHAKE: 0.008,
} as const

/** Procedural ship look. Colors are sRGB hex; glow values are HDR multipliers (feed the bloom). */
export const SHIP_LOOK = {
  HULL_COLOR: '#d4d7dd',
  HULL_METALNESS: 0.45,
  HULL_ROUGHNESS: 0.42,
  TRIM_COLOR: '#2b3039',
  ACCENT_COLOR: '#d8743a',
  CANOPY_COLOR: '#0a1824',
  /** Reflection strength of the baked nebula on the hull. */
  ENV_INTENSITY: 3,
  ENGINE_GLOW_COLOR: '#7cc4ff',
  ENGINE_GLOW_IDLE: 0.12,
  ENGINE_GLOW_MAX: 9,
  /** Port (left) and starboard (right) wingtip lights, tail strobe. */
  NAV_PORT_COLOR: '#ff3b30',
  NAV_STARBOARD_COLOR: '#36ff7a',
  NAV_GLOW: 4,
  STROBE_GLOW: 14,
  STROBE_PERIOD: 1.4,
  STROBE_FLASH: 0.06,
} as const

/** Light the ship (the lensing view is self-lit and ignores these). */
export const SHIP_LIGHTING = {
  /** The accretion disk acts as a warm point light at the origin. */
  DISK_LIGHT_COLOR: '#ffb37a',
  DISK_LIGHT_INTENSITY: 1600,
  DISK_LIGHT_DECAY: 1.2,
  /** Cool fill from the galactic band. */
  FILL_COLOR: '#9fb6ff',
  FILL_INTENSITY: 0.45,
  AMBIENT_COLOR: '#3a4060',
  AMBIENT_INTENSITY: 0.25,
} as const

/** Thruster particles. Speeds are relative to the ship; colors blend hot → cool over a particle's life. */
export const EXHAUST = {
  MAIN_SPEED: 16,
  MAIN_SPREAD: 1.1,
  MAIN_LIFE: 0.38,
  /** Share of the quality preset's particle budget emitted per MAIN_LIFE at full throttle. */
  MAIN_BUDGET_SHARE: 0.85,
  MAIN_SIZE: 0.2,
  MAIN_HOT: '#e6f3ff',
  MAIN_COOL: '#5b3dff',
  MAIN_INTENSITY: 1.8,
  /** Reaction-control puffs (strafe, reverse, brake). */
  RCS_SPEED: 9,
  RCS_SPREAD: 1.6,
  RCS_LIFE: 0.35,
  RCS_RATE: 90,
  RCS_SIZE: 0.14,
  RCS_HOT: '#ffffff',
  RCS_COOL: '#7d8798',
  RCS_INTENSITY: 0.9,
  /** Particles grow by this factor over their life. */
  GROWTH: 1.8,
  /** Pixel size cap so close particles don't flood the screen. */
  MAX_POINT_PX: 36,
} as const

/**
 * Procedural planets on circular (slightly inclined) orbits around the hole. Their motion follows
 * UNIVERSE time, so from deep in the well the outside system visibly speeds up.
 * Each planet has real gravity (GM = surfaceGravity * radius^2), which makes slingshots possible.
 */
export const PLANETS = {
  SEED: 7331,
  COUNT: 5,
  /** First orbit radius and the random spacing between successive orbits. */
  MIN_ORBIT: 170,
  ORBIT_GAP_MIN: 90,
  ORBIT_GAP_MAX: 170,
  /** No orbit within this distance plus the planet's gravity reach (SOI * GRAVITY_FADE) of the spawn radius. */
  SPAWN_CLEARANCE: 60,
  /** Max orbital inclination (radians) against the disk plane. */
  MAX_INCLINATION: 0.22,
  /** Max axial tilt (radians). */
  MAX_TILT: 0.5,
  /** Self-rotation in rad per universe second. */
  SPIN_MIN: 0.02,
  SPIN_MAX: 0.08,
  /** Relative odds per kind. */
  KIND_WEIGHTS: { rocky: 3, gas: 2, ice: 2, lava: 1.5 },
  /** Radius range per kind (units). */
  RADIUS: {
    rocky: [6, 11],
    gas: [17, 26],
    ice: [8, 13],
    lava: [6, 10],
  },
  /** Surface gravity range per kind (units/s^2). */
  SURFACE_GRAVITY: {
    rocky: [9, 14],
    gas: [8, 11],
    ice: [8, 12],
    lava: [10, 15],
  },
  /** Chance that a gas giant (or, rarely, an ice world) has rings. */
  GAS_RING_CHANCE: 0.75,
  ICE_RING_CHANCE: 0.2,
  /**
   * Sphere of influence, in planet radii. Planet gravity is full inside it and fades smoothly to zero
   * at SOI * GRAVITY_FADE (patched-conics style), so planets shape local flight without dragging the
   * whole system around. Slingshots are measured inside it.
   */
  SOI_RADII: 9,
  GRAVITY_FADE: 1.4,
} as const

/** Planet rendering. Colors are sRGB hex; light falls off with distance from the disk at the origin. */
export const PLANET_LOOK = {
  LIGHT_COLOR: '#ffcf9e',
  /** Lit-side irradiance = LIGHT_INTENSITY / distance^LIGHT_DECAY. */
  LIGHT_INTENSITY: 60,
  LIGHT_DECAY: 0.65,
  AMBIENT: '#0d1222',
  /** Base noise frequency on the unit sphere. */
  NOISE_SCALE: 2.2,
  /** Number of latitude bands on gas giants. */
  GAS_BANDS: 9,
  /** Atmosphere shell radius (planet radii) and glow strength. */
  ATMO_SCALE: 1.16,
  ATMO_INTENSITY: 1.4,
  /** Lava crack glow (HDR). */
  LAVA_GLOW: 2.4,
  RING_INNER: 1.45,
  RING_OUTER: 2.5,
  RING_OPACITY: 0.85,
  PALETTES: {
    rocky: [
      ['#6b5640', '#c29d72', '#3d3229', '#ece6dc'],
      ['#7a4030', '#d07a52', '#4a271e', '#f0e2d2'],
      ['#56664f', '#aeb08a', '#363b31', '#eef2ea'],
    ],
    gas: [
      ['#c48a52', '#efd9b4', '#8f4a2e', '#f5e8d0'],
      ['#4f6fa8', '#bcd2ee', '#2d3f73', '#e8f0fa'],
      ['#8a6aa0', '#e0cde8', '#4b3366', '#f3ebf7'],
    ],
    ice: [
      ['#9fb9cf', '#e9f3fb', '#5f86a8', '#ffffff'],
      ['#7fb5b0', '#dff4f0', '#3f7d7a', '#ffffff'],
    ],
    lava: [
      ['#1a1210', '#3b2a24', '#ff6a1a', '#ffd27a'],
      ['#141418', '#2e2a30', '#ff3d2e', '#ffb35c'],
    ],
  },
  ATMO_COLORS: {
    rocky: '#e8a87a',
    gas: '#f2d2a8',
    ice: '#9cc8ff',
    lava: '#ff7a3a',
  },
} as const

/** Planet name generator: two or three syllables plus a catalogue numeral. */
export const PLANET_NAMES = {
  SYLLABLES: ['ka', 'vel', 'dra', 'mor', 'thi', 'sen', 'ul', 'qua', 'ri', 'zo', 'ne', 'bar', 'ix', 'lo', 'tam', 'ze', 'or', 'phe'],
  NUMERALS: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
} as const

/** Scoring. The core currency is TIME DEBT: universe seconds that passed beyond your own. */
export const SCORE = {
  POINTS_PER_DEBT_SEC: 100,
} as const

/** Gravity assist around a moving planet: speed gained from the planet's pull inside its sphere of influence. */
export const SLINGSHOT = {
  MIN_GAIN: 1.5,
  POINTS_PER_SPEED: 120,
} as const

/** Periapsis pass around the hole: bonus when the closest approach dips below MAX_RS. */
export const CLOSE_PASS = {
  MAX_RS: 3,
  /** Bonus = POINTS * (dilation at periapsis - 1). */
  POINTS: 2000,
  /** Seconds before another close pass can score (stops jitter while hovering from spamming it). */
  COOLDOWN: 5,
} as const

/** Heads-up display. */
export const HUD = {
  /** Text refresh interval in seconds (markers move every frame). */
  INTERVAL: 0.1,
  /** Dilation bar is full at this factor. */
  DILATION_BAR_MAX: 3,
  /** Screen-edge margin for clamped off-screen markers (px). */
  MARKER_MARGIN: 36,
  /** Prograde marker distance ahead of the ship (units). */
  PROGRADE_DISTANCE: 200,
  /** Hide the prograde marker below this speed. */
  PROGRADE_MIN_SPEED: 0.5,
  TOAST_SEC: 3.2,
  /** Nearest-pickup markers only show within this distance (units). */
  PICKUP_MARKER_RANGE: 1200,
} as const

/**
 * Procedural sound (Web Audio, no files). Gains are linear (0..1 before the master compressor),
 * frequencies in Hz, times in seconds. The music is a key of D: drone, pads and an arpeggio.
 * Near the hole the ship's music drops in pitch by dilation^-PITCH_EXP and slows by dilation^-TEMPO_EXP,
 * while the "universe shimmer" (light falling in from outside) flutters faster and rises (blueshift).
 */
export const AUDIO = {
  MASTER_GAIN: 0.8,
  MUSIC_GAIN: 0.55,
  SFX_GAIN: 0.8,
  SHIP_GAIN: 0.7,
  /** Share of each bus sent to the procedural reverb, and the reverb tail length. */
  REVERB_SEND: 0.35,
  REVERB_SEC: 3.2,
  REVERB_DECAY: 2.6,
  /** Smoothing time constant for continuous parameters, and how often they are pushed (s). */
  SMOOTH: 0.12,
  PARAM_INTERVAL: 1 / 30,
  /** Mute / unmute fade. */
  MUTE_FADE: 0.08,
  /** Seconds of looped white noise shared by every noise layer. */
  NOISE_SEC: 2,
  /** Time dilation → music pitch / tempo. Pitch never drops below MIN_PITCH, tempo never below MIN_TEMPO. */
  PITCH_EXP: 0.22,
  MIN_PITCH: 0.5,
  TEMPO_EXP: 0.55,
  MIN_TEMPO: 0.2,
  /** Music low-pass: open while flying, closed after a death. */
  MUSIC_CUTOFF: 5200,
  MUSIC_CUTOFF_DEAD: 420,
  /** Music level per phase (multiplies MUSIC_GAIN). */
  MUSIC_MENU: 1,
  MUSIC_FLYING: 0.8,
  MUSIC_DEAD: 0.6,
} as const

export const DRONE = {
  /** D1 sub, D2 body, A2 fifth. */
  FREQS: [36.71, 73.42, 110],
  GAINS: [0.5, 0.28, 0.12],
  CUTOFF: 220,
  /** Slow filter sweep: rate (Hz) and depth (Hz). */
  LFO_RATE: 0.045,
  LFO_DEPTH: 140,
  GAIN: 0.55,
  /** The drone swells by this much at full danger. */
  DANGER_BOOST: 0.8,
} as const

export const PADS = {
  /** Chord root (D3) and four voices per chord, in semitones from it. */
  ROOT: 146.83,
  CHORDS: [
    [0, 7, 10, 14],
    [-4, 3, 7, 12],
    [-2, 2, 5, 9],
    [-7, 0, 3, 8],
  ],
  /** Two oscillators per voice, detuned ± this many cents. */
  DETUNE_CENTS: 8,
  CUTOFF: 950,
  Q: 0.6,
  /** Chord-change glide (multiplied by the inverse tempo). */
  GLIDE: 0.7,
  /** Slow volume swell. */
  SWELL_RATE: 0.07,
  SWELL_DEPTH: 0.35,
  GAIN: 0.12,
} as const

export const ARP = {
  /** Seconds per note at tempo 1, notes per chord. */
  STEP_SEC: 0.34,
  STEPS_PER_CHORD: 16,
  /** Per pattern step: chord tone index (0..3) and frequency multiplier over the pad voicing. */
  PATTERN: [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3],
  OCTAVE: [2, 2, 2, 2, 4, 2, 2, 4, 2, 2, 4, 2, 4, 2, 2, 4],
  /** Round-robin pluck voices (each rings out under the next notes without clicks). */
  VOICES: 3,
  /** Pluck envelope: attack, decay time constant, peak level. */
  ATTACK: 0.008,
  DECAY: 0.22,
  PEAK: 0.16,
  /** Echo: delay time, feedback, wet level, damping cutoff. */
  ECHO_SEC: 0.51,
  ECHO_FEEDBACK: 0.42,
  ECHO_WET: 0.5,
  ECHO_CUTOFF: 2400,
  /** Scheduler look-ahead (s). */
  LOOKAHEAD: 0.15,
  /** Arp level per phase. */
  MENU_LEVEL: 0.55,
  FLYING_LEVEL: 1,
} as const

/** Light from the outside universe: band-passed noise, tremolo rate × dilation, center rises with dilation. */
export const SHIMMER = {
  FREQ: 4200,
  Q: 3,
  /** Center frequency follows dilation up to this factor (blueshift). */
  MAX_SHIFT: 2.2,
  RATE: 0.6,
  MAX_RATE: 24,
  GAIN: 0.05,
  /** Level at dilation 1 (fraction of GAIN); full at FULL_AT. */
  BASE: 0.15,
  FULL_AT: 3,
} as const

/** Ship sounds driven every frame by flight and hazard state. */
export const SHIP_AUDIO = {
  /** Main engine: sawtooth rumble + low-passed noise. */
  ENGINE_FREQ: 42,
  ENGINE_FREQ_THROTTLE: 22,
  ENGINE_FREQ_BOOST: 26,
  ENGINE_CUTOFF: 180,
  ENGINE_CUTOFF_THROTTLE: 700,
  ENGINE_CUTOFF_BOOST: 2200,
  ENGINE_GAIN: 0.42,
  ENGINE_NOISE: 0.6,
  ENGINE_BOOST_GAIN: 0.5,
  /** Idle hum while the ship has power. */
  IDLE_GAIN: 0.05,
  /** Reaction control: high-passed hiss. */
  RCS_CUTOFF: 2600,
  RCS_GAIN: 0.18,
  /** Tidal groan: resonant low band, wobbling. */
  TIDAL_FREQ: 95,
  TIDAL_Q: 9,
  TIDAL_WOBBLE_RATE: 0.8,
  TIDAL_WOBBLE_DEPTH: 45,
  TIDAL_GAIN: 0.9,
  /** Disk plasma roar. */
  HEAT_FREQ: 700,
  HEAT_Q: 0.7,
  HEAT_GAIN: 0.5,
  /** Horizon proximity sub-bass. */
  SUB_FREQ: 31,
  SUB_GAIN: 0.45,
} as const

/** Warning tones, matched to the HUD warnings. Intervals are ship seconds between beep groups. */
export const ALARM = {
  LOW_FREQ: 620,
  CRITICAL_FREQ: 880,
  LOW_INTERVAL: 2.4,
  CRITICAL_INTERVAL: 0.9,
  BEEP_SEC: 0.09,
  /** Gap between the two beeps of a critical alarm. */
  DOUBLE_GAP: 0.16,
  GAIN: 0.07,
  /** Danger level (0..1) and tidal stress above which the alarm turns critical. */
  DANGER_CRITICAL: 0.6,
  TIDAL_CRITICAL: 0.35,
} as const

/** One-shot effects: overall levels per effect. */
export const SFX = {
  PICKUP: 0.35,
  SHARD: 0.3,
  SLINGSHOT: 0.4,
  CLOSE_PASS: 0.45,
  IMPACT: 0.7,
  EXPLOSION: 0.9,
  SPAGHETTI: 0.5,
  POWER_DOWN: 0.45,
  LAUNCH: 0.35,
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
    diskOctaves: 3, nebulaResolution: 256, planetSegments: 32, planetOctaves: 3, rockDetail: 1,
  },
  medium: {
    dpr: 1.5, msaa: 4, starCount: 7000, lensingSteps: 96, bloom: true, particles: 600,
    diskOctaves: 4, nebulaResolution: 512, planetSegments: 64, planetOctaves: 4, rockDetail: 1,
  },
  high: {
    dpr: 2, msaa: 4, starCount: 15000, lensingSteps: 160, bloom: true, particles: 1500,
    diskOctaves: 6, nebulaResolution: 768, planetSegments: 96, planetOctaves: 5, rockDetail: 2,
  },
}
