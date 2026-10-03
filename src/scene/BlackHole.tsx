import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  type Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
import { BLACK_HOLE, HORIZON_VISUAL } from '../game/constants'
import { horizonGlowFragment, horizonGlowVertex } from '../shaders/horizonGlow'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS
const EXTENT = HORIZON_VISUAL.EXTENT_RS * RS

/** Opaque event horizon (writes depth, so it occludes the far side of the disk) plus a camera-facing rim glow. */
export function BlackHole() {
  const glowRef = useRef<Mesh>(null)

  const horizonGeometry = useMemo(
    () => new SphereGeometry(RS, HORIZON_VISUAL.SEGMENTS, HORIZON_VISUAL.SEGMENTS / 2),
    [],
  )
  const horizonMaterial = useMemo(() => new MeshBasicMaterial({ color: 0x000000 }), [])
  const glowGeometry = useMemo(() => new PlaneGeometry(EXTENT * 2, EXTENT * 2), [])
  const glowMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: horizonGlowVertex,
        fragmentShader: horizonGlowFragment,
        uniforms: {
          uExtent: { value: EXTENT },
          uHorizon: { value: RS },
          uRingR: { value: HORIZON_VISUAL.RING_RS * RS },
          uRingWidth: { value: HORIZON_VISUAL.RING_WIDTH_RS * RS },
          uHaloFalloff: { value: HORIZON_VISUAL.HALO_FALLOFF_RS * RS },
          uHaloStrength: { value: HORIZON_VISUAL.HALO_STRENGTH },
          uIntensity: { value: HORIZON_VISUAL.INTENSITY },
          uColor: { value: new Color(HORIZON_VISUAL.COLOR) },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  useEffect(
    () => () => {
      horizonGeometry.dispose()
      horizonMaterial.dispose()
      glowGeometry.dispose()
      glowMaterial.dispose()
    },
    [horizonGeometry, horizonMaterial, glowGeometry, glowMaterial],
  )

  useFrame(({ camera }) => {
    glowRef.current?.quaternion.copy(camera.quaternion)
  })

  return (
    <group>
      <mesh geometry={horizonGeometry} material={horizonMaterial} />
      <mesh ref={glowRef} geometry={glowGeometry} material={glowMaterial} />
    </group>
  )
}
