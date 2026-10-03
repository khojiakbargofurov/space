import { useMemo } from 'react'
import { Vector3 } from 'three'
import { SHIP_LIGHTING } from '../game/constants'
import { sectorConfig } from '../game/sectors'
import { useGameStore } from '../game/store'

/**
 * Lights for real meshes (the ship): warm disk glow from the hole, cool fill from the sector's galactic
 * band, faint ambient.
 */
export function ShipLights() {
  const sector = useGameStore((s) => s.sector)
  const fillPosition = useMemo(
    () => new Vector3(...sectorConfig(sector).nebula.bandNormal).normalize().multiplyScalar(1000),
    [sector],
  )

  return (
    <>
      <ambientLight color={SHIP_LIGHTING.AMBIENT_COLOR} intensity={SHIP_LIGHTING.AMBIENT_INTENSITY} />
      <pointLight
        position={[0, 0, 0]}
        color={SHIP_LIGHTING.DISK_LIGHT_COLOR}
        intensity={SHIP_LIGHTING.DISK_LIGHT_INTENSITY}
        decay={SHIP_LIGHTING.DISK_LIGHT_DECAY}
        distance={0}
      />
      <directionalLight position={fillPosition} color={SHIP_LIGHTING.FILL_COLOR} intensity={SHIP_LIGHTING.FILL_INTENSITY} />
    </>
  )
}
