import { useGameStore } from '../game/store'
import { LensingView } from './LensingView'
import { OrbitCamera } from './OrbitCamera'
import { Ship } from './Ship'
import { ShipCamera } from './ShipCamera'
import { ShipController } from './ShipController'
import { ShipLights } from './ShipLights'
import { ThrustParticles } from './ThrustParticles'
import { useEnvironmentMap } from './useEnvironmentMap'
import { useNebulaCubeMap } from './useNebulaCubeMap'

/**
 * Everything in the 3D scene. In the menu the free orbit camera shows the hole with the parked ship;
 * while playing, the flight controller and ship camera take over.
 */
export function World() {
  const flying = useGameStore((s) => s.phase === 'playing')
  const nebula = useNebulaCubeMap()
  const envMap = useEnvironmentMap(nebula)

  return (
    <>
      {flying ? (
        <>
          <ShipController />
          <ShipCamera />
        </>
      ) : (
        <OrbitCamera />
      )}
      <ShipLights />
      <LensingView nebula={nebula} />
      <Ship envMap={envMap} />
      <ThrustParticles />
    </>
  )
}
