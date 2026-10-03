export const horizonGlowVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/** Camera-facing quad: thin bright ring just outside the horizon plus a soft exponential halo. */
export const horizonGlowFragment = /* glsl */ `
uniform float uExtent;
uniform float uHorizon;
uniform float uRingR;
uniform float uRingWidth;
uniform float uHaloFalloff;
uniform float uHaloStrength;
uniform float uIntensity;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0 * uExtent;
  if (d < uHorizon) discard;
  float ring = exp(-pow((d - uRingR) / uRingWidth, 2.0));
  float halo = uHaloStrength * exp(-max(d - uRingR, 0.0) / uHaloFalloff);
  float fade = 1.0 - smoothstep(uExtent * 0.6, uExtent, d);
  gl_FragColor = vec4(uColor * (ring + halo) * fade * uIntensity, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
