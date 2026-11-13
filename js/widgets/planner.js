// Meeting planner: today's best times for everyone, in home time, with each place's own clock.
import { esc } from '../util.js';
import { localParts, tzOffset, fmtTime, MIN } from '../time.js';
import { overlap } from '../planner.js';
import { chosenPlaces } from './worldclocks.js';

const hours = Array.from({length: 25}, (_, h) => ({value: h, label: String(h).padStart(2, '0') + ':00'}));

export default {
  type: 'planner', name: 'Meeting planner', description: 'The best times today when your places are all at work.',
  multi: true, size: {w: 8, h: 5}, min: {w: 5, h: 4},
  defaults: {places: [], from: 9, to: 18},
  fields: [
    {key: 'places', label: 'Places', kind: 'places'},
    {key: 'from', label: 'Working day starts', kind: 'select', options: hours.slice(0, 24)},
    {key: 'to', label: 'Working day ends', kind: 'select', options: hours.slice(1)},
  ],
  mount(el, w, ctx){
    el.classList.add('plannerw');
    let shown = '';
    function update(T){
      const o = ctx.opts(w), list = chosenPlaces(ctx, o.places, true), home = ctx.places.home(), h12 = ctx.state.h12;
      const lp = localParts(home.tz, T), key = [lp.y, lp.mo, lp.d, o.from, o.to, h12, list.map(p => p.id).join()].join('|');
      if (key === shown) return;
      shown = key;
      if (list.length < 2){ el.innerHTML = '<p class="w-empty">Pick at least two places in this widget’s settings.</p>'; return; }
      const from = +o.from, to = +o.to;
      if (!(to > from)){ el.innerHTML = '<p class="w-empty">The working day must end after it starts.</p>'; return; }
      const dayStart = Date.UTC(lp.y, lp.mo - 1, lp.d) - tzOffset(home.tz, T) * MIN;
      const slots = overlap(list, dayStart, {from, to});
      const all = slots.filter(s => s.score === list.length).slice(0, 3);
      const show = all.length ? all : slots.slice(0, 1);
      const row = s => `<li class="pl-slot"><div class="pl-when"><b>${esc(fmtTime(s.start, home.tz, h12))}–${esc(fmtTime(s.end, home.tz, h12))}</b>
          <span class="mono">${esc(home.name)}${all.length ? '' : ` · ${s.score} of ${list.length} at work`}</span></div>
          <ul class="pl-locals">${list.filter(p => p.id !== home.id).map(p => `<li><span>${esc(p.name)}</span><span class="mono">${esc(fmtTime(s.start, p.tz, h12))}–${esc(fmtTime(s.end, p.tz, h12))}</span></li>`).join('')}</ul></li>`;
      el.innerHTML = (all.length ? '' : `<p class="pl-note">${slots.length ? 'No time works for everyone today. Best partial overlap:' : 'Nobody is at work during these hours today.'}</p>`) +
        `<ul class="pl-slots">${show.map(row).join('')}</ul>`;
    }
    update(ctx.clock.getT());
    return {update};
  },
};
