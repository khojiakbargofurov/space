import { useGameStore } from '../game/store'

const MENU_KEYS: [string, string][] = [
  ['Enter', 'launch'],
  ['U', 'upgrades'],
  ['N', 'new run'],
  ['Drag / wheel', 'orbit view'],
  ['G', 'quality'],
  ['F', 'fps'],
  ['M', 'mute'],
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
  ['M', 'mute'],
  ['H', 'hide help'],
]

const DEAD_KEYS: [string, string][] = [
  ['R', 'new run'],
  ['Enter', 'orbit view'],
]

/** Key reference overlay (H toggles). The full menus arrive in stage 8. */
export function ControlsHint() {
  const phase = useGameStore((s) => s.phase)
  const show = useGameStore((s) => s.showHelp)
  const shopOpen = useGameStore((s) => s.shopOpen)
  if (!show) return null

  // The transit panel and the shop list their own keys.
  if (phase === 'warp' || phase === 'transit' || shopOpen) return null
  const rows = phase === 'playing' ? FLIGHT_KEYS : phase === 'dead' ? DEAD_KEYS : MENU_KEYS
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
