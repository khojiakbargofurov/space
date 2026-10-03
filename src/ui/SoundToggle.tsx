import { useGameStore } from '../game/store'

/** Sound on / off (M toggles too). */
export function SoundToggle() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)

  return (
    <button
      type="button"
      className={`sound-toggle${muted ? ' muted' : ''}`}
      aria-pressed={!muted}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      onClick={(e) => {
        toggleMute()
        // Drop focus so Space / Enter in flight don't re-press the button.
        e.currentTarget.blur()
      }}
    >
      {muted ? 'sound off' : 'sound on'}
    </button>
  )
}
