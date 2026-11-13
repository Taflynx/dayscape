// Date formats shared by the clock and date widgets. Pure.
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const p2 = n => String(n).padStart(2, '0');

export const DATE_FORMATS = [
  {value: 'short', label: 'Tue 3 Nov'},
  {value: 'long', label: 'Tuesday, 3 November 2026'},
  {value: 'us-long', label: 'Tuesday, November 3, 2026'},
  {value: 'dmy', label: '03/11/2026'},
  {value: 'mdy', label: '11/03/2026'},
  {value: 'iso', label: '2026-11-03'},
];

/** {y, mo (1-12), d, wd (0 = Sunday)} in the given format; 'none' gives ''. */
export function fmtDate({y, mo, d, wd}, f){
  switch (f){
    case 'none': return '';
    case 'long': return `${WD[wd]}, ${d} ${MO[mo - 1]} ${y}`;
    case 'us-long': return `${WD[wd]}, ${MO[mo - 1]} ${d}, ${y}`;
    case 'dmy': return `${p2(d)}/${p2(mo)}/${y}`;
    case 'mdy': return `${p2(mo)}/${p2(d)}/${y}`;
    case 'iso': return `${y}-${p2(mo)}-${p2(d)}`;
    default: return `${WD[wd].slice(0, 3)} ${d} ${MO[mo - 1].slice(0, 3)}`;
  }
}
