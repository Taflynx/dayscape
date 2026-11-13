import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid } from '../js/calendar-math.js';

test('monthGrid pads a Monday-start week (February 2026 starts on a Sunday)', () => {
  const g = monthGrid(2026, 2);
  assert.equal(g.length, 42);
  assert.deepEqual(g.slice(0, 7), [0, 0, 0, 0, 0, 0, 1]);
  assert.equal(g.filter(Boolean).length, 28);
});

test('monthGrid with a Sunday start begins on the 1st', () => {
  const g = monthGrid(2026, 2, 0);
  assert.equal(g[0], 1);
  assert.equal(g.filter(Boolean).length, 28);
});

test('monthGrid knows leap years', () => {
  assert.equal(monthGrid(2028, 2).filter(Boolean).length, 29);
});
