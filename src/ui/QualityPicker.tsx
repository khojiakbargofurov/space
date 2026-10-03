import { QUALITY_ORDER } from '../game/constants'
import { useGameStore } from '../game/store'

/** Minimal quality switch (the full settings menu arrives in stage 8). G cycles too. */
export function QualityPicker() {
  const quality = useGameStore((s) => s.quality)
  const setQuality = useGameStore((s) => s.setQuality)

  return (
    <div className="quality-picker" role="group" aria-label="Graphics quality">
      {QUALITY_ORDER.map((q) => (
        <button key={q} type="button" className={q === quality ? 'active' : ''} onClick={(e) => {
            setQuality(q)
            // Drop focus so Space / Enter in flight don't re-press the button.
            e.currentTarget.blur()
          }}>
          {q}
        </button>
      ))}
    </div>
  )
}
