// Dayscape boot: load the saved board, render it, and wire the bar, drawers and clock.
import { $ } from './util.js';
import { loadState, saveState, defaultState } from './store.js';
import { WIDGETS } from './widgets/index.js';
import { renderBoard, layout, tick, openLibrary, initLibrary, optsOf, refreshAll } from './board.js';
import { initSettings, openSettings } from './settings.js';
import * as clock from './clock.js';
import { phoneQuery } from './grid.js';
import { createEngine } from './scene/engine.js';
import { startBackground } from './scene/background.js';

// first-visit board (Task 14 tunes the composition)
export const DEFAULT_WIDGETS = [
  {type: 'notes', x: 18, y: 9, w: 6, h: 5, settings: {}},
];

const storage = (() => { try { return window.localStorage; } catch { return {getItem: () => null, setItem(){}}; } })();
const knownTypes = Object.keys(WIDGETS);
let state = loadState(storage, DEFAULT_WIDGETS.filter(w => WIDGETS[w.type]), knownTypes);

let toastT;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 4200);
}

const ctx = {
  get state(){ return state; },
  save: () => saveState(storage, state),
  opts: optsOf,
  places: {
    list: () => state.places,
    home: () => state.places.find(p => p.id === state.homeId) || state.places[0],
    byId: id => state.places.find(p => p.id === id),
  },
  clock, toast, knownTypes,
  weather: {get: async () => null, at: () => null, label: () => ''},
  replaceState(s){ state = s; ctx.save(); renderBoard(ctx); ctx.onPlacesChange?.(); },
  reset(){ ctx.replaceState(defaultState(DEFAULT_WIDGETS.filter(w => WIDGETS[w.type]))); toast('Board reset.'); },
  onPlacesChange: () => { refreshAll(); bg?.repaint(); },
  onFormatChange: () => { refreshAll(); bg?.repaint(); },
  onBackgroundChange: () => bg?.modeChanged(),
  openSettings: () => openSettings(),
};
let bg = null;
window.dayscape = ctx;            // handy for debugging in the console

renderBoard(ctx);
initLibrary();
initSettings(ctx);
$('#addBtn').addEventListener('click', openLibrary);
$('#settingsBtn').addEventListener('click', openSettings);
clock.onTime(tick);
phoneQuery.addEventListener('change', layout);
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 60); });
bg = startBackground(ctx, createEngine($('#scene')));
ctx.background = bg;
document.documentElement.dataset.ready = '1';
