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
  shards: HTMLElement
  /** Sector block (data-open mirrors the wormhole), quota text and bar. */
  sector: HTMLElement
  quota: HTMLElement
  quotaBar: HTMLElement
  speed: HTMLElement
  radial: HTMLElement
  distance: HTMLElement
  gravity: HTMLElement
  tide: HTMLElement
  engine: HTMLElement
  peak: HTMLElement
  /** Resource gauges in fuel, oxygen, hull order. */
  resources: HTMLElement[]
  resourceBars: HTMLElement[]
  resourceValues: HTMLElement[]
  warning: HTMLElement
  warningText: HTMLElement
  dangerBar: HTMLElement
  hit: HTMLElement
  toastBox: HTMLElement
  toasts: HTMLElement[]
  markers: HTMLElement[]
  markerBoxes: HTMLElement[]
  markerDistances: HTMLElement[]
  prograde: HTMLElement
  /** Nearest-pickup markers in PICKUP_KINDS order. */
  pickupMarkers: HTMLElement[]
  pickupDistances: HTMLElement[]
  wormhole: HTMLElement
  wormholeDistance: HTMLElement
}

export const hudDisplay: { el: HudElements | null } = { el: null }
