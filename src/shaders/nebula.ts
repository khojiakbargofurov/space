import { noiseGLSL } from './noise'

export const nebulaVertex = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Rendered once into a cube render target (linear HDR, no tone mapping):
 * domain-warped fbm clouds in two hues, a bright galactic band and dark dust lanes across it.
 */
export const nebulaFragment = /* glsl */ `
uniform float uSeed;
uniform float uScale;
uniform float uWarp;
uniform float uIntensity;
uniform float uBandWidth;
uniform float uBandStrength;
uniform float uDustStrength;
uniform vec3 uBandNormal;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColBand;

varying vec3 vDir;

${noiseGLSL}

void main() {
  vec3 d = normalize(vDir);
  vec3 p = d * uScale + uSeed;

  vec3 warp = vec3(fbm(p * 1.1 + 3.1), fbm(p * 1.1 - 5.7), fbm(p * 1.1 + 9.4));
  float n = fbm(p + warp * uWarp);
  float clouds = smoothstep(-0.15, 0.55, n);
  clouds *= clouds;

  float hue = smoothstep(-0.25, 0.25, fbm(p * 0.6 + 21.0));
  vec3 col = mix(uColA, uColB, hue);
  col = mix(col, uColC, 0.7 * smoothstep(0.1, 0.45, fbm(p * 1.8 - 13.0)));

  float h = dot(d, uBandNormal) / uBandWidth;
  float band = exp(-h * h);
  float dust = smoothstep(-0.05, 0.35, fbm(p * 3.2 + warp * 0.8));
  float bandLight = band * uBandStrength * (0.45 + 0.55 * smoothstep(-0.3, 0.4, n));
  bandLight *= 1.0 - uDustStrength * dust * band;

  vec3 neb = col * clouds * (0.4 + 0.6 * band) + uColBand * bandLight;
  gl_FragColor = vec4(neb * uIntensity, 1.0);
}
`
