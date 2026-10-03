import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BLACK_HOLE, ORBIT } from '../game/constants'

/** Free orbit around the black hole. Damping and auto-rotate are delta-time corrected. */
export function OrbitCamera() {
  const camera = useThree((s) => s.camera)
  const domElement = useThree((s) => s.gl.domElement)

  const controls = useMemo(() => {
    const c = new OrbitControls(camera)
    c.enableDamping = true
    c.enablePan = false
    c.minDistance = ORBIT.MIN_DISTANCE_RS * BLACK_HOLE.SCHWARZSCHILD_RADIUS
    c.maxDistance = ORBIT.MAX_DISTANCE
    c.rotateSpeed = ORBIT.ROTATE_SPEED
    c.zoomSpeed = ORBIT.ZOOM_SPEED
    c.autoRotate = true
    // OrbitControls auto-rotate angle per call = 2π/60 * speed * delta
    c.autoRotateSpeed = (ORBIT.AUTO_ROTATE_RAD_PER_SEC * 60) / (Math.PI * 2)
    c.target.set(0, 0, 0)
    return c
  }, [camera])

  useEffect(() => {
    const stopAutoRotate = () => {
      controls.autoRotate = false
    }
    controls.addEventListener('start', stopAutoRotate)
    controls.connect(domElement)
    return () => {
      controls.removeEventListener('start', stopAutoRotate)
      controls.disconnect()
    }
  }, [controls, domElement])

  // Negative priority: runs before other frame callbacks (so camera-locked objects see the final pose)
  // without taking over R3F's render loop.
  useFrame((_, delta) => {
    controls.dampingFactor = 1 - Math.pow(1 - ORBIT.DAMPING, delta * 60)
    controls.update(delta)
  }, -1)

  return null
}
