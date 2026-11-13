import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlap } from '../js/planner.js';

const TLV = {name: 'Tel Aviv', tz: 'Asia/Jerusalem'}, LON = {name: 'London', tz: 'Europe/London'}, KTM = {name: 'Kathmandu', tz: 'Asia/Kathmandu'};
const DAY0 = Date.UTC(2026, 0, 14);   // a Wednesday in winter

test('Tel Aviv and London share 09:00-16:00 UTC on a winter weekday', () => {
  const [best] = overlap([TLV, LON], DAY0);
  assert.equal(best.score, 2);
  assert.equal(best.start, Date.UTC(2026, 0, 14, 9));
  assert.equal(best.end, Date.UTC(2026, 0, 14, 16));
});

test('slots end on 15-minute marks even with a +5:45 zone', () => {
  const slots = overlap([TLV, KTM], DAY0);
  assert.ok(slots.length > 0);
  for (const s of slots){
    assert.equal(s.start % (15 * 60e3), 0);
    assert.equal(s.end % (15 * 60e3), 0);
  }
  assert.equal(slots[0].score, 2);
});

test('working hours are configurable and slots are sorted best first, then earliest', () => {
  const slots = overlap([TLV, LON], DAY0, {from: 8, to: 12});
  for (let i = 1; i < slots.length; i++)
    assert.ok(slots[i - 1].score > slots[i].score || (slots[i - 1].score === slots[i].score && slots[i - 1].start < slots[i].start));
  assert.equal(slots[0].start, Date.UTC(2026, 0, 14, 8));
  assert.equal(slots[0].end, Date.UTC(2026, 0, 14, 10));
});
