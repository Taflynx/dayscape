// Currency converter on European Central Bank rates (frankfurter.dev, no key), cached for six hours.
import { esc } from '../util.js';
import { getJSON } from '../locate.js';

const CODES = ['ILS', 'USD', 'EUR', 'CAD', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CNY', 'HKD', 'SGD', 'INR', 'KRW', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'BRL', 'MXN', 'ZAR', 'THB', 'IDR', 'MYR', 'PHP', 'ISK'];
const FX_KEY = 'dayscape.fx', FRESH = 6 * 3600e3;

/** "usd, eur cad" -> ['USD', 'EUR', 'CAD'], known codes only, no repeats, never the base. */
export const parseTargets = (text, base) => [...new Set(String(text || '').toUpperCase().match(/[A-Z]{3}/g) || [])].filter(c => CODES.includes(c) && c !== base);

async function rates(base, targets){
  const key = base + ':' + targets.join(',');
  let cache = {};
  try{ cache = JSON.parse(localStorage.getItem(FX_KEY)) || {}; }catch{}
  const hit = cache[key];
  if (hit && Date.now() - hit.fetched < FRESH) return hit;
  try{
    const j = await getJSON(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${targets.join(',')}`);
    if (!j || !j.rates) throw new Error('no rates');
    const got = {fetched: Date.now(), date: j.date, rates: j.rates};
    cache[key] = got;
    try{ localStorage.setItem(FX_KEY, JSON.stringify(cache)); }catch{}
    return got;
  }catch{ return hit || null; }
}

export default {
  type: 'currency', name: 'Currency', description: 'Convert an amount between the currencies you use.',
  multi: true, size: {w: 6, h: 4}, min: {w: 4, h: 3},
  defaults: {base: 'ILS', targets: 'USD, EUR, CAD', amount: 100},
  fields: [
    {key: 'base', label: 'From', kind: 'select', options: CODES.map(c => ({value: c, label: c}))},
    {key: 'targets', label: 'To (codes, comma separated)', kind: 'text', placeholder: 'USD, EUR, CAD'},
  ],
  mount(el, w, ctx){
    el.classList.add('fxw');
    const o = ctx.opts(w), base = CODES.includes(o.base) ? o.base : 'ILS', targets = parseTargets(o.targets, base);
    const money = (v, c) => { try{ return new Intl.NumberFormat('en', {style: 'currency', currency: c, maximumFractionDigits: v >= 100 ? 0 : 2}).format(v); }catch{ return v.toFixed(2) + ' ' + c; } };
    el.innerHTML = `<label class="fx-in"><input type="number" min="0" step="any" inputmode="decimal" aria-label="Amount in ${esc(base)}"><span class="mono">${esc(base)}</span></label>
      <ul class="fx-list"><li class="w-empty">Loading rates…</li></ul><div class="fx-src mono"></div>`;
    const input = el.querySelector('input'), list = el.querySelector('.fx-list');
    input.value = Number.isFinite(+o.amount) ? o.amount : 100;
    let data = null, alive = true;
    function draw(){
      if (!targets.length){ list.innerHTML = '<li class="w-empty">Add currency codes in this widget’s settings.</li>'; return; }
      if (!data){ list.innerHTML = '<li class="w-empty">Rates are unavailable right now.</li>'; return; }
      const a = Math.max(0, +input.value || 0);
      list.innerHTML = targets.filter(c => data.rates[c]).map(c => `<li><span class="mono">${esc(c)}</span><b>${esc(money(a * data.rates[c], c))}</b></li>`).join('');
      el.querySelector('.fx-src').textContent = `ECB rates · ${data.date}`;
    }
    input.addEventListener('input', () => { draw(); w.settings = {...w.settings, amount: +input.value || 0}; ctx.save(); });
    if (targets.length) rates(base, targets).then(d => { if (!alive) return; data = d; draw(); }); else draw();
    return {destroy(){ alive = false; }};
  },
};
