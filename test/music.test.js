import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, stepStation, embedUrl } from '../js/widgets/music.js';

test('next and previous wrap around the station list', () => {
  const n = STATIONS.length;
  assert.equal(stepStation(0, 1), 1);
  assert.equal(stepStation(n - 1, 1), 0);
  assert.equal(stepStation(0, -1), n - 1);
  assert.equal(stepStation(99, 0), 99 % n);
  assert.equal(stepStation(NaN, 1), 1);
});

test('the embed always follows the channel\'s current live stream', () => {
  const u = new URL(embedUrl(STATIONS[0], true));
  assert.equal(u.origin + u.pathname, 'https://www.youtube-nocookie.com/embed/live_stream');
  assert.equal(u.searchParams.get('channel'), STATIONS[0].channel);
  assert.equal(u.searchParams.get('autoplay'), '1');
  assert.equal(u.searchParams.get('enablejsapi'), '1');
  assert.equal(new URL(embedUrl(STATIONS[0], false)).searchParams.get('autoplay'), '0');
});

test('every station has a name, a genre and a channel id', () => {
  assert.ok(STATIONS.length >= 3);
  for (const s of STATIONS) assert.match(s.channel, /^UC[\w-]{22}$/);
});
