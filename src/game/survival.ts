import { BURST, DEBRIS, DISK_HEAT, DRAIN, HULL, PICKUPS, SHIP, TIDAL } from './constants'
import { collideRocks, shatterRock } from './debris'
import { requestBurst } from './fx'
import { diskHeat, tidalStress } from './physics'
import { collectPickup, pickups } from './pickups'
import { planets } from './planets'
import { award, damageHull, decayDamageFx, emitRunEvent, run } from './run'
import { sectorConfig } from './sectors'
import { ship } from './ship'
import { shipStats } from './stats'
import { useGameStore } from './store'
import type { DeathCause } from './types'
import { openWormhole, wormhole } from './wormhole'

const hit = { speed: 0 }

/**
 * Everything that keeps the pilot alive or kills them, once per flight frame after the ship moved:
 * fuel and oxygen drain, tidal stress, disk heating, impacts (planets, debris), pickups (shards also
 * bank for upgrades and open the wormhole once the sector quota is met) and hull self-repair. `dt` is ship seconds; `timeScale` = universe seconds per ship second.
 * Returns the cause of death, or null while the ship survives.
 */
export function updateSurvival(dt: number, timeScale: number): DeathCause | null {
  const r = ship.position.length()
  if (r < run.minR) run.minR = r
  run.sinceDamage += dt
  run.hitCooldown = Math.max(0, run.hitCooldown - dt)

  // --- consumables ---
  const rcs = Math.abs(ship.rcs.x) + Math.abs(ship.rcs.y) + Math.abs(ship.rcs.z)
  const flow =
    ship.throttle * (1 + (DRAIN.BOOST_FUEL_MULTIPLIER - 1) * ship.boost) * DRAIN.FUEL_PER_THRUST_SEC +
    rcs * DRAIN.FUEL_PER_RCS_SEC
  run.fuel = Math.max(0, run.fuel - flow * shipStats.fuelFlow * dt)
  run.oxygen = Math.max(0, run.oxygen - DRAIN.OXYGEN_PER_SEC * run.oxygenDrain * dt)

  // --- tidal forces: the hull is stretched along the radial axis ---
  const stress = tidalStress(r)
  run.tidalStress = stress
  if (stress > 0) damageHull(TIDAL.DAMAGE_PER_SEC * shipStats.tidalDamage * stress * stress * dt, 'tidal', false)
  ship.stretch = 1 + stress * TIDAL.VISUAL_STRETCH
  if (r > 1e-6) ship.stretchAxis.copy(ship.position).divideScalar(r)

  // --- accretion disk plasma ---
  const heat = diskHeat(ship.position)
  run.heat = heat
  if (heat > 0) damageHull(DISK_HEAT.DAMAGE_PER_SEC * shipStats.heatDamage * heat * dt, 'heat', false)

  // --- planet surface impacts ---
  if (ship.impact > HULL.SAFE_IMPACT_SPEED && run.hitCooldown <= 0) {
    const dmg = (ship.impact - HULL.SAFE_IMPACT_SPEED) * HULL.PLANET_DAMAGE_PER_SPEED
    damageHull(dmg, 'impact', true)
    run.hitCooldown = HULL.HIT_COOLDOWN
    emitRunEvent({ kind: 'impact', title: 'SURFACE IMPACT', detail: `-${dmg.toFixed(0)} hull`, points: 0 })
  }

  // --- debris ---
  const rock = collideRocks(ship.position, ship.velocity, SHIP.COLLISION_RADIUS, timeScale, hit)
  if (rock && hit.speed > DEBRIS.SAFE_SPEED && run.hitCooldown <= 0) {
    const dmg = DEBRIS.DAMAGE_BASE + (hit.speed - DEBRIS.SAFE_SPEED) * DEBRIS.DAMAGE_PER_SPEED
    damageHull(dmg, 'impact', true)
    run.hitCooldown = HULL.HIT_COOLDOWN
    requestBurst(rock.orbit.position, rock.orbit.velocity, timeScale, BURST.IMPACT)
    shatterRock(rock, run.worldTime)
    emitRunEvent({ kind: 'impact', title: 'DEBRIS IMPACT', detail: `-${dmg.toFixed(0)} hull`, points: 0 })
  }

  // --- pickups ---
  for (const p of pickups) {
    if (!p.active) continue
    const cfg = PICKUPS[p.kind]
    const reach = cfg.RADIUS * shipStats.pickupReach + SHIP.COLLISION_RADIUS
    if (p.orbit.position.distanceToSquared(ship.position) > reach * reach) continue
    collectPickup(p, run.worldTime)
    requestBurst(p.orbit.position, ship.velocity, 1, BURST.PICKUP)
    if (p.kind === 'fuel') {
      run.fuel = Math.min(shipStats.fuelMax, run.fuel + cfg.AMOUNT)
      const points = award(cfg.POINTS)
      emitRunEvent({ kind: 'fuel', title: 'FUEL CELL', detail: `+${cfg.AMOUNT} fuel`, points })
    } else if (p.kind === 'oxygen') {
      run.oxygen = Math.min(shipStats.oxygenMax, run.oxygen + cfg.AMOUNT)
      const points = award(cfg.POINTS)
      emitRunEvent({ kind: 'oxygen', title: 'OXYGEN CANISTER', detail: `+${cfg.AMOUNT} O₂`, points })
    } else {
      const points = award(cfg.POINTS * Math.pow(run.dilation, PICKUPS.SHARD_DILATION_EXP))
      run.shards += cfg.AMOUNT
      run.sectorShards += cfg.AMOUNT
      useGameStore.getState().bankShards(cfg.AMOUNT)
      const progress = wormhole.open ? '' : ` · ${Math.min(run.sectorShards, run.shardQuota)}/${run.shardQuota}`
      emitRunEvent({ kind: 'shard', title: 'CHRONO SHARD', detail: `×${run.dilation.toFixed(2)} dilation${progress}`, points })
    }
  }

  // --- the quota met: the way to the next sector opens ---
  if (!wormhole.open && run.sectorShards >= run.shardQuota) {
    openWormhole(run.worldTime, ship.position, planets)
    emitRunEvent({ kind: 'wormhole', title: 'WORMHOLE OPEN', detail: `to sector ${run.sector + 2} · ${sectorConfig(run.sector + 1).name}`, points: 0 })
  }

  // --- self-repair once the hull has been left alone for a while ---
  if (run.sinceDamage > HULL.REGEN_DELAY && run.hull > 0) {
    run.hull = Math.min(shipStats.hullMax, run.hull + HULL.REGEN_PER_SEC * dt)
  }
  decayDamageFx(dt)

  // --- death ---
  if (stress >= 1) return 'spaghettified'
  if (run.hull <= 0) {
    return run.lastDamage === 'tidal' ? 'spaghettified' : run.lastDamage === 'heat' ? 'incinerated' : 'destroyed'
  }
  if (run.oxygen <= 0) return 'suffocated'
  return null
}
