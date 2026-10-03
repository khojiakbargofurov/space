import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DynamicDrawUsage,
  type BufferGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { DEBRIS_LOOK, QUALITY_PRESETS } from '../game/constants'
import { rocks } from '../game/debris'
import { run } from '../game/run'
import { useGameStore } from '../game/store'

const _m = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3()
const ZERO = new Vector3()

/**
 * Lumpy unit rock: an icosahedron pushed in and out by a smooth function of direction. Vertices that
 * are shared between faces get the same offset, so the surface stays closed; normals are per face.
 */
function rockGeometry(detail: number): BufferGeometry {
  const g = new IcosahedronGeometry(1, detail)
  const pos = g.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      0.5 * Math.sin(3.1 * v.x + 1.7) * Math.sin(2.7 * v.y + 0.4) +
      0.3 * Math.sin(5.3 * v.z + 2.2) * Math.sin(4.1 * v.x - 0.9) +
      0.2 * Math.sin(7.7 * v.y + 3.1) * Math.sin(6.9 * v.z + 1.3)
    v.multiplyScalar(1 + DEBRIS_LOOK.JITTER * n)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

/** The debris belts: one instanced mesh, lit by the disk like the ship. Shattered rocks are hidden. */
export function Debris() {
  const detail = useGameStore((s) => QUALITY_PRESETS[s.quality].rockDetail)
  // A new sector has a different number of rocks: rebuild the instanced mesh.
  const worldVersion = useGameStore((s) => s.worldVersion)

  const sys = useMemo(() => {
    const geometry = rockGeometry(detail)
    const material = new MeshStandardMaterial({
      color: DEBRIS_LOOK.COLOR,
      roughness: DEBRIS_LOOK.ROUGHNESS,
      metalness: DEBRIS_LOOK.METALNESS,
      flatShading: true,
    })
    const mesh = new InstancedMesh(geometry, material, rocks.length)
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    mesh.frustumCulled = false
    return { geometry, material, mesh }
  }, [detail, worldVersion])

  useEffect(
    () => () => {
      sys.geometry.dispose()
      sys.material.dispose()
      sys.mesh.dispose()
    },
    [sys],
  )

  useFrame(() => {
    const t = run.worldTime
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i]
      if (r.active) {
        _q.setFromAxisAngle(r.spinAxis, (r.spin * t) % (Math.PI * 2))
        _s.copy(r.aspect).multiplyScalar(r.size / Math.max(r.aspect.x, r.aspect.y, r.aspect.z))
        _m.compose(r.orbit.position, _q, _s)
      } else {
        _m.compose(ZERO, _q.identity(), _s.setScalar(0))
      }
      sys.mesh.setMatrixAt(i, _m)
    }
    sys.mesh.instanceMatrix.needsUpdate = true
  }, -2)

  return <primitive object={sys.mesh} />
}
