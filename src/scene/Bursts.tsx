import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  type PerspectiveCamera,
  ShaderMaterial,
} from 'three'
import { BURST, QUALITY_PRESETS, SHIP } from '../game/constants'
import { burstQueue } from '../game/fx'
import { useGameStore } from '../game/store'
import { particlesFragment, particlesVertex } from '../shaders/particles'

function hdr(hex: string, intensity: number): Color {
  return new Color(hex).multiplyScalar(intensity)
}

function createPool(capacity: number) {
  const geometry = new BufferGeometry()
  const position = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage)
  const age = new BufferAttribute(new Float32Array(capacity).fill(1), 1).setUsage(DynamicDrawUsage)
  const kind = new BufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage)
  const size = new BufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('aAge', age)
  geometry.setAttribute('aKind', kind)
  geometry.setAttribute('aSize', size)
  return { capacity, geometry, position, age, kind, size, vel: new Float32Array(capacity * 3), life: new Float32Array(capacity).fill(1), next: 0 }
}

/**
 * One-shot particle bursts requested by game logic (game/fx): ship explosions, debris impact sparks and
 * pickup sparkles. Same point-sprite shader as the thrusters, with kind 0 = fire and kind 1 = sparkle.
 * Pool size scales with the quality preset; the oldest particle is reused first.
 */
export function Bursts() {
  const capacity = useGameStore((s) =>
    Math.max(BURST.MIN_CAPACITY, Math.round(QUALITY_PRESETS[s.quality].particles * BURST.CAPACITY_SHARE)),
  )
  const pool = useMemo(() => createPool(capacity), [capacity])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: particlesVertex,
        fragmentShader: particlesFragment,
        uniforms: {
          uScale: { value: 1000 },
          uMaxPx: { value: BURST.MAX_POINT_PX },
          uGrowth: { value: BURST.GROWTH },
          // The shader's "main" / "rcs" palettes are reused as fire / sparkle.
          uMainHot: { value: hdr(BURST.FIRE_HOT, BURST.FIRE_INTENSITY) },
          uMainCool: { value: hdr(BURST.FIRE_COOL, BURST.FIRE_INTENSITY) },
          uRcsHot: { value: hdr(BURST.SPARKLE_HOT, BURST.SPARKLE_INTENSITY) },
          uRcsCool: { value: hdr(BURST.SPARKLE_COOL, BURST.SPARKLE_INTENSITY) },
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => () => pool.geometry.dispose(), [pool])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, SHIP.MAX_DT)
    const pos = pool.position.array as Float32Array
    const age = pool.age.array as Float32Array
    const kind = pool.kind.array as Float32Array
    const size = pool.size.array as Float32Array
    const vel = pool.vel

    for (let i = 0; i < pool.capacity; i++) {
      if (age[i] >= 1) continue
      age[i] += dt / pool.life[i]
      const i3 = i * 3
      pos[i3] += vel[i3] * dt
      pos[i3 + 1] += vel[i3 + 1] * dt
      pos[i3 + 2] += vel[i3 + 2] * dt
    }

    for (let b = 0; b < burstQueue.count; b++) {
      const req = burstQueue.items[b]
      const spec = req.spec
      if (!spec) continue
      const n = Math.min(spec.COUNT, Math.floor(pool.capacity * 0.9))
      for (let k = 0; k < n; k++) {
        const i = pool.next
        pool.next = (i + 1) % pool.capacity
        // Uniform direction on the sphere; speeds skewed toward the fast end for a crisp shell.
        const z = Math.random() * 2 - 1
        const a = Math.random() * Math.PI * 2
        const rxy = Math.sqrt(1 - z * z)
        const sp = spec.SPEED * (0.25 + 0.75 * Math.sqrt(Math.random()))
        const i3 = i * 3
        pos[i3] = req.pos.x
        pos[i3 + 1] = req.pos.y
        pos[i3 + 2] = req.pos.z
        vel[i3] = req.vel.x + rxy * Math.cos(a) * sp
        vel[i3 + 1] = req.vel.y + rxy * Math.sin(a) * sp
        vel[i3 + 2] = req.vel.z + z * sp
        pool.life[i] = spec.LIFE * (0.6 + 0.4 * Math.random())
        age[i] = 0
        kind[i] = spec.KIND
        size[i] = spec.SIZE * (0.6 + 0.8 * Math.random())
      }
      req.spec = null
    }
    burstQueue.count = 0

    pool.position.needsUpdate = true
    pool.age.needsUpdate = true
    pool.kind.needsUpdate = true
    pool.size.needsUpdate = true

    const camera = state.camera as PerspectiveCamera
    const fovRad = (camera.fov * Math.PI) / 180
    material.uniforms.uScale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan(fovRad / 2))
  })

  return <points geometry={pool.geometry} material={material} frustumCulled={false} />
}
