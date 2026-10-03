/**
 * Thruster particles as additive point sprites in world space. Each particle carries its normalized
 * age (0 = born, ≥ 1 = dead), a kind (0 = main engine plasma, 1 = RCS puff) and a base size in world units.
 */
export const particlesVertex = /* glsl */ `
attribute float aAge;
attribute float aKind;
attribute float aSize;

uniform float uScale;
uniform float uMaxPx;
uniform float uGrowth;

varying float vAge;
varying float vKind;

void main() {
  vAge = aAge;
  vKind = aKind;
  if (aAge >= 1.0) {
    // Dead: push outside the clip volume.
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = aSize * mix(1.0, uGrowth, aAge);
  gl_PointSize = min(size * uScale / max(-mv.z, 1e-3), uMaxPx);
}
`

export const particlesFragment = /* glsl */ `
uniform vec3 uMainHot;
uniform vec3 uMainCool;
uniform vec3 uRcsHot;
uniform vec3 uRcsCool;

varying float vAge;
varying float vKind;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  if (d2 > 1.0) discard;
  float soft = exp(-d2 * 4.0) * (1.0 - d2);
  vec3 hot = mix(uMainHot, uRcsHot, vKind);
  vec3 cool = mix(uMainCool, uRcsCool, vKind);
  vec3 col = mix(hot, cool, smoothstep(0.0, 0.7, vAge));
  float fade = 1.0 - vAge;
  gl_FragColor = vec4(col * soft * fade * fade, 1.0);
}
`
