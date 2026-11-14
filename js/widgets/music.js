// Calm focus music: live radio stations from YouTube, with play, pause, previous and next.
// Each station is a channel's current live stream, so a station keeps working when the channel starts a new stream.

export const STATIONS = [
  {name: 'Lofi beats', by: 'Lofi Girl', channel: 'UCSJ4gkVC6NrvII8umztf0Ow'},
  {name: 'Café jazz', by: 'Cafe Music BGM', channel: 'UCJhjE7wbdYAae1G25m0tHAA'},
  {name: 'Calm piano', by: 'Soothing Relaxation', channel: 'UCjzHeG1KWoonmf9d5KBvSiw'},
  {name: 'Chill beats', by: 'Essentials Radio', channel: 'UCOxqgCwgOqC2lMqC5PYz_Dg'},
];

/** The station `d` steps from `i`, wrapping around. */
export function stepStation(i, d, n = STATIONS.length){
  i = Number.isFinite(i) ? Math.trunc(i) : 0;
  return (((i + d) % n) + n) % n;
}

export function embedUrl(st, autoplay){
  const u = new URL('https://www.youtube-nocookie.com/embed/live_stream');
  u.searchParams.set('channel', st.channel);
  u.searchParams.set('autoplay', autoplay ? '1' : '0');
  u.searchParams.set('enablejsapi', '1');
  u.searchParams.set('controls', '0');
  u.searchParams.set('modestbranding', '1');
  u.searchParams.set('playsinline', '1');
  if (typeof location !== 'undefined' && location.origin?.startsWith('http')) u.searchParams.set('origin', location.origin);
  return u.href;
}

const ICON = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M19 5 9 12l10 7z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M5 5l10 7-10 7z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
};

export default {
  type: 'music', name: 'Focus music', description: 'Calm live radio to focus by: lofi, jazz, piano and chill beats.',
  multi: false, size: {w: 6, h: 4}, min: {w: 4, h: 3},
  defaults: {station: 0},
  mount(el, w, ctx){
    el.classList.add('musicw');
    let playing = false, frame = null;
    const idx = () => stepStation(ctx.opts(w).station, 0);
    el.innerHTML = `<div class="mu-screen"><div class="mu-cover" aria-hidden="true"></div></div>
      <div class="mu-info"><div class="mu-name"></div><div class="mu-by"></div></div>
      <div class="mu-ctl">
        <button class="mu-btn" type="button" data-act="prev" aria-label="Previous station">${ICON.prev}</button>
        <button class="mu-btn mu-play" type="button" data-act="play" aria-label="Play">${ICON.play}</button>
        <button class="mu-btn" type="button" data-act="next" aria-label="Next station">${ICON.next}</button>
      </div>`;
    const screen = el.querySelector('.mu-screen'), playBtn = el.querySelector('.mu-play');

    function label(){
      const st = STATIONS[idx()];
      el.querySelector('.mu-name').textContent = st.name;
      el.querySelector('.mu-by').textContent = `${st.by} · live on YouTube`;
      playBtn.innerHTML = playing ? ICON.pause : ICON.play;
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      el.classList.toggle('playing', playing);
    }
    const command = func => frame?.contentWindow?.postMessage(JSON.stringify({event: 'command', func, args: []}), '*');

    // the player loads only when asked to play, so nothing is fetched from YouTube until then
    function load(){
      frame?.remove();
      frame = document.createElement('iframe');
      frame.className = 'mu-frame';
      frame.title = STATIONS[idx()].name + ' (YouTube live stream)';
      frame.allow = 'autoplay; encrypted-media';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.src = embedUrl(STATIONS[idx()], true);
      screen.append(frame);
    }
    function play(){ if (!frame) load(); else command('playVideo'); playing = true; label(); }
    function pause(){ command('pauseVideo'); playing = false; label(); }
    function go(d){
      w.settings = {...w.settings, station: stepStation(idx(), d)}; ctx.save();
      if (frame || playing){ load(); playing = true; }
      label();
    }

    el.querySelector('.mu-ctl').addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'play') playing ? pause() : play();
      else if (act === 'prev') go(-1);
      else if (act === 'next') go(1);
    });
    label();
    return {update(){}, resize(){}, destroy(){ frame?.remove(); }};
  },
};
