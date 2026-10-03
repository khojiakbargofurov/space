import { DEFAULT_QUALITY, QUALITY_ORDER, SAVE, UPGRADE_ORDER, UPGRADES } from './constants'
import type { Checkpoint, QualityLevel, UpgradeLevels } from './types'

/** Everything that survives a reload. */
export interface SaveData {
  /** Banked chrono shards (the upgrade currency). */
  bank: number
  upgrades: UpgradeLevels
  bestScore: number
  /** Deepest sector index ever reached. */
  bestSector: number
  checkpoint: Checkpoint | null
  quality: QualityLevel
  muted: boolean
}

export function emptyUpgrades(): UpgradeLevels {
  const levels = {} as UpgradeLevels
  for (const id of UPGRADE_ORDER) levels[id] = 0
  return levels
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback
}

function int(v: unknown, max = Number.MAX_SAFE_INTEGER): number {
  return Math.min(max, Math.floor(num(v)))
}

function readCheckpoint(v: unknown): Checkpoint | null {
  if (!v || typeof v !== 'object') return null
  const c = v as Record<string, unknown>
  if (int(c.sector) < 1) return null
  return {
    sector: int(c.sector),
    score: num(c.score),
    shards: int(c.shards),
    shipTime: num(c.shipTime),
    universeTime: num(c.universeTime),
    peakDilation: Math.max(1, num(c.peakDilation, 1)),
    minR: num(c.minR, Infinity),
  }
}

/** Reads and validates the save; anything missing or malformed falls back to defaults. */
export function loadSave(): SaveData {
  let raw: Record<string, unknown> = {}
  try {
    const text = localStorage.getItem(SAVE.KEY)
    const parsed: unknown = text ? JSON.parse(text) : null
    if (parsed && typeof parsed === 'object' && (parsed as { version?: unknown }).version === SAVE.VERSION) {
      raw = parsed as Record<string, unknown>
    }
  } catch {
    // Storage blocked (privacy mode) or corrupt JSON: start fresh.
  }

  const upgrades = emptyUpgrades()
  const savedUpgrades = (raw.upgrades ?? {}) as Record<string, unknown>
  for (const id of UPGRADE_ORDER) upgrades[id] = int(savedUpgrades[id], UPGRADES[id].costs.length)

  return {
    bank: int(raw.bank),
    upgrades,
    bestScore: num(raw.bestScore),
    bestSector: int(raw.bestSector),
    checkpoint: readCheckpoint(raw.checkpoint),
    quality: QUALITY_ORDER.includes(raw.quality as QualityLevel) ? (raw.quality as QualityLevel) : DEFAULT_QUALITY,
    muted: raw.muted === true,
  }
}

export function writeSave(data: SaveData): void {
  try {
    // Infinity (no approach yet) isn't valid JSON; it reads back as the default.
    const checkpoint = data.checkpoint && { ...data.checkpoint, minR: Number.isFinite(data.checkpoint.minR) ? data.checkpoint.minR : null }
    localStorage.setItem(SAVE.KEY, JSON.stringify({ version: SAVE.VERSION, ...data, checkpoint }))
  } catch {
    // Quota exceeded or storage blocked: progress just isn't kept.
  }
}
