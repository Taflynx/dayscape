// Search engines and web-address helpers. Pure, so the tests can load it.

export const ENGINES = [
  {id: 'google', name: 'Google', url: 'https://www.google.com/search?q='},
  {id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q='},
  {id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q='},
  {id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q='},
  {id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q='},
  {id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/do/search?q='},
  {id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/search?q='},
  {id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?q='},
];

export const engineOf = id => ENGINES.find(e => e.id === id) || ENGINES[0];
export const searchUrl = (id, query) => engineOf(id).url + encodeURIComponent(query);

/** A typed web address -> a full http(s) URL, or null when it isn't one. */
export function normalizeUrl(text){
  let s = String(text || '').trim();
  if (!s || /\s/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try{
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.href;
  }catch{ return null; }
}

export const siteHost = url => { try{ return new URL(url).hostname.replace(/^www\./, ''); }catch{ return ''; } };
