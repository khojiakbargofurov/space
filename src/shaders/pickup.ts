/**
 * Pickups: faceted glowing crystals (instanced) plus a soft additive halo sprite per pickup so they
 * stay visible as colored dots from far away. Facet normals come from screen-space derivatives.
 */
export const pickupVertex = /* glsl */ `
varying vec3 vViewPos;

void main() {
  vec4 p = vec4(position, 1.0);
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  vec4 mv = modelViewMatrix * p;
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

export const pickupFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uTime;

varying vec3 vViewPos;

void main() {
  vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 v = normalize(-vViewPos);
  float facing = abs(dot(n, v));
  float rim = pow(1.0 - facing, 2.0);
  float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
  vec3 col = uColor * uGlow * (0.2 + 0.5 * facing * facing + rim) * pulse;
  gl_FragColor = vec4(col, 1.0);
}
`

export const haloVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;

uniform float uScale;
uniform float uMinPx;
uniform float uMaxPx;

varying vec3 vColor;

void main() {
  vColor = aColor;
  if (aSize <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 1e-3), uMinPx, uMaxPx);
}
`

export const haloFragment = /* glsl */ `
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  if (d2 > 1.0) discard;
  float a = exp(-d2 * 5.0) * (1.0 - d2);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`
