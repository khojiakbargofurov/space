import { Vector3 } from 'three'

/** A one-shot particle burst preset (see BURST in constants). */
export interface BurstSpec {
  readonly COUNT: number
  readonly SPEED: number
  readonly LIFE: number
  readonly SIZE: number
  /** 0 = fire, 1 = sparkle. */
  readonly KIND: number
}

interface BurstRequest {
  pos: Vector3
  vel: Vector3
  spec: BurstSpec | null
}

const MAX_PENDING = 16

/**
 * Bursts requested by game logic this frame, emitted by the <Bursts> particle system on its next
 * update. Preallocated so requesting never allocates; extra requests in one frame are dropped.
 */
export const burstQueue = {
  items: Array.from({ length: MAX_PENDING }, (): BurstRequest => ({ pos: new Vector3(), vel: new Vector3(), spec: null })),
  count: 0,
}

/** Queues a burst at `pos`; particles inherit `vel * velScale` (velScale also converts universe → ship time). */
export function requestBurst(pos: Vector3, vel: Vector3, velScale: number, spec: BurstSpec): void {
  if (burstQueue.count >= MAX_PENDING) return
  const item = burstQueue.items[burstQueue.count++]
  item.pos.copy(pos)
  item.vel.copy(vel).multiplyScalar(velScale)
  item.spec = spec
}
