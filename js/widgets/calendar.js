import { localParts } from '../time.js';
import { monthGrid } from '../calendar-math.js';
import { MONTHS } from './date.js';

const HEADS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default {
  type: 'calendar', name: 'Calendar', description: 'This month at a glance.',
  multi: false, size: {w: 6, h: 5}, min: {w: 4, h: 4},
  defaults: {},
  mount(el, w, ctx){
    el.classList.add('calw');
    let shift = 0, shown = '';
    el.innerHTML = `<div class="cal-head"><button class="cal-nav" data-d="-1" aria-label="Previous month">‹</button><span class="cal-title"></span><button class="cal-nav" data-d="1" aria-label="Next month">›</button></div>
      <div class="cal-grid" role="grid"></div>`;
    const draw = T => {
      const t = localParts(ctx.places.home().tz, T);
      let y = t.y, mo = t.mo + shift;
      y += Math.floor((mo - 1) / 12); mo = ((mo - 1) % 12 + 12) % 12 + 1;
      const key = [y, mo, t.y, t.mo, t.d].join();
      if (key === shown) return;
      shown = key;
      const title = el.querySelector('.cal-title');
      title.textContent = `${MONTHS[mo - 1]} ${y}`;
      title.classList.toggle('away', shift !== 0);
      el.querySelector('.cal-grid').innerHTML = HEADS.map(h => `<span class="cal-h mono">${h}</span>`).join('') +
        monthGrid(y, mo).map(d => `<span class="cal-d${d && y === t.y && mo === t.mo && d === t.d ? ' today' : ''}">${d || ''}</span>`).join('');
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('.cal-nav');
      if (b){ shift += +b.dataset.d; draw(ctx.clock.getT()); }
      else if (e.target.closest('.cal-title.away')){ shift = 0; draw(ctx.clock.getT()); }
    });
    draw(ctx.clock.getT());
    return {update: draw};
  },
};
