import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickScene } from '../js/scene/pick.js';

const meadow = {id: 'meadow', place: null};
const mtl = {id: 'montreal', place: {name: 'Montreal'}};
const tlv = {id: 'telaviv', place: {name: 'Tel Aviv'}};
const ALL = [meadow, mtl, tlv];
function seeded(seed){ return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

test('pinned mode returns the pinned scene', () => {
  assert.equal(pickScene(ALL, {mode: 'pinned', pinned: 'telaviv', last: 'telaviv'}, [], Math.random).id, 'telaviv');
});

test('pinned mode with an unknown scene falls back to rotating', () => {
  assert.ok(ALL.includes(pickScene(ALL, {mode: 'pinned', pinned: 'atlantis', last: null}, [], Math.random)));
});

test('followed mode only shows the meadow and followed cities', () => {
  const r = seeded(7);
  for (let i = 0; i < 200; i++)
    assert.notEqual(pickScene(ALL, {mode: 'followed', pinned: null, last: null}, ['Montreal'], r).id, 'telaviv');
});

test('all mode never repeats the last scene', () => {
  const r = seeded(11);
  for (let i = 0; i < 200; i++)
    assert.notEqual(pickScene(ALL, {mode: 'all', pinned: null, last: 'meadow'}, [], r).id, 'meadow');
});

test('a single-scene pool returns that scene even if it was last', () => {
  assert.equal(pickScene([meadow], {mode: 'all', pinned: null, last: 'meadow'}, [], Math.random).id, 'meadow');
});
