import { noiseGLSL } from './noise'

/**
 * Wormhole: a camera-facing quad (position.xy in [-1, 1]). The throat is a disk of radius uCore that
 * shows the far side (the next sector's colors) swirling inward along a log spiral, brightening to a
 * white center; a hot ring marks the throat and faint spiral arms fall off outside it.
 * Premultiplied output: the throat covers what is behind it, the glow outside is additive.
 */
export const wormholeVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const wormholeFragment = /* glsl */ `
uniform float uTime;
uniform float uCore;
uniform float uTwist;
uniform float uSpin;
uniform float uIntensity;
uniform float uOpen;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColRim;

varying vec2 vUv;

${noiseGLSL}

void main() {
  float r = length(vUv);
  if (r >= 1.0) discard;
  float x = r / max(uCore, 1e-3);
  float lx = log(max(x, 0.02));
  float a = atan(vUv.y, vUv.x);
  // Log spiral: the angle winds faster toward the center; the whole pattern turns and falls inward.
  float sw = a + uTwist * lx - uTime * uSpin;
  vec3 p = vec3(cos(sw) * 1.7, sin(sw) * 1.7, lx * 1.4 - uTime * 0.7);
  float n = smoothstep(0.25, 0.8, fbm(p) * 0.5 + 0.5);

  float depth = max(1.0 - x, 0.0);
  float inside = 1.0 - smoothstep(0.9, 1.0, x);
  // Mostly dark far-side gas with bright filaments; only the very center burns white.
  vec3 throat = mix(uColA, uColB, n) * n * (0.25 + 1.1 * pow(depth, 1.5)) + vec3(1.2) * pow(depth, 10.0);

  float ring = exp(-pow((x - 1.0) / 0.05, 2.0));
  float outer = max(x - 1.0, 0.0);
  float arms = pow(max(sin(sw * 2.0 + n * 2.5), 0.0), 3.0) * exp(-outer * 1.5);
  vec3 halo = uColRim * (exp(-outer * 2.2) * 0.35 + arms * 0.45);

  float edge = smoothstep(1.0, 0.8, r);
  vec3 col = (inside * throat + ring * uColRim * 2.2 + (1.0 - inside) * halo) * uIntensity * uOpen * edge;
  gl_FragColor = vec4(col, inside * uOpen);
}
`

/**
 * Jump tunnel: fullscreen triangle drawn over everything. Streaks rush outward from the screen center
 * (noise sampled on a circle around the view axis, scrolled along 1/r), plus the white-out flash.
 * Additive.
 */
export const tunnelVertex = /* glsl */ `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const tunnelFragment = /* glsl */ `
uniform float uTime;
uniform float uTunnel;
uniform float uFlash;
uniform float uAspect;
uniform float uStreaks;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uColA;
uniform vec3 uColB;

varying vec2 vNdc;

${noiseGLSL}

void main() {
  vec2 p = vec2(vNdc.x * uAspect, vNdc.y);
  float r = max(length(p), 1e-3);
  float a = atan(p.y, p.x);
  // A circle of circumference uStreaks in noise space: seamless around the view axis.
  vec2 ring = vec2(cos(a), sin(a)) * (uStreaks / 6.2831853);
  float depth = 0.14 / r + uTime * uSpeed;
  float n = gnoise(vec3(ring, depth));
  float tint = gnoise(vec3(ring * 0.3, depth * 0.25 + 7.0)) * 0.5 + 0.5;
  float streak = pow(clamp(n * 0.5 + 0.55, 0.0, 1.0), 7.0);
  float clear = smoothstep(0.04, 0.8, r);
  vec3 col = mix(uColA, uColB, tint) * (streak * 4.0 + 0.2 * smoothstep(0.3, 1.5, r)) * clear;
  col = col * uTunnel * uIntensity + vec3(uFlash * 4.0);
  gl_FragColor = vec4(col, 1.0);
}
`
