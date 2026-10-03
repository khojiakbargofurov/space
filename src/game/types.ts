export type QualityLevel = 'low' | 'medium' | 'high'

/**
 * menu: orbit view, nothing flies · playing: in flight · dead: death sequence and report ·
 * warp: falling through a wormhole · transit: arrived in the next sector, shop open before launch.
 */
export type GamePhase = 'menu' | 'playing' | 'dead' | 'warp' | 'transit'

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
  /** Sector index (0-based) the run ended in, and its name. */
  sector: number
  sectorName: string
  score: number
  shards: number
  shipTime: number
  universeTime: number
  peakDilation: number
  /** Closest approach to the hole, in units of rs. */
  deepestRs: number
}

/** Sky of a sector: the nebula baked into the background and the galactic band orientation. */
export interface NebulaLook {
  seed: number
  intensity: number
  /** sRGB hex: deep gas, mid gas, warm dust light, galactic band. */
  colors: readonly [string, string, string, string]
  /** Galactic band plane normal (normalized at use). Stars and nebula share it. */
  bandNormal: readonly [number, number, number]
}

/** Accretion disk color ramp (sRGB hex, cool outer gas → blue-shifted hot gas) and output. */
export interface DiskLook {
  cool: string
  warm: string
  hot: string
  blue: string
  brightness: number
  /** Multiplies observed temperature before the color ramp (higher = whiter, bluer). */
  tempScale: number
}

/** One sector: its procedural seed, difficulty knobs and look. */
export interface SectorSpec {
  name: string
  seed: number
  planets: number
  /** Chrono shards needed to open the wormhole out of the sector. */
  shardQuota: number
  /** Multiplier on debris belt rock counts. */
  debris: number
  /** Multipliers on pickup counts per kind. */
  fuel: number
  oxygen: number
  shards: number
  /** Multiplier on oxygen consumption. */
  oxygenDrain: number
  /** Multiplier on every point scored in the sector. */
  scoreMult: number
  nebula: NebulaLook
  disk: DiskLook
}

export interface SectorConfig extends SectorSpec {
  /** 0-based sector index. */
  index: number
  /** Beyond the hand-made sectors. */
  endless: boolean
}

export type UpgradeId = 'fuelTank' | 'oxygen' | 'hull' | 'thrust' | 'injectors' | 'tidal' | 'heat' | 'collector'

export interface UpgradeSpec {
  name: string
  detail: string
  /** Shard cost of each level; the number of levels is costs.length. */
  costs: readonly number[]
  /** Effect per level (fraction, see the stat it changes). */
  perLevel: number
}

export type UpgradeLevels = Record<UpgradeId, number>

/** Run state saved on entering a sector, so a reload continues from there. */
export interface Checkpoint {
  sector: number
  score: number
  shards: number
  shipTime: number
  universeTime: number
  peakDilation: number
  minR: number
}

/** What crossing into the next sector paid (shown on arrival). */
export interface SectorClearReport {
  /** Index of the sector just cleared. */
  sector: number
  /** Shards collected there. */
  collected: number
  bonusPoints: number
  bonusShards: number
}
