// The settings drawer: places you follow, clock format, background, backup, restore and reset.
import { $, $$, esc, uid } from './util.js';
import { searchPlaces } from './places.js';
import { tzOffset, fmtDiff } from './time.js';
import { exportState, importState } from './store.js';

let ctx, d;
const flag = cc => /^[a-z]{2}$/.test(cc || '') ? `<img class="flag" alt="" src="https://flagcdn.com/w40/${cc}.png">` : '<span class="flag globe"></span>';

export function initSettings(c){
  ctx = c; d = $('#settings');
  d.addEventListener('click', onClick);
  d.addEventListener('change', onChange);
  d.addEventListener('focusout', onRename);
  d.addEventListener('keydown', e => { if (e.target.matches('.pl-name') && e.key === 'Enter'){ e.preventDefault(); e.target.blur(); } });
  $('#plQuery', d).addEventListener('input', renderResults);
  $('#plQuery', d).addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('.pl-res button', d)?.click(); } });
  initReorder();
}

export function openSettings(){ render(); d.showModal(); }

function render(){
  const s = ctx.state, home = ctx.places.home(), T = Date.now();
  $('#plList', d).innerHTML = s.places.map(p => `<li data-id="${esc(p.id)}">
      <span class="pl-grip" aria-hidden="true">⋮⋮</span>${flag(p.cc)}
      <span class="pl-name" contenteditable="plaintext-only" spellcheck="false">${esc(p.name)}</span>
      <span class="mono pl-off">${p.id === home.id ? (p.me ? 'Here' : 'Home') : esc(fmtDiff(tzOffset(p.tz, T) - tzOffset(home.tz, T)) || 'Same time')}</span>
      ${p.id === home.id ? '' : `<button class="lnk" data-home="${esc(p.id)}">Set home</button>`}
      <button class="x" data-del="${esc(p.id)}" aria-label="Remove ${esc(p.name)}"${s.places.length < 2 ? ' disabled' : ''}>×</button></li>`).join('');
  $(`input[name="fmt"][value="${s.h12 ? '12' : '24'}"]`, d).checked = true;
  $(`input[name="bg"][value="${s.bg.mode}"]`, d).checked = true;
  $(`input[name="theme"][value="${s.theme || 'auto'}"]`, d).checked = true;
  $('#plQuery', d).value = ''; $('#plRes', d).innerHTML = '';
  $('#resetBtn', d).textContent = 'Reset board';
}

function renderResults(){
  const q = $('#plQuery', d).value;
  $('#plRes', d).innerHTML = q.trim() ? searchPlaces(q, Date.now(), 6).map((c, i) =>
    `<li><button data-pick="${i}">${flag(c.cc)}<b>${esc(c.name)}</b><span class="mono">${esc(c.country)}</span></button></li>`).join('') : '';
  renderResults.list = searchPlaces(q, Date.now(), 6);
}

function changed(){ ctx.save(); ctx.onPlacesChange?.(); render(); }

function onClick(e){
  if (e.target === d || e.target.closest('[data-close]')) return d.close();
  const b = e.target.closest('button'); if (!b) return;
  const s = ctx.state;
  if (b.dataset.home){ s.homeId = b.dataset.home; changed(); }
  else if (b.dataset.del){
    s.places = s.places.filter(p => p.id !== b.dataset.del);
    if (!s.places.some(p => p.id === s.homeId)) s.homeId = s.places[0].id;
    changed();
  }
  else if (b.dataset.pick){
    const c = renderResults.list[+b.dataset.pick];
    if (!s.places.some(p => p.name === c.name && p.tz === c.tz)) s.places.push({id: uid(), name: c.name, country: c.country, cc: c.cc, tz: c.tz});
    changed();
  }
  else if (b.id === 'locateBtn') ctx.locate?.();
  else if (b.id === 'backupBtn') download();
  else if (b.id === 'restoreBtn') $('#restoreFile', d).click();
  else if (b.id === 'resetBtn'){
    if (b.dataset.armed){ ctx.reset(); d.close(); }
    else { b.dataset.armed = '1'; b.textContent = 'Click again to reset'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Reset board'; }, 4000); }
  }
}

async function onChange(e){
  const s = ctx.state;
  if (e.target.name === 'fmt'){ s.h12 = e.target.value === '12'; ctx.save(); ctx.onFormatChange?.(); }
  else if (e.target.name === 'theme'){ s.theme = e.target.value; ctx.save(); ctx.applyTheme?.(); }
  else if (e.target.name === 'bg'){ s.bg = {...s.bg, mode: e.target.value}; ctx.save(); ctx.onBackgroundChange?.(); }
  else if (e.target.id === 'restoreFile'){
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const r = importState(await file.text(), ctx.knownTypes);
    if (!r.ok) return ctx.toast(r.error);
    ctx.replaceState(r.state); d.close(); ctx.toast('Board restored.');
  }
}

function onRename(e){
  if (!e.target.matches('.pl-name')) return;
  const p = ctx.places.byId(e.target.closest('li').dataset.id), v = e.target.textContent.trim();
  if (v && v !== p.name){ p.name = v; ctx.save(); ctx.onPlacesChange?.(); }
  else e.target.textContent = p.name;
}

function download(){
  const blob = new Blob([exportState(ctx.state)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dayscape-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  ctx.toast('Backup saved.');
}

function initReorder(){
  const list = $('#plList', d);
  let row = null;
  list.addEventListener('pointerdown', e => {
    const g = e.target.closest('.pl-grip'); if (!g) return;
    e.preventDefault(); row = g.closest('li'); row.classList.add('lifting'); g.setPointerCapture(e.pointerId);
    const move = ev => {
      const prev = row.previousElementSibling, next = row.nextElementSibling;
      if (prev && ev.clientY < prev.getBoundingClientRect().top + prev.offsetHeight / 2) list.insertBefore(row, prev);
      else if (next && ev.clientY > next.getBoundingClientRect().top + next.offsetHeight / 2) list.insertBefore(next, row);
    };
    const end = () => {
      g.removeEventListener('pointermove', move); row.classList.remove('lifting');
      const order = $$('li', list).map(li => li.dataset.id);
      ctx.state.places.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      ctx.save(); ctx.onPlacesChange?.(); row = null;
    };
    g.addEventListener('pointermove', move);
    g.addEventListener('pointerup', end, {once: true});
    g.addEventListener('pointercancel', end, {once: true});
  });
}
