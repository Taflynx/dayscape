import { esc, uid } from '../util.js';
import { normalizeUrl, siteHost } from './engines.js';

const icon = url => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(siteHost(url))}.ico`;
const nameFor = url => { const h = siteHost(url).split('.'); const n = h.length > 1 ? h[h.length - 2] : h[0]; return n.charAt(0).toUpperCase() + n.slice(1); };

export default {
  type: 'sites', name: 'Sites', description: 'Your favourite sites as one-click tiles.',
  multi: true, size: {w: 8, h: 4}, min: {w: 4, h: 2},
  defaults: {sites: []},
  mount(el, w, ctx){
    el.classList.add('sites');
    const sites = () => Array.isArray(w.settings.sites) ? w.settings.sites : [];
    const store = next => { w.settings = {...w.settings, sites: next}; ctx.save(); draw(); };
    let editing = null;   // null, 'new' or a site id

    function draw(){
      const list = sites();
      // a restored backup could hold anything: only plain web addresses become links
      const safe = list.map(s => ({...s, url: normalizeUrl(s.url)})).filter(s => s.url);
      el.innerHTML = `<ul class="tiles">${safe.map(s => `<li class="tile" draggable="true" data-id="${esc(s.id)}">
          <a href="${esc(s.url)}" title="${esc(s.url)}"><span class="tile-ico"><img alt="" loading="lazy" src="${esc(icon(s.url))}"><b>${esc((s.name || '?').charAt(0))}</b></span><span class="tile-name">${esc(s.name)}</span></a>
          <button class="tile-more" type="button" aria-label="Options for ${esc(s.name)}" aria-haspopup="menu">⋯</button></li>`).join('')}
        <li class="tile tile-add"><button type="button" class="tile-plus" aria-label="Add a site"><span class="tile-ico">+</span><span class="tile-name">${list.length ? 'Add' : 'Add a site'}</span></button></li></ul>`;
      el.querySelectorAll('.tile-ico img').forEach(img => img.addEventListener('error', () => img.remove(), {once: true}));
      if (editing) form();
    }

    function form(){
      const s = sites().find(x => x.id === editing);
      const f = document.createElement('form');
      f.className = 'site-form';
      f.innerHTML = `<div class="pop-title">${s ? 'Edit site' : 'Add a site'}</div>
        <label class="fld"><span>Web address</span><input name="url" type="text" inputmode="url" autocomplete="off" placeholder="example.com"></label>
        <label class="fld"><span>Name (optional)</span><input name="name" type="text" maxlength="40"></label>
        <p class="site-err" role="alert" hidden>Enter a web address like example.com.</p>
        <div class="pop-row"><button class="btn sm" type="submit">${s ? 'Save' : 'Add site'}</button><button class="btn sm ghost-btn" type="button" data-cancel>Cancel</button></div>`;
      f.url.value = s?.url || ''; f.name.value = s?.name || '';
      el.append(f);
      f.url.focus();
      f.addEventListener('submit', e => {
        e.preventDefault();
        const url = normalizeUrl(f.url.value);
        if (!url){ f.querySelector('.site-err').hidden = false; f.url.focus(); return; }
        const name = f.name.value.trim() || nameFor(url);
        const next = s ? sites().map(x => x.id === s.id ? {...x, url, name} : x) : [...sites(), {id: uid(), url, name}];
        editing = null; store(next);
      });
      f.querySelector('[data-cancel]').addEventListener('click', () => { editing = null; draw(); });
      f.addEventListener('keydown', e => { if (e.key === 'Escape'){ e.stopPropagation(); editing = null; draw(); } });
    }

    let menu = null;
    const closeMenu = () => { menu?.remove(); menu = null; };
    function openMenu(btn, id){
      closeMenu();
      menu = document.createElement('div');
      menu.className = 'tile-menu'; menu.setAttribute('role', 'menu');
      menu.innerHTML = '<button type="button" role="menuitem" data-act="edit">Edit</button><button type="button" role="menuitem" data-act="remove">Remove</button>';
      btn.closest('.tile').append(menu);
      menu.querySelector('button').focus();
      menu.addEventListener('click', e => {
        const act = e.target.dataset.act; closeMenu();
        if (act === 'edit'){ editing = id; draw(); }
        else if (act === 'remove') store(sites().filter(x => x.id !== id));
      });
    }

    el.addEventListener('click', e => {
      const more = e.target.closest('.tile-more');
      if (more){ e.preventDefault(); openMenu(more, more.closest('.tile').dataset.id); return; }
      if (e.target.closest('.tile-plus')){ editing = 'new'; draw(); }
    });
    const outside = e => { if (menu && !menu.contains(e.target)) closeMenu(); };
    document.addEventListener('pointerdown', outside);

    // drag a tile onto another to reorder
    let dragId = null;
    el.addEventListener('dragstart', e => { const t = e.target.closest('.tile[data-id]'); if (!t) return; dragId = t.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); t.classList.add('dragging'); });
    el.addEventListener('dragover', e => { if (dragId && e.target.closest('.tile')){ e.preventDefault(); } });
    el.addEventListener('drop', e => {
      const t = e.target.closest('.tile');
      if (!dragId || !t) return;
      e.preventDefault();
      const list = sites().slice(), from = list.findIndex(x => x.id === dragId);
      const [moved] = list.splice(from, 1);
      const to = t.dataset.id ? list.findIndex(x => x.id === t.dataset.id) : list.length;
      list.splice(to < 0 ? list.length : to, 0, moved);
      dragId = null; store(list);
    });
    el.addEventListener('dragend', () => { dragId = null; el.querySelector('.dragging')?.classList.remove('dragging'); });

    draw();
    return {destroy(){ document.removeEventListener('pointerdown', outside); }};
  },
};
