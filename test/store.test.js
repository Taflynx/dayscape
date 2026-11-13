import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, loadState, saveState, exportState, importState, defaultState } from '../js/store.js';

const DEFAULT_WIDGETS = [
  {type: 'search', x: 0, y: 0, w: 10, h: 2},
  {type: 'notes', x: 0, y: 2, w: 5, h: 4},
];
const KNOWN = ['search', 'notes'];
const mem = (value) => ({ getItem: () => value, setItem(){ } });

test('a storage that throws still yields the default board', () => {
  const s = loadState({ getItem(){ throw new Error('blocked'); } }, DEFAULT_WIDGETS, KNOWN);
  assert.equal(s.places.length, 6);
  assert.equal(s.widgets.length, DEFAULT_WIDGETS.length);
  assert.equal(s.homeId, s.places[0].id);
});

test('corrupt JSON yields the default board', () => {
  assert.equal(loadState(mem('{oops'), DEFAULT_WIDGETS, KNOWN).widgets.length, 2);
});

test('a saved state with no places yields the default board', () => {
  const bad = JSON.stringify({v: 1, places: [], homeId: 'x', widgets: []});
  assert.equal(loadState(mem(bad), DEFAULT_WIDGETS, KNOWN).places.length, 6);
});

test('unknown widget types and invalid zones are dropped', () => {
  const saved = JSON.stringify({v: 1, homeId: 'a', widgets: [
    {id: 'w1', type: 'notes', x: 0, y: 0, w: 5, h: 4, settings: {}},
    {id: 'w2', type: 'ghost', x: 5, y: 0, w: 5, h: 4, settings: {}},
  ], places: [
    {id: 'a', name: 'London', tz: 'Europe/London'},
    {id: 'b', name: 'Nowhere', tz: 'Nope/Zone'},
  ]});
  const s = loadState(mem(saved), DEFAULT_WIDGETS, KNOWN);
  assert.deepEqual(s.widgets.map(w => w.id), ['w1']);
  assert.deepEqual(s.places.map(p => p.id), ['a']);
});

test('validation repairs home, settings and background', () => {
  const saved = JSON.stringify({v: 1, homeId: 'gone', bg: 'x', widgets: [{id: 'w', type: 'notes', x: 1.7, y: 0, w: 5, h: 4}],
    places: [{id: 'a', name: 'London', tz: 'Europe/London'}]});
  const s = loadState(mem(saved), DEFAULT_WIDGETS, KNOWN);
  assert.equal(s.homeId, 'a');
  assert.deepEqual(s.widgets[0].settings, {});
  assert.equal(s.widgets[0].x, 2);
  assert.deepEqual(s.bg, {mode: 'all', pinned: null, last: null});
});

test('saving to a storage that throws does not throw', () => {
  assert.doesNotThrow(() => saveState({ setItem(){ throw new Error('full'); } }, defaultState(DEFAULT_WIDGETS)));
});

test('saveState writes under the dayscape.v1 key', () => {
  let k; saveState({ setItem(key){ k = key; } }, defaultState(DEFAULT_WIDGETS));
  assert.equal(k, 'dayscape.v1');
  assert.equal(KEY, 'dayscape.v1');
});

test('importing something that is not JSON is refused', () => {
  assert.equal(importState('not json').ok, false);
});

test('importing another app\'s file is refused with a clear message', () => {
  assert.equal(importState(JSON.stringify({app: 'other'})).error, "This file isn't a Dayscape backup.");
});

test('export then import round-trips the state', () => {
  const s = defaultState(DEFAULT_WIDGETS);
  s.widgets[1].settings = {text: 'hello', color: 'sage'};
  assert.deepEqual(importState(exportState(s)).state, s);
});

test('ids that are not plain tokens are refused, so they can never reach markup', () => {
  const saved = JSON.stringify({v: 1, homeId: 'a', widgets: [
    {id: 'w1', type: 'notes', x: 0, y: 0, w: 5, h: 4, settings: {}},
    {id: '"><img src=x onerror=alert(1)>', type: 'notes', x: 5, y: 0, w: 5, h: 4, settings: {}},
  ], places: [
    {id: 'a', name: 'London', tz: 'Europe/London'},
    {id: 'b"><svg>', name: 'Paris', tz: 'Europe/Paris'},
  ]});
  const s = loadState(mem(saved), DEFAULT_WIDGETS, KNOWN);
  assert.deepEqual(s.widgets.map(w => w.id), ['w1']);
  assert.deepEqual(s.places.map(p => p.id), ['a']);
});
