// The living background: picks this visit's scene, paints it at the displayed time, and shows the caption.
import { $, esc } from '../util.js';
import { localParts, fmtTime } from '../time.js';
import { paintSky, skyHour, rgb, lum } from './sky.js';
import { sunTimes } from '../astro.js';
import { pickScene } from './pick.js';
import meadow from './scenes/meadow.js';
import montreal from './scenes/montreal.js';
import telaviv from './scenes/telaviv.js';
import { applyWeather, fmtTemp } from '../weather.js';

export { pickScene };
export const SCENES = [meadow, montreal, telaviv];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** Where a scene's time and weather come from: its own place, or home for the meadow. */
export const sceneHome = (scene, ctx) => scene.place || ctx.places.home();

export function startBackground(ctx, engine){
  const st = () => ctx.state;
  let scene = null, captionKey = '', menu = null, fc = null, fcFor = '', wxKey = '';

  // the forecast for whatever place the scene shows; refreshed by the caller every 15 minutes
  async function loadForecast(){
    const p = sceneHome(scene, ctx), k = p.id || p.name, had = Number.isFinite(p.lat);
    if (fcFor !== k){ fc = null; fcFor = k; }
    const got = await ctx.weather.get(p);
    if (fcFor !== k) return;              // the scene changed while we waited
    if (!had && Number.isFinite(p.lat) && p.id) ctx.save();   // geocoded coordinates are kept on the place
    fc = got; wxKey = ''; captionKey = ''; paint();
  }
  const conditions = T => fc ? (ctx.clock.isLive() ? ctx.weather.current(fc) : ctx.weather.at(fc, T)) : null;

  function show(s){
    scene = s;
    st().bg = {...st().bg, last: s.id};
    ctx.save();
    engine?.setScene(s);
    captionKey = ''; wxKey = '';
    paint();
    loadForecast();
  }

  function choose(excludeCurrent){
    const bg = {...st().bg};
    if (excludeCurrent){ bg.mode = bg.mode === 'pinned' ? 'all' : bg.mode; bg.last = scene?.id ?? bg.last; }
    return pickScene(SCENES, bg, st().places.map(p => p.name));
  }

  // that day's sunrise and sunset at the scene's place, in local hours; worked out once per local day
  let sunKey = '', sun = [NaN, NaN];
  function sunOf(T, home){
    if (!Number.isFinite(home.lat) || !Number.isFinite(home.lon)) return [NaN, NaN];
    const p = localParts(home.tz, T), k = [home.lat, home.lon, p.y, p.mo, p.d].join();
    if (k !== sunKey){
      sunKey = k;
      const st = sunTimes(Date.UTC(p.y, p.mo - 1, p.d), home.lat, home.lon);
      const hrs = ms => { if (ms == null) return NaN; const q = localParts(home.tz, ms); return q.h + q.mi / 60 + q.s / 3600; };
      sun = [hrs(st.sunrise), hrs(st.sunset)];
    }
    return sun;
  }

  function hourFrac(T){
    const p = localParts(sceneHome(scene, ctx).tz, T);
    return p.h + p.mi / 60 + p.s / 3600;
  }

  function paint(){
    if (!scene) return;
    const T = ctx.clock.getT(), home = sceneHome(scene, ctx);
    const w = conditions(T);
    const k = w ? [w.code, Math.round(w.cover), Math.round(w.wind), w.dir].join() : 'none';
    if (engine && k !== wxKey){ wxKey = k; applyWeather(engine.live, w); }
    const sky = engine ? engine.sky : {};
    const veil = engine ? Math.min(.85, Math.max(0, (engine.live.coverT - .6) / .35)) : 0;
    paintSky(sky, skyHour(hourFrac(T), ...sunOf(T, home)), veil);
    const root = document.documentElement.style;
    root.setProperty('--s1', rgb(sky.s1)); root.setProperty('--s2', rgb(sky.s2)); root.setProperty('--s3', rgb(sky.s3));
    document.body.classList.toggle('day', lum(sky.s2) > 0.62);
    const tc = $('#themeColor'); if (tc) tc.content = rgb(sky.s1);
    caption(T, home, w);
  }

  function caption(T, home, w){
    const wx = w ? `${fmtTemp(w.temp, home)} ${ctx.weather.label(w.code)}` : '';
    const text = [home.name, fmtTime(T, home.tz, st().h12), wx].filter(Boolean).join(' · ');
    if (text === captionKey) return;
    captionKey = text;
    const c = $('#caption');
    c.textContent = text; c.hidden = false;
    c.setAttribute('aria-label', `Background: ${text}. Open background options`);
  }

  // ----- caption menu -----
  function closeMenu(){ menu?.remove(); menu = null; }
  function openMenu(){
    if (menu){ closeMenu(); return; }
    menu = document.createElement('div');
    menu.className = 'pop bg-menu';
    menu.setAttribute('role', 'menu');
    const pinned = st().bg.mode === 'pinned' && st().bg.pinned === scene.id;
    menu.innerHTML = `<div class="pop-title">${esc(scene.name)}</div>
      <button class="lnk" role="menuitem" data-act="next"${SCENES.length < 2 ? ' disabled' : ''}>Next scene</button>
      <button class="lnk" role="menuitem" data-act="pin"${pinned ? ' disabled' : ''}>${pinned ? 'Kept as your scene' : 'Keep this scene'}</button>
      <button class="lnk" role="menuitem" data-act="settings">Background settings…</button>`;
    document.body.append(menu);
    const r = $('#caption').getBoundingClientRect();
    menu.style.left = Math.max(8, r.left - 6) + 'px';
    menu.style.bottom = (innerHeight - r.top + 8) + 'px';
    menu.querySelector('button:not([disabled])')?.focus();
    menu.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      closeMenu();
      if (act === 'next') show(choose(true));
      else if (act === 'pin'){
        st().bg = {...st().bg, mode: 'pinned', pinned: scene.id}; ctx.save();
        ctx.toast(`${scene.name} stays as your background.`);
      } else ctx.openSettings?.('bg');
    });
  }
  $('#caption').addEventListener('click', e => { e.stopPropagation(); openMenu(); });
  document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target) && e.target !== $('#caption')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu){ closeMenu(); $('#caption').focus(); } });

  // ----- crisp details over the painting (flags), redrawn every frame -----
  const fx = $('#sceneFx'), fxc = fx?.getContext('2d');
  let fxT = 0;
  function drawFx(dt){
    if (!fxc) return;
    const W = innerWidth, H = innerHeight, s = Math.min(devicePixelRatio || 1, 2);
    if (fx.width !== Math.round(W * s) || fx.height !== Math.round(H * s)){ fx.width = Math.round(W * s); fx.height = Math.round(H * s); }
    fxc.setTransform(s, 0, 0, s, 0, 0);
    fxc.clearRect(0, 0, W, H);
    if (!scene?.overlay || !engine) return;
    fxT += dt;
    try{ scene.overlay(fxc, W, H, fxT, {night: engine.sky.night ?? 0, wind: engine.live.wind ?? .3}); }catch(e){ console.warn('Dayscape: scene overlay failed', e); }
  }

  // ----- loop -----
  if (engine){
    document.body.classList.add('gl');
    let last = 0;
    const loop = now => {
      requestAnimationFrame(loop);
      if (document.hidden){ last = 0; return; }
      const dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      paint();
      engine.frame(reduceMotion.matches ? 0 : dt);
      drawFx(reduceMotion.matches ? 0 : dt);
    };
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => engine.resize(), 80); });
    engine.resize();
    requestAnimationFrame(loop);
  } else {
    ctx.clock.onTime(paint);
  }

  show(choose(false));

  return {
    engine,
    get scene(){ return scene; },
    next: () => show(choose(true)),
    /** Settings changed the mode: a pinned mode with nothing pinned keeps what is showing. */
    modeChanged(){
      const bg = st().bg;
      if (bg.mode === 'pinned' && !SCENES.some(s => s.id === bg.pinned)){ st().bg = {...bg, pinned: scene.id}; ctx.save(); }
    },
    drawFx,
    repaint(){ captionKey = ''; paint(); loadForecast(); },
    refreshWeather: loadForecast,
  };
}
