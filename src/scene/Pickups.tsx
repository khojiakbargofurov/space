import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  OctahedronGeometry,
  type PerspectiveCamera,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { PICKUP_LOOK } from '../game/constants'
import { PICKUP_KINDS, pickupRange, pickups } from '../game/pickups'
import { useGameStore } from '../game/store'
import type { PickupKind } from '../game/types'
import { haloFragment, haloVertex, pickupFragment, pickupVertex } from '../shaders/pickup'

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _s = new Vector3()
const ZERO = new Vector3()

function kindGeometry(kind: PickupKind): BufferGeometry {
  if (kind === 'fuel') return new CylinderGeometry(0.55, 0.55, 1.5, 6)
  if (kind === 'oxygen') return new IcosahedronGeometry(0.85, 0)
  // Chrono shard: a long double-pointed crystal.
  return new OctahedronGeometry(0.7, 0).scale(1, 2.2, 1)
}

/**
 * Fuel cells, oxygen canisters and chrono shards: one instanced mesh per kind plus a shared halo layer.
 * Rebuilt per sector (the counts change).
 */
export function Pickups() {
  const worldVersion = useGameStore((s) => s.worldVersion)
  const sys = useMemo(() => {
    const root = new Group()
    const meshes = PICKUP_KINDS.map((kind) => {
      const look = PICKUP_LOOK[kind]
      const material = new ShaderMaterial({
        vertexShader: pickupVertex,
        fragmentShader: pickupFragment,
        uniforms: {
          uColor: { value: new Color(look.COLOR) },
          uGlow: { value: look.GLOW },
          uTime: { value: 0 },
        },
      })
      const mesh = new InstancedMesh(kindGeometry(kind), material, pickupRange[kind].count)
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      // Instances orbit everywhere; a single bounding sphere would cull them wrongly.
      mesh.frustumCulled = false
      root.add(mesh)
      return { kind, mesh, material }
    })

    const n = pickups.length
    const haloGeometry = new BufferGeometry()
    const position = new BufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage)
    const size = new BufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage)
    const color = new BufferAttribute(new Float32Array(n * 3), 3)
    pickups.forEach((p, i) => {
      const c = new Color(PICKUP_LOOK[p.kind].COLOR).multiplyScalar(PICKUP_LOOK.HALO_INTENSITY)
      color.setXYZ(i, c.r, c.g, c.b)
    })
    haloGeometry.setAttribute('position', position)
    haloGeometry.setAttribute('aSize', size)
    haloGeometry.setAttribute('aColor', color)
    const haloMaterial = new ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: {
        uScale: { value: 1000 },
        uMinPx: { value: PICKUP_LOOK.HALO_MIN_PX },
        uMaxPx: { value: PICKUP_LOOK.HALO_MAX_PX },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const halo = new Points(haloGeometry, haloMaterial)
    halo.frustumCulled = false
    root.add(halo)
    return { root, meshes, haloGeometry, haloMaterial, position, size }
  }, [worldVersion])

  useEffect(
    () => () => {
      for (const m of sys.meshes) {
        m.mesh.geometry.dispose()
        m.material.dispose()
        m.mesh.dispose()
      }
      sys.haloGeometry.dispose()
      sys.haloMaterial.dispose()
    },
    [sys],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (const { kind, mesh, material } of sys.meshes) {
      material.uniforms.uTime.value = t
      const { start, count } = pickupRange[kind]
      const scale = PICKUP_LOOK[kind].SIZE
      for (let i = 0; i < count; i++) {
        const p = pickups[start + i]
        if (p.active) {
          _e.set(0.35, t * PICKUP_LOOK.SPIN + p.spinPhase, 0.2)
          _q.setFromEuler(_e)
          _m.compose(p.orbit.position, _q, _s.setScalar(scale))
        } else {
          _m.compose(ZERO, _q.identity(), _s.setScalar(0))
        }
        mesh.setMatrixAt(i, _m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    const pos = sys.position.array as Float32Array
    const size = sys.size.array as Float32Array
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i]
      pos[i * 3] = p.orbit.position.x
      pos[i * 3 + 1] = p.orbit.position.y
      pos[i * 3 + 2] = p.orbit.position.z
      size[i] = p.active ? PICKUP_LOOK.HALO_SIZE : 0
    }
    sys.position.needsUpdate = true
    sys.size.needsUpdate = true

    const camera = state.camera as PerspectiveCamera
    const fovRad = (camera.fov * Math.PI) / 180
    sys.haloMaterial.uniforms.uScale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan(fovRad / 2))
  })

  return <primitive object={sys.root} />
}
