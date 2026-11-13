// A countdown timer and a Pomodoro. Runs on real time (not the scrubbed one) and survives a reload.
import { pad } from '../time.js';
import { uid } from '../util.js';

const M = 60e3;
const POMO = {work: 25 * M, break: 5 * M, long: 15 * M};
const PHASE_NAME = {work: 'Focus', break: 'Short break', long: 'Long break'};
const TITLE = "⏰ Time's up · Dayscape";

let audio = null;
function tone(){
  try{
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [0, .32, .64].forEach((d, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = i === 2 ? 988 : 784;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.25, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .28);
      o.connect(g).connect(audio.destination); o.start(t + d); o.stop(t + d + .3);
    });
  }catch{ /* no audio: the title still tells */ }
}

const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : String(m)) + ':' + pad(s % 60); };

export default {
  type: 'timer', name: 'Timer', description: 'A countdown or a Pomodoro, with a gentle chime at zero.',
  multi: true, size: {w: 6, h: 4}, min: {w: 4, h: 3},
  defaults: {mode: 'countdown', dur: 10 * M, end: null, left: null, phase: 'work', round: 1},
  mount(el, w, ctx){
    el.classList.add('timerw');
    const group = 'tm-' + uid();   // a local radio-group name, never taken from saved data
    const o = () => ctx.opts(w);
    const set = patch => { w.settings = {...w.settings, ...patch}; ctx.save(); draw(); };
    const duration = () => o().mode === 'pomodoro' ? POMO[o().phase] : o().dur;
    const remaining = () => { const s = o(); return s.end ? s.end - Date.now() : s.left ?? duration(); };

    el.innerHTML = `<div class="seg tm-mode" role="radiogroup" aria-label="Timer mode">
        <label><input type="radio" name="${group}" value="countdown"><span>Timer</span></label>
        <label><input type="radio" name="${group}" value="pomodoro"><span>Pomodoro</span></label></div>
      <div class="tm-phase mono"></div>
      <div class="tm-left display" aria-live="off"></div>
      <div class="tm-presets"></div>
      <div class="tm-ctl"><button class="btn sm tm-go" type="button"></button><button class="btn sm ghost-btn tm-reset" type="button">Reset</button></div>`;
    const left = el.querySelector('.tm-left'), go = el.querySelector('.tm-go');

    function draw(){
      const s = o(), running = !!s.end;
      el.querySelector(`input[value="${s.mode}"]`).checked = true;
      el.querySelector('.tm-phase').textContent = s.mode === 'pomodoro' ? `${PHASE_NAME[s.phase]}${s.phase === 'work' ? ` · ${s.round} of 4` : ''}` : '';
      left.textContent = fmt(remaining());
      go.textContent = running ? 'Pause' : (s.left != null && s.left < duration() ? 'Resume' : 'Start');
      el.querySelector('.tm-reset').textContent = s.mode === 'pomodoro' ? 'Skip' : 'Reset';
      const pre = el.querySelector('.tm-presets');
      pre.hidden = s.mode === 'pomodoro';
      if (!pre.hidden && !pre.dataset.built){
        pre.dataset.built = '1';
        pre.innerHTML = [5, 10, 25].map(m => `<button type="button" class="chip" data-min="${m}">${m} min</button>`).join('') +
          `<label class="chip chip-in"><input type="number" min="1" max="600" inputmode="numeric" aria-label="Custom minutes" placeholder="min"></label>`;
      }
      pre.querySelectorAll('[data-min]').forEach(b => b.classList.toggle('on', +b.dataset.min * M === s.dur));
      el.classList.toggle('running', running);
    }

    /** Ends the current run; a Pomodoro moves to its next phase. Skipping does so without the chime. */
    function finish(chime = true){
      const s = o();
      if (chime){ tone(); document.title = TITLE; el.classList.add('done'); }
      if (s.mode === 'pomodoro'){
        const next = s.phase === 'work' ? (s.round >= 4 ? 'long' : 'break') : 'work';
        const round = s.phase === 'work' ? s.round : (s.phase === 'long' ? 1 : s.round + 1);
        set({end: null, left: null, phase: next, round});
      } else set({end: null, left: 0});
    }

    el.addEventListener('change', e => {
      if (e.target.name === group) set({mode: e.target.value, end: null, left: null});
      else if (e.target.type === 'number'){ const m = Math.round(+e.target.value); if (m >= 1 && m <= 600) set({dur: m * M, end: null, left: null}); e.target.value = ''; }
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.min) set({dur: +b.dataset.min * M, end: null, left: null});
      else if (b === go){
        const s = o();
        if (s.end) set({left: s.end - Date.now(), end: null});
        else { const r = remaining() > 0 ? remaining() : duration(); set({end: Date.now() + r, left: null}); }
      } else if (b.classList.contains('tm-reset')){
        if (o().mode === 'pomodoro') finish(false);
        else set({end: null, left: null});
      }
    });
    const clear = () => { if (document.title === TITLE){ document.title = 'Dayscape'; } el.classList.remove('done'); };
    document.addEventListener('pointerdown', clear);
    document.addEventListener('keydown', clear);

    const iv = setInterval(() => {
      const s = o();
      if (!s.end) return;
      if (s.end - Date.now() <= 0) finish(); else left.textContent = fmt(remaining());
    }, 250);
    draw();
    return {destroy(){ clearInterval(iv); document.removeEventListener('pointerdown', clear); document.removeEventListener('keydown', clear); }};
  },
};
