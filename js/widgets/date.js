import { localParts, isoWeek } from '../time.js';
import { placeOf } from './clock.js';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default {
  type: 'date', name: 'Date', description: 'Today’s weekday, date and week number.',
  multi: false, size: {w: 5, h: 3}, min: {w: 3, h: 2},
  defaults: {place: ''},
  fields: [{key: 'place', label: 'Place', kind: 'place'}],
  mount(el, w, ctx){
    el.classList.add('datew');
    el.innerHTML = '<div class="date-wd mono"></div><div class="date-day display"></div><div class="date-yr mono"></div>';
    let shown = '';
    const update = T => {
      const p = placeOf(ctx, ctx.opts(w).place), {y, mo, d, wd} = localParts(p.tz, T);
      const key = [y, mo, d].join('-');
      if (key === shown) return;
      shown = key;
      el.querySelector('.date-wd').textContent = WEEKDAYS[wd];
      el.querySelector('.date-day').textContent = `${d} ${MONTHS[mo - 1]}`;
      el.querySelector('.date-yr').textContent = `${y} · Week ${isoWeek(y, mo, d)}`;
    };
    update(ctx.clock.getT());
    return {update};
  },
};
