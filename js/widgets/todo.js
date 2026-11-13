import { esc, uid } from '../util.js';

export default {
  type: 'todo', name: 'To-do', description: 'A short checklist. Tick things off, then clear them.',
  multi: true, size: {w: 6, h: 5}, min: {w: 4, h: 3},
  defaults: {items: []},
  mount(el, w, ctx){
    el.classList.add('todo');
    el.innerHTML = `<input class="todo-add" type="text" placeholder="Add a task and press Enter" aria-label="New task" maxlength="200">
      <ul class="todo-list"></ul>
      <div class="todo-foot"><span class="todo-left mono"></span><button class="lnk todo-clear" type="button">Clear done</button></div>`;
    const list = el.querySelector('.todo-list'), add = el.querySelector('.todo-add');
    const items = () => Array.isArray(w.settings.items) ? w.settings.items : [];
    const store = next => { w.settings = {...w.settings, items: next}; ctx.save(); draw(); };
    function draw(){
      const it = items();
      list.innerHTML = it.length ? it.map(t => `<li data-id="${esc(t.id)}" class="${t.done ? 'done' : ''}">
          <label><input type="checkbox"${t.done ? ' checked' : ''}><span>${esc(t.text)}</span></label>
          <button class="todo-x" type="button" aria-label="Remove ${esc(t.text)}">×</button></li>`).join('')
        : '<li class="todo-empty">Nothing to do yet.</li>';
      const left = it.filter(t => !t.done).length, done = it.length - left;
      el.querySelector('.todo-left').textContent = it.length ? `${left} left` : '';
      el.querySelector('.todo-clear').hidden = !done;
    }
    add.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const text = add.value.trim();
      if (!text) return;
      add.value = '';
      store([...items(), {id: uid(), text, done: false}]);
    });
    list.addEventListener('change', e => {
      const id = e.target.closest('li')?.dataset.id;
      store(items().map(t => t.id === id ? {...t, done: e.target.checked} : t));
    });
    list.addEventListener('click', e => {
      if (!e.target.closest('.todo-x')) return;
      const id = e.target.closest('li').dataset.id;
      store(items().filter(t => t.id !== id));
    });
    el.querySelector('.todo-clear').addEventListener('click', () => store(items().filter(t => !t.done)));
    draw();
  },
};
