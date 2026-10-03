import { diskGLSL } from './disk'
import { noiseGLSL } from './noise'
import { starsGLSL } from './stars'

/** Fullscreen triangle; the fragment shader rebuilds the world-space view ray from NDC. */
export const lensingVertex = /* glsl */ `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Traces each pixel's ray backwards through Schwarzschild spacetime.
 * Photon orbits obey u'' + u = 1.5 rs u^2, equivalent to the Cartesian acceleration
 * a = -1.5 rs h^2 x / r^5 with h = |x × v| conserved. Inside NUMERIC radius this is integrated with an
 * r-proportional step; outside, the weak-field deflection (rs/b)(sinθ2 - sinθ1) is applied analytically
 * for the legs before and after, so the two regimes meet without a seam.
 * Outputs HDR color and writes depth for the horizon and the opaque parts of the disk.
 */
export const lensingFragment = /* glsl */ `
uniform samplerCube uNebula;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform mat4 uProj;
uniform float uTime;
uniform float uRs;
uniform float uNumericRadius;
uniform float uStepScale;

varying vec2 vNdc;

${noiseGLSL}
${diskGLSL}
${starsGLSL}

vec3 sky(vec3 d) {
  return texture(uNebula, d).rgb + stars(d);
}

/** Rotates direction d toward the hole (as seen from point p) by angle a. */
vec3 bendToward(vec3 p, vec3 d, float a) {
  vec3 n = d * dot(p, d) - p;
  float len = length(n);
  if (len < 1e-5 || a <= 0.0) return d;
  return normalize(d * cos(a) + (n / len) * sin(a));
}

/** Weak-field deflection accumulated along a straight leg; s = signed distance past periapsis. */
float legDeflection(float b, float sinFrom, float sinTo) {
  return uRs / max(b, 1e-4) * (sinTo - sinFrom);
}

void main() {
  vec4 vp = uInvProj * vec4(vNdc, 1.0, 1.0);
  vec3 rd = normalize(mat3(uCamWorld) * (vp.xyz / vp.w));
  vec3 ro = cameraPosition;

  float camR = length(ro);
  float tc = -dot(ro, rd);
  float b = length(cross(ro, rd));
  float dmin = tc > 0.0 ? b : camR;
  float R = uNumericRadius;

  vec3 col = vec3(0.0);
  float T = 1.0;
  bool captured = false;
  bool hasDepth = false;
  vec3 depthPoint = vec3(0.0);
  vec3 dir = rd;

  if (dmin >= R) {
    // Photon came from infinity along the straight line, reaching the camera at sinθ = tc / camR.
    dir = bendToward(ro, rd, legDeflection(b, -1.0, tc / camR));
  } else {
    vec3 pos = ro;
    vec3 vel = rd;
    if (camR > R) {
      float tEnter = tc - sqrt(R * R - b * b);
      pos = ro + rd * tEnter;
      // Leg from the sphere boundary to the camera (photon frame: sinθ goes from tc_e/R to tc/camR).
      vel = bendToward(pos, rd, legDeflection(b, -dot(pos, rd) / R, tc / camR));
    }
    vec3 L = cross(pos, vel);
    float k = -1.5 * uRs * dot(L, L);
    float r = length(pos);
    vec3 acc = k / (r * r * r * r * r) * pos;

    // Velocity Verlet (kick-drift-kick), one force evaluation per step.
    for (int i = 0; i < LENS_STEPS; i++) {
      if (r < uRs) {
        captured = true;
        if (!hasDepth) { depthPoint = pos; hasDepth = true; }
        break;
      }
      if (r > R && dot(pos, vel) > 0.0) break;

      float dt = uStepScale * r;
      vec3 prev = pos;
      vel += acc * (0.5 * dt);
      pos += vel * dt;
      r = length(pos);
      acc = k / (r * r * r * r * r) * pos;
      vel += acc * (0.5 * dt);

      if (prev.y * pos.y < 0.0) {
        vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
        float rh = length(hit.xz);
        if (rh > uInner && rh < uOuter) {
          vec4 e = diskSample(hit, normalize(vel), uRs);
          col += T * e.rgb;
          T *= 1.0 - e.a;
          if (!hasDepth && T < 0.5) { depthPoint = hit; hasDepth = true; }
          if (T < 0.01) break;
        }
      }
    }

    dir = normalize(vel);
    if (!captured) {
      // Remaining weak-field deflection from the last point out to infinity.
      float bOut = length(cross(pos, dir));
      dir = bendToward(pos, dir, legDeflection(bOut, dot(pos, dir) / r, 1.0));
    }
  }

  if (!captured) col += T * sky(dir);
  gl_FragColor = vec4(col, 1.0);

  float depth = 1.0;
  if (hasDepth) {
    vec4 clip = uProj * viewMatrix * vec4(depthPoint, 1.0);
    if (clip.w > 0.0) depth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);
  }
  gl_FragDepth = depth;

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
