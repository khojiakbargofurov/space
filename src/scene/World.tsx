import { useGameStore } from '../game/store'
import { HudUpdater } from './HudUpdater'
import { LensingView } from './LensingView'
import { OrbitCamera } from './OrbitCamera'
import { Planets } from './Planets'
import { Ship } from './Ship'
import { ShipCamera } from './ShipCamera'
import { ShipController } from './ShipController'
import { ShipLights } from './ShipLights'
import { SimulationClock } from './SimulationClock'
import { ThrustParticles } from './ThrustParticles'
import { useEnvironmentMap } from './useEnvironmentMap'
import { useNebulaCubeMap } from './useNebulaCubeMap'

/**
 * Everything in the 3D scene. In the menu the free orbit camera shows the hole, the planets and the
 * parked ship; while playing, the flight controller, ship camera and HUD take over.
 * Frame order: clock (-4) → ship (-3) → ship model / planets (-2) → cameras (-1) → everything else.
 */
export function World() {
  const flying = useGameStore((s) => s.phase === 'playing')
  const nebula = useNebulaCubeMap()
  const envMap = useEnvironmentMap(nebula)

  return (
    <>
      <SimulationClock />
      {flying ? (
        <>
          <ShipController />
          <ShipCamera />
          <HudUpdater />
        </>
      ) : (
        <OrbitCamera />
      )}
      <ShipLights />
      <LensingView nebula={nebula} />
      <Planets />
      <Ship envMap={envMap} />
      <ThrustParticles />
    </>
  )
}
