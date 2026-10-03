import { noiseGLSL } from './noise'

export const accretionDiskVertex = /* glsl */ `
varying vec3 vWorld;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

/**
 * Thin disk in the world XZ plane, orbiting counter-clockwise seen from +Y.
 * - Turbulence: domain-warped fbm in (angle, log r), sheared by Keplerian rotation.
 *   Two layers on offset flow cycles are cross-faded so the shear never winds up forever.
 * - Doppler: g = D * sqrt(1 - rs/r) shifts color temperature and beams intensity by g^n.
 */
export const accretionDiskFragment = /* glsl */ `
uniform float uTime;
uniform float uRs;
uniform float uInner;
uniform float uOuter;
uniform float uOmega;
uniform float uFlowPeriod;
uniform float uAngularFreq;
uniform float uRadialFreq;
uniform float uRingFreq;
uniform float uRingContrast;
uniform float uWarp;
uniform float uDoppler;
uniform float uBeaming;
uniform float uTempFalloff;
uniform float uTempScale;
uniform float uBrightness;
uniform float uMaxGrazing;
uniform vec3 uColCool;
uniform vec3 uColWarm;
uniform vec3 uColHot;
uniform vec3 uColBlue;

varying vec3 vWorld;

${noiseGLSL}

vec3 heatColor(float t) {
  vec3 c = mix(uColCool, uColWarm, smoothstep(0.0, 0.55, t));
  c = mix(c, uColHot, smoothstep(0.5, 1.05, t));
  return mix(c, uColBlue, smoothstep(1.05, 1.7, t));
}

float flowLayer(float theta, float lr, float omega, float phase) {
  float cycle = uTime / uFlowPeriod + phase;
  float k = fract(cycle);
  float seed = floor(cycle);
  float a = theta - omega * k * uFlowPeriod;
  vec3 q = vec3(cos(a) * uAngularFreq, sin(a) * uAngularFreq, lr * uRadialFreq + seed * 13.17);
  vec2 w = vec2(gnoise(q * 1.4 + 4.1), gnoise(q * 1.4 - 7.3));
  return fbm(q + vec3(w * uWarp, 0.0));
}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  float x = uInner / r;
  float rn = (r - uInner) / (uOuter - uInner);
  float lr = log(r / uInner);
  float theta = atan(p.y, p.x);
  float omega = uOmega * pow(x, 1.5);

  // Turbulent density, two cross-faded flow layers
  float ph = fract(uTime / uFlowPeriod);
  float w0 = 1.0 - abs(2.0 * ph - 1.0);
  float n = flowLayer(theta, lr, omega, 0.0) * w0 + flowLayer(theta, lr, omega, 0.5) * (1.0 - w0);
  float density = mix(0.18, 1.0, smoothstep(-0.32, 0.45, n));
  density *= 1.0 - uRingContrast + uRingContrast * (0.5 + 0.5 * gnoise(vec3(lr * uRingFreq, 0.5, 1.7)));

  // Radial profile
  float temp = pow(x, uTempFalloff);
  float edges = smoothstep(0.0, 0.035, rn) * (1.0 - smoothstep(0.45, 1.0, rn));

  // Relativistic Doppler + gravitational redshift
  vec3 vdir = vec3(-p.y, 0.0, p.x) / r;
  vec3 toCam = normalize(cameraPosition - vWorld);
  float beta = min(uDoppler * sqrt(uRs / (2.0 * r)), 0.9);
  float gamma = inversesqrt(1.0 - beta * beta);
  float D = 1.0 / (gamma * (1.0 - beta * dot(vdir, toCam)));
  float g = D * sqrt(max(1.0 - uRs / r, 0.0));
  float beam = pow(g, uBeaming);

  // Optically thin: longer path through the disk at grazing angles, fading out exactly edge-on
  float mu = abs(toCam.y);
  float grazing = min(1.0 / max(mu, 1e-3), uMaxGrazing) * smoothstep(0.0, 0.04, mu);

  vec3 col = heatColor(temp * g * uTempScale) * (temp * temp * density * edges * beam * grazing * uBrightness);
  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
