/**
 * 3D gradient noise + fbm, GLSL ES 3.0 (three compiles ShaderMaterial as #version 300 es on WebGL2).
 * Lattice hashing uses the pcg3d integer hash. Define FBM_OCTAVES before including.
 */
export const noiseGLSL = /* glsl */ `
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}

vec3 latticeGrad(vec3 cell) {
  uvec3 h = pcg3d(uvec3(ivec3(cell)));
  return vec3(h >> 8u) * (2.0 / 16777215.0) - 1.0;
}

/** Gradient noise, roughly in [-1, 1]. */
float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(latticeGrad(i), f);
  float n100 = dot(latticeGrad(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(latticeGrad(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(latticeGrad(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(latticeGrad(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(latticeGrad(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(latticeGrad(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(latticeGrad(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

#ifndef FBM_OCTAVES
#define FBM_OCTAVES 5
#endif

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < FBM_OCTAVES; i++) {
    sum += amp * gnoise(p);
    p = p * 2.03 + vec3(17.1, -3.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}
`
