import { Canvas } from '@react-three/fiber'
import { CAMERA, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'
import { FpsMeter } from './FpsMeter'

export function GameCanvas() {
  const quality = useGameStore((s) => s.quality)
  const preset = QUALITY_PRESETS[quality]

  return (
    <Canvas
      // Remount the renderer when antialias changes (it can't be toggled on a live context).
      key={preset.antialias ? 'aa' : 'no-aa'}
      dpr={[1, preset.dpr]}
      gl={{ antialias: preset.antialias, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: CAMERA.FOV, near: CAMERA.NEAR, far: CAMERA.FAR, position: [...CAMERA.START_POSITION] }}
    >
      <color attach="background" args={['#000000']} />
      <FpsMeter />
    </Canvas>
  )
}
