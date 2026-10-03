import { CHASE_CAM, CONTROLS, SHIP } from './constants'
import type { FlightInput } from './types'

/**
 * Raw keyboard / mouse state for flight. Event handlers only flip flags and accumulate
 * deltas; `readFlightInput` turns them into a FlightInput once per frame (allocation-free).
 *
 * Bindings: W/S thrust · A/D strafe · Space/C up/down · Q/E roll · arrows pitch/yaw ·
 * Shift boost · X brake · mouse (pointer lock) pitch/yaw · wheel chase distance.
 */
const keys: Record<string, boolean> = {}
const mouse = { dx: 0, dy: 0 }

/** Chase camera distance multiplier, changed by the mouse wheel. */
export const chaseZoom: { distance: number } = { distance: CHASE_CAM.OFFSET[2] }

const FLIGHT_KEYS = new Set([
  'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyX', 'KeyC', 'Space',
  'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
])

function axis(neg: boolean | undefined, pos: boolean | undefined): number {
  return (pos ? 1 : 0) - (neg ? 1 : 0)
}

function clamp1(v: number): number {
  return v > 1 ? 1 : v < -1 ? -1 : v
}

export function readFlightInput(out: FlightInput, dt: number): FlightInput {
  out.thrust = axis(keys.KeyS, keys.KeyW)
  out.strafeX = axis(keys.KeyA, keys.KeyD)
  out.strafeY = axis(keys.KeyC, keys.Space)
  out.roll = axis(keys.KeyE, keys.KeyQ)
  out.boost = !!(keys.ShiftLeft || keys.ShiftRight)
  out.brake = !!keys.KeyX

  let pitch = axis(keys.ArrowDown, keys.ArrowUp)
  let yaw = axis(keys.ArrowRight, keys.ArrowLeft)
  // Mouse travel → rotation: a rate of (pixels * rad/px) / dt, as a fraction of the max rate.
  if (dt > 0 && (mouse.dx !== 0 || mouse.dy !== 0)) {
    const k = CONTROLS.MOUSE_SENSITIVITY / dt
    const dy = CONTROLS.INVERT_Y ? mouse.dy : -mouse.dy
    pitch += (dy * k) / SHIP.MAX_PITCH_RATE
    yaw += (-mouse.dx * k) / SHIP.MAX_YAW_RATE
  }
  mouse.dx = 0
  mouse.dy = 0
  out.pitch = clamp1(pitch)
  out.yaw = clamp1(yaw)
  return out
}

export function clearFlightInput(): void {
  for (const k in keys) keys[k] = false
  mouse.dx = 0
  mouse.dy = 0
}

/**
 * Listens for flight controls while attached. Clicking `canvas` captures the mouse
 * (pointer lock); Esc releases it. Returns a detach function.
 */
export function attachFlightInput(canvas: HTMLCanvasElement): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (!FLIGHT_KEYS.has(e.code)) return
    keys[e.code] = true
    e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (!FLIGHT_KEYS.has(e.code)) return
    keys[e.code] = false
  }
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return
    mouse.dx += e.movementX
    mouse.dy += e.movementY
  }
  const onMouseDown = () => {
    if (document.pointerLockElement === canvas) return
    // Some browsers return a promise that rejects if the request is refused; nothing to do then.
    const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined
    p?.catch?.(() => {})
  }
  const onWheel = (e: WheelEvent) => {
    const step = e.deltaY > 0 ? CHASE_CAM.ZOOM_STEP : 1 / CHASE_CAM.ZOOM_STEP
    chaseZoom.distance = Math.min(CHASE_CAM.MAX_DISTANCE, Math.max(CHASE_CAM.MIN_DISTANCE, chaseZoom.distance * step))
  }
  // Releasing keys while the window is unfocused would otherwise leave them stuck "down".
  const onBlur = () => clearFlightInput()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('wheel', onWheel, { passive: true })

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('wheel', onWheel)
    if (document.pointerLockElement === canvas) document.exitPointerLock()
    clearFlightInput()
  }
}
