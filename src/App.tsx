import { useEffect } from 'react'
import { GameCanvas } from './scene/GameCanvas'
import { FpsCounter } from './ui/FpsCounter'
import { useGameStore } from './game/store'

export default function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' && !e.repeat) useGameStore.getState().toggleFps()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <GameCanvas />
      <FpsCounter />
    </>
  )
}
