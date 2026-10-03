import { useLayoutEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import {
  BackSide,
  BoxGeometry,
  Color,
  CubeCamera,
  type CubeTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLCubeRenderTarget,
  type WebGLRenderer,
} from 'three'
import { NEBULA, QUALITY_PRESETS } from '../game/constants'
import { sectorConfig } from '../game/sectors'
import { useGameStore } from '../game/store'
import type { NebulaLook } from '../game/types'
import { nebulaFragment, nebulaVertex } from '../shaders/nebula'

/** Renders the nebula shader once into every face of `target`. Temporary objects are freed immediately. */
function bakeNebula(gl: WebGLRenderer, target: WebGLCubeRenderTarget, look: NebulaLook): void {
  const [colA, colB, colC, colBand] = look.colors
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new ShaderMaterial({
    vertexShader: nebulaVertex,
    fragmentShader: nebulaFragment,
    defines: { FBM_OCTAVES: 6 },
    uniforms: {
      uSeed: { value: look.seed },
      uScale: { value: NEBULA.SCALE },
      uWarp: { value: NEBULA.WARP },
      uIntensity: { value: look.intensity },
      uBandWidth: { value: NEBULA.BAND_WIDTH },
      uBandStrength: { value: NEBULA.BAND_STRENGTH },
      uDustStrength: { value: NEBULA.DUST_STRENGTH },
      uBandNormal: { value: new Vector3(...look.bandNormal).normalize() },
      uColA: { value: new Color(colA) },
      uColB: { value: new Color(colB) },
      uColC: { value: new Color(colC) },
      uColBand: { value: new Color(colBand) },
    },
    side: BackSide,
    depthTest: false,
    depthWrite: false,
  })
  const bakeScene = new Scene()
  bakeScene.add(new Mesh(geometry, material))
  new CubeCamera(0.1, 10, target).update(gl, bakeScene)
  geometry.dispose()
  material.dispose()
}

/**
 * Bakes the current sector's nebula into a cube map (re-baked on quality or sky change) and returns its
 * texture, or null until the first bake. The render target is disposed on unmount / re-bake.
 */
export function useNebulaCubeMap(): CubeTexture | null {
  const gl = useThree((s) => s.gl)
  const resolution = useGameStore((s) => QUALITY_PRESETS[s.quality].nebulaResolution)
  // sectorConfig is cached, so restarting in the same sector keeps the same look (no re-bake).
  const look = useGameStore((s) => sectorConfig(s.sector).nebula)
  const [texture, setTexture] = useState<CubeTexture | null>(null)

  useLayoutEffect(() => {
    const target = new WebGLCubeRenderTarget(resolution, {
      type: HalfFloatType,
      generateMipmaps: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    })
    target.texture.colorSpace = LinearSRGBColorSpace
    bakeNebula(gl, target, look)
    setTexture(target.texture)
    return () => {
      setTexture(null)
      target.dispose()
    }
  }, [gl, resolution, look])

  return texture
}
