import { create } from 'zustand'
import { QUALITY_ORDER } from './constants'
import { loadSave, writeSave } from './save'
import type { CameraMode, Checkpoint, DeathReport, GamePhase, QualityLevel, SectorClearReport, UpgradeLevels } from './types'

interface GameState {
  phase: GamePhase
  quality: QualityLevel
  showFps: boolean
  showHelp: boolean
  cameraMode: CameraMode
  muted: boolean
  /** Report of the run that just ended (shown in the 'dead' phase). */
  death: DeathReport | null
  /** Current sector index (0-based). */
  sector: number
  /** Bumped whenever a sector's world is (re)generated; scene objects rebuild on it. */
  worldVersion: number
  /** Upgrade shop open over the orbit view. */
  shopOpen: boolean
  /** Rewards of the last sector crossing (shown in the 'transit' phase). */
  clear: SectorClearReport | null

  // --- saved progress ---
  bank: number
  upgrades: UpgradeLevels
  bestScore: number
  bestSector: number
  checkpoint: Checkpoint | null

  setPhase: (phase: GamePhase) => void
  setQuality: (quality: QualityLevel) => void
  cycleQuality: () => void
  toggleFps: () => void
  toggleHelp: () => void
  toggleCameraMode: () => void
  toggleMute: () => void
  /** Ends the run: enters the 'dead' phase with its report, records the best score and drops the checkpoint. */
  endRun: (report: DeathReport) => void
  /** Starts a fresh run in `phase` and clears the last report. */
  beginRun: (phase: GamePhase) => void
  /** A sector's world was generated. */
  setWorld: (sector: number) => void
  setShopOpen: (open: boolean) => void
  bankShards: (n: number) => void
  /** Spends `cost` shards on one level of `upgrades` (caller checks affordability). */
  setUpgrades: (upgrades: UpgradeLevels, cost: number) => void
  /** Arrived through a wormhole: enters 'transit' with the crossing's rewards. */
  arrive: (report: SectorClearReport) => void
  /** Entered a sector mid-run: save the checkpoint and records. */
  reachSector: (checkpoint: Checkpoint) => void
  clearCheckpoint: () => void
}

const saved = loadSave()

/**
 * UI-level state that changes rarely. Per-frame values (ship, clocks, score) live in mutable
 * module state (game/ship.ts, game/run.ts) so the render loop never triggers React updates.
 * Progress and settings are written to localStorage whenever they change.
 */
export const useGameStore = create<GameState>()((set) => ({
  phase: 'menu',
  quality: saved.quality,
  showFps: true,
  showHelp: true,
  cameraMode: 'chase',
  muted: saved.muted,
  death: null,
  sector: 0,
  worldVersion: 0,
  shopOpen: false,
  clear: null,
  bank: saved.bank,
  upgrades: saved.upgrades,
  bestScore: saved.bestScore,
  bestSector: saved.bestSector,
  checkpoint: saved.checkpoint,

  setPhase: (phase) => set({ phase, shopOpen: false }),
  setQuality: (quality) => set({ quality }),
  cycleQuality: () =>
    set((s) => ({ quality: QUALITY_ORDER[(QUALITY_ORDER.indexOf(s.quality) + 1) % QUALITY_ORDER.length] })),
  toggleFps: () => set((s) => ({ showFps: !s.showFps })),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  toggleCameraMode: () => set((s) => ({ cameraMode: s.cameraMode === 'chase' ? 'cockpit' : 'chase' })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  endRun: (report) =>
    set((s) => ({ phase: 'dead', death: report, bestScore: Math.max(s.bestScore, report.score), checkpoint: null, shopOpen: false })),
  beginRun: (phase) => set({ phase, death: null, shopOpen: false }),
  setWorld: (sector) => set((s) => ({ sector, worldVersion: s.worldVersion + 1 })),
  setShopOpen: (shopOpen) => set({ shopOpen }),
  arrive: (clear) => set({ phase: 'transit', clear, shopOpen: false }),
  bankShards: (n) => set((s) => ({ bank: s.bank + n })),
  setUpgrades: (upgrades, cost) => set((s) => ({ upgrades, bank: s.bank - cost })),
  reachSector: (checkpoint) =>
    set((s) => ({
      checkpoint,
      bestSector: Math.max(s.bestSector, checkpoint.sector),
      bestScore: Math.max(s.bestScore, checkpoint.score),
    })),
  clearCheckpoint: () => set({ checkpoint: null }),
}))

useGameStore.subscribe((s, prev) => {
  if (
    s.bank === prev.bank &&
    s.upgrades === prev.upgrades &&
    s.bestScore === prev.bestScore &&
    s.bestSector === prev.bestSector &&
    s.checkpoint === prev.checkpoint &&
    s.quality === prev.quality &&
    s.muted === prev.muted
  ) {
    return
  }
  writeSave({
    bank: s.bank,
    upgrades: s.upgrades,
    bestScore: s.bestScore,
    bestSector: s.bestSector,
    checkpoint: s.checkpoint,
    quality: s.quality,
    muted: s.muted,
  })
})
