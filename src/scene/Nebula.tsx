import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {
  BackSide,
  BoxGeometry,
  Color,
  CubeCamera,
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
import { GALAXY_BAND_NORMAL, NEBULA, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'
import { nebulaFragment, nebulaVertex } from '../shaders/nebula'

/** Renders the nebula shader once into every face of `target`. Temporary objects are freed immediately. */
function bakeNebula(gl: WebGLRenderer, target: WebGLCubeRenderTarget): void {
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new ShaderMaterial({
    vertexShader: nebulaVertex,
    fragmentShader: nebulaFragment,
    defines: { FBM_OCTAVES: 6 },
    uniforms: {
      uSeed: { value: NEBULA.SEED },
      uScale: { value: NEBULA.SCALE },
      uWarp: { value: NEBULA.WARP },
      uIntensity: { value: NEBULA.INTENSITY },
      uBandWidth: { value: NEBULA.BAND_WIDTH },
      uBandStrength: { value: NEBULA.BAND_STRENGTH },
      uDustStrength: { value: NEBULA.DUST_STRENGTH },
      uBandNormal: { value: new Vector3(...GALAXY_BAND_NORMAL).normalize() },
      uColA: { value: new Color(NEBULA.COLOR_A) },
      uColB: { value: new Color(NEBULA.COLOR_B) },
      uColC: { value: new Color(NEBULA.COLOR_C) },
      uColBand: { value: new Color(NEBULA.COLOR_BAND) },
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

/** Bakes the procedural nebula into a cube map and uses it as the scene background. Re-bakes on quality change. */
export function Nebula() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const resolution = useGameStore((s) => QUALITY_PRESETS[s.quality].nebulaResolution)

  useLayoutEffect(() => {
    const target = new WebGLCubeRenderTarget(resolution, {
      type: HalfFloatType,
      generateMipmaps: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    })
    target.texture.colorSpace = LinearSRGBColorSpace
    bakeNebula(gl, target)
    scene.background = target.texture
    return () => {
      if (scene.background === target.texture) scene.background = null
      target.dispose()
    }
  }, [gl, scene, resolution])

  return null
}
