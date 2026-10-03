/**
 * Accretion disk emission at a point where a traced ray crosses the y = 0 plane.
 * Requires noise.ts (gnoise, fbm) and uTime.
 * - Turbulence: domain-warped fbm in (angle, log r), sheared by Keplerian rotation.
 *   Two layers on offset flow cycles are cross-faded so the shear never winds up forever.
 * - Doppler: g = D * sqrt(1 - rs/r) shifts color temperature and beams intensity by g^n.
 * - Radiative transfer through a thin slab: optical depth tau / |cos i|.
 */
export const diskGLSL = /* glsl */ `
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
uniform float uDiskBrightness;
uniform float uDiskOpacity;
uniform vec3 uColCool;
uniform vec3 uColWarm;
uniform vec3 uColHot;
uniform vec3 uColBlue;

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

/** rgb = emitted light reaching the camera, a = fraction of light from behind that is absorbed. */
vec4 diskSample(vec3 hit, vec3 rayDir, float rs) {
  vec2 p = hit.xz;
  float r = length(p);
  float x = uInner / r;
  float rn = (r - uInner) / (uOuter - uInner);
  float lr = log(r / uInner);
  float theta = atan(p.y, p.x);
  float omega = uOmega * pow(x, 1.5);

  float ph = fract(uTime / uFlowPeriod);
  float w0 = 1.0 - abs(2.0 * ph - 1.0);
  float n = flowLayer(theta, lr, omega, 0.0) * w0 + flowLayer(theta, lr, omega, 0.5) * (1.0 - w0);
  float density = mix(0.18, 1.0, smoothstep(-0.32, 0.45, n));
  density *= 1.0 - uRingContrast + uRingContrast * (0.5 + 0.5 * gnoise(vec3(lr * uRingFreq, 0.5, 1.7)));
  density *= smoothstep(0.0, 0.035, rn) * (1.0 - smoothstep(0.45, 1.0, rn));

  float temp = pow(x, uTempFalloff);

  // The photon travels opposite to the traced ray.
  vec3 toObserver = -rayDir;
  vec3 vdir = vec3(-p.y, 0.0, p.x) / r;
  float beta = min(uDoppler * sqrt(rs / (2.0 * r)), 0.9);
  float gamma = inversesqrt(1.0 - beta * beta);
  float D = 1.0 / (gamma * (1.0 - beta * dot(vdir, toObserver)));
  float g = D * sqrt(max(1.0 - rs / r, 0.0));
  float beam = pow(g, uBeaming);

  float tau = uDiskOpacity * density / max(abs(rayDir.y), 0.02);
  float absorb = 1.0 - exp(-tau);
  vec3 source = heatColor(temp * g * uTempScale) * (temp * temp * beam * uDiskBrightness);
  return vec4(source * absorb, absorb);
}
`
