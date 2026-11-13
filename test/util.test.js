import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, uid } from '../js/util.js';

test('esc escapes the five HTML-significant characters', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('uid is 8 lowercase base-36 characters', () => {
  assert.match(uid(), /^[a-z0-9]{8}$/);
});

test('uid values differ', () => {
  assert.notEqual(uid(), uid());
});
