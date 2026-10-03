import { create } from 'zustand'
import { DEFAULT_QUALITY } from './constants'
import type { GamePhase, QualityLevel } from './types'

interface GameState {
  phase: GamePhase
  quality: QualityLevel
  showFps: boolean
  /** Seconds elapsed far from the black hole. */
  universeTime: number
  /** Proper time aboard the ship. */
  shipTime: number
  /** Current dilation factor (universe s per ship s). */
  dilation: number
  score: number

  setPhase: (phase: GamePhase) => void
  setQuality: (quality: QualityLevel) => void
  toggleFps: () => void
  /** Advance clocks by `shipDt` of ship time at the given dilation factor. */
  advanceClocks: (shipDt: number, dilation: number) => void
  reset: () => void
}

const initialRun = {
  phase: 'menu' as GamePhase,
  universeTime: 0,
  shipTime: 0,
  dilation: 1,
  score: 0,
}

export const useGameStore = create<GameState>()((set) => ({
  ...initialRun,
  quality: DEFAULT_QUALITY,
  showFps: true,

  setPhase: (phase) => set({ phase }),
  setQuality: (quality) => set({ quality }),
  toggleFps: () => set((s) => ({ showFps: !s.showFps })),
  advanceClocks: (shipDt, dilation) =>
    set((s) => ({
      shipTime: s.shipTime + shipDt,
      universeTime: s.universeTime + shipDt * dilation,
      dilation,
    })),
  reset: () => set(initialRun),
}))
