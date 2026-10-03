import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/store'
import { fpsDisplay } from './fpsDisplay'

export function FpsCounter() {
  const showFps = useGameStore((s) => s.showFps)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fpsDisplay.el = ref.current
    return () => {
      fpsDisplay.el = null
    }
  }, [showFps])

  if (!showFps) return null
  return (
    <div ref={ref} className="fps-counter">
      -- FPS
    </div>
  )
}
