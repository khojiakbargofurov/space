import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { type PerspectiveCamera, Vector3 } from 'three'
import { BLACK_HOLE, HUD, RESOURCES, SCORE, SHIP } from '../game/constants'
import { dangerLevel, tidalAccel } from '../game/physics'
import { PICKUP_KINDS, nearestPickup } from '../game/pickups'
import { planets } from '../game/planets'
import { onRunEvent, run } from '../game/run'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { formatClock, formatDistance, formatDuration, formatPoints } from '../ui/format'
import { hudDisplay } from '../ui/hudDisplay'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS
const MAX_THRUST = SHIP.MAIN_THRUST * SHIP.BOOST_MULTIPLIER
const RESOURCE_MAX = [RESOURCES.FUEL_MAX, RESOURCES.OXYGEN_MAX, RESOURCES.HULL_MAX]

/** Minimum on-screen bracket size (px). */
const MIN_BOX = 18
/** Marker slots: planets, then the prograde marker, then one per pickup kind. */
const PROGRADE = planets.length
const FIRST_PICKUP = planets.length + 1
const SLOTS = FIRST_PICKUP + PICKUP_KINDS.length

type HudState = {
  cam: Vector3
  ndc: Vector3
  lastX: Float32Array
  lastY: Float32Array
  lastOff: Int8Array
}

/**
 * Writes the HUD from the live simulation. Text refreshes every HUD.INTERVAL; planet, pickup and
 * prograde markers are re-projected every frame (DOM writes are skipped when nothing moved).
 * Mounted only while flying.
 */
export function HudUpdater() {
  const st = useMemo(
    () => ({
      timer: HUD.INTERVAL as number,
      nextToast: 0,
      lastFlash: -1,
      cam: new Vector3(),
      ndc: new Vector3(),
      // Last values written per marker, so unchanged ones aren't touched.
      lastX: new Float32Array(SLOTS).fill(NaN),
      lastY: new Float32Array(SLOTS).fill(NaN),
      lastBox: new Float32Array(planets.length).fill(NaN),
      lastOff: new Int8Array(SLOTS).fill(-1),
    }),
    [],
  )

  // Bonus / pickup / impact toasts: a pool of three, the newest moved to the bottom of the stack.
  useEffect(
    () =>
      onRunEvent((e) => {
        const el = hudDisplay.el
        if (!el) return
        const toast = el.toasts[st.nextToast]
        st.nextToast = (st.nextToast + 1) % el.toasts.length
        const [title, detail, points] = toast.children as unknown as HTMLElement[]
        title.textContent = e.title
        detail.textContent = e.detail
        points.textContent = e.points > 0 ? `+${formatPoints(e.points)}` : ''
        toast.dataset.kind = e.kind
        toast.style.animationDuration = `${HUD.TOAST_SEC}s`
        toast.classList.remove('show')
        el.toastBox.appendChild(toast)
        void toast.offsetWidth // restart the CSS animation
        toast.classList.add('show')
      }),
    [st],
  )

  useFrame((state, delta) => {
    const el = hudDisplay.el
    if (!el) return
    const camera = state.camera as PerspectiveCamera
    const w = state.size.width
    const h = state.size.height
    const focalPx = h / 2 / Math.tan((camera.fov * Math.PI) / 360)

    // --- markers (every frame) ---
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i]
      const onScreen = placeMarker(st, el.markers[i], i, p.position, camera, w, h, true)
      if (!onScreen) continue
      const box = Math.max(MIN_BOX, Math.round((2.4 * p.radius * focalPx) / -st.cam.z))
      if (box !== st.lastBox[i]) {
        st.lastBox[i] = box
        el.markerBoxes[i].style.width = `${box}px`
        el.markerBoxes[i].style.height = `${box}px`
        // The label sits at the bracket's top-right corner.
        el.markers[i].style.setProperty('--half', `${box / 2}px`)
      }
    }

    const speed = ship.velocity.length()
    if (speed < HUD.PROGRADE_MIN_SPEED) setOff(st, el.prograde, PROGRADE, 2)
    else {
      st.cam.copy(ship.velocity).multiplyScalar(HUD.PROGRADE_DISTANCE / speed).add(ship.position)
      placeMarker(st, el.prograde, PROGRADE, st.cam, camera, w, h, false)
    }

    for (let k = 0; k < PICKUP_KINDS.length; k++) {
      const slot = FIRST_PICKUP + k
      const node = el.pickupMarkers[k]
      const p = nearestPickup(PICKUP_KINDS[k], ship.position)
      if (!p || p.orbit.position.distanceTo(ship.position) > HUD.PICKUP_MARKER_RANGE) setOff(st, node, slot, 2)
      else placeMarker(st, node, slot, p.orbit.position, camera, w, h, true)
    }

    // Damage flash follows every frame (it decays fast).
    const flash = Math.round(run.flash * 100) / 100
    if (flash !== st.lastFlash) {
      st.lastFlash = flash
      el.hit.style.opacity = `${flash}`
    }

    // --- text (throttled) ---
    st.timer += delta
    if (st.timer < HUD.INTERVAL) return
    st.timer = 0

    const r = ship.position.length()
    const d = run.dilation
    const heat = Math.min(1, (d - 1) / (HUD.DILATION_BAR_MAX - 1))
    el.root.style.setProperty('--heat', heat.toFixed(3))
    el.dilation.textContent = `×${d.toFixed(3)}`
    el.dilationBar.style.transform = `scaleX(${heat.toFixed(4)})`
    el.shipClock.textContent = formatClock(run.shipTime)
    el.universeClock.textContent = formatClock(run.universeTime)
    el.debt.textContent = `+${formatDuration(run.universeTime - run.shipTime)}`
    el.score.textContent = formatPoints(run.score)
    el.rate.textContent = `+${((d - 1) * SCORE.POINTS_PER_DEBT_SEC).toFixed(0)}/s`
    el.shards.textContent = `${run.shards}`

    const vr = r > 1e-6 ? ship.position.dot(ship.velocity) / r : 0
    const g = ship.gravity.length()
    el.speed.textContent = `${speed.toFixed(1)} u/s`
    el.radial.textContent = `${vr < 0 ? '▼' : '▲'} ${Math.abs(vr).toFixed(1)} u/s`
    el.distance.textContent = `${(r / RS).toFixed(2)} rs`
    el.gravity.textContent = `${g.toFixed(1)} u/s² · ${((g / MAX_THRUST) * 100).toFixed(0)}% thr`
    el.tide.textContent = `${tidalAccel(r).toFixed(1)} u/s² · ${(run.tidalStress * 100).toFixed(0)}%`
    const mode = useGameStore.getState().cameraMode
    el.engine.textContent =
      run.fuel <= 0 ? `DRY · ${mode}` : `${(ship.throttle * 100).toFixed(0)}%${ship.boost > 0.5 ? ' BOOST' : ''} · ${mode}`
    el.peak.textContent = `×${run.peakDilation.toFixed(3)}`

    for (let i = 0; i < 3; i++) {
      const level = i === 0 ? run.fuel : i === 1 ? run.oxygen : run.hull
      const f = level / RESOURCE_MAX[i]
      el.resourceBars[i].style.transform = `scaleX(${f.toFixed(4)})`
      el.resourceValues[i].textContent = level.toFixed(0)
      const status = f <= RESOURCES.CRITICAL_FRACTION ? 'critical' : f <= RESOURCES.LOW_FRACTION ? 'low' : ''
      if (el.resources[i].dataset.status !== status) el.resources[i].dataset.status = status
    }

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i]
      el.markerDistances[i].textContent = formatDistance(Math.max(0, ship.position.distanceTo(p.position) - p.radius))
    }
    for (let k = 0; k < PICKUP_KINDS.length; k++) {
      const p = nearestPickup(PICKUP_KINDS[k], ship.position)
      if (p) el.pickupDistances[k].textContent = formatDistance(p.orbit.position.distanceTo(ship.position))
    }

    // Warnings, most urgent first.
    const danger = dangerLevel(r)
    const fuelF = run.fuel / RESOURCES.FUEL_MAX
    const oxyF = run.oxygen / RESOURCES.OXYGEN_MAX
    const hullF = run.hull / RESOURCES.HULL_MAX
    let warning = ''
    let critical = false
    if (run.tidalStress > 0.5) {
      warning = 'TIDAL STRESS · HULL FAILING'
      critical = true
    } else if (run.heat > 0) {
      warning = 'DISK PLASMA · HULL HEATING'
      critical = true
    } else if (g > MAX_THRUST) {
      warning = 'GRAVITY EXCEEDS MAX THRUST'
      critical = true
    } else if (oxyF <= RESOURCES.LOW_FRACTION) {
      warning = 'LOW OXYGEN'
      critical = oxyF <= RESOURCES.CRITICAL_FRACTION
    } else if (hullF <= RESOURCES.LOW_FRACTION) {
      warning = 'HULL CRITICAL'
      critical = true
    } else if (run.fuel <= 0) {
      warning = 'FUEL EXHAUSTED · THRUSTERS DEAD'
      critical = true
    } else if (fuelF <= RESOURCES.LOW_FRACTION) {
      warning = 'LOW FUEL'
      critical = fuelF <= RESOURCES.CRITICAL_FRACTION
    } else if (run.tidalStress > 0) {
      warning = 'TIDAL STRESS'
    } else if (danger > 0) {
      warning = 'HORIZON PROXIMITY'
      critical = danger > 0.6
    } else if (ship.contact) {
      warning = 'SURFACE CONTACT'
    }
    el.warning.classList.toggle('active', warning !== '')
    el.warning.classList.toggle('critical', critical)
    if (el.warningText.textContent !== warning) el.warningText.textContent = warning
    el.dangerBar.style.transform = `scaleX(${Math.max(danger, run.tidalStress).toFixed(3)})`
  })

  return null
}

/**
 * Projects `world` and moves marker `node` (slot `i`) there. Off-screen targets are pinned to the
 * screen edge with an arrow when `pin` is set, hidden otherwise. Leaves the camera-space position in
 * `st.cam`. Returns true if the target is on screen.
 */
function placeMarker(
  st: HudState,
  node: HTMLElement,
  i: number,
  world: Vector3,
  camera: PerspectiveCamera,
  w: number,
  h: number,
  pin: boolean,
): boolean {
  st.cam.copy(world).applyMatrix4(camera.matrixWorldInverse)
  const inFront = st.cam.z < 0
  st.ndc.copy(st.cam).applyMatrix4(camera.projectionMatrix)
  const onScreen = inFront && Math.abs(st.ndc.x) <= 1 && Math.abs(st.ndc.y) <= 1

  let x: number
  let y: number
  if (onScreen) {
    x = (st.ndc.x * 0.5 + 0.5) * w
    y = (-st.ndc.y * 0.5 + 0.5) * h
  } else if (!pin) {
    setOff(st, node, i, 2)
    return false
  } else {
    // Off-screen or behind: pin to the screen edge in the target's direction.
    const dx = st.cam.x
    let dy = -st.cam.y
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) dy = 1
    const m = HUD.MARKER_MARGIN
    const s = Math.min((w / 2 - m) / Math.max(Math.abs(dx), 1e-6), (h / 2 - m) / Math.max(Math.abs(dy), 1e-6))
    x = w / 2 + dx * s
    y = h / 2 + dy * s
    node.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`)
  }

  setOff(st, node, i, onScreen ? 0 : 1)
  const rx = Math.round(x)
  const ry = Math.round(y)
  if (rx !== st.lastX[i] || ry !== st.lastY[i]) {
    st.lastX[i] = rx
    st.lastY[i] = ry
    node.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
  }
  return onScreen
}

/** Marker visibility state: 0 on screen, 1 pinned to the edge, 2 hidden. */
function setOff(st: { lastOff: Int8Array }, node: HTMLElement, i: number, state: number): void {
  if (st.lastOff[i] === state) return
  st.lastOff[i] = state
  node.classList.toggle('off', state === 1)
  node.classList.toggle('hidden', state === 2)
}
