// The board: renders every widget in its frame, moves and resizes them, and hosts the gear menu and the library.
import { $, $$, esc, uid } from './util.js';
import { moveItem, resizeItem, findSpot, readingOrder, COLS, ROWS } from './grid-layout.js';
import { place, gesture, phoneQuery } from './grid.js';
import { WIDGETS, LIBRARY } from './widgets/index.js';
import { getT } from './clock.js';

let ctx, boardEl, ghost;
const live = new Map();           // widget id -> {el, inst, mod}

const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

export const optsOf = w => ({...WIDGETS[w.type].defaults, ...w.settings});
// layout items: floating widgets (notes) sit above the board and take no room
const items = () => ctx.state.widgets.map(w => ({...w, float: !!WIDGETS[w.type]?.float}));

export function renderBoard(c){
  ctx = c; boardEl = $('#board');
  for (const id of [...live.keys()]) unmount(id);
  boardEl.innerHTML = '<div class="ghost" hidden></div>';
  ghost = $('.ghost', boardEl);
  for (const w of ctx.state.widgets) mount(w);
  layout();
}

function frameFor(w, mod){
  const el = document.createElement('section');
  el.className = 'widget w-' + w.type + (mod.float ? ' float' : '') + (!mod.float && w.settings?.clear ? ' clear' : '');
  el.dataset.id = w.id;
  el.innerHTML = `<header class="w-head"><span class="w-name mono">${esc(mod.name)}</span><button class="w-gear" aria-label="${esc(mod.name)} settings">${GEAR}</button></header>
    <div class="w-body"></div><span class="w-corner" aria-hidden="true"></span>`;
  return el;
}

function mount(w){
  const mod = WIDGETS[w.type];
  if (!mod) return;
  const el = frameFor(w, mod);
  boardEl.append(el);
  const inst = mod.mount($('.w-body', el), w, ctx) || {};
  live.set(w.id, {el, inst, mod});
  $('.w-gear', el).addEventListener('click', e => { e.stopPropagation(); openSettings(w.id); });
  gesture({el, handle: $('.w-head', el), corner: $('.w-corner', el), ghost, min: mod.min,
    getItem: () => ctx.state.widgets.find(x => x.id === w.id),
    commit: r => {
      const cur = ctx.state.widgets.find(x => x.id === w.id);
      const next = r.w !== cur.w || r.h !== cur.h ? resizeItem(items(), w.id, r.w, r.h, mod.min) : moveItem(items(), w.id, r.x, r.y);
      if (!next) return false;
      ctx.state.widgets = next.map(n => ({...ctx.state.widgets.find(x => x.id === n.id), x: n.x, y: n.y, w: n.w, h: n.h}));
      ctx.save(); layout();
      return true;
    }});
}

function unmount(id){
  const m = live.get(id);
  if (!m) return;
  try { m.inst.destroy?.(); } catch {}
  m.el.remove(); live.delete(id);
}

function remount(id){
  const w = ctx.state.widgets.find(x => x.id === id);
  unmount(id); mount(w); layout();
}

/** Positions every frame; on phones, stacks them in reading order. */
export function layout(){
  const phone = phoneQuery.matches;
  document.body.classList.toggle('phone', phone);
  const order = readingOrder(ctx.state.widgets);
  for (const w of ctx.state.widgets){
    const m = live.get(w.id); if (!m) continue;
    if (phone){ m.el.removeAttribute('style'); m.el.style.order = order.indexOf(w.id); m.el.style.minHeight = Math.max(120, w.h * 46) + 'px'; }
    else place(m.el, w);
    m.inst.resize?.();
  }
}

export function tick(T){ for (const m of live.values()) m.inst.update?.(T); }

/** Adds a widget in the first free spot; a floating one (a note) lands beside `near`, or in the middle. */
export function addWidget(type, near){
  const mod = WIDGETS[type];
  let spot, fits = true;
  if (mod.float){
    const n = ctx.state.widgets.filter(x => WIDGETS[x.type]?.float).length;
    spot = near ? {x: Math.min(COLS - mod.size.w, near.x + 1), y: Math.min(ROWS - mod.size.h, near.y + 1)}
      : {x: Math.min(COLS - mod.size.w, 9 + n % 5), y: Math.min(ROWS - mod.size.h, 3 + n % 5)};
  } else {
    spot = findSpot(items(), mod.size.w, mod.size.h) || findSpot(items(), mod.min.w, mod.min.h);
    if (!spot){ ctx.toast('No room on the board. Make space or remove a widget.'); return false; }
    fits = !!findSpot(items(), mod.size.w, mod.size.h);
  }
  const w = {id: uid(), type, x: spot.x, y: spot.y, w: fits ? mod.size.w : mod.min.w, h: fits ? mod.size.h : mod.min.h, settings: {}};
  ctx.state.widgets.push(w); ctx.save(); mount(w); layout();
  const el = live.get(w.id).el; el.classList.add('fresh'); setTimeout(() => el.classList.remove('fresh'), 900);
  return true;
}

export function removeWidget(id){
  ctx.state.widgets = ctx.state.widgets.filter(w => w.id !== id);
  ctx.save(); unmount(id); layout();
}

// ---------- the gear menu ----------
let pop = null;
export function closePop(){ pop?.remove(); pop = null; }
document.addEventListener('pointerdown', e => { if (pop && !pop.contains(e.target) && !e.target.closest('.w-gear')) closePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

function field(f, value){
  const id = 'f-' + f.key;
  const opts = f.kind === 'place' ? [{value: '', label: 'Home'}, ...ctx.places.list().map(p => ({value: p.id, label: p.name}))] : f.options || [];
  switch (f.kind){
    case 'select': case 'place':
      return `<label class="fld"><span>${esc(f.label)}</span><select id="${id}" data-k="${f.key}">${opts.map(o => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    case 'toggle':
      return `<label class="fld fld-row"><input type="checkbox" data-k="${f.key}"${value ? ' checked' : ''}><span>${esc(f.label)}</span></label>`;
    case 'number':
      return `<label class="fld"><span>${esc(f.label)}</span><input type="number" data-k="${f.key}" value="${esc(value)}" min="${f.min ?? ''}" max="${f.max ?? ''}"></label>`;
    case 'places': {
      const chosen = Array.isArray(value) && value.length ? value : null;
      return `<fieldset class="fld"><legend>${esc(f.label)}</legend><div class="chk">${ctx.places.list().map(p =>
        `<label><input type="checkbox" data-k="${f.key}" data-multi value="${esc(p.id)}"${!chosen || chosen.includes(p.id) ? ' checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</div></fieldset>`;
    }
    default:
      return `<label class="fld"><span>${esc(f.label)}</span><input type="text" data-k="${f.key}" value="${esc(value ?? '')}" placeholder="${esc(f.placeholder || '')}"></label>`;
  }
}

export function openSettings(id){
  closePop();
  const w = ctx.state.widgets.find(x => x.id === id), m = live.get(id);
  if (!w || !m) return;
  const o = optsOf(w), phone = phoneQuery.matches;
  pop = document.createElement('div');
  pop.className = 'pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', m.mod.name + ' settings');
  pop.innerHTML = `<div class="pop-title">${esc(m.mod.name)}</div>${(m.mod.fields || []).map(f => field(f, o[f.key])).join('')}
    ${m.mod.float ? '' : field({key: 'clear', label: 'Transparent background', kind: 'toggle'}, !!w.settings.clear)}
    ${phone ? '<div class="pop-row"><button class="lnk" data-act="up">Move up</button><button class="lnk" data-act="down">Move down</button></div>' : ''}
    <button class="lnk danger" data-act="remove">Remove widget</button>`;
  document.body.append(pop);
  const g = $('.w-gear', m.el).getBoundingClientRect(), pr = pop.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pr.width - 8, g.right - pr.width)) + 'px';
  pop.style.top = Math.max(8, Math.min(innerHeight - pr.height - 8, g.bottom + 6)) + 'px';
  pop.addEventListener('change', e => {
    const k = e.target.dataset.k; if (!k) return;
    let v;
    if ('multi' in e.target.dataset) v = $$(`input[data-k="${k}"]:checked`, pop).map(i => i.value);
    else if (e.target.type === 'checkbox') v = e.target.checked;
    else if (e.target.type === 'number') v = +e.target.value;
    else v = e.target.value;
    w.settings = {...w.settings, [k]: v};
    ctx.save(); remount(id);
  });
  pop.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'remove'){ closePop(); removeWidget(id); }
    if (act === 'up' || act === 'down') moveInOrder(id, act === 'up' ? -1 : 1);
  });
}

/** Phones: swap reading position with the neighbour by swapping grid slots. */
function moveInOrder(id, dir){
  const order = readingOrder(ctx.state.widgets), i = order.indexOf(id), j = i + dir;
  if (j < 0 || j >= order.length) return;
  const a = ctx.state.widgets.find(w => w.id === id), b = ctx.state.widgets.find(w => w.id === order[j]);
  [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
  ctx.save(); layout();
}

// ---------- the library ----------
export function openLibrary(){
  closePop();
  const d = $('#library');
  const onBoard = new Set(ctx.state.widgets.map(w => w.type));
  $('.lib-list', d).innerHTML = LIBRARY.map(m => {
    const taken = !m.multi && onBoard.has(m.type);
    return `<li><div><b>${esc(m.name)}</b><p>${esc(m.description)}</p></div>${taken ? '<span class="mono taken">On your board</span>' : `<button class="btn sm" data-add="${m.type}">Add</button>`}</li>`;
  }).join('');
  d.showModal();
}

export function initLibrary(){
  const d = $('#library');
  d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-close]')) return d.close();
    const t = e.target.closest('[data-add]')?.dataset.add;
    if (t && addWidget(t)) d.close();
  });
}

export const relayout = () => layout();
export const refreshAll = () => { for (const w of ctx.state.widgets) remount(w.id); tick(getT()); };
