/**
 * DOM handles of the HUD, filled by <Hud> when it mounts. The in-canvas HudUpdater writes to them
 * directly so per-frame values never go through React.
 */
export interface HudElements {
  root: HTMLElement
  dilation: HTMLElement
  dilationBar: HTMLElement
  shipClock: HTMLElement
  universeClock: HTMLElement
  debt: HTMLElement
  score: HTMLElement
  rate: HTMLElement
  speed: HTMLElement
  radial: HTMLElement
  distance: HTMLElement
  gravity: HTMLElement
  engine: HTMLElement
  peak: HTMLElement
  warning: HTMLElement
  warningText: HTMLElement
  dangerBar: HTMLElement
  toastBox: HTMLElement
  toasts: HTMLElement[]
  markers: HTMLElement[]
  markerBoxes: HTMLElement[]
  markerDistances: HTMLElement[]
  prograde: HTMLElement
}

export const hudDisplay: { el: HudElements | null } = { el: null }
