import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SHIP } from '../game/constants'
import { attachFlightInput, readFlightInput } from '../game/input'
import { dangerLevel } from '../game/physics'
import { planets } from '../game/planets'
import { emitRunEvent, resetRun, run, updateBonuses } from '../game/run'
import { createFlightInput, resetShip, ship, stepShip } from '../game/ship'

/** Reads pilot input and integrates the ship under thrust and gravity. Mounted only in the 'playing' phase. */
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
    readFlightInput(input, delta)
    stepShip(ship, input, delta, planets, run.dilation)
    updateBonuses(ship.position, ship.velocity, Math.min(delta, SHIP.MAX_DT), planets)

    // Temporary until death/restart (stage 5): crossing the lethal radius starts a new run at the spawn.
    if (dangerLevel(ship.position.length()) >= 1) {
      emitRunEvent({ kind: 'lost', title: 'LOST TO THE HORIZON', detail: 'run restarted', points: 0 })
      resetShip(ship)
      resetRun(planets)
    }
  }, -3)

  return null
}
