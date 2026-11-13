import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, overlaps, moveItem, resizeItem, findSpot, readingOrder } from '../js/grid-layout.js';

const noOverlap = items => items.every((a, i) => items.every((b, j) => i === j || !overlaps(a, b)));
const byId = (items, id) => items.find(i => i.id === id);

test('the grid is 24 by 14', () => {
  assert.equal(COLS, 24); assert.equal(ROWS, 14);
});

test('moving A onto B pushes B down by A\'s height', () => {
  const items = [{id: 'A', x: 10, y: 0, w: 4, h: 3}, {id: 'B', x: 0, y: 0, w: 4, h: 2}];
  const out = moveItem(items, 'A', 0, 0);
  assert.deepEqual(byId(out, 'A'), {id: 'A', x: 0, y: 0, w: 4, h: 3});
  assert.equal(byId(out, 'B').y, 3);
});

test('a chain push settles with no overlaps', () => {
  const items = [{id: 'A', x: 10, y: 0, w: 4, h: 3}, {id: 'B', x: 0, y: 0, w: 4, h: 2}, {id: 'C', x: 0, y: 2, w: 4, h: 2}];
  const out = moveItem(items, 'A', 0, 0);
  assert.ok(noOverlap(out));
  assert.deepEqual(['B', 'C'].map(id => byId(out, id).y), [3, 5]);
});

test('a move that would push past the last row is refused and the input is untouched', () => {
  const items = [{id: 'A', x: 10, y: 0, w: 4, h: 8}, {id: 'B', x: 0, y: 0, w: 4, h: 8}];
  const before = structuredClone(items);
  assert.equal(moveItem(items, 'A', 0, 0), null);
  assert.deepEqual(items, before);
});

test('moveItem clamps to the grid', () => {
  const out = moveItem([{id: 'A', x: 0, y: 0, w: 4, h: 3}], 'A', 30, 99);
  assert.deepEqual([byId(out, 'A').x, byId(out, 'A').y], [COLS - 4, ROWS - 3]);
});

test('resizeItem never goes below the minimum', () => {
  const out = resizeItem([{id: 'A', x: 0, y: 0, w: 6, h: 6}], 'A', 1, 1, {w: 3, h: 2});
  assert.deepEqual([byId(out, 'A').w, byId(out, 'A').h], [3, 2]);
});

test('resizeItem pushes neighbours below', () => {
  const out = resizeItem([{id: 'A', x: 0, y: 0, w: 4, h: 2}, {id: 'B', x: 0, y: 2, w: 4, h: 2}], 'A', 4, 4, {w: 1, h: 1});
  assert.equal(byId(out, 'B').y, 4);
  assert.ok(noOverlap(out));
});

test('findSpot: empty board gives the top-left, full board gives null', () => {
  assert.deepEqual(findSpot([], 5, 4), {x: 0, y: 0});
  assert.equal(findSpot([{id: 'F', x: 0, y: 0, w: COLS, h: ROWS}], 1, 1), null);
});

test('findSpot skips occupied cells', () => {
  assert.deepEqual(findSpot([{id: 'A', x: 0, y: 0, w: 10, h: 4}], 5, 4), {x: 10, y: 0});
});

test('readingOrder sorts by row then column', () => {
  const items = [{id: 'c', y: 2, x: 0, w: 1, h: 1}, {id: 'b', y: 0, x: 5, w: 1, h: 1}, {id: 'a', y: 0, x: 1, w: 1, h: 1}];
  assert.deepEqual(readingOrder(items), ['a', 'b', 'c']);
});
