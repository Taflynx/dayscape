import { localParts, pad, relLabel } from '../time.js';

export const placeOf = (ctx, id) => (id && ctx.places.byId(id)) || ctx.places.home();

export default {
  type: 'clock', name: 'Clock', description: 'The time, big and clear, at home or any place you follow.',
  multi: true, size: {w: 7, h: 3}, min: {w: 4, h: 2},
  defaults: {seconds: false, place: ''},
  fields: [
    {key: 'place', label: 'Place', kind: 'place'},
    {key: 'seconds', label: 'Show seconds', kind: 'toggle'},
  ],
  mount(el, w, ctx){
    el.classList.add('clockw');
    el.innerHTML = '<div class="clock-time display"></div><div class="clock-sub mono"><span class="clock-place"></span><span class="clock-live"></span></div>';
    const tEl = el.querySelector('.clock-time'), live = el.querySelector('.clock-live');
    const update = T => {
      const o = ctx.opts(w), p = placeOf(ctx, o.place), h12 = ctx.state.h12;
      const {h, mi, s} = localParts(p.tz, T);
      const hh = h12 ? String((h % 12) || 12) : pad(h);
      tEl.innerHTML = `${hh}<span class="blink">:</span>${pad(mi)}${o.seconds ? `<small>:${pad(s)}</small>` : ''}${h12 ? `<small class="ampm">${h < 12 ? 'AM' : 'PM'}</small>` : ''}`;
      el.querySelector('.clock-place').textContent = p.name;
      const lv = ctx.clock.isLive();
      live.textContent = lv ? 'Live' : relLabel(T - Date.now());
      live.classList.toggle('scrub', !lv);
    };
    update(ctx.clock.getT());
    return {update};
  },
};
