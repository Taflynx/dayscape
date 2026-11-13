// Every widget, in library order.
import search from './search.js';
import sites from './sites.js';
import notes from './notes.js';
import todo from './todo.js';
import clock from './clock.js';
import date from './date.js';
import worldclocks from './worldclocks.js';
import calendar from './calendar.js';
import timeline from './timeline.js';
import weather from './weather.js';
import timer from './timer.js';
import sunmoon from './sunmoon.js';
import planner from './planner.js';
import currency from './currency.js';

export const LIBRARY = [search, clock, date, weather, timeline, worldclocks, calendar, sunmoon, planner, timer, currency, sites, notes, todo];
export const WIDGETS = Object.fromEntries(LIBRARY.map(m => [m.type, m]));
