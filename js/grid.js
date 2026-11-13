// Screen geometry of the board grid, and the pointer gestures that move and resize widgets.
import { COLS, ROWS } from './grid-layout.js';

export const BAR = 56, EDGE = 16, GAP = 10;
export const phoneQuery = matchMedia('(max-width: 760px)');

export function metrics(){
  const cw = (innerWidth - EDGE * 2 - (COLS - 1) * GAP) / COLS;
  const ch = Math.max(24, (innerHeight - BAR - EDGE * 2 - (ROWS - 1) * GAP) / ROWS);
  return {cw, ch};
}

/** Pixel rect (relative to the board) of a grid rect. */
export function rectFor({x, y, w, h}){
  const {cw, ch} = metrics();
  return {left: x * (cw + GAP), top: y * (ch + GAP), width: w * cw + (w - 1) * GAP, height: h * ch + (h - 1) * GAP};
}

export function place(el, item){
  const r = rectFor(item);
  Object.assign(el.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
}

/**
 * Drag `handle` to move, or `corner` to resize. While the pointer is down, `ghost` shows the snapped grid rect.
 * `commit(rect)` gets the final {x, y, w, h} in grid units and returns true when the board accepted it.
 */
export function gesture({el, handle, corner, ghost, getItem, min, commit}){
  const start = (e, mode) => {
    if (phoneQuery.matches || e.button) return;
    const item = getItem();
    if (mode === 'move' && e.target.closest('button, input, textarea, select, a')) return;
    e.preventDefault();
    const {cw, ch} = metrics(), sx = e.clientX, sy = e.clientY, r0 = rectFor(item);
    let target = {...item};
    el.classList.add(mode === 'move' ? 'moving' : 'sizing');
    ghost.hidden = false; place(ghost, item);
    const src = e.currentTarget;
    src.setPointerCapture(e.pointerId);
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move'){
        el.style.left = r0.left + dx + 'px'; el.style.top = r0.top + dy + 'px';
        target = {...item, x: Math.round((r0.left + dx) / (cw + GAP)), y: Math.round((r0.top + dy) / (ch + GAP))};
        target.x = Math.max(0, Math.min(COLS - item.w, target.x)); target.y = Math.max(0, Math.min(ROWS - item.h, target.y));
      } else {
        el.style.width = Math.max(40, r0.width + dx) + 'px'; el.style.height = Math.max(40, r0.height + dy) + 'px';
        target = {...item,
          w: Math.max(min.w, Math.min(COLS - item.x, Math.round((r0.width + dx + GAP) / (cw + GAP)))),
          h: Math.max(min.h, Math.min(ROWS - item.y, Math.round((r0.height + dy + GAP) / (ch + GAP))))};
      }
      place(ghost, target);
    };
    const end = () => {
      src.removeEventListener('pointermove', move);
      el.classList.remove('moving', 'sizing');
      ghost.hidden = true;
      if (!commit(target)) place(el, item);
    };
    src.addEventListener('pointermove', move);
    src.addEventListener('pointerup', end, {once: true});
    src.addEventListener('pointercancel', end, {once: true});
  };
  handle.addEventListener('pointerdown', e => start(e, 'move'));
  corner.addEventListener('pointerdown', e => start(e, 'size'));
}
