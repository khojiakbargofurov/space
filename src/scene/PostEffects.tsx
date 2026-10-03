import { useMemo } from 'react'
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { HalfFloatType, Vector2 } from 'three'
import { POST, QUALITY_PRESETS } from '../game/constants'
import { useGameStore } from '../game/store'

/** HDR chain: bloom → chromatic aberration → ACES tone mapping → vignette → film grain. */
export function PostEffects() {
  const quality = useGameStore((s) => s.quality)
  const preset = QUALITY_PRESETS[quality]
  const caOffset = useMemo(() => new Vector2(POST.CA_OFFSET, POST.CA_OFFSET), [])

  // Keyed so toggling bloom or MSAA rebuilds the composer cleanly.
  const key = `${preset.bloom ? 'bloom' : 'nobloom'}-${preset.msaa}`

  return (
    <EffectComposer key={key} multisampling={preset.msaa} frameBufferType={HalfFloatType}>
      {preset.bloom ? (
        <Bloom
          mipmapBlur
          luminanceThreshold={POST.BLOOM_THRESHOLD}
          luminanceSmoothing={POST.BLOOM_SMOOTHING}
          intensity={POST.BLOOM_INTENSITY}
          radius={POST.BLOOM_RADIUS}
          levels={POST.BLOOM_LEVELS}
        />
      ) : (
        <></>
      )}
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={POST.CA_MODULATION_OFFSET} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={POST.VIGNETTE_OFFSET} darkness={POST.VIGNETTE_DARKNESS} />
      <Noise opacity={POST.GRAIN_OPACITY} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
