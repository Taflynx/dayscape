// Sunrise, sunset and the moon's phase. Pure. The sun follows the NOAA sunrise equation; the moon uses the mean synodic month.

const RAD = Math.PI / 180, DAY_MS = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009;
const E = RAD * 23.4397;   // obliquity of the ecliptic
const toDays = ms => ms / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = j => Math.round((j + 0.5 - J1970) * DAY_MS);
const meanAnomaly = d => RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = M => M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const transitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

/**
 * Sunrise and sunset for the calendar day of `dateMs` (read in UTC: pass Date.UTC(y, m, d) for a local date).
 * Returns nulls during polar day (dayLength 1440) or polar night (dayLength 0). dayLength is in minutes.
 */
export function sunTimes(dateMs, lat, lon){
  // anchor on that day's rough solar noon at this longitude, so the right transit is picked east or west
  const solarNoon = Math.floor(dateMs / DAY_MS) * DAY_MS + DAY_MS / 2 - lon / 360 * DAY_MS;
  const lw = -RAD * lon, phi = RAD * lat, d = toDays(solarNoon);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = approxTransit(0, lw, n), M = meanAnomaly(ds), L = eclipticLongitude(M);
  const dec = Math.asin(Math.sin(E) * Math.sin(L));
  const noon = transitJ(ds, M, L);
  const x = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (x < -1) return {sunrise: null, sunset: null, dayLength: 1440, noon: fromJulian(noon)};
  if (x > 1) return {sunrise: null, sunset: null, dayLength: 0, noon: fromJulian(noon)};
  const set = transitJ(approxTransit(Math.acos(x), lw, n), M, L), rise = noon - (set - noon);
  const sunrise = fromJulian(rise), sunset = fromJulian(set);
  return {sunrise, sunset, dayLength: Math.round((sunset - sunrise) / 60e3), noon: fromJulian(noon)};
}

const SYNODIC = 29.530588853, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

/** age: 0..1 through the cycle (0 new, .5 full); fraction: the lit share of the disc. */
export function moonPhase(ms){
  const age = (((ms - NEW_MOON) / DAY_MS / SYNODIC) % 1 + 1) % 1;
  return {age, fraction: (1 - Math.cos(2 * Math.PI * age)) / 2, name: PHASES[Math.floor(age * 8 + .5) % 8]};
}
