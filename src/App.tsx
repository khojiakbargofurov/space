import { useEffect } from 'react'
import { useAudio } from './audio/useAudio'
import { GameCanvas } from './scene/GameCanvas'
import { ControlsHint } from './ui/ControlsHint'
import { FpsCounter } from './ui/FpsCounter'
import { DeathScreen } from './ui/DeathScreen'
import { Hud } from './ui/Hud'
import { QualityPicker } from './ui/QualityPicker'
import { SoundToggle } from './ui/SoundToggle'
import { restartRun } from './game/death'
import { useGameStore } from './game/store'

export default function App() {
  useAudio()

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
        case 'KeyM':
          game.toggleMute()
          break
        // Launch from the orbit view / back to it (menus arrive in stage 8). After a death the wreck is
        // cleared and a fresh ship waits at the spawn.
        case 'Enter':
          if (game.phase === 'dead') restartRun('menu')
          else game.setPhase(game.phase === 'playing' ? 'menu' : 'playing')
          break
        case 'KeyV':
          if (game.phase === 'playing') game.toggleCameraMode()
          break
        // New run from the spawn point (also the restart after a death).
        case 'KeyR':
          if (game.phase === 'playing' || game.phase === 'dead') restartRun('playing')
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
      <DeathScreen />
      <FpsCounter />
      <QualityPicker />
      <SoundToggle />
      <ControlsHint />
    </>
  )
}
