// The WebGL2 painting: a baked field of brush strokes, instanced grass and flowers, rain and snow.
// Ported from Dayline. createEngine(canvas) returns null when WebGL2 is unavailable.
import { newSky } from './sky.js';

export function rng(seed){ return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const mixC = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const n1 = (x, s) => .5 + .25 * Math.sin(x + s) + .15 * Math.sin(x * 2.3 + s * 1.7) + .1 * Math.sin(x * 5.1 + s * 2.9);
const meaY = (x, H) => H * .79 + (n1(x / 300, 11) - .5) * H * .05;

const GLSL_COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uScale;
uniform float uLight, uSat, uOver, uFog, uFlash;
float sq(float x){ return x * x; }
float hash1(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec4 hash4(vec2 p){ vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099)); p4 += dot(p4, p4.wzxy + 33.33); return fract((p4.xxyz + p4.yzzw) * p4.zywx); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash1(i), hash1(i + vec2(1, 0)), u.x), mix(hash1(i + vec2(0, 1)), hash1(i + vec2(1, 1)), u.x), u.y); }
float n1(float x, float s){ return .5 + .25 * sin(x + s) + .15 * sin(x * 2.3 + s * 1.7) + .1 * sin(x * 5.1 + s * 2.9); }
float farY(float x){ return uRes.y * .6 + (n1(x / 420., 3.3) - .5) * uRes.y * .22 - uRes.y * .07 * exp(-sq(x / uRes.x - .3) / .02); }
float midY(float x){ return min(uRes.y * .74 - uRes.y * .27 * exp(-sq(x / uRes.x - .9) / .05), uRes.y * .72 - uRes.y * .1 * exp(-sq(x / uRes.x - .12) / .025)) + (n1(x / 260., 7.) - .5) * uRes.y * .05; }
float meaY(float x){ return uRes.y * .79 + (n1(x / 300., 11.) - .5) * uRes.y * .05; }
// a mosaic of overlapping tapered strokes: x = shade with bristles, y = position across the stroke, z = a second random
vec3 stroke(vec2 p, vec2 cell, float seed){
  vec2 q = p / cell, i = floor(q);
  float best = -1.; vec3 res = vec3(.5, 0., .5);
  for (int yy = -1; yy <= 1; yy++) for (int xx = -2; xx <= 2; xx++){
    vec2 c = i + vec2(float(xx), float(yy));
    vec4 h = hash4(c + seed * 31.7);
    vec2 d = q - c - h.xy;
    float ang = (h.z - .5) * .2, cs = cos(ang), sn = sin(ang);   // small tilt: keeps every stroke inside the searched cells
    d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
    float len = .75 + h.w * .95, u = d.x / len;
    float w = (.45 + h.z * .35) * (1. - u * u * .6);
    if (abs(u) < 1. - .14 * vnoise(vec2(d.y * 4., h.x * 50.)) && abs(d.y) < w){
      float pr = fract(h.x * 7.13 + h.y * 3.71 + h.w * 1.37);
      if (pr > best){
        best = pr;
        float br = vnoise(vec2(u * 1.5 + h.x * 13., d.y / w * 5. + h.y * 29.));
        res = vec3(clamp(fract(h.w * 31.7 + h.y * 3.1) * .75 + br * .35 - .05, 0., 1.), d.y / w, fract(h.z * 17.3));
      }
    }
  }
  return res;
}
vec3 landAdjust(vec3 c){ float l = dot(c, vec3(.2126, .7152, .0722)); return mix(vec3(l), c, uSat) * uLight; }
vec3 grade(vec3 c, float y){
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(c, vec3(l), uOver * .6) * (1. - uOver * .15);
  c = mix(c, vec3(.886, .894, .91) * (.45 + uLight * .6), uFog * smoothstep(.25, .72, y / uRes.y) * .85);
  return c + uFlash * vec3(.55, .57, .65);
}
`;
const VS_FULL = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

const FS_FIELD = GLSL_COMMON + `
out vec4 o;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  vec2 ps = p + vec2(0., (vnoise(vec2(p.x / 260., 1.7)) - .5) * 70.);
  vec3 a = stroke(ps, vec2(120., 24.), 1.), b = stroke(ps + 37., vec2(58., 13.), 2.);
  float skyV = .5 + (a.x - .5) * .3 + (b.x - .5) * .18 + (vnoise(p / vec2(300., 70.)) - .5) * .2 + p.y / uRes.y * .05;
  float fy = farY(p.x), my = midY(p.x), ey = meaY(p.x);
  float j = (stroke(p, vec2(60., 14.), 3.).x - .5) * 9.;
  float layer = p.y > ey + j ? 3. : p.y > my + j ? 2. : p.y > fy + j ? 1. : 0.;
  float ridge = layer > 2.5 ? ey : layer > 1.5 ? my : fy;
  vec2 lp = vec2(p.x, p.y - ridge * .55);
  vec3 s1 = stroke(lp, vec2(54., 11.), 4. + layer), s2 = stroke(lp + 23., vec2(24., 7.), 8. + layer);
  float land = .5 + (s1.x - .5) * .42 + (s2.x - .5) * .2 - clamp((p.y - ridge) / 160., 0., 1.) * .1 + (vnoise(p / 40.) - .5) * .1;
  o = vec4(clamp(skyV, 0., 1.), clamp(land, 0., 1.), layer / 3., s2.z);
}`;

const FS_MAIN = GLSL_COMMON + `
uniform sampler2D uField;
uniform vec3 uS1, uS2, uS3, uSun, uMoon;
uniform float uNight, uDay, uCover, uDrift, uT;
out vec4 o;
vec3 overlay(vec3 b, float a){ return mix(2. * a * b, 1. - 2. * (1. - a) * (1. - b), step(.5, b)); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + 17.; a *= .5; } return v; }
vec3 orb(vec3 c, vec3 o, float R, vec2 p, float fr, vec3 a, vec3 b, vec3 e, vec3 glow){
  if (o.z <= 0.) return c;
  vec2 op = o.xy * uRes; float d = length(p - op);
  c += glow * exp(-d / (R * 1.8)) * o.z;
  float edge = R * (1. + (fr - .5) * .22);
  if (d < edge + 2.){
    float t = d / R;
    vec3 col = t < .5 ? mix(a, b, t * 2.) : mix(b, e, clamp((t - .5) * 2., 0., 1.));
    col *= .9 + .2 * vnoise(vec2(atan(p.y - op.y, p.x - op.x) * 6., d * .18));
    c = mix(c, col, o.z * smoothstep(edge, edge - 2., d));
  }
  return c;
}
void main(){
  vec4 f = texelFetch(uField, ivec2(gl_FragCoord.xy), 0);
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  float y = p.y / uRes.y, layer = floor(f.b * 3. + .5);
  vec3 c;
  if (layer < .5){
    vec3 g = y < .42 ? mix(uS1, uS2, y / .42) : mix(uS2, uS3, clamp((y - .42) / .28, 0., 1.));
    c = overlay(g, f.r);
    vec2 sc = floor(p / 38.); vec4 sh = hash4(sc + 5.1);
    float star = step(.72, sh.z) * smoothstep(1.5 + sh.w, .2, length(p - (sc + .15 + sh.xy * .7) * 38.)) * (.65 + .35 * sin(uT * 2. + sh.w * 30.));
    float R = clamp(uRes.x * .035, 34., 54.);
    c = orb(c, uSun, R, p, f.r, vec3(1., .84, .47), vec3(.97, .63, .27), vec3(.89, .41, .2), vec3(1., .74, .43) * .5);
    c = orb(c, uMoon, R * .9, p, f.r, vec3(1., .99, .93), vec3(.93, .9, .81), vec3(.78, .76, .67), vec3(1., .98, .88) * .16);
    float mask = smoothstep(uRes.y * .64, uRes.y * .4, p.y);
    if (mask > 0.){
      vec2 cp = p - vec2(uDrift, 0.);
      float thr = mix(.64, .3, uCover), d0 = fbm(cp / vec2(340., 110.));
      if (d0 > thr - .1){
        vec3 s = stroke(cp, vec2(46., 12.), 9.);
        float a = smoothstep(thr, thr + .05 + uCover * .08, d0 + (s.x - .5) * .08) * mask;
        float d1 = fbm((cp - vec2(0., 16.)) / vec2(340., 110.));
        float shade = clamp((d0 - d1) * 4.5 + .62, 0., 1.);
        vec3 light = mix(uS2 * 1.2 + .1, vec3(.98, .97, .95), uDay * .8), dark = mix(uS1 * 1.1, vec3(.62, .64, .7), uDay * .7);
        c = mix(c, mix(dark, light, shade) * (.95 + s.x * .09), a * .92);
        star *= 1. - a;
      }
    }
    c += star * uNight * vec3(1., .98, .9);
  } else {
    vec3 base = layer < 1.5 ? vec3(.463, .573, .518) : layer < 2.5 ? vec3(.259, .369, .251) : vec3(.18, .29, .133);
    c = mix(base + (f.g - .5) * .22, vec3(.78, .75, .59), f.a * .07);
    c = landAdjust(c);
  }
  c = grade(c, p.y) + (hash1(gl_FragCoord.xy) - .5) * .03;
  o = vec4(c, 1.);
}`;

const GLSL_BEND = `
uniform float uT, uWind, uDir;
float bend(float x, float lean, float ph, float flex){
  float gust = sin(uT * 1.7 + x * .013 + ph) * .55 + sin(uT * .61 + x * .0043) * .45;
  return lean + flex * (uDir * uWind * (.32 + .42 * gust) + .05 * sin(uT * 1.3 + ph));
}
vec2 bez(vec2 b, float L, float k, float t){
  vec2 p1 = b + vec2(k * L * .25, -L * .6), p2 = b + vec2(k * L, -L * (1. - min(.5, abs(k)) * .3));
  return mix(mix(b, p1, t), mix(p1, p2, t), t);
}
vec4 clip(vec2 p){ return vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.); }
`;
const VS_BLADE = GLSL_COMMON + GLSL_BEND + `
layout(location = 0) in vec2 aV;   // side, t along the blade
layout(location = 1) in vec4 aA;   // x, y, length, lean
layout(location = 2) in vec3 aB;   // phase, flex, width
layout(location = 3) in vec3 aC;   // colour
out vec3 vC; out float vY;
void main(){
  float k = bend(aA.x, aA.w, aB.x, aB.y), t = aV.y;
  vec2 pt = bez(aA.xy, aA.z, k, t);
  vec2 tg = normalize(bez(aA.xy, aA.z, k, min(1., t + .02)) - bez(aA.xy, aA.z, k, max(0., t - .02)) + vec2(0., -1e-4));
  pt += vec2(-tg.y, tg.x) * aV.x * aB.z * .5 * (1. - t * .85);
  vC = aC; vY = pt.y;
  gl_Position = clip(pt);
}`;
const FS_BLADE = GLSL_COMMON + `
in vec3 vC; in float vY; out vec4 o;
void main(){ o = vec4(grade(landAdjust(vC), vY), .92); }`;
const VS_DAB = GLSL_COMMON + GLSL_BEND + `
layout(location = 0) in vec2 aQ;   // corner
layout(location = 1) in vec4 aA;   // x, y, stem height, position along the stem
layout(location = 2) in vec4 aB;   // phase, flex, lean, size
layout(location = 3) in vec4 aC;   // colour, jitter
out vec2 vQ; out vec3 vC; out float vY;
void main(){
  float k = bend(aA.x, aB.z, aB.x, aB.y);
  vec2 c = bez(aA.xy, aA.z, k, aA.w) + vec2(aC.w, 0.);
  vec2 pt = c + aQ * vec2(aB.w, aB.w * .8);
  vQ = aQ; vC = aC.rgb; vY = pt.y;
  gl_Position = clip(pt);
}`;
const FS_DAB = GLSL_COMMON + `
in vec2 vQ; in vec3 vC; in float vY; out vec4 o;
void main(){ float r = length(vQ); if (r > 1.) discard; o = vec4(grade(landAdjust(vC), vY), .9 * smoothstep(1., .7, r)); }`;
const VS_FALL = GLSL_COMMON + `
uniform float uTime, uSlant, uMode;
layout(location = 0) in vec2 aQ;   // along 0..1, across -1..1
layout(location = 1) in vec4 aA;   // seed x, seed y, speed, length
out vec2 vQ;
void main(){
  float W = uRes.x, H = uRes.y; vec2 pt;
  if (uMode < .5){
    float y = mod(aA.y * (H + 120.) + uTime * aA.z * 820., H + 120.) - 60.;
    vec2 head = vec2(mod(aA.x * W + y * uSlant, W), y), dir = normalize(vec2(-uSlant, -1.));
    pt = head + dir * aA.w * aQ.x + vec2(-dir.y, dir.x) * aQ.y * .6;
    vQ = aQ;
  } else {
    float y = mod(aA.y * (H + 20.) + uTime * aA.z * 55., H + 20.) - 10.;
    float x = mod(aA.x * W + uTime * uSlant * 60. + sin(uTime * 1.3 + aA.x * 40.) * 12., W);
    vQ = vec2(aQ.x * 2. - 1., aQ.y);
    pt = vec2(x, y) + vQ * (1. + (aA.w - 10.) / 16. * 2.2);
  }
  gl_Position = vec4(pt.x / W * 2. - 1., 1. - pt.y / H * 2., 0., 1.);
}`;
const FS_FALL = GLSL_COMMON + `
uniform float uMode; in vec2 vQ; out vec4 o;
void main(){
  if (uMode < .5){ o = vec4(.87, .9, .95, .42); return; }
  float r = length(vQ); if (r > 1.) discard; o = vec4(1., 1., 1., .85 * smoothstep(1., .55, r));
}`;

export function newLive(){
  return {wind: .22, windT: .22, dir: 1, dirT: 1, cover: .25, coverT: .25, over: 0, overT: 0, fog: 0, fogT: 0,
    kind: null, rain: 0, rainT: 0, t: 0, rt: 0, drift: 0, flash: 0, nextFlash: 0};
}

export function createEngine(cv){
  const gl = cv.getContext('webgl2', {antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false});
  if (!gl) return null;
  const sky = newSky(), live = newLive();
  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    return {p, u: name => name in u ? u[name] : (u[name] = gl.getUniformLocation(p, name))};
  };
  let P;
  try{
    P = {field: program(VS_FULL, FS_FIELD), main: program(VS_FULL, FS_MAIN), blade: program(VS_BLADE, FS_BLADE), dab: program(VS_DAB, FS_DAB), fall: program(VS_FALL, FS_FALL)};
  }catch(e){ console.warn('Dayscape: WebGL shaders failed, showing the plain sky.', e); return null; }

  const buf = (data, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
  const attrib = (loc, b, size, stride, off, div) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); gl.vertexAttribDivisor(loc, div);
  };
  const empty = gl.createVertexArray();
  const bladeVerts = buf(new Float32Array([-1, 0, 1, 0, -1, .5, 1, .5, 0, 1]));
  const quadVerts = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  const lineVerts = buf(new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]));
  const bladeVAO = gl.createVertexArray(), dabVAO = gl.createVertexArray(), fallVAO = gl.createVertexArray();
  const bladeBuf = gl.createBuffer(), dabBuf = gl.createBuffer();
  let nBlades = 0, nDabs = 0;
  const FALL_MAX = 1600, R0 = rng(77);
  const fallBuf = buf(new Float32Array(Array.from({length: FALL_MAX * 4}, (_, i) => i % 4 === 2 ? .8 + R0() * .5 : i % 4 === 3 ? 10 + R0() * 16 : R0())));
  gl.bindVertexArray(fallVAO); attrib(0, lineVerts, 2, 2, 0, 0); attrib(1, fallBuf, 4, 4, 0, 1);

  let fieldTex = null, W = 0, H = 0, S = 1, cw = 0, ch = 0, scene = null;
  const fbo = gl.createFramebuffer();

  function upload(blades, dabs){
    blades.sort((a, b) => a[1] - b[1]);
    nBlades = blades.length; nDabs = dabs.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(blades.flat()), gl.STATIC_DRAW);
    gl.bindVertexArray(bladeVAO); attrib(0, bladeVerts, 2, 2, 0, 0); attrib(1, bladeBuf, 4, 10, 0, 1); attrib(2, bladeBuf, 3, 10, 4, 1); attrib(3, bladeBuf, 3, 10, 7, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, dabBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dabs.flat()), gl.STATIC_DRAW);
    gl.bindVertexArray(dabVAO); attrib(0, quadVerts, 2, 2, 0, 0); attrib(1, dabBuf, 4, 12, 0, 1); attrib(2, dabBuf, 4, 12, 4, 1); attrib(3, dabBuf, 4, 12, 8, 1);
  }

  function buildMeadow(){
    const R = rng(3), blades = [], dabs = [];
    const top0 = H * .79, count = Math.round(W * (H - top0) / 24);
    for (let i = 0; i < count; i++){
      const x = R() * W, top = meaY(x, H), y = top + R() ** .8 * (H - top + 6), depth = (y - top) / (H - top + 1);
      const c = mixC([30, 54, 28], [132, 160, 72], Math.min(1, R() * .8 + (1 - depth) * .2)).map(v => v / 255);
      blades.push([x, y, 7 + depth * 34 * (.6 + R() * .7), (R() - .5) * .45 + Math.sin(x / 90) * .1, R() * 6.28, .6 + R() * .7, 1 + depth * 2.2 * (.4 + R() * .6), ...c]);
    }
    // wildflowers: a stem plus a small stack of dabs that sway with it
    const FLOWERS = [[157, 134, 214], [199, 111, 176], [232, 195, 74], [242, 238, 224], [110, 127, 216], [226, 140, 90]];
    for (let i = 0; i < W / 10; i++){
      const x = R() * W, top = meaY(x, H), y = top + 6 + R() ** .9 * (H - top), depth = (y - top) / (H - top + 1);
      const fc = FLOWERS[(R() * FLOWERS.length) | 0], size = 1.2 + depth * 2.8, tall = R() < .5 ? 2 + (R() * 4 | 0) : 1;
      const sh = size * (tall + 2) * 1.6, ph = R() * 6.28, flex = .7 + R() * .5, lean = (R() - .5) * .2;
      blades.push([x, y, sh, lean, ph, flex, 1, 52 / 255, 84 / 255, 40 / 255]);
      for (let k = 0; k < tall; k++){
        const v = (R() - .5) * 30;
        dabs.push([x, y, sh, Math.min(1, size * (2 + k * 1.7) / sh), ph, flex, lean, size, ...fc.map(c => Math.max(0, Math.min(255, c + v)) / 255), (R() - .5) * size * .6]);
      }
    }
    upload(blades, dabs);
  }

  const common = prog => {
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u('uRes'), W, H); gl.uniform1f(prog.u('uScale'), S);
    gl.uniform1f(prog.u('uLight'), sky.light); gl.uniform1f(prog.u('uSat'), sky.sat);
    gl.uniform1f(prog.u('uOver'), live.over); gl.uniform1f(prog.u('uFog'), live.fog); gl.uniform1f(prog.u('uFlash'), live.flash);
  };

  // bake the stroke field for the current size and scene (the mask path arrives with the city scenes)
  function bake(){
    if (!W) return;
    if (fieldTex) gl.deleteTexture(fieldTex);
    fieldTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, cw, ch);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
    gl.viewport(0, 0, cw, ch);
    gl.disable(gl.BLEND);   // the last frame leaves blending on; the field must be written as-is
    common(P.field); gl.bindVertexArray(empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    buildMeadow();
  }

  function resize(){
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    // the painting is soft, so cap the pixel count: this keeps big screens fast
    S = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(2.4e6 / (W * H)));
    cw = Math.round(W * S); ch = Math.round(H * S);
    cv.width = cw; cv.height = ch;
    bake();
  }

  function step(dt, still){
    const e = still ? 1 : Math.min(1, dt * 1.2);
    for (const k of ['wind', 'dir', 'cover', 'rain', 'over', 'fog']) live[k] += (live[k + 'T'] - live[k]) * e;
    live.t += dt * (.7 + live.wind * 1.3);
    live.rt += dt;
    live.drift += live.dir * (5 + live.wind * 60) * .8 * dt;
    live.flash *= Math.exp(-dt * 7);
    if (live.kind === 'storm' && !still && performance.now() > live.nextFlash){
      live.nextFlash = performance.now() + 4000 + Math.random() * 7000;
      live.flash = .8;
      setTimeout(() => { live.flash = Math.max(live.flash, .55); }, 160);
    }
  }

  function draw(){
    if (!fieldTex) return;
    gl.viewport(0, 0, cw, ch);
    gl.disable(gl.BLEND);
    const m = P.main; common(m);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldTex); gl.uniform1i(m.u('uField'), 0);
    gl.uniform3fv(m.u('uS1'), sky.s1.map(v => v / 255)); gl.uniform3fv(m.u('uS2'), sky.s2.map(v => v / 255)); gl.uniform3fv(m.u('uS3'), sky.s3.map(v => v / 255));
    gl.uniform3fv(m.u('uSun'), sky.sun); gl.uniform3fv(m.u('uMoon'), sky.moon);
    gl.uniform1f(m.u('uNight'), sky.night); gl.uniform1f(m.u('uDay'), sky.day);
    gl.uniform1f(m.u('uCover'), live.cover); gl.uniform1f(m.u('uDrift'), live.drift); gl.uniform1f(m.u('uT'), live.rt);
    gl.bindVertexArray(empty); gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const [prog, vao, n, verts] of [[P.blade, bladeVAO, nBlades, 5], [P.dab, dabVAO, nDabs, 4]]){
      if (!n) continue;
      common(prog);
      gl.uniform1f(prog.u('uT'), live.t); gl.uniform1f(prog.u('uWind'), live.wind); gl.uniform1f(prog.u('uDir'), live.dir);
      gl.bindVertexArray(vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, verts, n);
    }
    const nFall = Math.min(FALL_MAX, Math.round(live.rain * 520 * Math.max(.6, W * H / (1440 * 860))));
    if (nFall > 0){
      const f = P.fall; common(f);
      gl.uniform1f(f.u('uTime'), live.rt); gl.uniform1f(f.u('uSlant'), live.dir * live.wind * .55); gl.uniform1f(f.u('uMode'), live.kind === 'snow' ? 1 : 0);
      gl.bindVertexArray(fallVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nFall);
    }
  }

  return {
    sky, live, gl,
    get scene(){ return scene; },
    setScene(s){ scene = s; bake(); },
    resize,
    /** Advance by dt seconds (0 = still) and paint one frame. */
    frame(dt){ step(dt, dt === 0); draw(); },
  };
}
