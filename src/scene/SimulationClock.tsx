import { useFrame } from '@react-three/fiber'
import { SHIP } from '../game/constants'
import { updateRocks } from '../game/debris'
import { timeDilation } from '../game/physics'
import { updatePickups } from '../game/pickups'
import { planets, updatePlanets } from '../game/planets'
import { advanceClocks, run } from '../game/run'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { updateWormhole } from '../game/wormhole'

/**
 * First thing every frame: measures the ship's time dilation, advances the ship / universe clocks
 * and moves the planets, pickups, debris and the wormhole along universe time. In the menu the world runs at 1x;
 * after a death the world keeps running at the wreck's dilation while the run clocks stand still.
 */
export function SimulationClock() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, SHIP.MAX_DT)
    const phase = useGameStore.getState().phase
    const flying = phase === 'playing'
    const dilation = flying || phase === 'dead' ? timeDilation(ship.position.length()) : 1
    advanceClocks(dt, dilation, flying)
    updatePlanets(planets, run.worldTime)
    updatePickups(run.worldTime, ship.position)
    updateRocks(planets, run.worldTime, ship.position)
    updateWormhole(run.worldTime, dt)
  }, -4)

  return null
}
