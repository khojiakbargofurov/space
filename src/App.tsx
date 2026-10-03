import { useEffect } from 'react'
import { useAudio } from './audio/useAudio'
import { GameCanvas } from './scene/GameCanvas'
import { ControlsHint } from './ui/ControlsHint'
import { FpsCounter } from './ui/FpsCounter'
import { DeathScreen } from './ui/DeathScreen'
import { Hud } from './ui/Hud'
import { MenuPanel } from './ui/MenuPanel'
import { QualityPicker } from './ui/QualityPicker'
import { buyUpgrade } from './ui/Shop'
import { SoundToggle } from './ui/SoundToggle'
import { TransitPanel } from './ui/TransitPanel'
import { UPGRADE_ORDER } from './game/constants'
import { useGameStore } from './game/store'
import { startNewRun } from './game/world'

export default function App() {
  useAudio()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const game = useGameStore.getState()
      const shopping = game.phase === 'transit' || (game.phase === 'menu' && game.shopOpen)

      // Upgrade shop: 1–8 buy.
      if (shopping && e.code.startsWith('Digit')) {
        const id = UPGRADE_ORDER[Number(e.code.slice(5)) - 1]
        if (id) buyUpgrade(id)
        return
      }

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
        // Launch from the orbit view / back to it, launch into the next sector after a jump (menus
        // arrive in stage 8). After a death a fresh run waits in sector 1.
        case 'Enter':
          if (game.phase === 'dead') startNewRun('menu')
          else if (game.phase === 'transit' || game.phase === 'menu') game.setPhase('playing')
          else if (game.phase === 'playing') game.setPhase('menu')
          break
        case 'KeyV':
          if (game.phase === 'playing') game.toggleCameraMode()
          break
        // New run from sector 1 (also the restart after a death).
        case 'KeyR':
          if (game.phase === 'playing' || game.phase === 'dead') startNewRun('playing')
          break
        case 'KeyN':
          if (game.phase === 'menu') startNewRun('menu')
          break
        case 'KeyU':
          if (game.phase === 'menu') game.setShopOpen(!game.shopOpen)
          break
        case 'Escape':
          if (game.phase === 'menu' && game.shopOpen) game.setShopOpen(false)
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
      <TransitPanel />
      <MenuPanel />
      <FpsCounter />
      <QualityPicker />
      <SoundToggle />
      <ControlsHint />
    </>
  )
}
