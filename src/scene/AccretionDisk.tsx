import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, RingGeometry, ShaderMaterial } from 'three'
import { BLACK_HOLE, DISK, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'
import { accretionDiskFragment, accretionDiskVertex } from '../shaders/accretionDisk'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS

export function AccretionDisk() {
  const octaves = useGameStore((s) => QUALITY_PRESETS[s.quality].diskOctaves)
  const time = useRef(0)

  const geometry = useMemo(() => {
    const g = new RingGeometry(DISK.INNER_RS * RS, DISK.OUTER_RS * RS, DISK.THETA_SEGMENTS, DISK.RADIAL_SEGMENTS)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: accretionDiskVertex,
        fragmentShader: accretionDiskFragment,
        defines: { FBM_OCTAVES: octaves },
        uniforms: {
          uTime: { value: 0 },
          uRs: { value: RS },
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
          uBrightness: { value: DISK.BRIGHTNESS },
          uMaxGrazing: { value: DISK.MAX_GRAZING_BOOST },
          uColCool: { value: new Color(DISK.COLOR_COOL) },
          uColWarm: { value: new Color(DISK.COLOR_WARM) },
          uColHot: { value: new Color(DISK.COLOR_HOT) },
          uColBlue: { value: new Color(DISK.COLOR_BLUE) },
        },
        side: DoubleSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [octaves],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    time.current += delta
    material.uniforms.uTime.value = time.current
  })

  return <mesh geometry={geometry} material={material} />
}
