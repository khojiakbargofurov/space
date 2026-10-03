import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AlwaysDepth,
  BufferAttribute,
  BufferGeometry,
  Color,
  type CubeTexture,
  type PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from 'three'
import { BLACK_HOLE, DISK, GALAXY_BAND_NORMAL, LENSING, QUALITY_PRESETS, STARFIELD } from '../game/constants'
import { useGameStore } from '../game/store'
import { lensingFragment, lensingVertex } from '../shaders/lensing'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS

function starCdf(): number[] {
  const total = STARFIELD.COLOR_WEIGHTS.reduce((a, w) => a + w, 0)
  let acc = 0
  return STARFIELD.COLOR_WEIGHTS.map((w) => (acc += w / total))
}

/** Expected stars per cell for each layer so the whole sky holds about `starCount` stars. */
function starProbabilities(starCount: number): number[] {
  return STARFIELD.LAYERS.map((l) => Math.min(1, (starCount * l.share) / (6 * l.grid * l.grid)))
}

/**
 * Fullscreen ray-traced view of everything at "infinity" and the hole itself:
 * lensed nebula + stars, the event horizon shadow, photon ring and the accretion disk (all images).
 * Drawn first; writes depth so later meshes are hidden behind the horizon and the dense disk.
 */
export function LensingView({ nebula }: { nebula: CubeTexture | null }) {
  const quality = useGameStore((s) => s.quality)
  const preset = QUALITY_PRESETS[quality]

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    return g
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: lensingVertex,
        fragmentShader: lensingFragment,
        defines: { LENS_STEPS: preset.lensingSteps, FBM_OCTAVES: preset.diskOctaves },
        uniforms: {
          uNebula: { value: null },
          uInvProj: { value: null },
          uCamWorld: { value: null },
          uProj: { value: null },
          uTime: { value: 0 },
          uRs: { value: RS },
          uNumericRadius: { value: LENSING.NUMERIC_RADIUS_RS * RS },
          uStepScale: { value: LENSING.STEP_BUDGET / preset.lensingSteps },
          // disk
          uInner: { value: DISK.INNER_RS * RS },
          uOuter: { value: DISK.OUTER_RS * RS },
          uOmega: { value: DISK.INNER_OMEGA },
          uFlowPeriod: { value: DISK.FLOW_PERIOD },
          uAngularFreq: { value: DISK.ANGULAR_FREQ },
          uRadialFreq: { value: DISK.RADIAL_FREQ },
          uRingFreq: { value: DISK.RING_FREQ },
          uRingContrast: { value: DISK.RING_CONTRAST },
          uWarp: { value: DISK.WARP },
          uDoppler: { value: DISK.DOPPLER_STRENGTH },
          uBeaming: { value: DISK.BEAMING_EXP },
          uTempFalloff: { value: DISK.TEMP_FALLOFF },
          uTempScale: { value: DISK.TEMP_SCALE },
          uDiskBrightness: { value: DISK.BRIGHTNESS },
          uDiskOpacity: { value: DISK.OPACITY },
          uColCool: { value: new Color(DISK.COLOR_COOL) },
          uColWarm: { value: new Color(DISK.COLOR_WARM) },
          uColHot: { value: new Color(DISK.COLOR_HOT) },
          uColBlue: { value: new Color(DISK.COLOR_BLUE) },
          // stars
          uStarGrid: { value: STARFIELD.LAYERS.map((l) => l.grid) },
          uStarProb: { value: starProbabilities(preset.starCount) },
          uStarGain: { value: STARFIELD.LAYERS.map((l) => l.gain) },
          uStarSize: { value: STARFIELD.LAYERS.map((l) => l.sizePx) },
          uStarColors: { value: STARFIELD.COLORS.map((hex) => new Color(hex)) },
          uStarCdf: { value: starCdf() },
          uStarPower: { value: STARFIELD.BRIGHTNESS_POWER },
          uTwinkle: { value: STARFIELD.TWINKLE },
          uPixelAngle: { value: 0.001 },
          uBandNormal: { value: new Vector3(...GALAXY_BAND_NORMAL).normalize() },
          uBandSigma: { value: STARFIELD.BAND_SIGMA },
          uBandFraction: { value: STARFIELD.BAND_FRACTION },
        },
        depthTest: true,
        depthFunc: AlwaysDepth,
        depthWrite: true,
      }),
    [preset.lensingSteps, preset.diskOctaves, preset.starCount],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    const u = material.uniforms
    const camera = state.camera as PerspectiveCamera
    u.uTime.value += delta
    u.uNebula.value = nebula
    u.uInvProj.value = camera.projectionMatrixInverse
    u.uCamWorld.value = camera.matrixWorld
    u.uProj.value = camera.projectionMatrix
    // Radians per physical pixel at the screen center: keeps stars a constant pixel size.
    const fovRad = (camera.fov * Math.PI) / 180
    u.uPixelAngle.value = (2 * Math.tan(fovRad / 2)) / (state.size.height * state.viewport.dpr)
  })

  if (!nebula) return null
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1000} />
}
