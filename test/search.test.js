import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, searchUrl } from '../js/widgets/engines.js';
import { normalizeUrl, siteHost } from '../js/widgets/engines.js';

test('searchUrl encodes the query for the chosen engine', () => {
  assert.equal(searchUrl('duckduckgo', 'a b&c'), 'https://duckduckgo.com/?q=a%20b%26c');
});

test('an unknown engine falls back to google', () => {
  assert.equal(searchUrl('altavista', 'x'), 'https://www.google.com/search?q=x');
});

test('there are eight engines, google first and chatgpt last', () => {
  assert.equal(ENGINES.length, 8);
  assert.deepEqual(ENGINES.map(e => e.id), ['google', 'bing', 'duckduckgo', 'brave', 'ecosia', 'startpage', 'perplexity', 'chatgpt']);
});

test('normalizeUrl adds https:// and refuses what is not a web address', () => {
  assert.equal(normalizeUrl('github.com/Taflynx'), 'https://github.com/Taflynx');
  assert.equal(normalizeUrl('  http://example.org '), 'http://example.org/');
  assert.equal(normalizeUrl('not a url'), null);
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl(''), null);
});

test('siteHost drops www.', () => {
  assert.equal(siteHost('https://www.youtube.com/watch'), 'youtube.com');
});
