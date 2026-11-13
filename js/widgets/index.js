// Every widget, in library order.
import search from './search.js';
import sites from './sites.js';
import notes from './notes.js';
import todo from './todo.js';

export const LIBRARY = [search, sites, notes, todo];
export const WIDGETS = Object.fromEntries(LIBRARY.map(m => [m.type, m]));
