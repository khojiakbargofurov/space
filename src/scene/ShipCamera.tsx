import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Matrix4, type PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { CAMERA, CHASE_CAM, COCKPIT_CAM } from '../game/constants'
import { chaseZoom } from '../game/input'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'

function approach(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt)
}

/**
 * Chase / cockpit camera. The chase camera trails the ship's orientation with a lag and is pushed
 * around by acceleration (not velocity), so cruising feels still and thrust feels physical.
 * On mount it swoops from wherever the orbit camera was into position.
 */
export function ShipCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  const st = useMemo(
    () => ({
      quat: new Quaternion().copy(ship.quaternion),
      accel: new Vector3(),
      startPos: new Vector3(),
      startQuat: new Quaternion(),
      intro: 0,
      time: 0,
      // scratch
      offset: new Vector3(),
      target: new Vector3(),
      up: new Vector3(),
      pos: new Vector3(),
      look: new Quaternion(),
      m: new Matrix4(),
    }),
    [],
  )

  useEffect(() => {
    st.startPos.copy(camera.position)
    st.startQuat.copy(camera.quaternion)
    st.quat.copy(ship.quaternion)
    st.intro = 0
    return () => {
      camera.fov = CAMERA.FOV
      camera.updateProjectionMatrix()
    }
  }, [camera, st])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    st.time += dt
    const cockpit = useGameStore.getState().cameraMode === 'cockpit'
    const effort = ship.throttle * ship.boost

    st.accel.lerp(ship.localAccel, approach(CHASE_CAM.ACCEL_FOLLOW, dt))

    let fov: number
    let shake: number
    if (cockpit) {
      st.quat.copy(ship.quaternion)
      st.pos.set(...COCKPIT_CAM.EYE).applyQuaternion(ship.quaternion).add(ship.position)
      st.look.copy(ship.quaternion)
      fov = COCKPIT_CAM.FOV + COCKPIT_CAM.BOOST_FOV_KICK * effort
      shake = COCKPIT_CAM.BOOST_SHAKE * effort
    } else {
      st.quat.slerp(ship.quaternion, approach(CHASE_CAM.ROTATION_FOLLOW, dt))
      const dist = chaseZoom.distance
      const pull = Math.min(ship.velocity.length() * CHASE_CAM.SPEED_PULLBACK, CHASE_CAM.SPEED_PULLBACK_MAX)
      st.offset
        .set(CHASE_CAM.OFFSET[0], (CHASE_CAM.OFFSET[1] * dist) / CHASE_CAM.OFFSET[2], dist + pull)
        .addScaledVector(st.accel, -CHASE_CAM.ACCEL_PULLBACK)
        .applyQuaternion(st.quat)
      st.pos.copy(ship.position).add(st.offset)
      st.target.set(...CHASE_CAM.LOOK_AHEAD).applyQuaternion(st.quat).add(ship.position)
      st.up.set(0, 1, 0).applyQuaternion(st.quat)
      // Matrix4.lookAt aims +Z from target to eye, i.e. the camera's -Z looks at the target.
      st.m.lookAt(st.pos, st.target, st.up)
      st.look.setFromRotationMatrix(st.m)
      fov = CHASE_CAM.FOV + CHASE_CAM.BOOST_FOV_KICK * effort
      shake = CHASE_CAM.BOOST_SHAKE * effort
    }

    if (shake > 0) {
      const t = st.time
      st.offset.set(
        Math.sin(t * 47.3) + 0.5 * Math.sin(t * 91.7),
        Math.sin(t * 53.1 + 1.3) + 0.5 * Math.sin(t * 83.9 + 0.7),
        0,
      )
      st.pos.addScaledVector(st.offset.applyQuaternion(st.look), shake)
    }

    if (st.intro < 1) {
      st.intro = Math.min(1, st.intro + dt / CHASE_CAM.INTRO_SEC)
      const e = st.intro * st.intro * (3 - 2 * st.intro)
      camera.position.lerpVectors(st.startPos, st.pos, e)
      camera.quaternion.slerpQuaternions(st.startQuat, st.look, e)
    } else {
      camera.position.copy(st.pos)
      camera.quaternion.copy(st.look)
    }

    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
  }, -1)

  return null
}
