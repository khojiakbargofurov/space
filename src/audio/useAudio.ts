import { useEffect } from 'react'
import { useGameStore } from '../game/store'
import { disposeAudio, setMuted, startAudio } from './engine'

/**
 * Audio lifecycle for the app: the context starts on the first key press or click (browsers block
 * sound before a gesture), follows the store's mute flag and is closed on unmount.
 */
export function useAudio(): void {
  const muted = useGameStore((s) => s.muted)

  useEffect(() => setMuted(muted), [muted])

  useEffect(() => {
    // Capture phase so the gesture counts even if a handler stops propagation.
    const unlock = () => startAudio()
    window.addEventListener('keydown', unlock, true)
    window.addEventListener('pointerdown', unlock, true)
    return () => {
      window.removeEventListener('keydown', unlock, true)
      window.removeEventListener('pointerdown', unlock, true)
      disposeAudio()
    }
  }, [])
}
