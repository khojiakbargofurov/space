import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SHIP_LOOK } from '../game/constants'
import { createRng } from '../game/random'

/**
 * The player's ship, built entirely from primitives: a flattened lathe fuselage, a glass canopy
 * with frame bows, one-piece swept wings with tip pods, twin engine nacelles and a dorsal fin.
 * Ship-local axes: nose toward -Z, up +Y, right +X. Overall length ≈ 4.3 units.
 */
export interface ShipGeometries {
  hull: BufferGeometry
  trim: BufferGeometry
  accent: BufferGeometry
  canopy: BufferGeometry
  engineGlow: BufferGeometry
  navPort: BufferGeometry
  navStarboard: BufferGeometry
  strobe: BufferGeometry
  dashGlow: BufferGeometry
}

export interface ShipMaterials {
  hull: MeshStandardMaterial
  trim: MeshStandardMaterial
  accent: MeshStandardMaterial
  canopy: MeshStandardMaterial
  engineGlow: MeshBasicMaterial
  navPort: MeshBasicMaterial
  navStarboard: MeshBasicMaterial
  strobe: MeshBasicMaterial
  dashGlow: MeshBasicMaterial
}

/** Fuselage cross-section is an ellipse: wider than tall. */
const FUSE_SCALE_X = 1.15
const FUSE_SCALE_Y = 0.8

/** Lathe around Y, then laid along Z (profile y → ship z). */
function lathe(profile: [number, number][], segments: number): BufferGeometry {
  const g = new LatheGeometry(
    profile.map(([r, z]) => new Vector2(r, z)),
    segments,
  )
  g.rotateX(Math.PI / 2)
  return g
}

/** Merges parts into one non-indexed geometry and disposes the parts. */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((p) => {
    const f = p.index ? p.toNonIndexed() : p
    if (f !== p) p.dispose()
    return f
  })
  const merged = mergeGeometries(flat)
  for (const f of flat) f.dispose()
  if (!merged) throw new Error('ship geometry merge failed')
  return merged
}

function fuselage(): BufferGeometry {
  const g = lathe(
    [
      [0, -2.2],
      [0.07, -2.12],
      [0.18, -1.9],
      [0.3, -1.5],
      [0.39, -1.0],
      [0.44, -0.4],
      [0.46, 0.3],
      [0.45, 1.1],
      [0.41, 1.7],
      [0.35, 2.0],
      [0, 2.02],
    ],
    32,
  )
  g.scale(FUSE_SCALE_X, FUSE_SCALE_Y, 1)
  return g
}

/** One polygon across both wings (the middle hides inside the fuselage), so no mirrored normals. */
function wings(): BufferGeometry {
  // Points are (ship x, ship z); the shape's y axis maps to -z after rotateX(-90°).
  const pts: [number, number][] = [
    [0.3, -0.7],
    [1.72, 0.85],
    [1.86, 1.4],
    [0.3, 1.75],
    [-0.3, 1.75],
    [-1.86, 1.4],
    [-1.72, 0.85],
    [-0.3, -0.7],
  ]
  const shape = new Shape(pts.map(([x, z]) => new Vector2(x, -z)))
  const g = new ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.03,
    bevelSegments: 1,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, -0.15, 0)
  return g
}

function dorsalFin(): BufferGeometry {
  // Points are (ship z, ship y); extruded along x.
  const pts: [number, number][] = [
    [0.85, 0.22],
    [1.85, 0.98],
    [2.08, 0.98],
    [2.0, 0.18],
  ]
  const shape = new Shape(pts.map(([z, y]) => new Vector2(z, y)))
  const g = new ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false })
  g.rotateY(-Math.PI / 2)
  g.translate(0.02, 0, 0)
  return g
}

function nacelle(x: number): BufferGeometry {
  const g = lathe(
    [
      [0.1, -0.78],
      [0.2, -0.66],
      [0.25, -0.3],
      [0.255, 0.45],
      [0.235, 0.75],
    ],
    20,
  )
  g.translate(x, -0.06, 1.4)
  return g
}

function nozzleRing(x: number): BufferGeometry {
  const g = new TorusGeometry(0.215, 0.035, 8, 24)
  g.translate(x, -0.06, 2.14)
  return g
}

function nozzleGlow(x: number): BufferGeometry {
  const g = new CircleGeometry(0.15, 20)
  g.translate(x, -0.06, 2.08)
  return g
}

function wingPod(x: number): BufferGeometry {
  const g = lathe(
    [
      [0, -0.3],
      [0.05, -0.24],
      [0.06, 0.2],
      [0.03, 0.3],
      [0, 0.3],
    ],
    10,
  )
  g.translate(x, -0.13, 1.15)
  return g
}

function canopyDome(): BufferGeometry {
  const g = new SphereGeometry(0.38, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  g.scale(0.85, 0.7, 2.2)
  g.translate(0, 0.26, -0.55)
  return g
}

/** Frame bow across the dome at fraction `t` of its half-length (behind the pilot, so the forward view stays clear). */
function canopyBow(t: number): BufferGeometry {
  const k = Math.sqrt(1 - t * t)
  const g = new TorusGeometry(0.385, 0.016, 6, 24, Math.PI)
  g.scale(0.85 * k, 0.7 * k, 1)
  g.translate(0, 0.26, -0.55 + t * 0.38 * 2.2)
  return g
}

/** Accent band wrapped around the fuselage. */
function band(z: number): BufferGeometry {
  const g = lathe(
    [
      [0.455, -0.07],
      [0.468, -0.05],
      [0.468, 0.05],
      [0.455, 0.07],
    ],
    32,
  )
  g.scale(FUSE_SCALE_X, FUSE_SCALE_Y, 1)
  g.translate(0, 0, z)
  return g
}

function light(x: number, y: number, z: number, r: number): BufferGeometry {
  const g = new SphereGeometry(r, 8, 6)
  g.translate(x, y, z)
  return g
}

export function buildShipGeometries(): ShipGeometries {
  // Small console in front of the pilot (only seen from the cockpit; the canopy hides it outside).
  const dash = new BoxGeometry(0.24, 0.05, 0.12)
  dash.translate(0, 0.33, -0.92)
  const dashGlow = new BoxGeometry(0.15, 0.004, 0.01)
  dashGlow.translate(0, 0.357, -0.875)

  return {
    hull: merge([fuselage(), wings(), dorsalFin()]),
    trim: merge([
      nacelle(-0.62), nacelle(0.62), nozzleRing(-0.62), nozzleRing(0.62),
      wingPod(-1.82), wingPod(1.82), canopyBow(0.2), canopyBow(0.6), dash,
    ]),
    accent: merge([band(0.35), band(0.55)]),
    canopy: canopyDome(),
    engineGlow: merge([nozzleGlow(-0.62), nozzleGlow(0.62)]),
    navPort: light(-1.82, -0.13, 0.84, 0.045),
    navStarboard: light(1.82, -0.13, 0.84, 0.045),
    strobe: light(0, 0.99, 2.0, 0.04),
    dashGlow,
  }
}

/** Light grey hull panels with darker seams and rivets (white-based: tinted by the material color). */
function panelTexture(): CanvasTexture {
  const w = 512
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rng = createRng(1337)
  ctx.fillStyle = '#f2f2f2'
  ctx.fillRect(0, 0, w, h)

  // Panels: rows of varying height, each split into varying widths; a few slightly darker.
  let y = 0
  while (y < h) {
    const rowH = 24 + Math.floor(rng() * 40)
    let x = 0
    while (x < w) {
      const pw = 40 + Math.floor(rng() * 90)
      if (rng() < 0.22) {
        ctx.fillStyle = rng() < 0.5 ? '#dcdcdc' : '#e6e6e6'
        ctx.fillRect(x, y, pw, rowH)
      }
      ctx.strokeStyle = '#8f9399'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.5, y + 0.5, pw, rowH)
      if (rng() < 0.35) {
        ctx.fillStyle = '#a5a9ae'
        for (let rx = x + 5; rx < x + pw - 3; rx += 7) ctx.fillRect(rx, y + 3, 1.5, 1.5)
      }
      x += pw
    }
    y += rowH
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.anisotropy = 4
  return tex
}

export function createShipMaterials(): ShipMaterials {
  const env = SHIP_LOOK.ENV_INTENSITY
  return {
    hull: new MeshStandardMaterial({
      color: SHIP_LOOK.HULL_COLOR,
      metalness: SHIP_LOOK.HULL_METALNESS,
      roughness: SHIP_LOOK.HULL_ROUGHNESS,
      map: panelTexture(),
      envMapIntensity: env,
    }),
    trim: new MeshStandardMaterial({ color: SHIP_LOOK.TRIM_COLOR, metalness: 0.7, roughness: 0.5, envMapIntensity: env }),
    accent: new MeshStandardMaterial({ color: SHIP_LOOK.ACCENT_COLOR, metalness: 0.3, roughness: 0.5, envMapIntensity: env }),
    canopy: new MeshStandardMaterial({
      color: SHIP_LOOK.CANOPY_COLOR,
      metalness: 0.9,
      roughness: 0.06,
      envMapIntensity: env * 1.5,
    }),
    engineGlow: new MeshBasicMaterial({ color: SHIP_LOOK.ENGINE_GLOW_COLOR }),
    navPort: new MeshBasicMaterial({ color: new Color(SHIP_LOOK.NAV_PORT_COLOR).multiplyScalar(SHIP_LOOK.NAV_GLOW) }),
    navStarboard: new MeshBasicMaterial({
      color: new Color(SHIP_LOOK.NAV_STARBOARD_COLOR).multiplyScalar(SHIP_LOOK.NAV_GLOW),
    }),
    strobe: new MeshBasicMaterial({ color: '#ffffff' }),
    dashGlow: new MeshBasicMaterial({ color: new Color(SHIP_LOOK.ENGINE_GLOW_COLOR).multiplyScalar(0.7) }),
  }
}

export function disposeShipMaterials(m: ShipMaterials): void {
  m.hull.map?.dispose()
  for (const mat of Object.values(m)) mat.dispose()
}
