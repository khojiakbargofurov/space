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
  /** Width segments of planet spheres (height segments = half). */
  planetSegments: number
  /** fbm octaves for planet surfaces. */
  planetOctaves: number
  /** Icosahedron subdivision of debris rocks. */
  rockDetail: number
}

export type PlanetKind = 'rocky' | 'gas' | 'ice' | 'lava'

export type CameraMode = 'chase' | 'cockpit'

/** Pilot commands for one frame. Axes are -1..1 (rotation: fraction of max rate). */
export interface FlightInput {
  /** +1 main engine, -1 reverse thrusters. */
  thrust: number
  /** +1 right, -1 left. */
  strafeX: number
  /** +1 up, -1 down. */
  strafeY: number
  /** +1 nose up. */
  pitch: number
  /** +1 nose left. */
  yaw: number
  /** +1 roll left. */
  roll: number
  boost: boolean
  brake: boolean
}

export type PickupKind = 'fuel' | 'oxygen' | 'shard'

/** What ended a run. */
export type DeathCause = 'spaghettified' | 'incinerated' | 'destroyed' | 'suffocated'

/** Hull damage sources (the last one decides how a hull failure reads). */
export type DamageSource = 'tidal' | 'heat' | 'impact'

/** Snapshot of a finished run for the death screen. */
export interface DeathReport {
  cause: DeathCause
  score: number
  shards: number
  shipTime: number
  universeTime: number
  peakDilation: number
  /** Closest approach to the hole, in units of rs. */
  deepestRs: number
}
