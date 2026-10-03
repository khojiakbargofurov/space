export const starfieldVertex = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkle;

varying vec3 vColor;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  float tw = 1.0 + uTwinkle * sin(uTime * (0.8 + aPhase * 2.4) + aPhase * 37.0);
  vColor = aColor * tw;
  gl_PointSize = aSize * uPixelRatio;
}
`

export const starfieldFragment = /* glsl */ `
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c) * 4.0;
  float a = (exp(-d2 * 7.0) + 0.12 * exp(-d2 * 2.0)) * (1.0 - d2);
  if (a <= 0.002) discard;
  gl_FragColor = vec4(vColor * a, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
