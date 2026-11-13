// The painted sky: colours by hour, and where the sun and moon sit. Ported unchanged from Dayline.

// [hour, top, middle, horizon]
export const SKY_KEYS = [
  [0,    '#1C2140', '#2E2F5A', '#4A3F6B'],
  [4.5,  '#22264A', '#3A365F', '#5A4672'],
  [5.75, '#3F3E72', '#7A5E92', '#C7849C'],
  [7,    '#8E86C2', '#E9A2B6', '#F7C59A'],
  [9,    '#A9C4DA', '#CFE0E4', '#F3E6C8'],
  [13,   '#9DBFD8', '#C8DCE4', '#EEF0E2'],
  [16.5, '#B4C3DA', '#E3D3C8', '#F6D8A6'],
  [18.5, '#9C8CC6', '#E59AB0', '#F4A766'],
  [20,   '#4B4378', '#8A6A9C', '#D98C8C'],
  [21.5, '#272A50', '#3A3866', '#5A4A78'],
  [24,   '#1C2140', '#2E2F5A', '#4A3F6B']
];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

/** -> [top, mid, horizon] as rgb arrays */
export function skyAt(hf){
  hf = ((hf % 24) + 24) % 24;
  let i = 0; while (SKY_KEYS[i + 1][0] < hf) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], f = (hf - a[0]) / (b[0] - a[0]);
  return [1, 2, 3].map(k => { const x = hex(a[k]), y = hex(b[k]); return x.map((v, j) => Math.round(v + (y[j] - v) * f)); });
}
export const rgb = c => `rgb(${c.join(',')})`;
export const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export function newSky(){
  return {s1: [28, 33, 64], s2: [46, 47, 90], s3: [74, 63, 107], sun: [0, 0, 0], moon: [0, 0, 0], light: .36, sat: .7, night: 1, day: 0};
}

/** Writes the colours, orbs and light for `hourFrac` (local hours, 0..24) into `sky`. */
export function paintSky(sky, hf, sunVeil = 0){
  const [t, m, h] = skyAt(hf);
  sky.s1 = t; sky.s2 = m; sky.s3 = h;
  // sun travels 6:00 -> 19:00, moon 19:00 -> 6:00, along an arc that dips behind the hills
  const arc = p => [(8 + p * 84) / 100, (76 - Math.sin(Math.PI * Math.min(1, Math.max(0, p))) * 62) / 100, p >= -0.04 && p <= 1.04 ? 1 - sunVeil : 0];
  sky.sun = arc((hf - 6) / 13);
  sky.moon = arc((((hf - 19) % 24) + 24) % 24 / 11);
  sky.light = (hf > 5 && hf < 20) ? Math.max(0.36, Math.min(1, 1.25 * Math.sin(Math.PI * (hf - 5) / 15))) : 0.36;
  sky.sat = 0.55 + sky.light * 0.45;
  sky.night = Math.max(0, Math.min(1, (0.62 - lum(m)) * 3));
  sky.day = Math.max(0, Math.min(1, (lum(m) - 0.25) / 0.45));
  return sky;
}
