// Which painted plate (morning, day, sunset, night) shows at a local hour, and how far it has faded into the next. Pure.

import { sunTimes } from '../astro.js';
import { localParts } from '../time.js';

/** Local sunrise and sunset, in hours, for the day of instant T at the place. NaN when unknown. */
export function sunHours(T, place){
  if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lon)) return {rise: NaN, set: NaN};
  const p = localParts(place.tz, T), st = sunTimes(Date.UTC(p.y, p.mo - 1, p.d), place.lat, place.lon);
  const hrs = ms => { if (ms == null) return NaN; const q = localParts(place.tz, ms); return q.h + q.mi / 60 + q.s / 3600; };
  return {rise: hrs(st.sunrise), set: hrs(st.sunset)};
}

/** h, rise and set are local hours (0-24). Returns {a, b, t}: show `a` faded `t` (0..1) toward `b`. */
export function plateMix(h, rise, set){
  if (!Number.isFinite(rise) || !Number.isFinite(set)){ rise = 6; set = 18; }
  // [start of the fade into this plate, plate]; each fade lasts half an hour
  const marks = [[rise - .75, 'morning'], [rise + 1.25, 'day'], [set - 1.75, 'sunset'], [set + .25, 'night']];
  h = ((h % 24) + 24) % 24;
  let cur = 'night', next = null, t = 0;
  for (const [m, name] of marks){
    if (h >= m + .5) cur = name;
    else if (h >= m){ next = name; t = (h - m) / .5; break; }
    else break;
  }
  return next ? {a: cur, b: next, t: Math.round(t * 1000) / 1000} : {a: cur, b: cur, t: 0};
}
