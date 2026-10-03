import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BLACK_HOLE, READOUT } from '../game/constants'
import { attachFlightInput, readFlightInput } from '../game/input'
import { dangerLevel } from '../game/physics'
import { createFlightInput, resetShip, ship, stepShip } from '../game/ship'
import { useGameStore } from '../game/store'
import { flightDisplay } from '../ui/flightDisplay'

/** Reads pilot input and integrates the ship while flying. Mounted only in the 'playing' phase. */
export function ShipController() {
  const canvas = useThree((s) => s.gl.domElement)
  const input = useMemo(createFlightInput, [])
  const readoutTimer = useRef(0)

  useEffect(() => {
    const detach = attachFlightInput(canvas)
    return () => {
      detach()
      // Engines off while parked in the orbit view.
      ship.throttle = 0
      ship.boost = 0
      ship.rcs.set(0, 0, 0)
      ship.localAccel.set(0, 0, 0)
    }
  }, [canvas])

  // Runs first each frame: ship model, cameras and particles all read the updated state.
  useFrame((_, delta) => {
    readFlightInput(input, delta)
    stepShip(ship, input, delta)

    const r = ship.position.length()
    // Temporary until death/restart (stage 5): falling into the hole puts you back at the spawn.
    if (dangerLevel(r) >= 1) resetShip(ship)

    readoutTimer.current += delta
    if (readoutTimer.current >= READOUT.INTERVAL && flightDisplay.el) {
      readoutTimer.current = 0
      const mode = useGameStore.getState().cameraMode
      const boost = ship.boost > 0.5 ? ' · BOOST' : ''
      flightDisplay.el.textContent =
        `SPD ${ship.velocity.length().toFixed(1)} u/s · R ${(r / BLACK_HOLE.SCHWARZSCHILD_RADIUS).toFixed(1)} rs · ` +
        `THR ${(ship.throttle * 100).toFixed(0)}%${boost} · ${mode.toUpperCase()}`
    }
  }, -3)

  return null
}
