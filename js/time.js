// Time zone maths and formatting. Pure; uses only Intl.

export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const pad = n => String(n).padStart(2, '0');

export function validTz(tz){
  try { new Intl.DateTimeFormat('en', {timeZone: tz}); return true; } catch { return false; }
}

const dtf = {}, abbrF = {}, offCache = new Map();
const partsF = tz => dtf[tz] || (dtf[tz] = new Intl.DateTimeFormat('en-US', {
  timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short'}));
const WD = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};

/** Wall-clock fields of `ms` in `tz`. mo is 1-based; wd 0 = Sunday. */
export function localParts(tz, ms){
  const p = {};
  for (const x of partsF(tz).formatToParts(ms)) p[x.type] = x.value;
  return {y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD[p.weekday]};
}

/** Offset of `tz` from UTC at instant `ms`, in minutes. */
export function tzOffset(tz, ms){
  const key = tz + '|' + Math.floor(ms / (15 * MIN));
  let v = offCache.get(key);
  if (v !== undefined) return v;
  const p = localParts(tz, ms);
  v = Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / MIN);
  if (offCache.size > 4000) offCache.clear();
  offCache.set(key, v);
  return v;
}

export function tzAbbr(tz, ms){
  const f = abbrF[tz] || (abbrF[tz] = new Intl.DateTimeFormat('en-US', {timeZone: tz, timeZoneName: 'short'}));
  return f.formatToParts(ms).find(p => p.type === 'timeZoneName')?.value || '';
}

/** "09:05" or "9:05 AM". */
export function fmtTime(ms, tz, h12){
  const {h, mi} = localParts(tz, ms);
  if (!h12) return pad(h) + ':' + pad(mi);
  return ((h % 12) || 12) + ':' + pad(mi) + ' ' + (h < 12 ? 'AM' : 'PM');
}

/** "+5:45", "−3", or "" for no difference. */
export function fmtDiff(min){
  if (!min) return '';
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return (min > 0 ? '+' : '−') + h + (m ? ':' + pad(m) : '');
}

/** "in 2h 5m", "3h ago", "right now". */
export function relLabel(ms){
  const m = Math.round(ms / MIN);
  if (m === 0) return 'right now';
  const a = Math.abs(m), d = Math.floor(a / 1440), h = Math.floor(a % 1440 / 60), mm = a % 60;
  const s = [d && d + 'd', h && h + 'h', mm && mm + 'm'].filter(Boolean).join(' ');
  return m > 0 ? 'in ' + s : s + ' ago';
}

/** ISO-8601 week number of a calendar date (mo is 1-based). */
export function isoWeek(y, mo, d){
  const t = new Date(Date.UTC(y, mo - 1, d));
  const wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - y0) / DAY + 1) / 7);
}
