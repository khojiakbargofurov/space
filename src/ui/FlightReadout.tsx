import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/store'
import { flightDisplay } from './flightDisplay'

/** Debug flight line (speed, distance, throttle, camera); replaced by the real HUD in stage 4. */
export function FlightReadout() {
  const flying = useGameStore((s) => s.phase === 'playing')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    flightDisplay.el = ref.current
    return () => {
      flightDisplay.el = null
    }
  }, [flying])

  if (!flying) return null
  return <div ref={ref} className="flight-readout" />
}
