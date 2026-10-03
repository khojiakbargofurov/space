import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, ShaderMaterial, Vector3 } from 'three'
import { GALAXY_BAND_NORMAL, QUALITY_PRESETS, STARFIELD } from '../game/constants'
import { createRng, gaussian } from '../game/random'
import { useGameStore } from '../game/store'
import { starfieldFragment, starfieldVertex } from '../shaders/starfield'

function pickWeighted(weights: readonly number[], u: number): number {
  let total = 0
  for (const w of weights) total += w
  let t = u * total
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i]
    if (t <= 0) return i
  }
  return weights.length - 1
}

function buildStarGeometry(count: number): BufferGeometry {
  const rng = createRng(STARFIELD.SEED)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  const palette = STARFIELD.COLORS.map((hex) => new Color(hex))
  const n = new Vector3(...GALAXY_BAND_NORMAL).normalize()
  const e1 = new Vector3(0, 0, 1).cross(n).normalize()
  const e2 = new Vector3().crossVectors(n, e1)
  const dir = new Vector3()

  for (let i = 0; i < count; i++) {
    if (rng() < STARFIELD.BAND_FRACTION) {
      const a = rng() * Math.PI * 2
      dir
        .copy(e1)
        .multiplyScalar(Math.cos(a))
        .addScaledVector(e2, Math.sin(a))
        .addScaledVector(n, gaussian(rng) * STARFIELD.BAND_SIGMA)
        .normalize()
    } else {
      const z = rng() * 2 - 1
      const phi = rng() * Math.PI * 2
      const s = Math.sqrt(1 - z * z)
      dir.set(s * Math.cos(phi), z, s * Math.sin(phi))
    }
    dir.multiplyScalar(STARFIELD.RADIUS).toArray(positions, i * 3)

    const b = Math.pow(rng(), STARFIELD.BRIGHTNESS_POWER)
    sizes[i] = STARFIELD.MIN_SIZE_PX + (STARFIELD.MAX_SIZE_PX - STARFIELD.MIN_SIZE_PX) * b
    const intensity = 0.2 + (STARFIELD.MAX_INTENSITY - 0.2) * b
    const c = palette[pickWeighted(STARFIELD.COLOR_WEIGHTS, rng())]
    colors[i * 3] = c.r * intensity
    colors[i * 3 + 1] = c.g * intensity
    colors[i * 3 + 2] = c.b * intensity
    phases[i] = rng()
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(positions, 3))
  g.setAttribute('aColor', new BufferAttribute(colors, 3))
  g.setAttribute('aSize', new BufferAttribute(sizes, 1))
  g.setAttribute('aPhase', new BufferAttribute(phases, 1))
  return g
}

/** Point stars on a shell locked to the camera position, so they read as infinitely far away. */
export function Starfield() {
  const count = useGameStore((s) => QUALITY_PRESETS[s.quality].starCount)
  const pointsRef = useRef<Points>(null)

  const geometry = useMemo(() => buildStarGeometry(count), [count])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starfieldVertex,
        fragmentShader: starfieldFragment,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uTwinkle: { value: STARFIELD.TWINKLE },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    pointsRef.current?.position.copy(state.camera.position)
    material.uniforms.uTime.value += delta
    material.uniforms.uPixelRatio.value = state.viewport.dpr
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />
}
