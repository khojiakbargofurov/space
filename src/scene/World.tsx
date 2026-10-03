import { useGameStore } from '../game/store'
import { AudioDriver } from './AudioDriver'
import { Bursts } from './Bursts'
import { DeathSequence } from './DeathSequence'
import { Debris } from './Debris'
import { HudUpdater } from './HudUpdater'
import { LensingView } from './LensingView'
import { OrbitCamera } from './OrbitCamera'
import { Pickups } from './Pickups'
import { Planets } from './Planets'
import { Ship } from './Ship'
import { ShipCamera } from './ShipCamera'
import { ShipController } from './ShipController'
import { ShipLights } from './ShipLights'
import { SimulationClock } from './SimulationClock'
import { ThrustParticles } from './ThrustParticles'
import { useEnvironmentMap } from './useEnvironmentMap'
import { useNebulaCubeMap } from './useNebulaCubeMap'
import { WarpTunnel } from './WarpTunnel'
import { Wormhole } from './Wormhole'

/**
 * Everything in the 3D scene. In the menu the free orbit camera shows the hole, the planets and the
 * parked ship; while playing, the flight controller, ship camera and HUD take over. After a death the
 * ship camera stays (watching the wreck) while the death sequence runs. Through a wormhole jump and
 * the arrival in the next sector ('warp', 'transit') the ship camera keeps following the ship.
 * Frame order: clock (-4) → ship / death sequence / warp (-3) → models (-2) → cameras (-1) → everything else.
 */
export function World() {
  const phase = useGameStore((s) => s.phase)
  const worldVersion = useGameStore((s) => s.worldVersion)
  const flying = phase === 'playing'
  const dead = phase === 'dead'
  const shipView = flying || dead || phase === 'warp' || phase === 'transit'
  const nebula = useNebulaCubeMap()
  const envMap = useEnvironmentMap(nebula)

  return (
    <>
      <SimulationClock />
      {/* Same slot for every in-run phase so the camera isn't remounted on death or a jump. */}
      {shipView ? <ShipCamera /> : <OrbitCamera />}
      {flying && <ShipController />}
      {/* Remounted per sector: its marker slots depend on the planet count. */}
      {flying && <HudUpdater key={worldVersion} />}
      {dead && <DeathSequence />}
      <ShipLights />
      <LensingView nebula={nebula} />
      <Planets />
      <Debris />
      <Pickups />
      <Wormhole />
      <Ship envMap={envMap} />
      <ThrustParticles />
      <Bursts />
      <WarpTunnel />
      <AudioDriver />
    </>
  )
}
