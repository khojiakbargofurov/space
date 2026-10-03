import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, Quaternion, type Texture, Vector3 } from 'three'
import { SHIP_LOOK } from '../game/constants'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { buildShipGeometries, createShipMaterials, disposeShipMaterials } from './shipModel'

const glowBase = new Color(SHIP_LOOK.ENGINE_GLOW_COLOR)
const Z = new Vector3(0, 0, 1)
const _qInv = new Quaternion()

/**
 * Renders the player's ship at the live ship state; engine glow follows the throttle and every light
 * follows ship power. Tidal stretching scales the model along a world axis: the outer group aligns
 * its Z with `ship.stretchAxis` and is scaled there, the inner group carries the ship's own rotation.
 */
export function Ship({ envMap }: { envMap: Texture | null }) {
  const cockpit = useGameStore((s) => s.phase === 'playing' && s.cameraMode === 'cockpit')
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const geo = useMemo(buildShipGeometries, [])
  const mat = useMemo(createShipMaterials, [])
  const lightBase = useMemo(
    () => ({ port: mat.navPort.color.clone(), starboard: mat.navStarboard.color.clone(), dash: mat.dashGlow.color.clone() }),
    [mat],
  )

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
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    o.visible = !ship.hidden
    if (ship.hidden) return
    o.position.copy(ship.position)

    const s = ship.stretch
    if (s > 1.0001) {
      o.quaternion.setFromUnitVectors(Z, ship.stretchAxis)
      const thin = 1 / Math.sqrt(s)
      o.scale.set(thin, thin, s)
      i.quaternion.multiplyQuaternions(_qInv.copy(o.quaternion).invert(), ship.quaternion)
    } else {
      o.quaternion.identity()
      o.scale.set(1, 1, 1)
      i.quaternion.copy(ship.quaternion)
    }

    const power = ship.power
    const thrust = ship.throttle * (1 + ship.boost * 0.6)
    const glow = SHIP_LOOK.ENGINE_GLOW_IDLE + (SHIP_LOOK.ENGINE_GLOW_MAX - SHIP_LOOK.ENGINE_GLOW_IDLE) * thrust
    mat.engineGlow.color.copy(glowBase).multiplyScalar(glow * power)
    mat.navPort.color.copy(lightBase.port).multiplyScalar(power)
    mat.navStarboard.color.copy(lightBase.starboard).multiplyScalar(power)
    mat.dashGlow.color.copy(lightBase.dash).multiplyScalar(power)

    const phase = state.clock.elapsedTime % SHIP_LOOK.STROBE_PERIOD
    mat.strobe.color.setScalar((phase < SHIP_LOOK.STROBE_FLASH ? SHIP_LOOK.STROBE_GLOW : 0.05) * power)
  }, -2)

  return (
    <group ref={outer}>
      <group ref={inner}>
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
    </group>
  )
}
