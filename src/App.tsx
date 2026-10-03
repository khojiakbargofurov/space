import { useEffect } from 'react'
import { GameCanvas } from './scene/GameCanvas'
import { FpsCounter } from './ui/FpsCounter'
import { QualityPicker } from './ui/QualityPicker'
import { useGameStore } from './game/store'

export default function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'KeyF') useGameStore.getState().toggleFps()
      // Quality hotkey (the full settings menu arrives in stage 8)
      if (e.code === 'KeyQ') useGameStore.getState().cycleQuality()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <GameCanvas />
      <FpsCounter />
      <QualityPicker />
    </>
  )
}
