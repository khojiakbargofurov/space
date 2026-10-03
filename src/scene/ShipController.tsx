import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SHIP } from '../game/constants'
import { killShip } from '../game/death'
import { attachFlightInput, readFlightInput } from '../game/input'
import { planets } from '../game/planets'
import { run, updateBonuses } from '../game/run'
import { createFlightInput, ship, stepShip } from '../game/ship'
import { updateSurvival } from '../game/survival'

/**
 * Reads pilot input, integrates the ship under thrust and gravity, then runs bonuses and survival
 * (resources, hazards, pickups, death). Mounted only in the 'playing' phase.
 */
export function ShipController() {
  const canvas = useThree((s) => s.gl.domElement)
  const input = useMemo(createFlightInput, [])

  useEffect(() => {
    const detach = attachFlightInput(canvas)
    return () => {
      detach()
      // Engines off while parked in the orbit view.
      ship.throttle = 0
      ship.boost = 0
      ship.rcs.set(0, 0, 0)
      ship.localAccel.set(0, 0, 0)
      ship.thrust.set(0, 0, 0)
    }
  }, [canvas])

  // Right after the simulation clock: ship model, cameras, particles and HUD all read the updated state.
  useFrame((_, delta) => {
    const dt = Math.min(delta, SHIP.MAX_DT)
    readFlightInput(input, delta)
    // Dry tanks: every thruster is dead, only the reaction wheels still turn the ship.
    if (run.fuel <= 0) {
      input.thrust = 0
      input.strafeX = 0
      input.strafeY = 0
      input.boost = false
      input.brake = false
    }
    stepShip(ship, input, delta, planets, run.dilation)
    updateBonuses(ship.position, ship.velocity, dt, planets)
    const cause = updateSurvival(dt, run.dilation)
    if (cause) killShip(cause)
  }, -3)

  return null
}
