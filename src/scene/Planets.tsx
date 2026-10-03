import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Group,
  Mesh,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
import { PLANET_LOOK, QUALITY_PRESETS } from '../game/constants'
import { type Planet, planets } from '../game/planets'
import { run } from '../game/run'
import { useGameStore } from '../game/store'
import type { PlanetKind } from '../game/types'
import { atmosphereFragment, planetFragment, planetVertex, ringFragment, shellVertex } from '../shaders/planet'

const KIND_DEFINE: Record<PlanetKind, number> = { rocky: 0, gas: 1, ice: 2, lava: 3 }

interface PlanetView {
  planet: Planet
  root: Group
  surface: Mesh
  surfaceMat: ShaderMaterial
  atmoMat: ShaderMaterial
  ringMat: ShaderMaterial | null
}

function lightAt(p: Planet): number {
  return PLANET_LOOK.LIGHT_INTENSITY / Math.pow(Math.max(p.position.length(), 1), PLANET_LOOK.LIGHT_DECAY)
}

function buildView(p: Planet, sphere: SphereGeometry, ring: RingGeometry, octaves: number): PlanetView {
  const [a, b, c, d] = p.palette
  const lightColor = new Color(PLANET_LOOK.LIGHT_COLOR)

  const surfaceMat = new ShaderMaterial({
    vertexShader: planetVertex,
    fragmentShader: planetFragment,
    defines: { PLANET_KIND: KIND_DEFINE[p.kind], FBM_OCTAVES: octaves },
    uniforms: {
      uColA: { value: new Color(a) },
      uColB: { value: new Color(b) },
      uColC: { value: new Color(c) },
      uColD: { value: new Color(d) },
      uSeed: { value: p.seed },
      uNoiseScale: { value: PLANET_LOOK.NOISE_SCALE },
      uBands: { value: PLANET_LOOK.GAS_BANDS },
      uTime: { value: 0 },
      uLightColor: { value: lightColor },
      uLightIntensity: { value: 1 },
      uAmbient: { value: new Color(PLANET_LOOK.AMBIENT) },
      uAtmoColor: { value: new Color(p.atmosphere) },
      uLavaGlow: { value: PLANET_LOOK.LAVA_GLOW },
    },
  })

  const atmoMat = new ShaderMaterial({
    vertexShader: shellVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      uCenter: { value: p.position },
      uRadius: { value: p.radius },
      uShell: { value: PLANET_LOOK.ATMO_SCALE },
      uColor: { value: new Color(p.atmosphere) },
      uIntensity: { value: 1 },
    },
    side: BackSide,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })

  const root = new Group()
  root.name = p.name
  const tilt = new Group()
  tilt.quaternion.copy(p.tilt)
  root.add(tilt)

  const surface = new Mesh(sphere, surfaceMat)
  surface.scale.setScalar(p.radius)
  tilt.add(surface)

  const atmo = new Mesh(sphere, atmoMat)
  atmo.scale.setScalar(p.radius * PLANET_LOOK.ATMO_SCALE)
  root.add(atmo)

  let ringMat: ShaderMaterial | null = null
  if (p.rings) {
    ringMat = new ShaderMaterial({
      vertexShader: shellVertex,
      fragmentShader: ringFragment,
      uniforms: {
        uCenter: { value: p.position },
        uRadius: { value: p.radius },
        uInner: { value: PLANET_LOOK.RING_INNER },
        uOuter: { value: PLANET_LOOK.RING_OUTER },
        uSeed: { value: p.seed },
        uColA: { value: new Color(b) },
        uColB: { value: new Color(d) },
        uLightColor: { value: lightColor },
        uLightIntensity: { value: 1 },
        uOpacity: { value: PLANET_LOOK.RING_OPACITY },
      },
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    })
    const ringMesh = new Mesh(ring, ringMat)
    ringMesh.scale.setScalar(p.radius)
    // RingGeometry lies in XY; lay it in the (tilted) equatorial plane.
    ringMesh.rotation.x = -Math.PI / 2
    tilt.add(ringMesh)
  }

  return { planet: p, root, surface, surfaceMat, atmoMat, ringMat }
}

/**
 * The planetary system. Positions come from game/planets (moved along universe time by the
 * simulation clock); this only mirrors them into the scene and feeds the shaders.
 * Rebuilt (and the old GPU resources disposed) when the quality preset changes.
 */
export function Planets() {
  const segments = useGameStore((s) => QUALITY_PRESETS[s.quality].planetSegments)
  const octaves = useGameStore((s) => QUALITY_PRESETS[s.quality].planetOctaves)

  const system = useMemo(() => {
    const sphere = new SphereGeometry(1, segments, Math.max(8, segments / 2))
    const ring = new RingGeometry(PLANET_LOOK.RING_INNER, PLANET_LOOK.RING_OUTER, Math.max(48, segments * 2), 1)
    const root = new Group()
    const views = planets.map((p) => buildView(p, sphere, ring, octaves))
    for (const v of views) root.add(v.root)
    return { sphere, ring, root, views }
  }, [segments, octaves])

  useEffect(
    () => () => {
      system.sphere.dispose()
      system.ring.dispose()
      for (const v of system.views) {
        v.surfaceMat.dispose()
        v.atmoMat.dispose()
        v.ringMat?.dispose()
      }
    },
    [system],
  )

  // After the simulation clock (-4) and ship (-3) so positions are current; before the cameras.
  useFrame(() => {
    for (const v of system.views) {
      const p = v.planet
      v.root.position.copy(p.position)
      v.surface.rotation.y = p.rotation
      const light = lightAt(p)
      v.surfaceMat.uniforms.uLightIntensity.value = light
      v.surfaceMat.uniforms.uTime.value = run.worldTime
      v.atmoMat.uniforms.uIntensity.value = light * PLANET_LOOK.ATMO_INTENSITY
      if (v.ringMat) v.ringMat.uniforms.uLightIntensity.value = light
    }
  }, -2)

  return <primitive object={system.root} />
}
