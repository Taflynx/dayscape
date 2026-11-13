// The one persisted state object, its defaults, validation, backup and restore. Pure: storage is injected.
import { uid } from './util.js';
import { validTz } from './time.js';
import { CITY_DATA, DEFAULT_PLACES } from './places.js';

export const KEY = 'dayscape.v1';
const APP = 'dayscape';
const BG_MODES = ['all', 'followed', 'pinned'];
const NOT_BACKUP = "This file isn't a Dayscape backup.";

const cc = c => /^[a-z]{2}$/.test(c || '') ? c : '';
const int = (v, d = 0) => Number.isFinite(+v) ? Math.round(+v) : d;

export function defaultState(defaultWidgets){
  const places = DEFAULT_PLACES.map(n => CITY_DATA.find(c => c.name === n)).filter(Boolean)
    .map(c => ({id: uid(), name: c.name, country: c.country, cc: c.cc, tz: c.tz}));
  return {
    v: 1, places, homeId: places[0].id, h12: false, located: false,
    widgets: defaultWidgets.map(w => ({id: uid(), settings: {}, ...structuredClone(w)})),
    bg: {mode: 'all', pinned: null, last: null},
  };
}

/** Returns a repaired copy of `obj`, or null when it cannot be a Dayscape state. */
export function validateState(obj, knownTypes){
  if (!obj || typeof obj !== 'object' || obj.v !== 1 || !Array.isArray(obj.places) || !Array.isArray(obj.widgets)) return null;
  const places = obj.places
    .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && validTz(p.tz))
    .map(p => {
      const q = {id: p.id, name: p.name, country: String(p.country || ''), cc: cc(p.cc), tz: p.tz};
      if (Number.isFinite(p.lat) && Number.isFinite(p.lon)){ q.lat = p.lat; q.lon = p.lon; }
      if (p.me) q.me = true;
      return q;
    });
  if (!places.length) return null;
  const widgets = obj.widgets
    .filter(w => w && typeof w.id === 'string' && typeof w.type === 'string' && (!knownTypes || knownTypes.includes(w.type)))
    .map(w => ({id: w.id, type: w.type, x: int(w.x), y: int(w.y), w: Math.max(1, int(w.w, 1)), h: Math.max(1, int(w.h, 1)),
      settings: w.settings && typeof w.settings === 'object' ? w.settings : {}}));
  const bg = obj.bg && BG_MODES.includes(obj.bg.mode)
    ? {mode: obj.bg.mode, pinned: obj.bg.pinned ?? null, last: obj.bg.last ?? null}
    : {mode: 'all', pinned: null, last: null};
  return {
    v: 1, places, homeId: places.some(p => p.id === obj.homeId) ? obj.homeId : places[0].id,
    h12: !!obj.h12, located: !!obj.located, widgets, bg,
  };
}

/** Never throws: anything unreadable falls back to the default board. */
export function loadState(storage, defaultWidgets, knownTypes){
  try {
    const s = validateState(JSON.parse(storage.getItem(KEY)), knownTypes);
    if (s) return s;
  } catch {}
  return defaultState(defaultWidgets);
}

export function saveState(storage, state){
  try { storage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export const exportState = state => JSON.stringify({app: APP, v: 1, exported: new Date().toISOString(), state}, null, 2);

export function importState(text, knownTypes){
  let data;
  try { data = JSON.parse(text); } catch { return {ok: false, error: NOT_BACKUP}; }
  if (!data || data.app !== APP) return {ok: false, error: NOT_BACKUP};
  const state = validateState(data.state, knownTypes);
  return state ? {ok: true, state} : {ok: false, error: NOT_BACKUP};
}
