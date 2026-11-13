// When can everyone meet? Pure.
import { localParts } from './time.js';

const STEP = 15 * 60e3;

/**
 * Scans the 24 hours from dayStartMs in 15-minute steps and returns runs of equal coverage,
 * best first (most places inside working hours), then earliest. Runs where nobody works are left out.
 */
export function overlap(places, dayStartMs, {from = 9, to = 18} = {}){
  const start = Math.ceil(dayStartMs / STEP) * STEP, lo = from * 60, hi = to * 60;
  const score = t => places.reduce((n, p) => { const q = localParts(p.tz, t), m = q.h * 60 + q.mi; return n + (m >= lo && m < hi ? 1 : 0); }, 0);
  const runs = [];
  let cur = null;
  for (let t = start; t < start + 864e5; t += STEP){
    const s = score(t);
    if (cur && cur.score === s){ cur.end = t + STEP; continue; }
    if (cur && cur.score > 0) runs.push(cur);
    cur = {start: t, end: t + STEP, score: s};
  }
  if (cur && cur.score > 0) runs.push(cur);
  return runs.sort((a, b) => b.score - a.score || a.start - b.start);
}
