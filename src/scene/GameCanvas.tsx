import { Canvas } from '@react-three/fiber'
import { CAMERA, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'
import { FpsMeter } from './FpsMeter'
import { LensingView } from './LensingView'
import { OrbitCamera } from './OrbitCamera'
import { PostEffects } from './PostEffects'

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
      <OrbitCamera />
      <LensingView />
      <PostEffects />
      <FpsMeter />
    </Canvas>
  )
}
