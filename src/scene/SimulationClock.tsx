import { useFrame } from '@react-three/fiber'
import { SHIP } from '../game/constants'
import { timeDilation } from '../game/physics'
import { planets, updatePlanets } from '../game/planets'
import { advanceClocks, run } from '../game/run'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'

/**
 * First thing every frame: measures the ship's time dilation, advances the ship / universe clocks
 * and moves the planets along universe time. Outside flight the world simply runs at 1x.
 */
export function SimulationClock() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, SHIP.MAX_DT)
    const flying = useGameStore.getState().phase === 'playing'
    const dilation = flying ? timeDilation(ship.position.length()) : 1
    advanceClocks(dt, dilation, flying)
    updatePlanets(planets, run.worldTime)
  }, -4)

  return null
}
