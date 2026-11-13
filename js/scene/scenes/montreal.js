// Montreal as a postcard from the south shore: every landmark gathered in the open middle-right of the screen.
// Mount Royal with Saint Joseph's Oratory, the downtown towers, Habitat 67 on the water, the leaning Olympic tower,
// the Jacques Cartier Bridge landing beside the Biosphere, and the flags of Canada, Quebec and Montreal on the near bank.
import { rng } from '../engine.js';

const M = {mountain: 1, sphere: 2, glass: 3, stone: 4, dark: 5, copper: 6, concrete: 7, brick: 8, river: 9, steel: 10, bank: 11, trees: 12};

const palette = [
  {day: [62, 94, 54], night: [27, 35, 38], cell: [40, 12]},                     // 1 Mount Royal, wooded
  {day: [196, 210, 220], night: [86, 112, 150], cell: [5, 5], glow: true},       // 2 the Biosphere's skin, lit at night
  {day: [132, 154, 172], night: [42, 48, 70], cell: [8, 24]},                    // 3 blue-grey glass
  {day: [198, 184, 162], night: [62, 60, 74], cell: [9, 26]},                    // 4 pale stone
  {day: [66, 76, 92], night: [26, 28, 42], cell: [8, 24]},                       // 5 dark glass
  {day: [104, 162, 142], night: [38, 60, 62], cell: [7, 9]},                     // 6 copper roofs and domes
  {day: [216, 212, 202], night: [72, 74, 90], cell: [10, 18]},                   // 7 concrete (Olympic site, Habitat 67, piers)
  {day: [150, 110, 90], night: [46, 40, 50], cell: [14, 10]},                    // 8 low city, brick
  {day: [72, 100, 120], night: [24, 30, 50], cell: [80, 5]},                     // 9 the St. Lawrence
  {day: [82, 130, 104], night: [70, 112, 104], cell: [5, 12]},                   // 10 bridge steel
  {day: [88, 120, 60], night: [25, 35, 29], cell: [50, 12]},                     // 11 near bank and island
  {day: [46, 76, 46], night: [17, 25, 23], cell: [16, 14]},                      // 12 trees
];

const RIVER = .62;
const shoreY = (x, W, H) => H * (.835 + .018 * Math.sin(x / W * 6.3 + .8) + .01 * Math.sin(x / W * 17.1));
// a broad, low, rounded mountain rising behind the towers
const ridge = (x, W, H) => H * (.605 - .175 * Math.exp(-((x / W - .54) ** 2) / .05) - .008 * Math.sin(x / W * 23));
// the bridge's M-shaped top chord: [x, height above the deck]
const CHORD = [[.755, 0], [.79, .078], [.865, .032], [.94, .078], [.975, 0]];
const chordAt = x => {
  for (let i = 1; i < CHORD.length; i++){
    const [x0, h0] = CHORD[i - 1], [x1, h1] = CHORD[i];
    if (x <= x1) return h0 + (h1 - h0) * Math.max(0, (x - x0) / (x1 - x0));
  }
  return 0;
};
export const FLAGS = [{x: .5, kind: 'canada'}, {x: .565, kind: 'quebec'}, {x: .63, kind: 'montreal'}];

function drawMask(c, W, H){
  const fill = (m, g = 0, b = 0) => { c.fillStyle = `rgb(${m * 16},${g},${b})`; };
  const X = f => f * W, Y = f => f * H;
  const R = rng(514);

  // Mount Royal
  fill(M.mountain);
  c.beginPath(); c.moveTo(X(.2), Y(RIVER));
  for (let x = X(.2); x <= X(.9); x += 4) c.lineTo(x, ridge(x, W, H));
  c.lineTo(X(.9), Y(RIVER)); c.closePath(); c.fill();

  // Saint Joseph's Oratory on the mountain's western flank: a stone body, a drum and a green copper dome
  const ox = .4, oy = ridge(X(ox), W, H) + Y(.02);
  fill(M.stone); c.fillRect(X(ox - .02), oy - Y(.022), X(.04), Y(.03));
  c.fillRect(X(ox - .008), oy - Y(.046), X(.016), Y(.026));
  fill(M.copper);
  c.beginPath(); c.ellipse(X(ox), oy - Y(.046), X(.0095), Y(.03), 0, Math.PI, 2 * Math.PI); c.fill();
  c.fillRect(X(ox) - 1.5, oy - Y(.086), 3, Y(.012));

  // towers: [centre, width, top, material]; back row first, landmarks in front
  const tower = (x, w, t, m, lit = .8) => {
    const l = X(x - w / 2), r = X(x + w / 2), tp = Y(t);
    fill(m); c.fillRect(l, tp, r - l, Y(RIVER) - tp);
    fill(m, 255);
    for (let y = tp + 6; y < Y(.58); y += 8) for (let xx = l + 3; xx < r - 4; xx += 6) if (R() < lit) c.fillRect(xx, y, 3, 4);
  };
  [[.505, .024, .41, M.stone], [.518, .025, .345, M.glass], [.6, .025, .29, M.stone], [.638, .024, .31, M.dark], [.675, .025, .3, M.stone], [.712, .024, .35, M.glass], [.556, .022, .32, M.stone]]
    .forEach(([x, w, t, m]) => tower(x, w, t, m, .6));
  tower(.54, .027, .25, M.dark);                     // CIBC
  // Place Ville Marie: a cross in plan, so a stepped silhouette
  tower(.576, .062, .225, M.glass); tower(.576, .036, .215, M.glass);
  // 1000 de La Gauchetiere and its copper pyramid, the tallest
  tower(.618, .034, .175, M.stone);
  fill(M.copper); c.beginPath(); c.moveTo(X(.601), Y(.176)); c.lineTo(X(.618), Y(.13)); c.lineTo(X(.635), Y(.176)); c.closePath(); c.fill();
  // 1250 Rene-Levesque, chamfered at the top
  tower(.657, .036, .165, M.glass);
  fill(0); c.beginPath(); c.moveTo(X(.639), Y(.164)); c.lineTo(X(.65), Y(.164)); c.lineTo(X(.639), Y(.18)); c.closePath(); c.fill();
  tower(.694, .03, .225, M.dark);                    // Tour de la Bourse

  // the Olympic Stadium's leaning tower
  fill(M.concrete);
  c.beginPath(); c.moveTo(X(.742), Y(.605)); c.bezierCurveTo(X(.756), Y(.49), X(.772), Y(.38), X(.79), Y(.29));
  c.lineTo(X(.806), Y(.298)); c.bezierCurveTo(X(.794), Y(.4), X(.78), Y(.51), X(.772), Y(.605)); c.closePath(); c.fill();
  fill(M.concrete, 255);
  c.beginPath(); c.moveTo(X(.785), Y(.28)); c.lineTo(X(.811), Y(.289)); c.lineTo(X(.806), Y(.316)); c.lineTo(X(.782), Y(.306)); c.closePath(); c.fill();

  // the low city along the shore, from Old Montreal eastwards
  for (let x = X(.36); x < W; ){
    const w = W * (.01 + R() * .018), t = Y(.54 + R() * .055);
    fill(M.brick); c.fillRect(x, t, w + 1, Y(RIVER) - t);
    fill(M.brick, 255);
    for (let y = t + 4; y < Y(RIVER) - 4; y += 7) for (let xx = x + 2; xx < x + w - 3; xx += 6) if (R() < .45) c.fillRect(xx, y, 3, 3);
    x += w;
  }
  // the stadium's shell
  fill(M.concrete);
  c.beginPath(); c.ellipse(X(.79), Y(.613), X(.065), Y(.05), 0, Math.PI, 2 * Math.PI); c.fill();
  fill(M.dark); c.beginPath(); c.ellipse(X(.79), Y(.603), X(.034), Y(.018), 0, Math.PI, 2 * Math.PI); c.fill();

  // the St. Lawrence
  fill(M.river, 0, 255); c.fillRect(0, Y(RIVER), W, H - Y(RIVER));

  // Habitat 67: stacked concrete boxes on the water's edge
  // (boxes stagger and leave gaps, so the river and city show between them)
  const hb = Y(.64), bw = X(.017), bh = Y(.026);
  [[0, .29, 7, 1.25], [1, .3, 6, 1.25], [2, .312, 4, 1.4], [3, .325, 2, 1.6]].forEach(([row, x0, n, gap]) => {
    for (let i = 0; i < n; i++){
      const x = X(x0) + i * bw * gap + (row % 2) * bw * .4, y = hb - (row + 1) * bh * 1.02;
      fill(M.concrete); c.fillRect(x, y, bw, bh);
      fill(M.concrete, 255); c.fillRect(x + bw * .25, y + bh * .4, bw * .5, bh * .25);
    }
  });
  fill(M.concrete); c.fillRect(X(.285), hb, X(.15), Y(.007));

  // Île Sainte-Hélène, where the bridge lands, with the Biosphere's geodesic sphere
  fill(M.bank); c.beginPath(); c.moveTo(X(.83), Y(.705));
  for (let x = .83; x <= 1.01; x += .01) c.lineTo(X(x), Y(.69 - .008 * Math.sin(x * 40)));
  c.lineTo(X(1.01), Y(.72)); c.lineTo(X(.83), Y(.72)); c.closePath(); c.fill();
  const sx = X(.915), sy = Y(.638), sr = W * .042;
  fill(M.sphere, 255);
  c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgb(${M.dark * 16},0,0)`; c.lineWidth = Math.max(1.4, W * .0011);
  c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.clip();
  for (let k = -5; k <= 5; k++){
    const a = k / 6;                                 // latitude bands
    c.beginPath(); c.ellipse(sx, sy + a * sr, Math.sqrt(1 - a * a) * sr, sr * .05, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(sx + a * sr, sy, sr * Math.abs(Math.cos(Math.asin(a))) * .14 + 1, sr, 0, 0, Math.PI * 2); c.stroke();
  }
  for (let k = -8; k <= 8; k++){ c.beginPath(); c.moveTo(sx + k * sr / 4 - sr, sy - sr); c.lineTo(sx + k * sr / 4 + sr, sy + sr); c.stroke(); }
  c.restore();
  c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.stroke();
  fill(M.trees);
  for (let i = 0; i < 9; i++){ const x = X(.84 + R() * .16), r = W * (.008 + R() * .012); c.beginPath(); c.arc(x, Y(.69) - r * .4, r, 0, Math.PI * 2); c.fill(); }

  // the Jacques Cartier Bridge: deck, piers and the M-shaped cantilever truss
  const deck = x => Y(.69 - (x - .7) * .08);
  fill(M.concrete);
  for (const px of [.735, .8, .935, .99]) c.fillRect(X(px) - 3, deck(px), 7, Y(.72) - deck(px));
  fill(M.steel);
  c.beginPath(); c.moveTo(X(.69), deck(.69)); c.lineTo(X(1.02), deck(1.02)); c.lineTo(X(1.02), deck(1.02) + Y(.011)); c.lineTo(X(.69), deck(.69) + Y(.011)); c.closePath(); c.fill();
  const chord = CHORD.map(([x, h]) => [X(x), deck(x) - Y(h)]);
  c.strokeStyle = `rgb(${M.steel * 16},0,0)`; c.lineCap = 'round';
  c.lineWidth = Math.max(3, W * .0026);
  c.beginPath(); chord.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  c.lineWidth = Math.max(1.6, W * .0013);
  for (let x = .76; x < .975; x += .011){
    c.beginPath(); c.moveTo(X(x), deck(x)); c.lineTo(X(x + .0055), deck(x + .0055) - Y(chordAt(x + .0055))); c.lineTo(X(x + .011), deck(x + .011)); c.stroke();
  }
  fill(M.steel, 255);                                // deck lamps
  for (let x = .695; x < 1; x += .009) c.fillRect(X(x), deck(x) - 3, 3, 3);
  for (const [x, y] of chord) c.fillRect(x - 2, y - 2, 5, 5);

  // trees on the near bank, then the bank itself
  fill(M.trees);
  for (const [x0, x1] of [[-.02, .2], [.99, 1.04]]) for (let i = 0; i < (x0 < 0 ? 24 : 6); i++){
    const x = X(x0 + R() * (x1 - x0)), r = W * (.018 + R() * .028), y = shoreY(x, W, H) - r * (.6 + R() * 1.1);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  fill(M.bank);
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, shoreY(x, W, H));
  c.lineTo(W, H); c.closePath(); c.fill();
}

// ----- the three flags, drawn crisp over the painting and waving in the wind -----
function leaf(c, x, y, s){
  // the 11-point maple leaf, unit coordinates, centred, y down
  const p = [[0,-1],[.13,-.74],[.3,-.82],[.25,-.4],[.55,-.62],[.48,-.44],[.84,-.5],[.72,-.3],[.9,-.2],[.46,.12],[.52,.3],[.06,.22],[.05,.62]];
  c.beginPath();
  p.forEach(([a, b], i) => i ? c.lineTo(x + a * s, y + b * s) : c.moveTo(x + a * s, y + b * s));
  for (let i = p.length - 1; i >= 0; i--) c.lineTo(x - p[i][0] * s, y + p[i][1] * s);
  c.closePath(); c.fill();
}
function fleur(c, x, y, s){
  c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s * .42, y - s * .3, x, y + s * .25); c.quadraticCurveTo(x - s * .42, y - s * .3, x, y - s); c.fill();
  for (const d of [-1, 1]){
    c.beginPath(); c.moveTo(x + d * s * .12, y + s * .1);
    c.quadraticCurveTo(x + d * s * .95, y - s * .55, x + d * s * .6, y + s * .05);
    c.quadraticCurveTo(x + d * s * .45, y + s * .3, x + d * s * .12, y + s * .3); c.fill();
  }
  c.fillRect(x - s * .5, y + s * .2, s, s * .16);
  c.beginPath(); c.moveTo(x - s * .14, y + s * .36); c.lineTo(x, y + s * .8); c.lineTo(x + s * .14, y + s * .36); c.fill();
}
function paintFlag(c, kind, w, h){
  if (kind === 'canada'){
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d52b1e'; c.fillRect(0, 0, w / 4, h); c.fillRect(w * .75, 0, w / 4, h);
    leaf(c, w / 2, h * .5, h * .4);
  } else if (kind === 'quebec'){
    c.fillStyle = '#003da5'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.fillRect(w / 2 - h / 12, 0, h / 6, h); c.fillRect(0, h / 2 - h / 12, w, h / 6);
    for (const [fx, fy] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) fleur(c, w * fx, h * fy - h * .03, h * .16);
  } else {
    // Montreal: a red cross on white, with the fleur-de-lis, rose, thistle and shamrock, and the white pine at the centre
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d0202e'; c.fillRect(w / 2 - h * .07, 0, h * .14, h); c.fillRect(0, h / 2 - h * .07, w, h * .14);
    const s = h * .13;
    c.fillStyle = '#1b4fa0'; fleur(c, w * .25, h * .24, s);
    c.fillStyle = '#d0202e'; for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; c.beginPath(); c.arc(w * .75 + Math.cos(a) * s * .45, h * .25 + Math.sin(a) * s * .45, s * .42, 0, 7); c.fill(); }
    c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(w * .75, h * .25, s * .25, 0, 7); c.fill();
    c.fillStyle = '#3c8a3c'; c.fillRect(w * .25 - 1, h * .75, 2, s * .9);
    c.fillStyle = '#8a4fa8'; c.beginPath(); c.ellipse(w * .25, h * .72, s * .38, s * .5, 0, 0, 7); c.fill();
    c.fillStyle = '#3c8a3c'; for (let i = 0; i < 3; i++){ const a = -Math.PI / 2 + i / 3 * Math.PI * 2; c.beginPath(); c.arc(w * .75 + Math.cos(a) * s * .38, h * .74 + Math.sin(a) * s * .38, s * .36, 0, 7); c.fill(); }
    c.fillStyle = '#d0202e'; c.beginPath(); c.arc(w / 2, h / 2, h * .15, 0, 7); c.fill();
    c.fillStyle = '#2f7a3a'; c.beginPath(); c.moveTo(w / 2, h * .38); c.lineTo(w / 2 + h * .09, h * .58); c.lineTo(w / 2 - h * .09, h * .58); c.closePath(); c.fill();
  }
}
const flagCache = new Map();
function overlay(c, W, H, t, {night = 0, wind = .3} = {}){
  const fw = Math.max(40, W * .05), fh = fw / 2;
  for (const f of FLAGS){
    const px = W * f.x, base = shoreY(px, W, H) + 2, top = H * .47;
    const k = f.kind + fw;
    let img = flagCache.get(k);
    if (!img){
      img = document.createElement('canvas'); img.width = Math.ceil(fw * 2); img.height = Math.ceil(fh * 2);
      const g = img.getContext('2d'); g.scale(2, 2); paintFlag(g, f.kind, fw, fh);
      flagCache.set(k, img);
    }
    // pole
    c.fillStyle = night > .5 ? '#5d6670' : '#cfd5da';
    c.fillRect(px - 1.5, top - 4, 3, base - top + 4);
    c.beginPath(); c.arc(px, top - 5, 3, 0, 7); c.fill();
    // the cloth in vertical strips, each lifted by a travelling wave and shaded by its slope
    const n = 24, sw = fw / n, amp = fh * (.05 + wind * .12), sp = 3 + wind * 5;
    for (let i = 0; i < n; i++){
      const u = i / n, ph = u * 7 - t * sp + f.x * 40;
      const dy = Math.sin(ph) * amp * u, shade = Math.cos(ph) * .22 * Math.min(1, u * 3);
      const sx = (i / n) * img.width;
      c.drawImage(img, sx, 0, img.width / n + 1, img.height, px + 1.5 + i * sw * (.97 + .03 * Math.cos(ph)), top + dy, sw + .6, fh);
      if (shade){ c.fillStyle = shade > 0 ? `rgba(255,255,255,${shade * .5})` : `rgba(0,0,20,${-shade})`; c.fillRect(px + 1.5 + i * sw * (.97 + .03 * Math.cos(ph)), top + dy, sw + .6, fh); }
    }
  }
  if (night > .02){
    // dusk and night: dim the cloth like the painting around it, with a little floodlight
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(14,18,40,${Math.min(.62, night * .62)})`; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }
}

export default {
  id: 'montreal', name: 'Montreal', kind: 'mask',
  place: {name: 'Montreal', cc: 'ca', tz: 'America/Toronto', lat: 45.5017, lon: -73.5673},
  palette, drawMask, overlay,
  grass: (x, H, W) => shoreY(x, W, H) + 5,
};
