import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATE_FORMATS, fmtDate } from '../js/datefmt.js';

const p = {y: 2026, mo: 11, d: 3, wd: 2};   // Tuesday 3 November 2026

test('every listed format renders and has a label', () => {
  for (const f of DATE_FORMATS){ assert.ok(f.label); assert.equal(typeof fmtDate(p, f.value), 'string'); }
});

test('the date formats', () => {
  assert.equal(fmtDate(p, 'short'), 'Tue 3 Nov');
  assert.equal(fmtDate(p, 'long'), 'Tuesday, 3 November 2026');
  assert.equal(fmtDate(p, 'us-long'), 'Tuesday, November 3, 2026');
  assert.equal(fmtDate(p, 'dmy'), '03/11/2026');
  assert.equal(fmtDate(p, 'mdy'), '11/03/2026');
  assert.equal(fmtDate(p, 'iso'), '2026-11-03');
  assert.equal(fmtDate(p, 'none'), '');
});

test('an unknown format falls back to short', () => {
  assert.equal(fmtDate(p, 'bogus'), 'Tue 3 Nov');
});
