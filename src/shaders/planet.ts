import { noiseGLSL } from './noise'

/**
 * Procedural planet surfaces. One shader, four looks selected by the PLANET_KIND define
 * (0 rocky, 1 gas giant, 2 ice, 3 lava), so each kind compiles to its own branch-free program.
 * Noise is evaluated on the object-space unit sphere, so the pattern turns with the planet's spin.
 * The only light is the accretion disk at the world origin.
 */
export const planetVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  // Uniform scale only, so the model matrix rotates normals correctly.
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const planetFragment = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColD;
uniform float uSeed;
uniform float uNoiseScale;
uniform float uBands;
uniform float uTime;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbient;
uniform vec3 uAtmoColor;
uniform float uLavaGlow;

varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;

${noiseGLSL}

float ridged(vec3 p) {
  return 1.0 - abs(gnoise(p));
}

void main() {
  vec3 n = normalize(vObj);
  vec3 p = n * uNoiseScale + vec3(uSeed, uSeed * 0.37, -uSeed * 0.71);
  vec3 albedo;
  vec3 emission = vec3(0.0);
  float shine = 0.0;

#if PLANET_KIND == 0
  // Rocky: warped continents, ridge lines, polar caps.
  float h = fbm(p + 0.8 * vec3(fbm(p * 0.5), fbm(p * 0.5 + 4.1), 0.0));
  float ridge = pow(ridged(p * 2.6), 6.0);
  albedo = mix(uColA, uColB, smoothstep(-0.25, 0.35, h));
  albedo = mix(albedo, uColC, ridge * 0.45);
  albedo = mix(albedo, uColD, smoothstep(0.78, 0.9, abs(n.y) + h * 0.2));
#elif PLANET_KIND == 1
  // Gas giant: latitude bands bent by slow turbulence, finer secondary belts.
  float lat = n.y;
  vec3 q = vec3(p.x * 0.5, lat * 3.0, p.z * 0.5) + vec3(uTime * 0.004, 0.0, 0.0);
  float warp = fbm(q);
  float b1 = sin(lat * uBands + warp * 3.2);
  float b2 = sin(lat * uBands * 2.7 + warp * 6.0 + 1.3);
  albedo = mix(uColA, uColB, b1 * 0.5 + 0.5);
  albedo = mix(albedo, uColC, smoothstep(0.35, 1.0, b2) * 0.55);
  albedo = mix(albedo, uColD, smoothstep(0.55, 0.95, fbm(q * 3.0 + 7.0)) * 0.35);
#elif PLANET_KIND == 2
  // Ice: bright plains crossed by thin dark fractures, glossy.
  float h = fbm(p);
  float crack = pow(ridged(p * 2.4 + h), 28.0);
  albedo = mix(uColA, uColB, smoothstep(-0.3, 0.4, h));
  albedo = mix(albedo, uColC, crack * 0.6);
  shine = 0.4;
#else
  // Lava: dark crust, glowing fissures that stay lit on the night side.
  float h = fbm(p);
  float crack = pow(ridged(p * 2.0 + h * 1.5), 26.0);
  albedo = mix(uColA, uColB, smoothstep(-0.2, 0.5, h));
  float pulse = 0.75 + 0.25 * sin(uTime * 0.6 + h * 12.0);
  emission = mix(uColC, uColD, crack) * crack * uLavaGlow * pulse;
#endif

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(-vPosW);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = dot(N, L);
  // Slightly wrapped terminator reads softer, like light scattering through an atmosphere.
  float diff = smoothstep(-0.08, 1.0, ndl);
  vec3 light = uLightColor * uLightIntensity;
  vec3 col = albedo * (light * diff + uAmbient);

  vec3 H = normalize(L + V);
  col += light * shine * pow(max(dot(N, H), 0.0), 48.0) * step(0.0, ndl);

  // Atmospheric rim on the day side.
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uAtmoColor * light * rim * smoothstep(-0.25, 0.6, ndl) * 0.6;

  col += emission;
  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** Shared vertex for the atmosphere shell and rings: world position plus object-space position. */
export const shellVertex = /* glsl */ `
varying vec3 vPosW;
varying vec3 vObj;

void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

/**
 * Atmosphere halo on a back-facing shell (additive). Glow depends on how close the view ray passes
 * to the planet: brightest just above the limb, fading out at the shell, and only on the day side.
 */
export const atmosphereFragment = /* glsl */ `
uniform vec3 uCenter;
uniform float uRadius;
uniform float uShell;
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vPosW;
varying vec3 vObj;

void main() {
  vec3 rd = normalize(vPosW - cameraPosition);
  vec3 oc = uCenter - cameraPosition;
  float t = max(dot(oc, rd), 0.0);
  vec3 closest = cameraPosition + rd * t;
  float d = length(closest - uCenter);
  float h = clamp((d - uRadius) / (uRadius * (uShell - 1.0)), 0.0, 1.0);
  float glow = exp(-h * 4.0) * (1.0 - h);
  vec3 up = normalize(closest - uCenter);
  float lit = smoothstep(-0.35, 0.55, dot(up, normalize(-uCenter)));
  gl_FragColor = vec4(uColor * glow * lit * uIntensity, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * Planetary rings: concentric bands of varying density, lit by the disk, with the planet's shadow
 * (ray toward the light tested against the planet sphere).
 */
export const ringFragment = /* glsl */ `
uniform vec3 uCenter;
uniform float uRadius;
uniform float uInner;
uniform float uOuter;
uniform float uSeed;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uOpacity;

varying vec3 vPosW;
varying vec3 vObj;

${noiseGLSL}

void main() {
  float r = length(vObj.xy);
  float t = (r - uInner) / (uOuter - uInner);
  if (t < 0.0 || t > 1.0) discard;

  float bands = gnoise(vec3(t * 38.0, uSeed, 0.0)) * 0.6 + gnoise(vec3(t * 75.0, uSeed + 3.0, 0.0)) * 0.4;
  float density = smoothstep(-0.45, 0.6, bands);
  // Gaps and soft edges.
  density *= smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.9, t);
  density *= 1.0 - 0.85 * smoothstep(0.015, 0.0, abs(t - 0.62));

  vec3 L = normalize(-vPosW);
  vec3 oc = uCenter - vPosW;
  float along = dot(oc, L);
  float shadow = 1.0;
  if (along > 0.0 && length(oc - L * along) < uRadius) shadow = 0.08;

  vec3 col = mix(uColA, uColB, gnoise(vec3(t * 9.0, uSeed + 7.0, 0.0)) * 0.5 + 0.5);
  col *= uLightColor * uLightIntensity * shadow * 0.85;
  gl_FragColor = vec4(col, density * uOpacity);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
