import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plateMix, sunHours } from '../js/scene/plates.js';

const R = 7, S = 16.5;   // sunrise 07:00, sunset 16:30

test('holds a single plate away from sunrise and sunset', () => {
  assert.deepEqual(plateMix(2, R, S), {a: 'night', b: 'night', t: 0});
  assert.deepEqual(plateMix(12, R, S), {a: 'day', b: 'day', t: 0});
  assert.deepEqual(plateMix(7.5, R, S), {a: 'morning', b: 'morning', t: 0});
  assert.deepEqual(plateMix(16.4, R, S), {a: 'sunset', b: 'sunset', t: 0});
  assert.deepEqual(plateMix(23, R, S), {a: 'night', b: 'night', t: 0});
});

test('crossfades between neighbouring plates', () => {
  assert.deepEqual(plateMix(6.5, R, S), {a: 'night', b: 'morning', t: .5});
  assert.deepEqual(plateMix(8.5, R, S), {a: 'morning', b: 'day', t: .5});
  assert.deepEqual(plateMix(15, R, S), {a: 'day', b: 'sunset', t: .5});
  assert.deepEqual(plateMix(17, R, S), {a: 'sunset', b: 'night', t: .5});
});

test('missing sun times fall back to 6:00 and 18:00', () => {
  assert.deepEqual(plateMix(12, null, null), {a: 'day', b: 'day', t: 0});
  assert.deepEqual(plateMix(3, NaN, NaN), {a: 'night', b: 'night', t: 0});
});

const MTL = {tz: 'America/Toronto', lat: 45.5017, lon: -73.5673};

test('finds local sunrise and sunset hours for a place', () => {
  const {rise, set} = sunHours(Date.UTC(2026, 5, 21, 16), MTL);   // midsummer, noon in Montreal
  assert.ok(rise > 5 && rise < 5.3, `rise ${rise}`);
  assert.ok(set > 20.7 && set < 20.9, `set ${set}`);
});

test('gives no sun hours for a place without coordinates', () => {
  assert.deepEqual(sunHours(Date.UTC(2026, 5, 21, 16), {tz: 'UTC'}), {rise: NaN, set: NaN});
});
