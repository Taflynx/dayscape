import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, CITY_DATA, DEFAULT_PLACES } from '../js/places.js';

const NOW = Date.UTC(2026, 10, 13, 12);

test('searchPlaces ranks the city name match first', () => {
  assert.equal(searchPlaces('mont', NOW)[0].name, 'Montreal');
});

test('searchPlaces finds Kathmandu with its zone', () => {
  assert.equal(searchPlaces('kathmandu', NOW)[0].tz, 'Asia/Kathmandu');
});

test('searchPlaces returns at most 12 results', () => {
  assert.ok(searchPlaces('a', NOW).length <= 12);
});

test('every default place is in the catalogue', () => {
  for (const n of DEFAULT_PLACES) assert.ok(CITY_DATA.some(c => c.name === n), n);
});
