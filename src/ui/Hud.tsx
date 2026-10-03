import { useEffect, useRef } from 'react'
import { PICKUP_KINDS } from '../game/pickups'
import { planets } from '../game/planets'
import { sectorConfig, sectorLabel } from '../game/sectors'
import { useGameStore } from '../game/store'
import { type HudElements, hudDisplay } from './hudDisplay'

function one(root: HTMLElement, key: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-hud="${key}"]`)
  if (!el) throw new Error(`HUD element missing: ${key}`)
  return el
}

function all(root: HTMLElement, key: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-hud="${key}"]`))
}

const RESOURCE_ROWS = [
  ['fuel', 'FUEL'],
  ['oxygen', 'O₂'],
  ['hull', 'HULL'],
] as const

const PICKUP_LABELS = { fuel: 'FUEL', oxygen: 'O₂', shard: 'SHARD' } as const

/**
 * Flight HUD: time dilation gauge with the ship and universe clocks, score and shards, sector and
 * wormhole quota, flight data, resource gauges, warnings, damage flash, toasts, planet / nearest-pickup
 * / wormhole markers, the prograde marker and the sector banner shown on launch. Static markup only;
 * the values are written by the in-canvas HudUpdater through `hudDisplay`.
 */
export function Hud() {
  const flying = useGameStore((s) => s.phase === 'playing')
  const sector = useGameStore((s) => s.sector)
  // A new sector has other planets: re-render the markers.
  const worldVersion = useGameStore((s) => s.worldVersion)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const elements: HudElements = {
      root,
      dilation: one(root, 'dilation'),
      dilationBar: one(root, 'dilation-bar'),
      shipClock: one(root, 'ship-clock'),
      universeClock: one(root, 'universe-clock'),
      debt: one(root, 'debt'),
      score: one(root, 'score'),
      rate: one(root, 'rate'),
      shards: one(root, 'shards'),
      sector: one(root, 'sector'),
      quota: one(root, 'quota'),
      quotaBar: one(root, 'quota-bar'),
      speed: one(root, 'speed'),
      radial: one(root, 'radial'),
      distance: one(root, 'distance'),
      gravity: one(root, 'gravity'),
      tide: one(root, 'tide'),
      engine: one(root, 'engine'),
      peak: one(root, 'peak'),
      resources: all(root, 'resource'),
      resourceBars: all(root, 'resource-bar'),
      resourceValues: all(root, 'resource-value'),
      warning: one(root, 'warning'),
      warningText: one(root, 'warning-text'),
      dangerBar: one(root, 'danger-bar'),
      hit: one(root, 'hit'),
      toastBox: one(root, 'toasts'),
      toasts: all(root, 'toast'),
      markers: all(root, 'marker'),
      markerBoxes: all(root, 'marker-box'),
      markerDistances: all(root, 'marker-distance'),
      prograde: one(root, 'prograde'),
      pickupMarkers: all(root, 'pickup-marker'),
      pickupDistances: all(root, 'pickup-distance'),
      wormhole: one(root, 'wormhole'),
      wormholeDistance: one(root, 'wormhole-distance'),
    }
    hudDisplay.el = elements
    return () => {
      hudDisplay.el = null
    }
  }, [flying, worldVersion])

  if (!flying) return null
  const cfg = sectorConfig(sector)
  return (
    <div ref={ref} className="hud">
      <div className="hud-hit" data-hud="hit" />
      <div className="hud-markers">
        {planets.map((p) => (
          <div key={p.name} className="hud-marker" data-hud="marker">
            <div className="hud-marker-box" data-hud="marker-box" />
            <div className="hud-marker-arrow" />
            <div className="hud-marker-label">
              <span className="hud-marker-name">{p.name}</span>
              <span data-hud="marker-distance" />
            </div>
          </div>
        ))}
        {PICKUP_KINDS.map((k) => (
          <div key={k} className="hud-pickup hidden" data-hud="pickup-marker" data-kind={k}>
            <div className="hud-pickup-diamond" />
            <div className="hud-marker-arrow" />
            <div className="hud-pickup-label">
              {PICKUP_LABELS[k]} <span data-hud="pickup-distance" />
            </div>
          </div>
        ))}
        <div className="hud-wormhole hidden" data-hud="wormhole">
          <div className="hud-wormhole-ring" />
          <div className="hud-marker-arrow" />
          <div className="hud-wormhole-label">
            WORMHOLE <span data-hud="wormhole-distance" />
          </div>
        </div>
        <div className="hud-prograde" data-hud="prograde" />
      </div>

      <div className="hud-banner" key={worldVersion}>
        <div className="hud-banner-title">{sectorLabel(sector)}</div>
        <div className="hud-banner-line">
          Collect {cfg.shardQuota} chrono shards to open the wormhole · score ×{cfg.scoreMult.toFixed(2)}
        </div>
      </div>

      <div className="hud-top">
        <div className="hud-label">TIME DILATION</div>
        <div className="hud-dilation" data-hud="dilation">×1.000</div>
        <div className="hud-bar">
          <div className="hud-bar-fill" data-hud="dilation-bar" />
        </div>
        <div className="hud-clocks">
          <div className="hud-clock">
            <span className="hud-label">SHIP</span>
            <span data-hud="ship-clock">00:00:00.0</span>
          </div>
          <div className="hud-clock hud-clock-universe">
            <span className="hud-label">UNIVERSE</span>
            <span data-hud="universe-clock">00:00:00.0</span>
          </div>
        </div>
        <div className="hud-debt">
          <span className="hud-label">TIME DEBT</span> <span data-hud="debt">0.0 s</span>
        </div>
      </div>

      <div className="hud-score">
        <div className="hud-label">SCORE</div>
        <div className="hud-score-value" data-hud="score">0</div>
        <div className="hud-score-rate" data-hud="rate">+0/s</div>
        <div className="hud-shards">
          <span className="hud-shard-icon">◆</span> <span data-hud="shards">0</span>
        </div>
        <div className="hud-sector" data-hud="sector">
          <div className="hud-sector-name">
            {sectorLabel(sector)} <span className="hud-sector-mult">×{cfg.scoreMult.toFixed(2)}</span>
          </div>
          <div className="hud-quota-bar">
            <div className="hud-quota-fill" data-hud="quota-bar" />
          </div>
          <div className="hud-quota" data-hud="quota" />
        </div>
      </div>

      <div className="hud-resources">
        {RESOURCE_ROWS.map(([key, label]) => (
          <div key={key} className="hud-resource" data-hud="resource" data-kind={key}>
            <span className="hud-label">{label}</span>
            <div className="hud-resource-bar">
              <div className="hud-resource-fill" data-hud="resource-bar" />
            </div>
            <span className="hud-resource-value" data-hud="resource-value">100</span>
          </div>
        ))}
      </div>

      <div className="hud-flight">
        <div className="hud-row"><span className="hud-label">SPD</span><span data-hud="speed" /></div>
        <div className="hud-row"><span className="hud-label">V-RAD</span><span data-hud="radial" /></div>
        <div className="hud-row"><span className="hud-label">DIST</span><span data-hud="distance" /></div>
        <div className="hud-row"><span className="hud-label">GRAV</span><span data-hud="gravity" /></div>
        <div className="hud-row"><span className="hud-label">TIDE</span><span data-hud="tide" /></div>
        <div className="hud-row"><span className="hud-label">ENG</span><span data-hud="engine" /></div>
        <div className="hud-row"><span className="hud-label">PEAK</span><span data-hud="peak" /></div>
      </div>

      <div className="hud-warning" data-hud="warning">
        <div data-hud="warning-text" />
        <div className="hud-danger">
          <div className="hud-danger-fill" data-hud="danger-bar" />
        </div>
      </div>

      <div className="hud-toasts" data-hud="toasts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="hud-toast" data-hud="toast">
            <span className="hud-toast-title" />
            <span className="hud-toast-detail" />
            <span className="hud-toast-points" />
          </div>
        ))}
      </div>
    </div>
  )
}
