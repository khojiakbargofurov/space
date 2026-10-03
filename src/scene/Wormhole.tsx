import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  type PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { WORMHOLE } from '../game/constants'
import { sectorConfig } from '../game/sectors'
import { useGameStore } from '../game/store'
import { wormhole, wormholeOpening } from '../game/wormhole'
import { wormholeFragment, wormholeVertex } from '../shaders/wormhole'

/**
 * The open wormhole: a camera-facing swirl showing the next sector's colors through its throat. It
 * grows open over WORMHOLE.OPEN_SEC and never shrinks below WORMHOLE.MIN_PX on screen, so it reads as a
 * bright point from across the system.
 */
export function Wormhole() {
  const sector = useGameStore((s) => s.sector)

  const sys = useMemo(() => {
    const geometry = new PlaneGeometry(2, 2)
    const material = new ShaderMaterial({
      vertexShader: wormholeVertex,
      fragmentShader: wormholeFragment,
      defines: { FBM_OCTAVES: 4 },
      uniforms: {
        uTime: { value: 0 },
        uCore: { value: 1 / WORMHOLE.GLOW_SCALE },
        uTwist: { value: WORMHOLE.TWIST },
        uSpin: { value: WORMHOLE.SPIN },
        uIntensity: { value: WORMHOLE.INTENSITY },
        uOpen: { value: 0 },
        uColA: { value: new Color() },
        uColB: { value: new Color() },
        uColRim: { value: new Color() },
      },
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
    })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.visible = false
    return { geometry, material, mesh }
  }, [])

  useEffect(
    () => () => {
      sys.geometry.dispose()
      sys.material.dispose()
    },
    [sys],
  )

  // The throat looks into the sector it leads to.
  useEffect(() => {
    const [, mid, warm, band] = sectorConfig(sector + 1).nebula.colors
    const u = sys.material.uniforms
    ;(u.uColA.value as Color).set(mid).multiplyScalar(1.5)
    ;(u.uColB.value as Color).set(band).multiplyScalar(0.8)
    ;(u.uColRim.value as Color).set(warm).lerp(WHITE, 0.35)
  }, [sys, sector])

  // After the cameras (-1): face the final camera pose.
  useFrame((state, delta) => {
    const { mesh, material } = sys
    mesh.visible = wormhole.open
    if (!wormhole.open) return
    const camera = state.camera as PerspectiveCamera
    const open = wormholeOpening()
    mesh.position.copy(wormhole.orbit.position)
    mesh.quaternion.copy(camera.quaternion)
    const focalPx = state.size.height / 2 / Math.tan((camera.fov * Math.PI) / 360)
    const minSize = (camera.position.distanceTo(mesh.position) * WORMHOLE.MIN_PX) / focalPx
    mesh.scale.setScalar(Math.max(WORMHOLE.RADIUS * WORMHOLE.GLOW_SCALE * open, minSize * open, 1e-3))
    material.uniforms.uTime.value += delta
    material.uniforms.uOpen.value = open
  })

  return <primitive object={sys.mesh} />
}

const WHITE = new Color(1, 1, 1)
