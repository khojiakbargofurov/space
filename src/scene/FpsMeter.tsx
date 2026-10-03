import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DEBUG } from '../game/constants'
import { useGameStore } from '../game/store'
import { fpsDisplay } from '../ui/fpsDisplay'

/** Samples frame rate inside the render loop and writes it straight to the DOM overlay. */
export function FpsMeter() {
  const acc = useRef({ frames: 0, time: 0 })

  useFrame(({ gl }, delta) => {
    const a = acc.current
    a.frames++
    a.time += delta
    if (a.time < DEBUG.FPS_SAMPLE_INTERVAL) return
    if (fpsDisplay.el) {
      const fps = a.frames / a.time
      const ms = (a.time / a.frames) * 1000
      const { geometries, textures } = gl.info.memory
      const quality = useGameStore.getState().quality
      fpsDisplay.el.textContent = `${fps.toFixed(0)} FPS · ${ms.toFixed(1)} ms · ${quality} · geo ${geometries} tex ${textures}`
    }
    a.frames = 0
    a.time = 0
  })

  return null
}
