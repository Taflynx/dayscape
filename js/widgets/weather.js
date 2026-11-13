// Weather for one place: now, the next eight hours and five days. Follows the displayed time when scrubbed.
import { esc } from '../util.js';
import { localParts, MIN } from '../time.js';
import { WX, fmtTemp, fmtWind } from '../weather.js';
import { placeOf } from './clock.js';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A small line icon for a weather code; night swaps the sun for a moon. */
export function wxIcon(code, night = false){
  const [, kind] = WX(code);
  const sun = night ? '<path d="M15 4a6 6 0 1 0 5 9 7 7 0 0 1-5-9z"/>' : '<circle cx="12" cy="11" r="4"/><path d="M12 2v2M12 18v2M3 11h2M19 11h2M5.6 4.6l1.4 1.4M17 16l1.4 1.4M5.6 17.4 7 16M17 6l1.4-1.4"/>';
  const cloud = '<path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 7 18z"/>';
  const body =
    code <= 1 ? sun :
    code === 2 ? `<g transform="translate(-3 -3) scale(.8)">${sun}</g>${cloud}` :
    kind === 'fog' ? '<path d="M4 9h16M3 13h18M5 17h14"/>' :
    kind === 'snow' ? `${cloud}<path d="M9 21h.01M12 22h.01M15 21h.01"/>` :
    kind === 'storm' ? `${cloud}<path d="m12 15-2 4h3l-2 4"/>` :
    kind === 'rain' ? `${cloud}<path d="m9 20-1 2M13 20l-1 2M17 20l-1 2"/>` : cloud;
  return `<svg class="wx-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export default {
  type: 'weather', name: 'Weather', description: 'Conditions now, the next hours and the week ahead.',
  multi: true, size: {w: 8, h: 5}, min: {w: 5, h: 3},
  defaults: {place: ''},
  fields: [{key: 'place', label: 'Place', kind: 'place'}],
  mount(el, w, ctx){
    el.classList.add('wxw');
    el.innerHTML = '<p class="w-empty">Loading the forecast…</p>';
    let fc, failed = false, shown = '', alive = true;
    const place = () => placeOf(ctx, ctx.opts(w).place);

    async function load(){
      const p = place(), had = Number.isFinite(p.lat);
      const timeout = new Promise(r => setTimeout(() => r(undefined), 15000));
      const got = await Promise.race([ctx.weather.get(p), timeout]);
      if (!alive) return;
      if (!had && Number.isFinite(p.lat)) ctx.save();
      if (got){ fc = got; failed = false; } else if (!fc) failed = true;
      shown = ''; update(ctx.clock.getT());
    }

    function update(T){
      if (failed && !fc){
        if (shown !== 'x'){ shown = 'x'; el.innerHTML = '<p class="w-empty">Weather is unavailable right now.</p>'; }
        return;
      }
      if (!fc) return;
      const p = place(), live = ctx.clock.isLive();
      const key = Math.floor(T / (10 * MIN)) + '|' + live + p.id;
      if (key === shown) return;
      shown = key;
      const n = live ? ctx.weather.current(fc) : ctx.weather.at(fc, T);
      if (!n){ el.innerHTML = '<p class="w-empty">No forecast that far out.</p>'; return; }
      const lp = localParts(p.tz, T), night = lp.h < 6 || lp.h >= 18;
      // the next eight hours from the displayed time
      const h0 = Math.ceil(T / 3600e3) * 3600e3;
      const hours = Array.from({length: 8}, (_, i) => h0 + i * 3600e3).map(t => {
        const a = ctx.weather.at(fc, t), hh = localParts(p.tz, t).h;
        return `<li><span class="mono">${ctx.state.h12 ? ((hh % 12) || 12) + (hh < 12 ? 'a' : 'p') : String(hh).padStart(2, '0')}</span>${wxIcon(a.code, hh < 6 || hh >= 18)}<b>${esc(fmtTemp(a.temp, p).replace(/°[CF]/, '°'))}</b></li>`;
      }).join('');
      // five days starting today (in the place's own calendar)
      // daily.t marks each day's start in UTC; the day itself is the forecast's calendar date
      const ymd = q => q.y * 1e4 + q.mo * 100 + q.d, today = ymd(lp);
      const deg = c => esc(fmtTemp(c, p).replace(/°[CF]/, '°'));
      const days = fc.daily.t.map((t, i) => {
        const u = new Date(t + 12 * 3600e3);
        return {i, key: u.getUTCFullYear() * 1e4 + (u.getUTCMonth() + 1) * 100 + u.getUTCDate(), wd: u.getUTCDay()};
      }).filter(d => d.key >= today).slice(0, 5).map(({i, key, wd}) =>
        `<li><span class="mono">${key === today ? 'Today' : WD[wd]}</span>${wxIcon(fc.daily.code[i])}<span><b>${deg(fc.daily.hi[i])}</b> ${deg(fc.daily.lo[i])}</span></li>`).join('');
      el.innerHTML = `<div class="wx-now">${wxIcon(n.code, night)}<div class="wx-temp display">${esc(fmtTemp(n.temp, p))}</div>
          <div class="wx-desc"><b>${esc(ctx.weather.label(n.code))}</b><span class="mono">${esc(p.name)} · Wind ${esc(fmtWind(n.wind, p))}</span></div></div>
        <ul class="wx-hours">${hours}</ul><ul class="wx-days">${days}</ul>`;
    }

    load();
    const iv = setInterval(load, 15 * 60e3);
    return {update, destroy(){ alive = false; clearInterval(iv); }};
  },
};
