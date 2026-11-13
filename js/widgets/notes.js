import { debounce } from '../util.js';

export const NOTE_COLORS = {butter: '#F6E7A8', rose: '#F2C9C4', sage: '#CFE0C3', sky: '#C9DCEB'};

export default {
  type: 'notes', name: 'Note', description: 'A sticky note that saves as you type.',
  multi: true, float: true, size: {w: 5, h: 4}, min: {w: 3, h: 3},
  defaults: {color: 'butter', text: ''},
  fields: [{key: 'color', label: 'Colour', kind: 'select', options: [
    {value: 'butter', label: 'Butter'}, {value: 'rose', label: 'Rose'}, {value: 'sage', label: 'Sage'}, {value: 'sky', label: 'Sky'}]}],
  mount(el, w, ctx){
    const o = ctx.opts(w);
    el.closest('.widget').style.setProperty('--note', NOTE_COLORS[o.color] || NOTE_COLORS.butter);
    el.closest('.widget').classList.add('is-note');
    const ta = document.createElement('textarea');
    ta.className = 'note-text';
    ta.placeholder = 'Write something…';
    ta.setAttribute('aria-label', 'Note text');
    ta.value = o.text;
    const store = debounce(() => { w.settings = {...w.settings, text: ta.value}; ctx.save(); }, 400);
    ta.addEventListener('input', store);
    el.append(ta);
    // a slight tilt, steady per note, so a pile reads as paper
    const tilt = ([...w.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 7 - 3) * .6;
    el.closest('.widget').style.setProperty('--tilt', tilt + 'deg');
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'note-add'; add.textContent = '+';
    add.setAttribute('aria-label', 'Add another note');
    add.addEventListener('click', () => ctx.addWidget('notes', w));
    el.append(add);
    return {destroy(){ if (ta.value !== (w.settings.text ?? '')){ w.settings = {...w.settings, text: ta.value}; ctx.save(); } }};
  },
};
