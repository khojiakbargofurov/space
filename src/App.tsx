import { useEffect } from 'react'
import { GameCanvas } from './scene/GameCanvas'
import { ControlsHint } from './ui/ControlsHint'
import { FpsCounter } from './ui/FpsCounter'
import { Hud } from './ui/Hud'
import { QualityPicker } from './ui/QualityPicker'
import { planets } from './game/planets'
import { resetRun } from './game/run'
import { resetShip, ship } from './game/ship'
import { useGameStore } from './game/store'

export default function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const game = useGameStore.getState()
      switch (e.code) {
        case 'KeyF':
          game.toggleFps()
          break
        // Quality hotkey (the full settings menu arrives in stage 8). Q is roll in flight.
        case 'KeyG':
          game.cycleQuality()
          break
        case 'KeyH':
          game.toggleHelp()
          break
        // Launch from the orbit view / back to it (menus arrive in stage 8).
        case 'Enter':
          game.setPhase(game.phase === 'playing' ? 'menu' : 'playing')
          break
        case 'KeyV':
          if (game.phase === 'playing') game.toggleCameraMode()
          break
        // New run from the spawn point (proper death/restart arrives in stage 5).
        case 'KeyR':
          if (game.phase === 'playing') {
            resetShip(ship)
            resetRun(planets)
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <GameCanvas />
      <Hud />
      <FpsCounter />
      <QualityPicker />
      <ControlsHint />
    </>
  )
}
