// Every widget, in library order.
import notes from './notes.js';

export const LIBRARY = [notes];
export const WIDGETS = Object.fromEntries(LIBRARY.map(m => [m.type, m]));
