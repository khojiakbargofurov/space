import { useFrame } from '@react-three/fiber'
import { SHIP } from '../game/constants'
import { stepDeath } from '../game/death'
import { run } from '../game/run'

/** Drives the wreck after a death (spaghettification, drift). Mounted only in the 'dead' phase. */
export function DeathSequence() {
  useFrame((_, delta) => {
    stepDeath(Math.min(delta, SHIP.MAX_DT), run.dilation)
  }, -3)

  return null
}
