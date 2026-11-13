// Dayscape boot: load the saved board, render it, and wire the bar, drawers and clock.
import { $, uid } from './util.js';
import { validTz, tzOffset } from './time.js';
import { norm } from './places.js';
import { createWeather } from './weather.js';
import { getJSON, ipLookup, gpsLookup, browserTz } from './locate.js';
import { loadState, saveState, defaultState } from './store.js';
import { WIDGETS } from './widgets/index.js';
import { renderBoard, layout, tick, openLibrary, initLibrary, optsOf, refreshAll, addWidget } from './board.js';
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
  weather: createWeather({fetchJSON: getJSON, storage}),
  replaceState(s){ state = s; ctx.save(); applyTheme(); renderBoard(ctx); ctx.onPlacesChange?.(); },
  reset(){ ctx.replaceState(defaultState(DEFAULT_WIDGETS.filter(w => WIDGETS[w.type]))); toast('Board reset.'); },
  onPlacesChange: () => { refreshAll(); bg?.repaint(); },
  onFormatChange: () => { refreshAll(); bg?.repaint(); },
  onBackgroundChange: () => bg?.modeChanged(),
  openSettings: () => openSettings(),
  addWidget: (type, near) => addWidget(type, near),
  applyTheme,
  locate,
};
let bg = null;

// widget look: light glass, smoked glass, or auto (smoked once the painted sky darkens)
function applyTheme(){
  const b = document.body.classList, t = state.theme || 'auto';
  b.toggle('theme-auto', t === 'auto'); b.toggle('theme-light', t === 'light'); b.toggle('theme-dark', t === 'dark');
}
applyTheme();

// ----- location -----
function setMyPlace(p, how){
  if (!p.tz || !validTz(p.tz)) p.tz = browserTz();
  const now = Date.now();
  let c = state.places.find(x => norm(x.name) === norm(p.name) && tzOffset(x.tz, now) === tzOffset(p.tz, now));
  state.places.forEach(x => delete x.me);
  if (!c){ c = {id: uid(), name: p.name, country: p.country || '', cc: p.cc || '', tz: p.tz}; state.places.unshift(c); }
  if (Number.isFinite(p.lat) && Number.isFinite(p.lon)){ c.lat = p.lat; c.lon = p.lon; }
  c.me = true;
  state.homeId = c.id; state.located = true;
  ctx.save(); ctx.onPlacesChange();
  toast(how === 'ip' ? `Found you near ${c.name} from your network. Use my location in Settings for a precise spot.` : `You're in ${c.name}. It's home now.`);
}
let locating = false;
async function locate(){
  if (locating) return;
  locating = true;
  try{
    let p = null, how = 'gps';
    if (navigator.geolocation){ try{ p = await gpsLookup(); }catch{} }
    if (!p){ p = await ipLookup(); how = 'ip'; }
    if (p) setMyPlace(p, how);
    else toast("Couldn't find your location. Add your city under Places you follow.");
  } finally { locating = false; }
}
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
setInterval(() => bg.refreshWeather(), 15 * 60e3);
if (!state.located) ipLookup().then(p => { if (p && p.name) setMyPlace(p, 'ip'); else { state.located = true; ctx.save(); } });
document.documentElement.dataset.ready = '1';
