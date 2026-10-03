import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type Texture } from 'three'
import { SHIP_LOOK } from '../game/constants'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { buildShipGeometries, createShipMaterials, disposeShipMaterials } from './shipModel'

const glowBase = new Color(SHIP_LOOK.ENGINE_GLOW_COLOR)

/** Renders the player's ship at the live ship state; engine glow follows the throttle. */
export function Ship({ envMap }: { envMap: Texture | null }) {
  const cockpit = useGameStore((s) => s.phase === 'playing' && s.cameraMode === 'cockpit')
  const group = useRef<Group>(null)
  const geo = useMemo(buildShipGeometries, [])
  const mat = useMemo(createShipMaterials, [])

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose()
    },
    [geo],
  )
  useEffect(() => () => disposeShipMaterials(mat), [mat])

  useEffect(() => {
    for (const m of [mat.hull, mat.trim, mat.accent, mat.canopy]) {
      m.envMap = envMap
      m.needsUpdate = true
    }
  }, [envMap, mat])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    g.position.copy(ship.position)
    g.quaternion.copy(ship.quaternion)

    const thrust = ship.throttle * (1 + ship.boost * 0.6)
    const glow = SHIP_LOOK.ENGINE_GLOW_IDLE + (SHIP_LOOK.ENGINE_GLOW_MAX - SHIP_LOOK.ENGINE_GLOW_IDLE) * thrust
    mat.engineGlow.color.copy(glowBase).multiplyScalar(glow)

    const phase = state.clock.elapsedTime % SHIP_LOOK.STROBE_PERIOD
    mat.strobe.color.setScalar(phase < SHIP_LOOK.STROBE_FLASH ? SHIP_LOOK.STROBE_GLOW : 0.05)
  }, -2)

  return (
    <group ref={group}>
      <mesh geometry={geo.hull} material={mat.hull} />
      <mesh geometry={geo.trim} material={mat.trim} />
      <mesh geometry={geo.accent} material={mat.accent} />
      {/* Hidden from inside: the pilot looks through it. */}
      <mesh geometry={geo.canopy} material={mat.canopy} visible={!cockpit} />
      <mesh geometry={geo.engineGlow} material={mat.engineGlow} />
      <mesh geometry={geo.navPort} material={mat.navPort} />
      <mesh geometry={geo.navStarboard} material={mat.navStarboard} />
      <mesh geometry={geo.strobe} material={mat.strobe} />
      <mesh geometry={geo.dashGlow} material={mat.dashGlow} />
    </group>
  )
}
