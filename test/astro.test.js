import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunTimes, moonPhase } from '../js/astro.js';

const near = (ms, h, m, label) => {
  const want = Date.UTC(2026, 5, 21, h, m);
  assert.ok(Math.abs(ms - want) <= 3 * 60e3, `${label}: ${new Date(ms).toISOString()} vs ${new Date(want).toISOString()}`);
};

test('Montreal on the June solstice: sunrise about 09:05 UTC, sunset about 00:47 UTC the next day', () => {
  const s = sunTimes(Date.UTC(2026, 5, 21), 45.5017, -73.5673);
  near(s.sunrise, 9, 5, 'sunrise');
  near(s.sunset, 24, 47, 'sunset');
  assert.ok(s.dayLength > 15 * 60 && s.dayLength < 16 * 60);
});

test('Svalbard in June has no sunrise (midnight sun)', () => {
  const s = sunTimes(Date.UTC(2026, 5, 21), 78.22, 15.65);
  assert.equal(s.sunrise, null);
  assert.equal(s.sunset, null);
  assert.equal(s.dayLength, 1440);
});

test('the moon was full on 3 January 2026', () => {
  assert.equal(moonPhase(Date.UTC(2026, 0, 3, 10, 3)).name, 'Full Moon');
});

test('the moon was new on 18 January 2026', () => {
  assert.equal(moonPhase(Date.UTC(2026, 0, 18, 19, 52)).name, 'New Moon');
});
