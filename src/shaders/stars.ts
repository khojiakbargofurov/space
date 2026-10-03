/**
 * Procedural point stars as a pure function of direction, so they can be sampled along lensed rays.
 * Each layer is a grid on the six cube faces with at most one star per cell (kept away from cell edges
 * so a star's footprint never crosses into a neighbor). Requires noise.ts (pcg3d) and uTime.
 */
export const starsGLSL = /* glsl */ `
#define STAR_LAYERS 3

uniform float uStarGrid[STAR_LAYERS];
uniform float uStarProb[STAR_LAYERS];
uniform float uStarGain[STAR_LAYERS];
uniform float uStarSize[STAR_LAYERS];
uniform vec3 uStarColors[6];
uniform float uStarCdf[6];
uniform float uStarPower;
uniform float uTwinkle;
uniform float uPixelAngle;
uniform vec3 uBandNormal;
uniform float uBandSigma;
uniform float uBandFraction;

vec3 hash01(uvec3 h) {
  return vec3(h >> 8u) * (1.0 / 16777215.0);
}

vec3 faceDir(int axis, float sgn, vec2 uv) {
  if (axis == 0) return normalize(vec3(sgn, uv));
  if (axis == 1) return normalize(vec3(uv.x, sgn, uv.y));
  return normalize(vec3(uv, sgn));
}

vec3 starColor(float u) {
  for (int i = 0; i < 5; i++) {
    if (u < uStarCdf[i]) return uStarColors[i];
  }
  return uStarColors[5];
}

vec3 stars(vec3 d) {
  vec3 a = abs(d);
  int axis;
  float sgn;
  vec2 uv;
  if (a.x >= a.y && a.x >= a.z) { axis = 0; sgn = sign(d.x); uv = d.yz / a.x; }
  else if (a.y >= a.z) { axis = 1; sgn = sign(d.y); uv = d.xz / a.y; }
  else { axis = 2; sgn = sign(d.z); uv = d.xy / a.z; }
  int face = axis * 2 + (sgn > 0.0 ? 1 : 0);

  // Gaussian band density, normalized so the total star count is unchanged.
  float bandNorm = uBandSigma * 0.8862;

  vec3 col = vec3(0.0);
  for (int layer = 0; layer < STAR_LAYERS; layer++) {
    float grid = uStarGrid[layer];
    vec2 cell = floor((uv * 0.5 + 0.5) * grid);
    uvec3 h = pcg3d(uvec3(ivec3(ivec2(cell), face + 6 * layer)));
    vec3 r0 = hash01(h);

    vec3 center = faceDir(axis, sgn, (cell + 0.5) / grid * 2.0 - 1.0);
    float hb = dot(center, uBandNormal) / uBandSigma;
    float density = 1.0 - uBandFraction + uBandFraction * exp(-hb * hb) / bandNorm;
    if (r0.x > uStarProb[layer] * density) continue;

    vec3 sd = faceDir(axis, sgn, (cell + 0.2 + 0.6 * r0.yz) / grid * 2.0 - 1.0);
    float sigma = uPixelAngle * uStarSize[layer];
    vec3 diff = d - sd;
    float e = dot(diff, diff) / (sigma * sigma);
    if (e > 9.0) continue;

    vec3 r1 = hash01(pcg3d(h));
    float b = 0.12 + 0.88 * pow(r1.x, uStarPower);
    float tw = 1.0 + uTwinkle * sin(uTime * (0.8 + 2.4 * r1.z) + 37.0 * r1.z);
    col += starColor(r1.y) * (uStarGain[layer] * b * tw * exp(-e));
  }
  return col;
}
`
