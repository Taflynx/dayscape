// Where am I: a coarse guess from the network, or a precise one from the browser. Ported from Dayline.

export async function getJSON(url, ms = 9000){
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try{ const r = await fetch(url, {signal: c.signal}); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally{ clearTimeout(t); }
}

export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** -> {name, country, cc, lat, lon, tz} | null */
export async function ipLookup(){
  try{
    const j = await getJSON('https://ipwho.is/');
    if (j.success !== false && j.city) return {name: j.city, country: j.country, cc: (j.country_code || '').toLowerCase(), lat: j.latitude, lon: j.longitude, tz: j.timezone?.id};
  }catch{}
  try{
    const j = await getJSON('https://ipapi.co/json/');
    if (j.city) return {name: j.city, country: j.country_name, cc: (j.country_code || '').toLowerCase(), lat: j.latitude, lon: j.longitude, tz: j.timezone};
  }catch{}
  return null;
}

/** Rejects when the browser refuses or has no location. */
export async function gpsLookup(){
  const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout: 12000, maximumAge: 600000}));
  const lat = pos.coords.latitude, lon = pos.coords.longitude;
  let name = '', country = '', cc = '';
  try{
    const j = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    name = j.city || j.locality || j.principalSubdivision || ''; country = j.countryName || ''; cc = (j.countryCode || '').toLowerCase();
  }catch{}
  return {name: name || 'My location', country, cc, lat, lon, tz: browserTz()};
}
