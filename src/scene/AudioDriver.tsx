import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ALARM, ARP, AUDIO, RESOURCES } from '../game/constants'
import { shipStats } from '../game/stats'
import { playSound, updateAudio } from '../audio/engine'
import type { MusicParams } from '../audio/music'
import type { SfxKind } from '../audio/sfx'
import type { ShipSoundParams } from '../audio/shipSounds'
import { dangerLevel } from '../game/physics'
import { type RunEventKind, onRunEvent, run } from '../game/run'
import { ship } from '../game/ship'
import { useGameStore } from '../game/store'
import type { DeathCause, GamePhase } from '../game/types'

const EVENT_SFX: Record<RunEventKind, SfxKind> = {
  slingshot: 'slingshot',
  'close-pass': 'close-pass',
  fuel: 'fuel',
  oxygen: 'oxygen',
  shard: 'shard',
  impact: 'impact',
  wormhole: 'wormhole',
}

const DEATH_SFX: Record<DeathCause, SfxKind> = {
  spaghettified: 'spaghettified',
  incinerated: 'explosion',
  destroyed: 'explosion',
  suffocated: 'power-down',
}

/** 0 = quiet, 1 = warning, 2 = critical; mirrors the HUD warning priorities. */
function alarmLevel(danger: number): number {
  const fuel = run.fuel / shipStats.fuelMax
  const oxygen = run.oxygen / shipStats.oxygenMax
  const hull = run.hull / shipStats.hullMax
  if (
    danger > ALARM.DANGER_CRITICAL ||
    run.tidalStress > ALARM.TIDAL_CRITICAL ||
    run.heat > 0 ||
    oxygen <= RESOURCES.CRITICAL_FRACTION ||
    hull <= RESOURCES.CRITICAL_FRACTION
  ) {
    return 2
  }
  // Dry tanks only warn: a drifting pilot shouldn't get a double beep for the rest of the run.
  if (danger > 0 || run.tidalStress > 0 || fuel <= RESOURCES.LOW_FRACTION || oxygen <= RESOURCES.LOW_FRACTION || hull <= RESOURCES.LOW_FRACTION) {
    return 1
  }
  return 0
}

/**
 * Feeds the audio engine from the simulation: score and ship sounds every frame, one-shots for run
 * events, launches, wormhole jumps and deaths. Runs after the ship and death sequence have updated.
 */
export function AudioDriver() {
  const st = useMemo(
    () => ({
      music: { dilation: 1, danger: 0, level: 1, arp: 0, cutoff: AUDIO.MUSIC_CUTOFF } as MusicParams,
      ship: { dt: 0, throttle: 0, boost: 0, rcs: 0, power: 0, tidal: 0, heat: 0, danger: 0, alarm: 0 } as ShipSoundParams,
      lastPhase: useGameStore.getState().phase as GamePhase,
      lastEpoch: run.epoch,
    }),
    [],
  )

  useEffect(() => onRunEvent((e) => playSound(EVENT_SFX[e.kind])), [])

  useFrame((_, delta) => {
    const phase = useGameStore.getState().phase
    const flying = phase === 'playing'
    const dead = phase === 'dead'

    if (flying && (st.lastPhase !== 'playing' || run.epoch !== st.lastEpoch)) playSound('launch')
    if (dead && st.lastPhase !== 'dead' && run.deathCause) playSound(DEATH_SFX[run.deathCause])
    if (phase === 'warp' && st.lastPhase !== 'warp') playSound('warp')
    st.lastPhase = phase
    st.lastEpoch = run.epoch

    const danger = flying ? dangerLevel(ship.position.length()) : 0
    const m = st.music
    m.dilation = run.dilation
    m.danger = danger
    m.level = flying ? AUDIO.MUSIC_FLYING : dead ? AUDIO.MUSIC_DEAD : AUDIO.MUSIC_MENU
    m.arp = flying ? ARP.FLYING_LEVEL : dead ? 0 : ARP.MENU_LEVEL
    m.cutoff = dead ? AUDIO.MUSIC_CUTOFF_DEAD : AUDIO.MUSIC_CUTOFF

    const s = st.ship
    s.throttle = ship.throttle
    s.boost = ship.boost
    s.rcs = Math.abs(ship.rcs.x) + Math.abs(ship.rcs.y) + Math.abs(ship.rcs.z)
    // Parked ships are silent; a dead one only hums while its lights fade (life support failure).
    s.power = ship.hidden ? 0 : flying ? ship.power : dead && run.deathCause === 'suffocated' ? ship.power : 0
    s.tidal = flying ? run.tidalStress : 0
    s.heat = flying ? run.heat : 0
    s.danger = danger
    s.alarm = flying ? alarmLevel(danger) : 0

    updateAudio(delta, m, s)
  })

  return null
}
