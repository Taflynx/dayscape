import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeather } from '../js/weather.js';

const H = 3600e3, T0 = Date.UTC(2026, 10, 13, 0);
function memStorage(){ const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v))}; }
function reply(){
  const hours = [0, 1, 2, 3].map(i => T0 / 1000 + i * 3600);
  return {
    current: {weather_code: 2, temperature_2m: 12, wind_speed_10m: 10, wind_direction_10m: 270, cloud_cover: 40},
    hourly: {time: hours, temperature_2m: [10, 14, 12, 8], weather_code: [0, 2, 61, 3], wind_speed_10m: [5, 9, 13, 7],
      wind_direction_10m: [90, 180, 270, 0], cloud_cover: [0, 40, 90, 100]},
    daily: {time: [T0 / 1000], temperature_2m_max: [15], temperature_2m_min: [6], weather_code: [61], sunrise: [T0 / 1000 + 6 * 3600], sunset: [T0 / 1000 + 17 * 3600]},
  };
}
const place = {id: 'a', name: 'Montreal', tz: 'America/Toronto', lat: 45.5, lon: -73.57};

test('at() between two hourly points interpolates temp linearly', async () => {
  const w = createWeather({fetchJSON: async () => reply(), storage: memStorage(), now: () => T0});
  const fc = await w.get(place);
  assert.equal(w.at(fc, T0 + H / 2).temp, 12);
  assert.equal(w.at(fc, T0 + H * 1.25).temp, 13.5);
});

test('at() outside the range returns the nearest point', async () => {
  const w = createWeather({fetchJSON: async () => reply(), storage: memStorage(), now: () => T0});
  const fc = await w.get(place);
  assert.equal(w.at(fc, T0 - 10 * H).temp, 10);
  assert.equal(w.at(fc, T0 + 99 * H).temp, 8);
  assert.equal(w.at(fc, T0 + 99 * H).code, 3);
});

test('get() when fetchJSON rejects resolves null without throwing', async () => {
  const w = createWeather({fetchJSON: async () => { throw new Error('offline'); }, storage: memStorage(), now: () => T0});
  assert.equal(await w.get(place), null);
});

test('a second get() within 30 minutes makes no new fetch', async () => {
  let calls = 0, t = T0;
  const w = createWeather({fetchJSON: async () => { calls++; return reply(); }, storage: memStorage(), now: () => t});
  await w.get(place);
  t += 29 * 60e3;
  await w.get(place);
  assert.equal(calls, 1);
  t += 2 * 60e3;
  await w.get(place);
  assert.equal(calls, 2);
});

test('label() uses the ported Dayline names', () => {
  const w = createWeather({fetchJSON: async () => reply(), storage: memStorage(), now: () => T0});
  assert.equal(w.label(63), 'Rain');
  assert.equal(w.label(61), 'Light rain');
  assert.equal(w.label(0), 'Clear');
});

test('get() resolves coordinates by geocoding and stores them on the place', async () => {
  const p = {id: 'b', name: 'Tokyo', cc: 'jp', tz: 'Asia/Tokyo'};
  const w = createWeather({fetchJSON: async url => url.includes('geocoding') ? {results: [{latitude: 35.68, longitude: 139.69, country_code: 'JP'}]} : reply(), storage: memStorage(), now: () => T0});
  const fc = await w.get(p);
  assert.ok(fc);
  assert.equal(p.lat, 35.68);
  assert.equal(p.lon, 139.69);
});
