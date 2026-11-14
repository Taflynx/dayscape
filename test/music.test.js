import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, stepStation, embedUrl, playerError } from '../js/widgets/music.js';

test('next and previous wrap around the station list', () => {
  const n = STATIONS.length;
  assert.equal(stepStation(0, 1), 1);
  assert.equal(stepStation(n - 1, 1), 0);
  assert.equal(stepStation(0, -1), n - 1);
  assert.equal(stepStation(99, 0), 99 % n);
  assert.equal(stepStation(NaN, 1), 1);
});

test('the embed plays the station live video, since YouTube no longer plays channel-only embeds', () => {
  const u = new URL(embedUrl(STATIONS[0], true));
  assert.equal(u.origin + u.pathname, `https://www.youtube-nocookie.com/embed/${STATIONS[0].video}`);
  assert.equal(u.searchParams.get('channel'), null);
  assert.equal(u.searchParams.get('autoplay'), '1');
  assert.equal(u.searchParams.get('enablejsapi'), '1');
  assert.equal(new URL(embedUrl(STATIONS[0], false)).searchParams.get('autoplay'), '0');
});

test('every station has a name, a channel and a live video id', () => {
  assert.ok(STATIONS.length >= 3);
  for (const s of STATIONS){
    assert.match(s.channel, /^UC[\w-]{22}$/);
    assert.match(s.video, /^[\w-]{11}$/);
  }
});

test('a player error message from YouTube is recognised so the widget can move on', () => {
  assert.equal(playerError(JSON.stringify({event: 'onError', info: 150})), 150);
  assert.equal(playerError(JSON.stringify({event: 'infoDelivery', info: {}})), null);
  assert.equal(playerError('not json'), null);
  assert.equal(playerError({event: 'onError', info: 100}), 100);
});
