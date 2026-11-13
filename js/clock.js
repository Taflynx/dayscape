// The shared displayed time. Live by default; any Timeline can scrub it, and every widget and the scene follow it.
import { MIN, HOUR } from './time.js';

const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let cursor = null;               // null = live; otherwise an absolute ms
let anim = null;
const subs = new Set();

export const getT = () => cursor ?? Date.now();
export const isLive = () => cursor === null;

function emit(){ const T = getT(); for (const cb of subs) cb(T); }

/** Subscribe to displayed-time changes. Called on every change and once a second while live. Returns an unsubscribe function. */
export function onTime(cb){ subs.add(cb); return () => subs.delete(cb); }

export function stopAnim(){ if (anim) cancelAnimationFrame(anim); anim = null; }

export function setCursor(ms){ cursor = ms; emit(); }

export function animateTo(target, done){
  stopAnim();
  const from = getT(), t0 = performance.now();
  const dur = reduceMotion ? 0 : Math.min(700, 220 + Math.abs(target - from) / HOUR * 30);
  const step = t => {
    const p = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3);
    cursor = from + (target - from) * e;
    emit();
    if (p < 1) anim = requestAnimationFrame(step); else { anim = null; done && done(); emit(); }
  };
  anim = requestAnimationFrame(step);
}

export const snap = (t, mins = 15) => Math.round(t / (mins * MIN)) * mins * MIN;
export function goNow(){ animateTo(Date.now(), () => { cursor = null; }); }
/** After a drag: snap to the quarter hour, or return to live when close to now. */
export function settle(){ if (Math.abs(getT() - Date.now()) < 8 * MIN) return goNow(); animateTo(snap(getT())); }

/** Momentum after a fling; v is pixels per ms, pxPerHour the strip scale. */
export function inertia(v, pxPerHour){
  if (reduceMotion) return settle();
  stopAnim();
  let last = performance.now();
  const step = t => {
    const dt = t - last; last = t;
    cursor = getT() - v * dt / pxPerHour * HOUR;
    v *= Math.pow(0.93, dt / 16);
    emit();
    if (Math.abs(v) > 0.03) anim = requestAnimationFrame(step); else { anim = null; settle(); }
  };
  anim = requestAnimationFrame(step);
}

// a heartbeat while live, aligned to the second
if (typeof window !== 'undefined'){
  const tick = () => { if (cursor === null && !anim) emit(); setTimeout(tick, 1000 - Date.now() % 1000 + 5); };
  tick();
}
