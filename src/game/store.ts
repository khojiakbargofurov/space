import { create } from 'zustand'
import { DEFAULT_QUALITY, QUALITY_ORDER } from './constants'
import type { CameraMode, GamePhase, QualityLevel } from './types'

interface GameState {
  phase: GamePhase
  quality: QualityLevel
  showFps: boolean
  showHelp: boolean
  cameraMode: CameraMode

  setPhase: (phase: GamePhase) => void
  setQuality: (quality: QualityLevel) => void
  cycleQuality: () => void
  toggleFps: () => void
  toggleHelp: () => void
  toggleCameraMode: () => void
}

/**
 * UI-level state that changes rarely. Per-frame values (ship, clocks, score) live in mutable
 * module state (game/ship.ts, game/run.ts) so the render loop never triggers React updates.
 */
export const useGameStore = create<GameState>()((set) => ({
  phase: 'menu',
  quality: DEFAULT_QUALITY,
  showFps: true,
  showHelp: true,
  cameraMode: 'chase',

  setPhase: (phase) => set({ phase }),
  setQuality: (quality) => set({ quality }),
  cycleQuality: () =>
    set((s) => ({ quality: QUALITY_ORDER[(QUALITY_ORDER.indexOf(s.quality) + 1) % QUALITY_ORDER.length] })),
  toggleFps: () => set((s) => ({ showFps: !s.showFps })),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  toggleCameraMode: () => set((s) => ({ cameraMode: s.cameraMode === 'chase' ? 'cockpit' : 'chase' })),
}))
