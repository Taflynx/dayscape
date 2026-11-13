import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validTz, tzOffset, fmtTime, fmtDiff, isoWeek, localParts } from '../js/time.js';

const JAN = Date.UTC(2026, 0, 1);

test('tzOffset handles quarter-hour and half-hour zones', () => {
  assert.equal(tzOffset('Asia/Kathmandu', JAN), 345);
  assert.equal(tzOffset('Asia/Kolkata', JAN), 330);
});

test('tzOffset changes exactly at the New York DST switch', () => {
  assert.equal(tzOffset('America/New_York', Date.UTC(2026, 2, 8, 6, 59)), -300);
  assert.equal(tzOffset('America/New_York', Date.UTC(2026, 2, 8, 7, 0)), -240);
});

test('fmtDiff formats offsets with minutes and a real minus sign', () => {
  assert.equal(fmtDiff(345), '+5:45');
  assert.equal(fmtDiff(-180), '−3');
  assert.equal(fmtDiff(0), '');
});

test('fmtTime renders 12-hour clock', () => {
  assert.equal(fmtTime(Date.UTC(2026, 0, 1, 13, 5), 'UTC', true), '1:05 PM');
  assert.equal(fmtTime(Date.UTC(2026, 0, 1, 9, 5), 'UTC', false), '09:05');
});

test('isoWeek at the year edges of 2026', () => {
  assert.equal(isoWeek(2026, 1, 1), 1);
  assert.equal(isoWeek(2026, 12, 31), 53);
});

test('validTz rejects unknown zones', () => {
  assert.equal(validTz('Nope/Zone'), false);
  assert.equal(validTz('Europe/London'), true);
});

test('localParts gives the wall-clock fields of a zone', () => {
  const p = localParts('Asia/Kathmandu', JAN);
  assert.deepEqual([p.y, p.mo, p.d, p.h, p.mi, p.wd], [2026, 1, 1, 5, 45, 4]);
});
