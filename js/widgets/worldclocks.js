import { esc } from '../util.js';
import { localParts, tzOffset, fmtDiff, fmtTime } from '../time.js';

/** The places a place-aware widget shows: its own pick, or every followed place except home. */
export function chosenPlaces(ctx, ids, includeHome = false){
  const all = ctx.places.list(), home = ctx.places.home();
  if (Array.isArray(ids) && ids.length){ const got = ids.map(id => ctx.places.byId(id)).filter(Boolean); if (got.length) return got; }
  return includeHome ? all : all.filter(p => p.id !== home.id);
}

const isDay = h => h >= 6 && h < 18;

function dial(h, mi, s){
  const hr = (h % 12 + mi / 60) * 30, mn = (mi + s / 60) * 6, day = isDay(h);
  return `<svg class="dial${day ? '' : ' night'}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" class="face"/>
    ${Array.from({length: 12}, (_, i) => `<line x1="50" y1="${i % 3 ? 9 : 7}" x2="50" y2="${i % 3 ? 13 : 16}" transform="rotate(${i * 30} 50 50)" class="tick"/>`).join('')}
    <line x1="50" y1="54" x2="50" y2="27" class="hand-h" transform="rotate(${hr} 50 50)"/>
    <line x1="50" y1="56" x2="50" y2="15" class="hand-m" transform="rotate(${mn} 50 50)"/>
    <circle cx="50" cy="50" r="3.2" class="pin"/></svg>`;
}

export default {
  type: 'worldclocks', name: 'World clocks', description: 'Analog or digital clocks for the places you follow.',
  multi: true, size: {w: 10, h: 3}, min: {w: 4, h: 2},
  defaults: {places: [], style: 'analog'},
  fields: [
    {key: 'style', label: 'Style', kind: 'select', options: [{value: 'analog', label: 'Analog'}, {value: 'digital', label: 'Digital'}]},
    {key: 'places', label: 'Places', kind: 'places'},
  ],
  mount(el, w, ctx){
    el.classList.add('wclocks');
    let lastMin = '';
    const update = T => {
      const o = ctx.opts(w), home = ctx.places.home(), list = chosenPlaces(ctx, o.places);
      const key = Math.floor(T / (o.style === 'analog' ? 1000 : 60000)) + '|' + list.map(p => p.id).join() + ctx.state.h12;
      if (key === lastMin) return;
      lastMin = key;
      if (!list.length){ el.innerHTML = '<p class="w-empty">Follow more places in Settings to see their clocks here.</p>'; return; }
      el.innerHTML = `<ul class="wc ${o.style === 'digital' ? 'digital' : 'analog'}">${list.map(p => {
        const {h, mi, s} = localParts(p.tz, T);
        const diff = fmtDiff(tzOffset(p.tz, T) - tzOffset(home.tz, T)) || 'Same time';
        return `<li class="${isDay(h) ? 'day' : 'night'}">${o.style === 'digital' ? `<div class="wc-time display">${esc(fmtTime(T, p.tz, ctx.state.h12))}</div>` : dial(h, mi, s)}
          <div class="wc-name">${esc(p.name)}</div><div class="wc-diff mono">${esc(diff)}</div></li>`;
      }).join('')}</ul>`;
    };
    update(ctx.clock.getT());
    return {update};
  },
};
