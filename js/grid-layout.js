// Board layout maths in grid units. Pure; never mutates its input.

export const COLS = 24, ROWS = 14;

export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const clampRect = r => ({...r,
  w: Math.min(COLS, r.w), h: Math.min(ROWS, r.h),
  x: Math.max(0, Math.min(COLS - Math.min(COLS, r.w), r.x)),
  y: Math.max(0, Math.min(ROWS - Math.min(ROWS, r.h), r.y))});

/**
 * Settle `target` where it is and push every overlapping item straight down. null if anything leaves the grid.
 * Floating items (notes) sit above the board: they never push and are never pushed.
 */
function settle(items, target){
  const settled = [target];
  const rest = items.filter(i => i.id !== target.id).map(i => ({...i})).sort((a, b) => a.y - b.y || a.x - b.x);
  if (target.float) return items.map(i => i.id === target.id ? target : {...i});
  const floats = rest.filter(i => i.float);
  for (const it of rest.filter(i => !i.float)){
    let hit;
    while ((hit = settled.filter(s => !s.float && overlaps(s, it))).length) it.y = Math.max(...hit.map(s => s.y + s.h));
    if (it.y + it.h > ROWS) return null;
    settled.push(it);
  }
  settled.push(...floats);
  const order = new Map(items.map((i, k) => [i.id, k]));
  return settled.sort((a, b) => order.get(a.id) - order.get(b.id));
}

export function moveItem(items, id, x, y){
  const it = items.find(i => i.id === id);
  return it ? settle(items, clampRect({...it, x, y})) : null;
}

export function resizeItem(items, id, w, h, min = {w: 1, h: 1}){
  const it = items.find(i => i.id === id);
  if (!it) return null;
  const nw = Math.max(min.w, Math.min(COLS - it.x, w)), nh = Math.max(min.h, Math.min(ROWS - it.y, h));
  return settle(items, clampRect({...it, w: nw, h: nh}));
}

/** First free top-left cell (row by row) where a w×h item fits, or null. Floating items take no room and fit anywhere. */
export function findSpot(items, w, h, float = false){
  if (float) return {x: 0, y: 0};
  items = items.filter(i => !i.float);
  for (let y = 0; y + h <= ROWS; y++)
    for (let x = 0; x + w <= COLS; x++){
      const r = {x, y, w, h};
      if (!items.some(i => overlaps(i, r))) return {x, y};
    }
  return null;
}

export const readingOrder = items => [...items].sort((a, b) => a.y - b.y || a.x - b.x).map(i => i.id);
