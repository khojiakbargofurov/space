import { useGameStore } from '../game/store'

const MENU_KEYS: [string, string][] = [
  ['Enter', 'launch'],
  ['Drag / wheel', 'orbit view'],
  ['G', 'quality'],
  ['F', 'fps'],
  ['H', 'hide help'],
]

const FLIGHT_KEYS: [string, string][] = [
  ['Click', 'capture mouse (Esc releases)'],
  ['Mouse / arrows', 'pitch · yaw'],
  ['W / S', 'thrust · reverse'],
  ['Shift', 'boost'],
  ['A / D', 'strafe'],
  ['Space / C', 'up · down'],
  ['Q / E', 'roll'],
  ['X', 'brake'],
  ['V', 'chase / cockpit'],
  ['Wheel', 'chase distance'],
  ['R', 'new run'],
  ['Enter', 'orbit view'],
  ['H', 'hide help'],
]

/** Key reference overlay (H toggles). The full menus arrive in stage 8. */
export function ControlsHint() {
  const flying = useGameStore((s) => s.phase === 'playing')
  const show = useGameStore((s) => s.showHelp)
  if (!show) return null

  const rows = flying ? FLIGHT_KEYS : MENU_KEYS
  return (
    <div className="controls-hint">
      {rows.map(([key, action]) => (
        <div key={key + action} className="controls-row">
          <kbd>{key}</kbd>
          <span>{action}</span>
        </div>
      ))}
    </div>
  )
}
