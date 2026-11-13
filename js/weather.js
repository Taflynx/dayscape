// Forecasts from Open-Meteo (no key needed), cached per place for 30 minutes. Pure: fetch, storage and clock are injected.

const KEY = 'dayscape.wx';
const FRESH = 30 * 60e3;

/** WMO weather code -> [label, painted kind, amount 0..1]. Ported from Dayline. */
export const WX = code =>
  code === 0 ? ['Clear', null, 0] : code === 1 ? ['Mostly clear', null, 0] : code === 2 ? ['Partly cloudy', null, 0] : code === 3 ? ['Overcast', null, 0] :
  code <= 48 ? ['Fog', 'fog', 0] : code <= 55 ? ['Drizzle', 'rain', .3] : code <= 57 ? ['Freezing drizzle', 'rain', .35] :
  code === 61 ? ['Light rain', 'rain', .45] : code === 63 ? ['Rain', 'rain', .7] : code <= 67 ? ['Heavy rain', 'rain', 1] :
  code === 71 ? ['Light snow', 'snow', .4] : code === 73 ? ['Snow', 'snow', .7] : code <= 77 ? ['Heavy snow', 'snow', 1] :
  code === 80 ? ['Showers', 'rain', .5] : code === 81 ? ['Showers', 'rain', .75] : code === 82 ? ['Downpour', 'rain', 1] :
  code <= 86 ? ['Snow showers', 'snow', .7] : ['Thunderstorm', 'storm', .9];

const placeKey = p => p.lat.toFixed(2) + ',' + p.lon.toFixed(2);

function nowFrom(o){
  const [, kind, amt] = WX(o.code);
  return {...o, kind, rain: kind === 'rain' || kind === 'storm' ? amt : 0, snow: kind === 'snow' ? amt : 0};
}

export function createWeather({fetchJSON, storage, now = Date.now}){
  const busy = new Map();
  let cache = {};
  try{ cache = JSON.parse(storage.getItem(KEY)) || {}; }catch{ cache = {}; }
  const persist = () => { try{ storage.setItem(KEY, JSON.stringify(cache)); }catch{} };

  async function coords(p){
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) return true;
    try{
      const j = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(p.name)}&count=5&language=en&format=json`);
      const rs = j.results || [];
      const r = rs.find(r => !p.cc || (r.country_code || '').toLowerCase() === p.cc) || rs[0];
      if (r){ p.lat = r.latitude; p.lon = r.longitude; return true; }
    }catch{}
    return false;
  }

  async function load(p){
    if (!await coords(p)) return null;
    const key = placeKey(p), hit = cache[key];
    if (hit && now() - hit.fetched < FRESH) return hit;
    try{
      const f = 'temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m';
      const d = 'temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset';
      const j = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=${f}&hourly=${f}&daily=${d}&past_days=1&forecast_days=7&timeformat=unixtime&timezone=GMT`);
      const h = j.hourly, dy = j.daily, ms = a => a.map(s => s * 1000);
      const fc = {
        lat: p.lat, lon: p.lon, fetched: now(),
        cur: {code: j.current.weather_code, temp: j.current.temperature_2m, wind: j.current.wind_speed_10m, dir: j.current.wind_direction_10m, cover: j.current.cloud_cover},
        hourly: {t: ms(h.time), code: h.weather_code, temp: h.temperature_2m, wind: h.wind_speed_10m, dir: h.wind_direction_10m, cover: h.cloud_cover},
        daily: {t: ms(dy.time), hi: dy.temperature_2m_max, lo: dy.temperature_2m_min, code: dy.weather_code, sunrise: ms(dy.sunrise), sunset: ms(dy.sunset)},
      };
      cache[key] = fc;
      for (const k in cache) if (now() - cache[k].fetched > 6 * 3600e3) delete cache[k];
      persist();
      return fc;
    }catch{
      return hit || null;   // offline: an old forecast beats none
    }
  }

  return {
    /** Resolves the place's forecast, or null when it cannot be had. Never rejects. */
    get(p){
      const k = p.id || p.name;
      if (!busy.has(k)) busy.set(k, load(p).catch(() => null).finally(() => busy.delete(k)));
      return busy.get(k);
    },
    /** Conditions at T (ms): linear between hours, the nearest hour outside the range. */
    at(fc, T){
      const h = fc?.hourly;
      if (!h || !h.t.length) return null;
      const n = h.t.length;
      if (T <= h.t[0]) return nowFrom(pick(h, 0));
      if (T >= h.t[n - 1]) return nowFrom(pick(h, n - 1));
      let i = 0; while (h.t[i + 1] < T) i++;
      const f = (T - h.t[i]) / (h.t[i + 1] - h.t[i]), near = f < .5 ? i : i + 1;
      const lerp = k => h[k][i] + (h[k][i + 1] - h[k][i]) * f;
      return nowFrom({code: h.code[near], dir: h.dir[near], temp: lerp('temp'), wind: lerp('wind'), cover: lerp('cover')});
    },
    /** The latest observed conditions. */
    current: fc => fc?.cur ? nowFrom(fc.cur) : null,
    label: code => WX(code)[0],
  };
}
const pick = (h, i) => ({code: h.code[i], temp: h.temp[i], wind: h.wind[i], dir: h.dir[i], cover: h.cover[i]});

export const usesF = p => p?.cc === 'us';
export const fmtTemp = (c, p) => usesF(p) ? Math.round(c * 9 / 5 + 32) + '°F' : Math.round(c) + '°C';
export const fmtWind = (k, p) => usesF(p) ? Math.round(k / 1.609) + ' mph' : Math.round(k) + ' km/h';

/** Sets the painting's weather targets from conditions (null = a clear, gentle day). Ported from Dayline. */
export function applyWeather(live, w){
  if (!w){
    Object.assign(live, {windT: .22, dirT: 1, coverT: .25, rainT: 0, kind: null, overT: 0, fogT: 0});
    return;
  }
  const [, kind, amt] = WX(w.code);
  let dx = -Math.sin(w.dir * Math.PI / 180);   // wind blows away from the side it comes from
  if (Math.abs(dx) < .35) dx = dx < 0 ? -.35 : .35;
  const cover = kind === 'fog' ? .9 : kind ? Math.max(.7, w.cover / 100) : w.cover / 100;
  Object.assign(live, {windT: Math.max(.06, Math.min(1, w.wind / 45)), dirT: dx, coverT: cover, rainT: kind && kind !== 'fog' ? amt : 0, kind});
  live.overT = kind === 'storm' ? 1 : Math.max(0, (cover - .55) / .45);
  live.fogT = kind === 'fog' ? 1 : 0;
}
