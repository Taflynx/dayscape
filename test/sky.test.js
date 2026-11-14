import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skyHour } from '../js/scene/sky.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('maps the real sunrise and sunset onto the painted day (6:00 to 19:00)', () => {
  near(skyHour(6.9, 6.9, 16.4), 6);
  near(skyHour(16.4, 6.9, 16.4), 19);
  near(skyHour((6.9 + 16.4) / 2, 6.9, 16.4), 12.5);
});

test('spreads the night evenly between sunset and the next sunrise', () => {
  // night of 14.5 hours maps onto the painted 11 hours
  near(skyHour(16.4 + 14.5 / 2, 6.9, 16.4), (19 + 5.5) % 24);
  near(skyHour(2, 6.9, 16.4) % 24, (19 + 11 * (2 + 24 - 16.4) / 14.5) % 24);
});

test('falls back to the clock hour without sun times', () => {
  near(skyHour(14.25, NaN, NaN), 14.25);
  near(skyHour(14.25, null, 18), 14.25);
});
