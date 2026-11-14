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

const FS_FIELD_MASK = GLSL_COMMON + `
uniform sampler2D uMask;
uniform vec2 uCell[13];
out vec4 o;
vec4 mk(vec2 p){ return texture(uMask, clamp(p / uRes, vec2(0.), vec2(1.))); }
float matOf(vec4 k){ return clamp(floor(k.r * 255. / 16. + .5), 0., 12.); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  vec2 ps = p + vec2(0., (vnoise(vec2(p.x / 260., 1.7)) - .5) * 70.);
  vec3 a = stroke(ps, vec2(120., 24.), 1.), b = stroke(ps + 37., vec2(58., 13.), 2.);
  float skyV = .5 + (a.x - .5) * .3 + (b.x - .5) * .18 + (vnoise(p / vec2(300., 70.)) - .5) * .2 + p.y / uRes.y * .05;
  // brushy edges: look the material up a little off the pixel, by an amount that suits the material's strokes
  float m0 = matOf(mk(p));
  vec2 c0 = uCell[int(m0)];
  float amp = m0 < .5 ? 3. : min(c0.x, c0.y) * .3;
  vec2 jt = (vec2(vnoise(p / 9.), vnoise(p / 9. + 19.)) - .5) * 2. * amp;
  vec4 k = mk(p + jt);
  float m = matOf(k);
  vec2 cell = uCell[int(m)];
  bool vert = cell.y > cell.x;                 // tall cells paint vertical strokes (walls, towers)
  vec2 sp = vert ? p.yx : p, sc = vert ? cell.yx : cell;
  vec3 s1 = stroke(sp, sc, 4. + m), s2 = stroke(sp + 23., sc * .45, 8. + m);
  float land = .5 + (s1.x - .5) * .42 + (s2.x - .5) * .2 + (vnoise(p / 40.) - .5) * .1;
  float code = m + 16. * step(.5, mk(p + jt * .2).g) + 32. * step(.5, k.b);   // windows stay crisp
  o = vec4(clamp(skyV, 0., 1.), clamp(land, 0., 1.), code / 255., s2.z);
}`;

const FS_MAIN = GLSL_COMMON + `
uniform sampler2D uField;
uniform vec3 uS1, uS2, uS3, uSun, uMoon;
uniform float uNight, uDay, uCover, uDrift, uT;
uniform float uKind, uWave;
uniform vec3 uPDay[13], uPNight[13];
uniform float uGlow[13];
uniform sampler2D uPlA, uPlB;            // painted plates: day and night, the sky cut out in alpha
uniform float uImgAspect, uWarm, uPlFade;
uniform vec4 uBand;                      // image v: sky ends, water starts, water ends, grass starts
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
// Van Gogh's sky: short separate dashes of paint, each laid along a flow that runs in long rivers
// and curls into a few slow whirlpools drifting with the wind
vec2 vortex(int i){
  vec4 h = hash4(vec2(float(i) * 7.1, 3.3));
  return vec2(mod(h.x * uRes.x * 1.3 + uDrift * (.25 + h.y * .2), uRes.x * 1.3) - uRes.x * .15, uRes.y * (.1 + h.z * .2));
}
vec2 flow(vec2 q){
  vec2 v = vec2(1., .28 * sin(q.x / 170. + uT * .17) + .1 * sin(q.x / 61. - uT * .23));
  for (int i = 0; i < 3; i++){
    vec4 h = hash4(vec2(float(i) * 7.1, 3.3));
    vec2 d = q - vortex(i);
    float R = uRes.y * (.07 + h.w * .06), w = exp(-dot(d, d) / (R * R * 2.2)) * 3.2 * (i == 1 ? -1. : 1.);
    v += vec2(-d.y, d.x) / R * w;
  }
  return normalize(v);
}
// x = shade (with bristles), y = across the stroke, z = a random per stroke; best = -1 where no stroke covers
vec4 flowStroke(vec2 p, float cell, float seed){
  vec2 q = p / cell, i = floor(q);
  float best = -1.; vec4 res = vec4(.5, 0., .5, -1.);
  for (int yy = -2; yy <= 2; yy++) for (int xx = -2; xx <= 2; xx++){
    vec2 c = i + vec2(float(xx), float(yy));
    vec4 h = hash4(c + seed * 31.7);
    vec2 ctr = c + h.xy;
    vec2 dir = flow(ctr * cell), d = q - ctr;
    d = vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
    float len = 1.1 + h.w * .9, u = d.x / len;
    float w = (.24 + h.z * .14) * (1. - u * u * .55);
    if (abs(u) < 1. && abs(d.y) < w){
      float pr = fract(h.x * 7.13 + h.y * 3.71 + h.w * 1.37);
      if (pr > best){
        best = pr;
        float br = vnoise(vec2(u * 1.2 + h.x * 13., d.y / w * 4. + h.y * 29.));
        res = vec4(clamp(fract(h.w * 31.7 + h.y * 3.1) * .8 + br * .3 - .05, 0., 1.), d.y / w, fract(h.z * 17.3), 1.);
      }
    }
  }
  return res;
}
vec3 skyCol(vec2 p, float y, float fr){
  vec3 g = y < .42 ? mix(uS1, uS2, y / .42) : mix(uS2, uS3, clamp((y - .42) / .28, 0., 1.));
  float gl0 = dot(g, vec3(.2126, .7152, .0722));
  g = clamp(mix(vec3(gl0), g, 1.45) * vec3(.94, .98, 1.08), 0., 1.);   // Van Gogh's skies are deeper and bluer than life
  vec2 sp = p - vec2(uT * 5., 0.);
  vec4 a = flowStroke(sp, 15., 1.), b = flowStroke(sp + 7., 9., 2.);
  vec4 k = b.w > 0. && b.z > .45 ? b : a;           // small strokes lie over the big ones here and there
  // between the strokes the darker ground shows, as on a real canvas
  vec3 c = k.w > 0. ? overlay(g, clamp(.5 + (k.x - .5) * .8 + (fr - .5) * .12, 0., 1.)) * (1. - .14 * abs(k.y))
                    : g * mix(.72, .82, fr);
  float pick = k.z;
  c = mix(c, c * vec3(1.1, 1.05, .82) + vec3(.07, .06, 0.), smoothstep(.75, .92, pick) * .6 * (1. - uNight * .3) * step(0., k.w));
  c = mix(c, c * vec3(.8, .87, 1.1), smoothstep(.25, .08, pick) * .5 * step(0., k.w));
  vec2 sc = floor(p / 38.); vec4 sth = hash4(sc + 5.1);
  float sd = length(p - (sc + .15 + sth.xy * .7) * 38.);
  float star = step(.72, sth.z) * smoothstep(1.5 + sth.w, .2, sd) * (.65 + .35 * sin(uT * 2. + sth.w * 30.));
  // a few big stars with Van Gogh's glowing rings
  vec2 bc = floor(p / 150.); vec4 bh = hash4(bc + 9.7);
  float bd = length(p - (bc + .2 + bh.xy * .6) * 150.), bs = step(.62, bh.z) * (.7 + .3 * sin(uT * .9 + bh.w * 20.));
  star += bs * (smoothstep(7., 2., bd) + .45 * exp(-bd / 16.) * (.6 + .4 * sin(bd * .55 - uT * 1.5)));
  float R = clamp(uRes.x * .035, 34., 54.);
  c = orb(c, uSun, R, p, fr, vec3(1., .84, .47), vec3(.97, .63, .27), vec3(.89, .41, .2), vec3(1., .74, .43) * .5);
  c = orb(c, uMoon, R * .9, p, fr, vec3(1., .99, .93), vec3(.93, .9, .81), vec3(.78, .76, .67), vec3(1., .98, .88) * .16);
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
      c = mix(c, mix(dark, light, shade) * (.86 + k.x * .22 - .08 * abs(k.y)), a * .85);   // clouds are painted with the same strokes
      star *= 1. - a;
    }
  }
  c += star * uNight * vec3(1., .98, .9);
  for (int i = 0; i < 2; i++){
    vec3 o = i == 0 ? uSun : uMoon;
    if (o.z <= 0.) continue;
    float d = length(p - o.xy * uRes), R = clamp(uRes.x * .035, 34., 54.);
    float ring = exp(-d / (R * 2.6)) * (.55 + .45 * sin(d * .16 - uT * 1.1 + k.x * 1.5)) * smoothstep(R * .95, R * 1.3, d);
    c += ring * o.z * (i == 0 ? vec3(1., .82, .35) * .5 : vec3(.95, .92, .7) * .38);
  }
  return c;
}
void main(){
  vec4 f = texelFetch(uField, ivec2(gl_FragCoord.xy), 0);
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  float y = p.y / uRes.y, layer = floor(f.b * 3. + .5);
  float code = floor(f.b * 255. + .5), m = mod(code, 16.), win = mod(floor(code / 16.), 2.), wat = floor(code / 32.);
  bool skyPix = uKind < .5 ? layer < .5 : m < .5;
  vec3 c;
  if (uKind > 1.5){
    // a painted plate covers the screen; where its alpha is clear the live sky shows through
    float sa = uRes.x / uRes.y;
    vec2 k = sa > uImgAspect ? vec2(1., uImgAspect / sa) : vec2(sa / uImgAspect, 1.);
    vec2 uv = (p / uRes - .5) * k + vec2(.5, .5 + (1. - k.y) * .2);
    float v = uv.y, t = uT;
    // the river: inside its band, and only where the day painting is blue (not the bushes on the bank)
    vec3 d0 = texture(uPlA, uv).rgb;
    float watM = smoothstep(uBand.y, uBand.y + .02, v) * smoothstep(uBand.z, uBand.z - .03, v)
               * smoothstep(.0, .08, d0.b - max(d0.r, d0.g) + .03);
    float rip = sin(v * 380. - t * 2.2 + vnoise(uv * vec2(14., 60.)) * 6.) * .5 + (vnoise(vec2(uv.x * 40. - t * .5 * (.4 + uWave), v * 160.)) - .5);
    uv += watM * vec2(rip * .003 * (.6 + uWave), rip * .001);
    float gr = clamp((v - uBand.w) / (1. - uBand.w), 0., 1.);
    float gust = sin(t * 1.7 + uv.x * 9.) * .55 + sin(t * .61 + uv.x * 3.1) * .45;
    uv.x += gr * gr * (uWave * (.35 + .45 * gust) + .06 * sin(t * 1.3 + uv.x * 4.)) * .006;   // a gentle sway; the live blades carry the motion
    uv = clamp(uv, vec2(.001), vec2(.999));
    vec4 A = texture(uPlA, uv), B = texture(uPlB, uv);
    float nw = smoothstep(.05, .75, uNight);
    float land = smoothstep(.25, .75, mix(A.a, B.a, nw)) * uPlFade;
    // the day painting follows the light of the hour; the night painting takes over as the sky darkens
    vec3 tint = uS3 / max(.001, max(uS3.r, max(uS3.g, uS3.b)));
    vec3 dc = A.rgb * mix(vec3(1.), tint, uWarm * .5);
    float dl = dot(dc, vec3(.2126, .7152, .0722));
    vec3 dayC = mix(vec3(dl), dc, uSat) * (.6 + .4 * uLight);   // softer than the meadow: the painting stays readable at dusk
    vec3 lc = mix(dayC, B.rgb, nw);
    // the river also mirrors the live sky, so it moves with the clouds and colours of the hour
    float yy = clamp(.5 - (v - uBand.y) * 1.2, 0., 1.);
    vec3 g = yy < .42 ? mix(uS1, uS2, yy / .42) : mix(uS2, uS3, clamp((yy - .42) / .28, 0., 1.));
    float r2 = vnoise(vec2(p.x / 23. - t * .6, p.y / 1.6));
    lc = mix(lc, g * (.75 + r2 * .3), watM * .25);
    lc += watM * smoothstep(.8, .96, vnoise(vec2(uv.x * 260. + t * 1.4, v * 700.))) * .1 * mix(vec3(1., .95, .8), vec3(.9, .85, .6), uNight);
    c = land > .001 ? lc : vec3(0.);
    if (land < .999) c = mix(skyCol(p, y, f.r), lc, land);
  } else if (skyPix){
    c = skyCol(p, y, f.r);
  } else if (uKind < .5){
    vec3 base = layer < 1.5 ? vec3(.463, .573, .518) : layer < 2.5 ? vec3(.259, .369, .251) : vec3(.18, .29, .133);
    c = mix(base + (f.g - .5) * .22, vec3(.78, .75, .59), f.a * .07);
    c = landAdjust(c);
  } else {
    int mi = int(m);
    // the day colour goes through the daylight grade; the night colour is the author's own, used as painted
    vec3 dayC = landAdjust(mix(uPDay[mi] + (f.g - .5) * .2, vec3(.78, .75, .59), f.a * .05));
    vec3 nightC = uPNight[mi] + (f.g - .5) * .12;
    c = mix(dayC, nightC, uNight);
    c *= 1. - win * .16 * (1. - uNight);   // by day, window glass reads as a slightly darker grid
    if (wat > .5){
      // the river mirrors the sky above it, broken into ripples that move with the wind
      float yy = clamp(.6 - (y - .6) * 1.5, 0., 1.);
      vec3 g = yy < .42 ? mix(uS1, uS2, yy / .42) : mix(uS2, uS3, clamp((yy - .42) / .28, 0., 1.));
      float rip = vnoise(vec2(p.x / 70. + uT * .3 * (.3 + uWave), p.y / 2.6)), rip2 = vnoise(vec2(p.x / 23. - uT * .5, p.y / 1.4));
      vec3 refl = g * (.72 + rip * .28 + rip2 * .1) * mix(.95, .8, uNight);
      c = mix(c, refl, .7) + (f.g - .5) * .06;
      for (int i = 0; i < 2; i++){
        vec3 orbp = i == 0 ? uSun : uMoon;
        if (orbp.z > 0. && orbp.y < .62){
          float dx = abs(p.x - orbp.x * uRes.x), wd = 8. + max(0., y - .6) * uRes.y * .12;
          float spark = smoothstep(.55, .8, vnoise(vec2(p.x / 5. + uT * 1.7, p.y / 1.8)));
          c += exp(-dx * dx / (wd * wd)) * spark * orbp.z * (i == 0 ? vec3(1., .82, .5) * .75 : vec3(.92, .93, 1.) * .4);
        }
      }
    }
    if (win > .5){
      // after dusk each window lights at its own moment and flickers a little; glowing landmarks are always on
      vec2 wc = floor(p / vec2(6., 8.));
      float h = hash1(wc + 3.7);
      float on = uGlow[mi] > .5 ? smoothstep(.05, .35, uNight) : step(h, uNight * .85 - .08);
      float fl = .88 + .12 * sin(uT * (1. + h * 3.) + h * 60.);
      c = mix(c, vec3(1., .83, .5) * fl, on * .85);
    }
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
    P = {field: program(VS_FULL, FS_FIELD), fieldMask: program(VS_FULL, FS_FIELD_MASK), main: program(VS_FULL, FS_MAIN), blade: program(VS_BLADE, FS_BLADE), dab: program(VS_DAB, FS_DAB), fall: program(VS_FALL, FS_FALL)};
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

  let fieldTex = null, W = 0, H = 0, S = 1, cw = 0, ch = 0, scene = null, palette = null;
  // painted plates: one texture per plate name, loaded when the scene is set; mix says which two show
  let plates = {}, plateFor = null, plateFade = 0;
  function loadPlates(s){
    for (const t of Object.values(plates)) gl.deleteTexture(t);
    plates = {}; plateFade = 0; plateFor = s;
    for (const [name, url] of Object.entries(s.plates || {})){
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (plateFor !== s) return;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        plates[name] = t;
      };
      img.onerror = () => console.warn('Dayscape: a scene painting failed to load', url);
      img.src = url;
    }
  }
  const imgToY = v => {
    const ia = scene?.aspect || 16 / 9, sa = W / H, ky = sa > ia ? ia / sa : 1;
    return ((v - .5 - (1 - ky) * .2) / ky + .5) * H;
  };
  // live grass fills the painted grass band, thinner at its top edge
  const plateGrass = (x, h) => { const b = scene?.bands?.grass; return b == null ? null : imgToY(b + .04) + Math.sin(x / 70) * 6; };
  const plateTex = name => plates[name] || plates.day || Object.values(plates)[0];
  const fbo = gl.createFramebuffer();
  const blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  function upload(blades, dabs){
    blades.sort((a, b) => a[1] - b[1]);
    nBlades = blades.length; nDabs = dabs.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(blades.flat()), gl.STATIC_DRAW);
    gl.bindVertexArray(bladeVAO); attrib(0, bladeVerts, 2, 2, 0, 0); attrib(1, bladeBuf, 4, 10, 0, 1); attrib(2, bladeBuf, 3, 10, 4, 1); attrib(3, bladeBuf, 3, 10, 7, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, dabBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dabs.flat()), gl.STATIC_DRAW);
    gl.bindVertexArray(dabVAO); attrib(0, quadVerts, 2, 2, 0, 0); attrib(1, dabBuf, 4, 12, 0, 1); attrib(2, dabBuf, 4, 12, 4, 1); attrib(3, dabBuf, 4, 12, 8, 1);
  }

  // grass and wildflowers below topFn(x, H); topFn may return null where nothing grows
  function buildGrass(topFn){
    const R = rng(3), blades = [], dabs = [];
    let band = 0; for (let i = 0; i < 64; i++){ const t = topFn((i + .5) / 64 * W, H); band += t == null ? 0 : Math.max(0, H - t); }
    const count = Math.round(W * band / 64 / 24);
    for (let i = 0; i < count; i++){
      const x = R() * W, top = topFn(x, H);
      if (top == null || top >= H) continue;
      const y = top + R() ** .8 * (H - top + 6), depth = (y - top) / (H - top + 1);
      const c = mixC([30, 54, 28], [132, 160, 72], Math.min(1, R() * .8 + (1 - depth) * .2)).map(v => v / 255);
      blades.push([x, y, 7 + depth * 34 * (.6 + R() * .7), (R() - .5) * .45 + Math.sin(x / 90) * .1, R() * 6.28, .6 + R() * .7, 1 + depth * 2.2 * (.4 + R() * .6), ...c]);
    }
    // wildflowers: a stem plus a small stack of dabs that sway with it
    const FLOWERS = [[157, 134, 214], [199, 111, 176], [232, 195, 74], [242, 238, 224], [110, 127, 216], [226, 140, 90]];
    for (let i = 0; i < W / 10 * Math.min(1, band / 64 / (H * .21)); i++){
      const x = R() * W, top = topFn(x, H);
      if (top == null || top >= H) continue;
      const y = top + 6 + R() ** .9 * (H - top), depth = (y - top) / (H - top + 1);
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
    const isPlate = scene?.kind === 'plates';
    const mask = scene?.kind === 'mask' ? maskTexture() : null;
    if (mask){
      const f = P.fieldMask; common(f);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mask); gl.uniform1i(f.u('uMask'), 1);
      const cells = new Float32Array(26); cells.set([120, 24]);
      (scene.palette || []).slice(0, 12).forEach((e, i) => cells.set(e.cell || [40, 10], (i + 1) * 2));
      gl.uniform2fv(f.u('uCell'), cells);
      gl.bindVertexArray(empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteTexture(mask); gl.activeTexture(gl.TEXTURE0);
    } else {
      common(P.field); gl.bindVertexArray(empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    buildGrass(isPlate ? plateGrass : mask ? (x, h) => scene.grass?.(x, h, W) ?? null : meaY);
    palette = paletteUniforms(mask ? scene.palette : null);
    if (isPlate) palette.kind = 2;
  }

  // the scene's material mask, drawn in CSS pixels and cleaned so every pixel holds exactly one material
  function maskTexture(){
    const w = Math.max(1, Math.round(W)), h = Math.max(1, Math.round(H));
    const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h;
    const c2 = cv2.getContext('2d', {willReadFrequently: true});
    c2.fillStyle = '#000'; c2.fillRect(0, 0, w, h);
    try{ scene.drawMask(c2, w, h); }catch(e){ console.warn('Dayscape: scene mask failed', e); }
    const img = c2.getImageData(0, 0, w, h), d = img.data;
    // antialiased edges blend two materials into a third; give such pixels their left or upper neighbour's material
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const i = (y * w + x) * 4, r = d[i], q = Math.round(r / 16);
      if (Math.abs(r - q * 16) > 1 || q > 12) d[i] = x ? d[i - 4] : y ? d[i - w * 4] : 0;
      else d[i] = q * 16;
      d[i + 1] = d[i + 1] > 127 ? 255 : 0; d[i + 2] = d[i + 2] > 127 ? 255 : 0; d[i + 3] = 255;
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function paletteUniforms(pal){
    const day = new Float32Array(39), night = new Float32Array(39), glow = new Float32Array(13);
    (pal || []).slice(0, 12).forEach((e, i) => { day.set(e.day.map(v => v / 255), (i + 1) * 3); night.set((e.night || e.day).map(v => v / 255), (i + 1) * 3); glow[i + 1] = e.glow ? 1 : 0; });
    return {day, night, glow, kind: pal ? 1 : 0};
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

  function draw(dt){
    if (!fieldTex) return;
    gl.viewport(0, 0, cw, ch);
    gl.disable(gl.BLEND);
    {
    const m = P.main; common(m);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldTex); gl.uniform1i(m.u('uField'), 0);
    gl.uniform3fv(m.u('uS1'), sky.s1.map(v => v / 255)); gl.uniform3fv(m.u('uS2'), sky.s2.map(v => v / 255)); gl.uniform3fv(m.u('uS3'), sky.s3.map(v => v / 255));
    gl.uniform3fv(m.u('uSun'), sky.sun); gl.uniform3fv(m.u('uMoon'), sky.moon);
    gl.uniform1f(m.u('uNight'), sky.night); gl.uniform1f(m.u('uDay'), sky.day);
    gl.uniform1f(m.u('uCover'), live.cover); gl.uniform1f(m.u('uDrift'), live.drift); gl.uniform1f(m.u('uT'), live.rt);
    gl.uniform1f(m.u('uKind'), palette.kind); gl.uniform1f(m.u('uWave'), live.wind);
    if (palette.kind === 2){
      const A = plateTex('day'), B = plateTex('night') || A;
      if (A) plateFade = Math.min(1, plateFade + (dt ? dt / .8 : 1));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A || blank); gl.uniform1i(m.u('uPlA'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, B || blank); gl.uniform1i(m.u('uPlB'), 2);
      gl.activeTexture(gl.TEXTURE0);
      const b = scene.bands || {};
      gl.uniform4f(m.u('uBand'), b.sky ?? .25, b.water?.[0] ?? 2, b.water?.[1] ?? 2, b.grass ?? 2);
      gl.uniform1f(m.u('uImgAspect'), scene.aspect || 16 / 9); gl.uniform1f(m.u('uPlFade'), A ? plateFade : 0);
      // warm light in the hours around sunrise and sunset
      gl.uniform1f(m.u('uWarm'), Math.max(0, 1 - Math.abs(sky.day - .45) / .45) * (1 - sky.night));
    } else if (palette.kind){ gl.uniform3fv(m.u('uPDay'), palette.day); gl.uniform3fv(m.u('uPNight'), palette.night); gl.uniform1fv(m.u('uGlow'), palette.glow); }
    gl.bindVertexArray(empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

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
    setScene(s){ scene = s; if (s?.kind === 'plates') loadPlates(s); bake(); },
    resize,
    /** Advance by dt seconds (0 = still) and paint one frame. */
    frame(dt){ step(dt, dt === 0); draw(dt); },
  };
}
