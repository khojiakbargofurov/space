import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial } from 'three'
import { WARP } from '../game/constants'
import { run } from '../game/run'
import { sectorConfig } from '../game/sectors'
import { stepWarp, warp } from '../game/warp'
import { tunnelFragment, tunnelVertex } from '../shaders/wormhole'

/**
 * Drives the wormhole jump (game/warp) and draws its tunnel and white-out over the whole frame.
 * Always mounted: the fade runs on after the sector swap, into the 'transit' phase.
 */
export function WarpTunnel() {
  const sys = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    const material = new ShaderMaterial({
      vertexShader: tunnelVertex,
      fragmentShader: tunnelFragment,
      defines: { FBM_OCTAVES: 1 },
      uniforms: {
        uTime: { value: 0 },
        uTunnel: { value: 0 },
        uFlash: { value: 0 },
        uAspect: { value: 1 },
        uStreaks: { value: WARP.STREAKS },
        uSpeed: { value: WARP.SPEED },
        uIntensity: { value: WARP.INTENSITY },
        uColA: { value: new Color() },
        uColB: { value: new Color() },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = 1000
    mesh.visible = false
    return { geometry, material, mesh, colorSector: -1 }
  }, [])

  useEffect(
    () => () => {
      sys.geometry.dispose()
      sys.material.dispose()
    },
    [sys],
  )

  // After the simulation clock (-4) has moved the wormhole; before the cameras read the ship.
  useFrame((state, delta) => {
    stepWarp(Math.min(delta, 0.1))
    const { mesh, material } = sys
    mesh.visible = warp.active && (warp.tunnel > 1e-3 || warp.flash > 1e-3)
    if (!mesh.visible) return

    // Colors of the destination: the next sector before the swap, the current one after.
    const dest = warp.swapped ? run.sector : run.sector + 1
    const u = material.uniforms
    if (sys.colorSector !== dest) {
      sys.colorSector = dest
      const [, , warm, band] = sectorConfig(dest).nebula.colors
      ;(u.uColA.value as Color).set(band)
      ;(u.uColB.value as Color).set(warm).multiplyScalar(1.4)
    }
    u.uTime.value += delta
    u.uTunnel.value = warp.tunnel
    u.uFlash.value = warp.flash
    u.uAspect.value = state.size.width / Math.max(1, state.size.height)
  }, -3)

  return <primitive object={sys.mesh} />
}
