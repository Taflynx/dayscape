// Dayline's timelines as a widget: one strip per place, drag to scrub the shared time, tap an hour to jump.
import { esc } from '../util.js';
import { MIN, HOUR as H, DAY, pad, tzOffset, tzAbbr, fmtDiff, relLabel } from '../time.js';
import { skyAt, rgb } from '../scene/sky.js';
import { chosenPlaces } from './worldclocks.js';

const STRIP = Array.from({length: 25}, (_, h) => skyAt(h)[1]);
const fDate = new Intl.DateTimeFormat('en-US', {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'});
const fLong = new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'});
const fWd = new Intl.DateTimeFormat('en-US', {weekday: 'short', timeZone: 'UTC'});
const GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
const flag = cc => /^[a-z]{2}$/.test(cc || '') ? `<img class="flag" alt="" loading="lazy" src="https://flagcdn.com/w80/${cc}.png">` : `<span class="flag">${GLOBE}</span>`;

function clockText(L, h12){
  const d = new Date(L), h = d.getUTCHours(), m = d.getUTCMinutes();
  if (!h12) return pad(h) + ':' + pad(m);
  return ((h % 12) || 12) + ':' + pad(m) + `<small>${h < 12 ? 'AM' : 'PM'}</small>`;
}
const hourText = (h, h12) => !h12 ? String(h) : ((h % 12) || 12) + `<small>${h < 12 ? 'A' : 'P'}</small>`;

export default {
  type: 'timeline', name: 'Timeline', description: 'Your places side by side on a strip of hours. Drag to see any time anywhere.',
  multi: true, size: {w: 16, h: 6}, min: {w: 10, h: 3},
  defaults: {places: [], zoom: 64},
  fields: [
    {key: 'places', label: 'Places', kind: 'places'},
    {key: 'zoom', label: 'Hour width', kind: 'select', options: [{value: 48, label: 'Compact'}, {value: 64, label: 'Standard'}, {value: 88, label: 'Wide'}]},
  ],
  mount(el, w, ctx){
    const {clock} = ctx;
    el.classList.add('tl');
    el.innerHTML = `<div class="tl-rows" tabindex="0" aria-label="Timelines. Arrow keys move the time, N returns to now."></div>
      <div class="tl-foot"><span class="tl-when"></span><div class="tl-ctl">
        <button class="tl-btn" data-step="-1" aria-label="One hour earlier">−1 h</button>
        <button class="tl-btn tl-now" aria-label="Back to now">Now</button>
        <button class="tl-btn" data-step="1" aria-label="One hour later">+1 h</button></div></div>`;
    const rowsEl = el.querySelector('.tl-rows');
    const PX = () => +ctx.opts(w).zoom || 64;
    let rows = [], ids = '';

    function build(){
      const list = chosenPlaces(ctx, ctx.opts(w).places, true);
      ids = list.map(p => p.id + p.name).join() + ctx.places.home().id;
      rowsEl.innerHTML = list.map(p => `<div class="tl-row${p.id === ctx.places.home().id ? ' is-home' : ''}" data-id="${esc(p.id)}">
        <div class="tl-label">${flag(p.cc)}<div class="tl-info"><div class="tl-name">${esc(p.name)}</div><div class="tl-sub mono"></div></div>
          <div class="tl-right"><div class="tl-time"></div><div class="tl-date mono"></div></div></div>
        <div class="tl-strip"><div class="cells"></div><div class="now-mark"></div></div></div>`).join('');
      rowsEl.querySelectorAll('img.flag').forEach(i => i.addEventListener('error', () => { i.outerHTML = `<span class="flag">${GLOBE}</span>`; }, {once: true}));
      rows = [...rowsEl.children].map(r => ({el: r, place: list.find(p => p.id === r.dataset.id),
        time: r.querySelector('.tl-time'), date: r.querySelector('.tl-date'), sub: r.querySelector('.tl-sub'), cells: r.querySelector('.cells'), now: r.querySelector('.now-mark')}));
    }

    function update(T){
      const want = chosenPlaces(ctx, ctx.opts(w).places, true).map(p => p.id + p.name).join() + ctx.places.home().id;
      if (want !== ids) build();
      const now = Date.now(), px = PX(), h12 = ctx.state.h12;
      const hc = ctx.places.home(), hOff = tzOffset(hc.tz, T), hL = T + hOff * MIN;
      const W = rows[0]?.cells.clientWidth || 600, c = W / 2, nowX = c - (T - now) / H * px, live = clock.isLive();
      for (const r of rows){
        const p = r.place, off = tzOffset(p.tz, T), L = T + off * MIN;
        r.time.innerHTML = clockText(L, h12);
        r.sub.innerHTML = (p.id === hc.id ? `<span class="home-badge">${p.me ? 'Here' : 'Home'}</span> · ` : '') + esc(`${p.country}${p.country ? ' · ' : ''}${tzAbbr(p.tz, T)}`);
        const dd = Math.floor(L / DAY) - Math.floor(hL / DAY), diff = fmtDiff(off - hOff);
        r.date.innerHTML = (dd > 0 ? '<span class="nd">Tomorrow</span>' : dd < 0 ? '<span class="pd">Yesterday</span>' : fDate.format(L)) + (diff ? `<span class="diff">${diff}H</span>` : '');
        const first = Math.floor((L - c / px * H) / H) - 1, last = Math.ceil((L + c / px * H) / H);
        let html = '';
        for (let k = first; k <= last; k++){
          const start = k * H, x = c + (start - L) / H * px, d = new Date(start), h = d.getUTCHours();
          const work = h >= 9 && h < 18 && d.getUTCDay() % 6 !== 0;
          const inner = h === 0 ? `${fWd.format(start)} ${d.getUTCDate()}` : hourText(h, h12);
          html += `<div class="cell${work ? ' work' : ''}${h === 0 ? ' midnight' : ''}" data-k="${k}" style="width:${px + 1}px;transform:translateX(${x.toFixed(1)}px);--g:linear-gradient(90deg,${rgb(STRIP[h])},${rgb(STRIP[h + 1])})"><span class="hl">${inner}</span><i class="tl-bar"></i></div>`;
        }
        r.cells.innerHTML = html;
        r.now.style.display = (!live && nowX > -2 && nowX < W + 2) ? '' : 'none';
        r.now.style.left = nowX + 'px';
      }
      el.querySelector('.tl-when').innerHTML = `<b>${clockText(hL, h12)}</b> ${esc(hc.name)}, ${esc(fLong.format(hL))}${live ? '' : ', ' + esc(relLabel(T - now))}`;
      el.querySelector('.tl-now').classList.toggle('show', !live);
    }

    // ----- drag to scrub, tap to jump, fling with inertia -----
    let drag = null;
    rowsEl.addEventListener('pointerdown', e => {
      const st = e.target.closest('.tl-strip');
      if (!st || e.button > 0) return;
      clock.stopAnim();
      drag = {x: e.clientX, startT: clock.getT(), moved: false, lastX: e.clientX, lastT: performance.now(), v: 0, cell: e.target.closest('.cell'), row: e.target.closest('.tl-row'), id: e.pointerId};
      st.setPointerCapture(e.pointerId);
    });
    rowsEl.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      drag.moved = true;
      const t = performance.now(), dt = t - drag.lastT;
      if (dt > 0) drag.v = 0.7 * ((e.clientX - drag.lastX) / dt) + 0.3 * drag.v;
      drag.lastX = e.clientX; drag.lastT = t;
      clock.setCursor(drag.startT - dx / PX() * H);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved){
        const p = d.row && rows.find(r => r.el === d.row)?.place;
        if (d.cell && p) clock.animateTo(+d.cell.dataset.k * H - tzOffset(p.tz, clock.getT()) * MIN);
        return;
      }
      const v = performance.now() - d.lastT > 80 ? 0 : d.v;
      if (Math.abs(v) > 0.15) clock.inertia(v, PX()); else clock.settle();
    };
    rowsEl.addEventListener('pointerup', endDrag);
    rowsEl.addEventListener('pointercancel', endDrag);

    let wheelT;
    rowsEl.addEventListener('wheel', e => {
      if (!e.target.closest('.tl-strip')) return;
      e.preventDefault(); clock.stopAnim();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      clock.setCursor(clock.getT() + d / PX() * H * 0.6);
      clearTimeout(wheelT); wheelT = setTimeout(clock.settle, 180);
    }, {passive: false});

    rowsEl.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
        e.preventDefault();
        clock.animateTo(clock.snap(clock.getT()) + (e.shiftKey ? 60 : 15) * MIN * (e.key === 'ArrowRight' ? 1 : -1));
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'Home'){ e.preventDefault(); clock.goNow(); }
    });
    el.querySelector('.tl-ctl').addEventListener('click', e => {
      const b = e.target.closest('.tl-btn'); if (!b) return;
      if (b.dataset.step) clock.animateTo(clock.snap(clock.getT()) + +b.dataset.step * H);
      else clock.goNow();
    });

    build();
    update(clock.getT());
    return {update, resize: () => update(clock.getT())};
  },
};
