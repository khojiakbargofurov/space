import { Canvas } from '@react-three/fiber'
import { CAMERA, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'
import { FpsMeter } from './FpsMeter'
import { PostEffects } from './PostEffects'
import { World } from './World'

export function GameCanvas() {
  const quality = useGameStore((s) => s.quality)
  const preset = QUALITY_PRESETS[quality]

  return (
    <Canvas
      dpr={[1, preset.dpr]}
      // Anti-aliasing happens in the post-processing frame buffer (preset.msaa), not the canvas.
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      // Dev-only handle for profiling from the console (window.__r3f.gl / scene / camera).
      onCreated={(state) => {
        if (import.meta.env.DEV) Object.assign(window, { __r3f: state })
      }}
      camera={{ fov: CAMERA.FOV, near: CAMERA.NEAR, far: CAMERA.FAR, position: [...CAMERA.START_POSITION] }}
    >
      <World />
      <PostEffects />
      <FpsMeter />
    </Canvas>
  )
}
