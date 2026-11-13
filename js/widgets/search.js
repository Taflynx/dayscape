import { ENGINES, engineOf, searchUrl } from './engines.js';

export default {
  type: 'search', name: 'Search', description: 'Search the web with the engine you choose.',
  multi: false, size: {w: 10, h: 2}, min: {w: 6, h: 2},
  defaults: {engine: 'google'},
  fields: [{key: 'engine', label: 'Search engine', kind: 'select', options: ENGINES.map(e => ({value: e.id, label: e.name}))}],
  mount(el, w, ctx){
    const eng = engineOf(ctx.opts(w).engine);
    el.classList.add('search');
    el.innerHTML = `<form class="search-form" role="search">
      <svg class="search-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      <input class="search-q" type="search" name="q" autocomplete="off" enterkeyhint="search"></form>`;
    const q = el.querySelector('.search-q');
    q.placeholder = `Search with ${eng.name}`;
    q.setAttribute('aria-label', `Search with ${eng.name}`);
    el.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const text = q.value.trim();
      if (text) location.href = searchUrl(eng.id, text);
    });
    // a home page should be ready to type into, unless something else already has focus
    requestAnimationFrame(() => { if (document.activeElement === document.body && !document.querySelector('dialog[open]')) q.focus({preventScroll: true}); });
  },
};
