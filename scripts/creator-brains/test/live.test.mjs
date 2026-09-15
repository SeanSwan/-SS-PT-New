#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/live.test.mjs
 * PURPOSE: T-16 — the REAL boundary. Proves yt-dlp can actually probe and
 *          fetch a caption track on this machine, and that a fetched document
 *          carries non-empty cues with a resolvable deep link.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * THESE TESTS HIT THE NETWORK AND ARE SKIPPED BY DEFAULT.
 *   Run them deliberately:  node --test --test-name-pattern=@live scripts/creator-brains/test/live.test.mjs
 *   or:                     CREATOR_BRAINS_LIVE=1 node --test scripts/creator-brains/test/live.test.mjs
 *
 * WHY THEY EXIST AT ALL: every other test in this suite injects a fake yt-dlp.
 * That makes them fast and deterministic, and it also means the suite would
 * stay green if yt-dlp were uninstalled, renamed, or broken by an upstream
 * change. The upstream hostile review's worst-case failure is exactly that —
 * "runs go green, zero segments stored, brain silently stale for weeks". One
 * test must therefore touch the real thing.
 *
 * The fixed video id is the canary: it is stable, public, and captioned.
 *
 * @module creator-brains/test/live
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, tempRoot } from './helpers.mjs';
import { STATES, newVideoState } from '../lib/fsm.mjs';

const LIVE = process.env.CREATOR_BRAINS_LIVE === '1';
const CANARY_VIDEO = process.env.CREATOR_BRAINS_CANARY_VIDEO || 'aircAruvnKk';
const skip = LIVE ? false : 'network test — set CREATOR_BRAINS_LIVE=1 to run';

test('T-16 @live yt-dlp resolves on this machine', { skip }, async () => {
  const { selfCheck } = await import('../lib/ytdlp.mjs');
  const check = selfCheck();
  assert.equal(check.ok, true, `yt-dlp must resolve: ${check.reason}`);
  assert.ok(check.version, 'a version string is reported');
});

test('T-16b @live the subtitle probe answers with a language list', { skip }, async () => {
  const { probeSubs } = await import('../lib/ytdlp.mjs');
  const probe = probeSubs(CANARY_VIDEO);
  assert.equal(probe.ok, true, `probe failed: ${probe.error}`);
  assert.ok(probe.languages.includes('en'), `expected an en track, got ${probe.languages.join(',')}`);
});

test('T-16c @live an end-to-end fetch stores a document with real cues', { skip }, async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const { readDoc } = await import('../lib/store.mjs');
  const r = tempRoot('cb-live');
  const clock = makeClock();
  const channelId = `UC${'z'.repeat(22)}`;
  const creator = { channelId, title: 'Canary' };
  const video = newVideoState(CANARY_VIDEO, channelId, { now: clock.iso() });

  const out = await fetchVideo(video, { r, creator, now: clock }); // REAL deps
  assert.equal(out.state, STATES.FETCHED, `live fetch failed: ${out.lastError}`);

  const doc = readDoc(r, channelId, CANARY_VIDEO);
  assert.ok(doc, 'document stored');
  assert.ok(doc.cues.length > 50, `expected real cue volume, got ${doc.cues?.length}`);
  assert.ok(doc.text.length > 1000, 'expected real transcript text');
  assert.match(doc.text, /\w/);
  assert.equal(doc.source, 'timed-text');
  assert.ok(doc.contentHash, 'content hash recorded for idempotence');

  // The deep link a brain page will render must be well formed.
  const t = Math.floor(doc.cues[0].ms / 1000);
  assert.match(`https://www.youtube.com/watch?v=${CANARY_VIDEO}&t=${t}s`, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}&t=\d+s$/);
});

test('T-16d @live upload enumeration returns STRUCTURED rows for a real channel', { skip }, async () => {
  const { listUploads } = await import('../lib/ytdlp.mjs');
  // Rows are JSON records now, not tab-separated, so a tab inside a real title
  // cannot shift a field or drop a row (review HR12).
  const res = listUploads('https://www.youtube.com/@3blue1brown/videos', { limit: 5 });
  assert.ok(Array.isArray(res.rows), 'a structured result with a rows array');
  assert.ok(res.rows.length >= 1, `at least one upload row (got ${res.rows.length}, error ${res.error || 'none'})`);
  assert.equal(res.invalid.length, 0, 'no row failed to parse');
  assert.match(res.rows[0].id, /^[\w-]{11}$/, 'a real video id');
  assert.ok(res.rows[0].title, 'a title');
});

test('T-16e @live a real channel id resolves from playlist metadata', { skip }, async () => {
  const { runOperation } = await import('../lib/ytdlp.mjs');
  const out = runOperation('resolveChannel', { url: 'https://www.youtube.com/@3blue1brown/videos' });
  const line = String(out).split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
  const [playlistChannelId] = line.split('\t');
  assert.match(playlistChannelId, /^UC[A-Za-z0-9_-]{22}$/, 'a canonical channel id, from playlist metadata');
});

// The packet asked for "actual supported-tool smoke for a public mixed-content
// channel" (review HR22). This walks the same channel across all three tabs with
// the REAL tool and asserts what a census depends on: every tab is reported, a
// limit is a TRUNCATION rather than a completeness claim, and an incremental walk
// carries the early stop that keeps it from being mistaken for one.
test('T-16f @live a real census covers all three tabs, and knows what it is', { skip }, async () => {
  const { enumerateChannel, TABS } = await import('../lib/enumerate.mjs');
  const channelId = `UC${'x'.repeat(22)}`; // replaced below by the resolved id
  const { runOperation } = await import('../lib/ytdlp.mjs');
  const line = String(runOperation('resolveChannel', { url: 'https://www.youtube.com/@3blue1brown/videos' }))
    .split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
  const resolved = line.split('\t').find((s) => /^UC[A-Za-z0-9_-]{22}$/.test(s)) || channelId;

  // A LIMIT MAKES THE WALK A SAMPLE: every tab is attempted, and the verdict says
  // it is not authoritative.
  const sample = enumerateChannel(resolved, { limit: 3, tabs: TABS });
  assert.deepEqual(Object.keys(sample.perTab).sort(), [...TABS].sort(),
    'the walk reports a verdict for every tab it was asked for');
  assert.equal(sample.complete, false, 'a limit-truncated walk is NOT a census');
  assert.match(String(sample.reason), /limit/i, 'and it says why');

  // An incremental walk carries the stop that keeps it partial.
  const newest = sample.rows[0] && sample.rows[0].id;
  assert.match(String(newest), /^[\w-]{11}$/, 'the first row is the high-water mark');
  const incremental = enumerateChannel(resolved, { limit: 1, tabs: ['videos'], stopAfterId: newest });
  assert.equal(incremental.stoppedEarly, true, 'the walk stops at the mark');
  assert.equal(incremental.complete, false, 'and an early-stopped walk can never be a census');
});
