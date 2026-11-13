// The place catalogue and search. Pure.
import { validTz } from './time.js';

// name | country | ISO code | zone
export const CITY_DATA = `
Jerusalem|Israel|il|Asia/Jerusalem
Tel Aviv|Israel|il|Asia/Jerusalem
Haifa|Israel|il|Asia/Jerusalem
London|United Kingdom|gb|Europe/London
Dublin|Ireland|ie|Europe/Dublin
Lisbon|Portugal|pt|Europe/Lisbon
Paris|France|fr|Europe/Paris
Berlin|Germany|de|Europe/Berlin
Munich|Germany|de|Europe/Berlin
Amsterdam|Netherlands|nl|Europe/Amsterdam
Brussels|Belgium|be|Europe/Brussels
Madrid|Spain|es|Europe/Madrid
Barcelona|Spain|es|Europe/Madrid
Rome|Italy|it|Europe/Rome
Milan|Italy|it|Europe/Rome
Zurich|Switzerland|ch|Europe/Zurich
Vienna|Austria|at|Europe/Vienna
Prague|Czechia|cz|Europe/Prague
Budapest|Hungary|hu|Europe/Budapest
Warsaw|Poland|pl|Europe/Warsaw
Athens|Greece|gr|Europe/Athens
Bucharest|Romania|ro|Europe/Bucharest
Kyiv|Ukraine|ua|Europe/Kyiv
Moscow|Russia|ru|Europe/Moscow
Istanbul|Turkey|tr|Europe/Istanbul
Stockholm|Sweden|se|Europe/Stockholm
Oslo|Norway|no|Europe/Oslo
Copenhagen|Denmark|dk|Europe/Copenhagen
Helsinki|Finland|fi|Europe/Helsinki
Reykjavik|Iceland|is|Atlantic/Reykjavik
Larnaca|Cyprus|cy|Asia/Nicosia
Cairo|Egypt|eg|Africa/Cairo
Amman|Jordan|jo|Asia/Amman
Dubai|United Arab Emirates|ae|Asia/Dubai
Abu Dhabi|United Arab Emirates|ae|Asia/Dubai
Riyadh|Saudi Arabia|sa|Asia/Riyadh
Doha|Qatar|qa|Asia/Qatar
Tehran|Iran|ir|Asia/Tehran
Mumbai|India|in|Asia/Kolkata
New Delhi|India|in|Asia/Kolkata
Bangalore|India|in|Asia/Kolkata
Kathmandu|Nepal|np|Asia/Kathmandu
Bangkok|Thailand|th|Asia/Bangkok
Singapore|Singapore|sg|Asia/Singapore
Jakarta|Indonesia|id|Asia/Jakarta
Bali|Indonesia|id|Asia/Makassar
Ho Chi Minh City|Vietnam|vn|Asia/Ho_Chi_Minh
Hong Kong|Hong Kong|hk|Asia/Hong_Kong
Beijing|China|cn|Asia/Shanghai
Shanghai|China|cn|Asia/Shanghai
Taipei|Taiwan|tw|Asia/Taipei
Manila|Philippines|ph|Asia/Manila
Seoul|South Korea|kr|Asia/Seoul
Tokyo|Japan|jp|Asia/Tokyo
Sydney|Australia|au|Australia/Sydney
Melbourne|Australia|au|Australia/Melbourne
Brisbane|Australia|au|Australia/Brisbane
Perth|Australia|au|Australia/Perth
Auckland|New Zealand|nz|Pacific/Auckland
Honolulu|United States|us|Pacific/Honolulu
Anchorage|United States|us|America/Anchorage
Los Angeles|United States|us|America/Los_Angeles
San Francisco|United States|us|America/Los_Angeles
Seattle|United States|us|America/Los_Angeles
Las Vegas|United States|us|America/Los_Angeles
Vancouver|Canada|ca|America/Vancouver
Denver|United States|us|America/Denver
Phoenix|United States|us|America/Phoenix
Chicago|United States|us|America/Chicago
Dallas|United States|us|America/Chicago
Houston|United States|us|America/Chicago
Mexico City|Mexico|mx|America/Mexico_City
Cancun|Mexico|mx|America/Cancun
New York|United States|us|America/New_York
Boston|United States|us|America/New_York
Washington DC|United States|us|America/New_York
Miami|United States|us|America/New_York
Toronto|Canada|ca|America/Toronto
Montreal|Canada|ca|America/Toronto
Halifax|Canada|ca|America/Halifax
St. John's|Canada|ca|America/St_Johns
Buenos Aires|Argentina|ar|America/Argentina/Buenos_Aires
Sao Paulo|Brazil|br|America/Sao_Paulo
Rio de Janeiro|Brazil|br|America/Sao_Paulo
Santiago|Chile|cl|America/Santiago
Bogota|Colombia|co|America/Bogota
Lima|Peru|pe|America/Lima
Cape Town|South Africa|za|Africa/Johannesburg
Johannesburg|South Africa|za|Africa/Johannesburg
Nairobi|Kenya|ke|Africa/Nairobi
Lagos|Nigeria|ng|Africa/Lagos
Addis Ababa|Ethiopia|et|Africa/Addis_Ababa
Marrakesh|Morocco|ma|Africa/Casablanca
UTC|Coordinated Universal Time||UTC
`.trim().split('\n').map(l => { const [name, country, cc, tz] = l.split('|'); return {name, country, cc, tz}; }).filter(c => validTz(c.tz));

export const ALL_ZONES = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [])
  .filter(z => z.includes('/'))
  .map(z => ({name: z.split('/').pop().replace(/_/g, ' '), country: z.split('/')[0], cc: '', tz: z}));

export const DEFAULT_PLACES = ['Tel Aviv', 'London', 'New York', 'Montreal', 'Los Angeles', 'Tokyo'];

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ'".\-_]/g, '').replace(/\s+/g, ' ');

/** Cities first (names that start with the query on top), then raw IANA zones. */
export function searchPlaces(query, nowMs = Date.now(), limit = 12){
  const term = norm(String(query).trim());
  if (!term) return CITY_DATA.slice(0, limit);
  const hit = c => [c.name, c.country, c.tz].some(f => norm(f).includes(term));
  const starts = c => norm(c.name).startsWith(term);
  const cities = CITY_DATA.filter(hit).sort((a, b) => starts(b) - starts(a));
  const zones = ALL_ZONES.filter(hit).filter(z => !cities.some(c => c.tz === z.tz && norm(c.name) === norm(z.name)));
  return cities.concat(zones).slice(0, limit);
}
