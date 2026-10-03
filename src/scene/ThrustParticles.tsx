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
  Vector3,
} from 'three'
import { EXHAUST, QUALITY_PRESETS, SHIP } from '../game/constants'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { particlesFragment, particlesVertex } from '../shaders/particles'

const _origin = new Vector3()
const _dir = new Vector3()
const _jitter = new Vector3()

/** RCS thruster clusters (ship-local), used in front/back pairs so puffs look balanced. */
const RCS_X = [
  [0.52, 0.05, -1.0],
  [0.52, 0.05, 1.0],
] as const
const RCS_Y = [
  [0, 0.32, -1.0],
  [0, 0.32, 1.0],
] as const
const RCS_NOSE = [
  [-0.28, 0.02, -1.45],
  [0.28, 0.02, -1.45],
] as const
const RCS_TAIL = [
  [-0.3, 0.25, 1.95],
  [0.3, 0.25, 1.95],
] as const

function hdr(hex: string, intensity: number): Color {
  return new Color(hex).multiplyScalar(intensity)
}

function createSim(capacity: number) {
  const geometry = new BufferGeometry()
  const position = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage)
  const age = new BufferAttribute(new Float32Array(capacity).fill(1), 1).setUsage(DynamicDrawUsage)
  const kind = new BufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage)
  const size = new BufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('aAge', age)
  geometry.setAttribute('aKind', kind)
  geometry.setAttribute('aSize', size)
  return {
    capacity,
    geometry,
    position,
    age,
    kind,
    size,
    vel: new Float32Array(capacity * 3),
    life: new Float32Array(capacity).fill(1),
    next: 0,
    mainAcc: 0,
    /** Fractional RCS emission per channel: ±x, ±y, nose, tail. */
    rcsAcc: new Float32Array(4),
    rcsAmount: new Float32Array(4),
    nozzle: 0,
  }
}

type Sim = ReturnType<typeof createSim>

/**
 * Spawns one particle at ship-local point (lx,ly,lz) moving along ship-local unit dir (dx,dy,dz)
 * at `speed` relative to the ship. `born` is how long ago (within this frame) it left the thruster.
 */
function emit(
  sim: Sim,
  lx: number, ly: number, lz: number,
  dx: number, dy: number, dz: number,
  speed: number, spread: number, life: number, baseSize: number, kind: number, born: number,
): void {
  const i = sim.next
  sim.next = (i + 1) % sim.capacity
  const q = ship.quaternion
  _origin.set(lx, ly, lz).applyQuaternion(q).add(ship.position)
  _dir.set(dx, dy, dz).applyQuaternion(q).multiplyScalar(speed * (0.8 + 0.4 * Math.random()))
  _jitter.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2 * spread)
  _dir.add(_jitter)
  const pos = sim.position.array as Float32Array
  const vel = sim.vel
  const i3 = i * 3
  // Relative motion since birth; from here on it also carries the ship's velocity.
  pos[i3] = _origin.x + _dir.x * born
  pos[i3 + 1] = _origin.y + _dir.y * born
  pos[i3 + 2] = _origin.z + _dir.z * born
  vel[i3] = ship.velocity.x + _dir.x
  vel[i3 + 1] = ship.velocity.y + _dir.y
  vel[i3 + 2] = ship.velocity.z + _dir.z
  sim.life[i] = life
  ;(sim.age.array as Float32Array)[i] = born / life
  ;(sim.kind.array as Float32Array)[i] = kind
  ;(sim.size.array as Float32Array)[i] = baseSize * (0.75 + 0.5 * Math.random())
}

/**
 * Ring buffer of thruster particles: main engine plasma from the nozzles plus RCS puffs for strafe,
 * reverse and brake. Capacity comes from the quality preset; the oldest particle is reused first.
 */
export function ThrustParticles() {
  const capacity = useGameStore((s) => QUALITY_PRESETS[s.quality].particles)

  const sim = useMemo(() => createSim(capacity), [capacity])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: particlesVertex,
        fragmentShader: particlesFragment,
        uniforms: {
          uScale: { value: 1000 },
          uMaxPx: { value: EXHAUST.MAX_POINT_PX },
          uGrowth: { value: EXHAUST.GROWTH },
          uMainHot: { value: hdr(EXHAUST.MAIN_HOT, EXHAUST.MAIN_INTENSITY) },
          uMainCool: { value: hdr(EXHAUST.MAIN_COOL, EXHAUST.MAIN_INTENSITY) },
          uRcsHot: { value: hdr(EXHAUST.RCS_HOT, EXHAUST.RCS_INTENSITY) },
          uRcsCool: { value: hdr(EXHAUST.RCS_COOL, EXHAUST.RCS_INTENSITY) },
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => () => sim.geometry.dispose(), [sim])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, SHIP.MAX_DT)
    const pos = sim.position.array as Float32Array
    const age = sim.age.array as Float32Array
    const vel = sim.vel

    // Age and move live particles.
    for (let i = 0; i < sim.capacity; i++) {
      if (age[i] >= 1) continue
      age[i] += dt / sim.life[i]
      const i3 = i * 3
      pos[i3] += vel[i3] * dt
      pos[i3 + 1] += vel[i3 + 1] * dt
      pos[i3 + 2] += vel[i3 + 2] * dt
    }

    if (dt > 0) {
      // Main engines: at full throttle the budget share of the pool is alive at once.
      const mainRate = (sim.capacity * EXHAUST.MAIN_BUDGET_SHARE) / EXHAUST.MAIN_LIFE
      sim.mainAcc += mainRate * ship.throttle * dt
      const n = Math.floor(sim.mainAcc)
      sim.mainAcc -= n
      const speed = EXHAUST.MAIN_SPEED * (1 + 0.6 * ship.boost)
      for (let k = 0; k < n; k++) {
        const nz = SHIP.NOZZLES[sim.nozzle]
        sim.nozzle = (sim.nozzle + 1) % SHIP.NOZZLES.length
        const born = ((k + Math.random()) / n) * dt
        emit(sim, nz[0], nz[1], nz[2], 0, 0, 1, speed, EXHAUST.MAIN_SPREAD, EXHAUST.MAIN_LIFE, EXHAUST.MAIN_SIZE, 0, born)
      }

      // RCS puffs leave opposite to the thrust direction, from the opposite side of the hull.
      const rcs = ship.rcs
      const amount = sim.rcsAmount
      amount[0] = rcs.x
      amount[1] = rcs.y
      amount[2] = rcs.z > 0 ? rcs.z : 0
      amount[3] = rcs.z < 0 ? -rcs.z : 0
      for (let a = 0; a < 4; a++) {
        const level = Math.abs(amount[a])
        if (level < 0.05) continue
        sim.rcsAcc[a] += EXHAUST.RCS_RATE * level * dt
        const count = Math.floor(sim.rcsAcc[a])
        sim.rcsAcc[a] -= count
        for (let k = 0; k < count; k++) {
          const born = Math.random() * dt
          const side = k % 2
          if (a === 0) {
            const sx = -Math.sign(amount[0])
            const p = RCS_X[side]
            emit(sim, p[0] * sx, p[1], p[2], sx, 0, 0, EXHAUST.RCS_SPEED, EXHAUST.RCS_SPREAD, EXHAUST.RCS_LIFE, EXHAUST.RCS_SIZE, 1, born)
          } else if (a === 1) {
            const sy = -Math.sign(amount[1])
            const p = RCS_Y[side]
            emit(sim, p[0], p[1] * sy, p[2], 0, sy, 0, EXHAUST.RCS_SPEED, EXHAUST.RCS_SPREAD, EXHAUST.RCS_LIFE, EXHAUST.RCS_SIZE, 1, born)
          } else {
            // a = 2: pushing backward → nose jets fire forward; a = 3: pushing forward → tail jets fire back.
            const p = a === 2 ? RCS_NOSE[side] : RCS_TAIL[side]
            emit(sim, p[0], p[1], p[2], 0, 0, a === 2 ? -1 : 1, EXHAUST.RCS_SPEED, EXHAUST.RCS_SPREAD, EXHAUST.RCS_LIFE, EXHAUST.RCS_SIZE, 1, born)
          }
        }
      }
    }

    sim.position.needsUpdate = true
    sim.age.needsUpdate = true
    sim.kind.needsUpdate = true
    sim.size.needsUpdate = true

    // Pixels per world unit at distance 1 (perspective point size).
    const camera = state.camera as PerspectiveCamera
    const fovRad = (camera.fov * Math.PI) / 180
    material.uniforms.uScale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan(fovRad / 2))
  })

  return <points geometry={sim.geometry} material={material} frustumCulled={false} />
}
