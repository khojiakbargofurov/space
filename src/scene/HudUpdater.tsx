import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { type PerspectiveCamera, Vector3 } from 'three'
import { BLACK_HOLE, HUD, SCORE, SHIP } from '../game/constants'
import { dangerLevel } from '../game/physics'
import { planets } from '../game/planets'
import { onRunEvent, run } from '../game/run'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import { formatClock, formatDistance, formatDuration, formatPoints } from '../ui/format'
import { hudDisplay } from '../ui/hudDisplay'

const RS = BLACK_HOLE.SCHWARZSCHILD_RADIUS
const MAX_THRUST = SHIP.MAIN_THRUST * SHIP.BOOST_MULTIPLIER

/** Minimum on-screen bracket size (px). */
const MIN_BOX = 18

/**
 * Writes the HUD from the live simulation. Text refreshes every HUD.INTERVAL; planet markers and the
 * prograde marker are re-projected every frame (DOM writes are skipped when nothing moved).
 * Mounted only while flying.
 */
export function HudUpdater() {
  const st = useMemo(
    () => ({
      timer: HUD.INTERVAL as number,
      nextToast: 0,
      cam: new Vector3(),
      ndc: new Vector3(),
      // Last values written per marker, so unchanged ones aren't touched.
      lastX: new Float32Array(planets.length + 1).fill(NaN),
      lastY: new Float32Array(planets.length + 1).fill(NaN),
      lastBox: new Float32Array(planets.length).fill(NaN),
      lastOff: new Int8Array(planets.length + 1).fill(-1),
    }),
    [],
  )

  // Bonus / loss toasts: a pool of three, the newest moved to the bottom of the stack.
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
    for (let i = 0; i <= planets.length; i++) {
      const isPrograde = i === planets.length
      const node = isPrograde ? el.prograde : el.markers[i]
      if (isPrograde) {
        const speed = ship.velocity.length()
        if (speed < HUD.PROGRADE_MIN_SPEED) {
          setOff(st, node, i, 2)
          continue
        }
        st.cam.copy(ship.velocity).multiplyScalar(HUD.PROGRADE_DISTANCE / speed).add(ship.position)
      } else {
        st.cam.copy(planets[i].position)
      }
      st.cam.applyMatrix4(camera.matrixWorldInverse)
      const inFront = st.cam.z < 0
      st.ndc.copy(st.cam).applyMatrix4(camera.projectionMatrix)
      const onScreen = inFront && Math.abs(st.ndc.x) <= 1 && Math.abs(st.ndc.y) <= 1

      let x: number
      let y: number
      if (onScreen) {
        x = (st.ndc.x * 0.5 + 0.5) * w
        y = (-st.ndc.y * 0.5 + 0.5) * h
      } else if (isPrograde) {
        setOff(st, node, i, 2)
        continue
      } else {
        // Off-screen or behind: pin to the screen edge in the planet's direction.
        let dx = st.cam.x
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
      if (!isPrograde && onScreen) {
        const box = Math.max(MIN_BOX, Math.round((2.4 * planets[i].radius * focalPx) / -st.cam.z))
        if (box !== st.lastBox[i]) {
          st.lastBox[i] = box
          el.markerBoxes[i].style.width = `${box}px`
          el.markerBoxes[i].style.height = `${box}px`
          // The label sits at the bracket's top-right corner.
          node.style.setProperty('--half', `${box / 2}px`)
        }
      }
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

    const vr = r > 1e-6 ? ship.position.dot(ship.velocity) / r : 0
    const g = ship.gravity.length()
    el.speed.textContent = `${ship.velocity.length().toFixed(1)} u/s`
    el.radial.textContent = `${vr < 0 ? '▼' : '▲'} ${Math.abs(vr).toFixed(1)} u/s`
    el.distance.textContent = `${(r / RS).toFixed(2)} rs`
    el.gravity.textContent = `${g.toFixed(1)} u/s² · ${((g / MAX_THRUST) * 100).toFixed(0)}% thr`
    const mode = useGameStore.getState().cameraMode
    el.engine.textContent = `${(ship.throttle * 100).toFixed(0)}%${ship.boost > 0.5 ? ' BOOST' : ''} · ${mode}`
    el.peak.textContent = `×${run.peakDilation.toFixed(3)}`

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i]
      el.markerDistances[i].textContent = formatDistance(Math.max(0, ship.position.distanceTo(p.position) - p.radius))
    }

    // Warnings, most urgent first.
    const danger = dangerLevel(r)
    let warning = ''
    if (g > MAX_THRUST) warning = 'GRAVITY EXCEEDS MAX THRUST'
    else if (danger > 0) warning = 'HORIZON PROXIMITY'
    else if (ship.contact) warning = 'SURFACE CONTACT'
    el.warning.classList.toggle('active', warning !== '')
    el.warning.classList.toggle('critical', g > MAX_THRUST || danger > 0.6)
    if (el.warningText.textContent !== warning) el.warningText.textContent = warning
    el.dangerBar.style.transform = `scaleX(${danger.toFixed(3)})`
  })

  return null
}

/** Marker visibility state: 0 on screen, 1 pinned to the edge, 2 hidden. */
function setOff(st: { lastOff: Int8Array }, node: HTMLElement, i: number, state: number): void {
  if (st.lastOff[i] === state) return
  st.lastOff[i] = state
  node.classList.toggle('off', state === 1)
  node.classList.toggle('hidden', state === 2)
}
