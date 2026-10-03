import { useMemo } from 'react'
import { Vector3 } from 'three'
import { GALAXY_BAND_NORMAL, SHIP_LIGHTING } from '../game/constants'

/** Lights for real meshes (the ship): warm disk glow from the hole, cool galactic fill, faint ambient. */
export function ShipLights() {
  const fillPosition = useMemo(() => new Vector3(...GALAXY_BAND_NORMAL).normalize().multiplyScalar(1000), [])

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
