import { useLayoutEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { type CubeTexture, PMREMGenerator, type Texture } from 'three'

/**
 * Prefilters the baked nebula cube map (PMREM) so rough and glossy materials can reflect it.
 * Rebuilt whenever the nebula is re-baked; the render target is disposed on change / unmount.
 */
export function useEnvironmentMap(source: CubeTexture | null): Texture | null {
  const gl = useThree((s) => s.gl)
  const [texture, setTexture] = useState<Texture | null>(null)

  useLayoutEffect(() => {
    if (!source) return
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromCubemap(source)
    pmrem.dispose()
    setTexture(target.texture)
    return () => {
      setTexture(null)
      target.dispose()
    }
  }, [gl, source])

  return texture
}
