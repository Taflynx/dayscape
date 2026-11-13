import { localParts, isoWeek } from '../time.js';
import { placeOf } from './clock.js';
import { DATE_FORMATS, fmtDate } from '../datefmt.js';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default {
  type: 'date', name: 'Date', description: 'Today’s weekday, date and week number.',
  multi: false, size: {w: 5, h: 3}, min: {w: 3, h: 2},
  defaults: {place: '', format: 'full'},
  fields: [{key: 'place', label: 'Place', kind: 'place'},
    {key: 'format', label: 'Format', kind: 'select', options: [{value: 'full', label: 'Weekday, date and week'}, ...DATE_FORMATS]}],
  mount(el, w, ctx){
    el.classList.add('datew');
    el.innerHTML = '<div class="date-wd mono"></div><div class="date-day display"></div><div class="date-yr mono"></div>';
    let shown = '';
    const update = T => {
      const o = ctx.opts(w), p = placeOf(ctx, o.place), lp = localParts(p.tz, T), {y, mo, d, wd} = lp;
      const key = [y, mo, d].join('-');
      if (key === shown) return;
      shown = key;
      if (o.format !== 'full'){
        el.classList.add('one-line');
        el.querySelector('.date-wd').textContent = '';
        el.querySelector('.date-day').textContent = fmtDate(lp, o.format);
        el.querySelector('.date-yr').textContent = p.name;
        return;
      }
      el.querySelector('.date-wd').textContent = WEEKDAYS[wd];
      el.querySelector('.date-day').textContent = `${d} ${MONTHS[mo - 1]}`;
      el.querySelector('.date-yr').textContent = `${y} · Week ${isoWeek(y, mo, d)}`;
    };
    update(ctx.clock.getT());
    return {update};
  },
};
