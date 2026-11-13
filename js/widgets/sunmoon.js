// Sunrise, sunset and day length for the displayed date, and the moon's phase drawn as a disc.
import { esc } from '../util.js';
import { localParts, fmtTime } from '../time.js';
import { sunTimes, moonPhase } from '../astro.js';
import { placeOf } from './clock.js';

/** An SVG moon: the lit part is a half disc plus an ellipse for the terminator. Southern skies see it mirrored. */
export function moonSvg(age, south = false){
  const r = 40, c = 50, k = Math.cos(2 * Math.PI * age), rx = Math.abs(k) * r, waxing = age < .5;
  const limb = waxing ? 1 : 0, term = (k > 0) === waxing ? 0 : 1;
  const lit = Math.abs(age - .5) > .485 ? '' : `<path class="lit" d="M${c} ${c - r}A${r} ${r} 0 0 ${limb} ${c} ${c + r}A${rx.toFixed(2)} ${r} 0 0 ${term} ${c} ${c - r}z"/>`;
  return `<svg class="moon" viewBox="0 0 100 100" aria-hidden="true"><g${south ? ' transform="matrix(-1 0 0 1 100 0)"' : ''}><circle class="dark" cx="${c}" cy="${c}" r="${r}"/>${Math.abs(age - .5) < .015 ? `<circle class="lit" cx="${c}" cy="${c}" r="${r}"/>` : lit}</g><circle class="rim" cx="${c}" cy="${c}" r="${r}"/></svg>`;
}

export default {
  type: 'sunmoon', name: 'Sun and moon', description: 'Sunrise, sunset, day length and tonight’s moon.',
  multi: true, size: {w: 6, h: 4}, min: {w: 4, h: 3},
  defaults: {place: ''},
  fields: [{key: 'place', label: 'Place', kind: 'place'}],
  mount(el, w, ctx){
    el.classList.add('sunmoon');
    let shown = '', alive = true;
    const place = () => placeOf(ctx, ctx.opts(w).place);
    function update(T){
      const p = place();
      if (!Number.isFinite(p.lat)){
        if (shown !== 'locating'){ shown = 'locating'; el.innerHTML = '<p class="w-empty">Finding this place on the map…</p>'; }
        return;
      }
      const lp = localParts(p.tz, T), key = [p.id, lp.y, lp.mo, lp.d, lp.h, ctx.state.h12].join();
      if (key === shown) return;
      shown = key;
      const s = sunTimes(Date.UTC(lp.y, lp.mo - 1, lp.d), p.lat, p.lon), m = moonPhase(T);
      const t = ms => esc(fmtTime(ms, p.tz, ctx.state.h12));
      const len = `${Math.floor(s.dayLength / 60)}h ${s.dayLength % 60}m`;
      const sun = s.sunrise == null
        ? `<div class="sm-polar">${s.dayLength ? 'The sun doesn’t set today.' : 'The sun doesn’t rise today.'}</div>`
        : `<div class="sm-row"><span class="mono">Sunrise</span><b>${t(s.sunrise)}</b></div><div class="sm-row"><span class="mono">Sunset</span><b>${t(s.sunset)}</b></div>`;
      el.innerHTML = `<div class="sm-sun">${sun}<div class="sm-row"><span class="mono">Daylight</span><b>${len}</b></div></div>
        <div class="sm-moon">${moonSvg(m.age, p.lat < 0)}<div class="sm-name">${esc(m.name)}</div><div class="mono sm-lit">${Math.round(m.fraction * 100)}% lit</div></div>`;
    }
    // places without coordinates are looked up once (the weather service geocodes and keeps them)
    if (!Number.isFinite(place().lat)) ctx.weather.get(place()).then(() => { if (alive){ ctx.save(); shown = ''; update(ctx.clock.getT()); } });
    update(ctx.clock.getT());
    return {update, destroy(){ alive = false; }};
  },
};
