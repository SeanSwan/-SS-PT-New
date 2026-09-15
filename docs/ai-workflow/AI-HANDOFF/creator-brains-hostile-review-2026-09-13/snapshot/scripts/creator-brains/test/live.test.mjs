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

test('T-16d @live uploading enumeration returns rows for a real channel', { skip }, async () => {
  const { listUploads } = await import('../lib/ytdlp.mjs');
  const rows = listUploads('https://www.youtube.com/@3blue1brown/videos', { limit: 5 });
  assert.ok(rows.length >= 1, 'at least one upload row');
  assert.match(rows[0].id, /^[\w-]{11}$/, 'a real video id');
  assert.ok(rows[0].title, 'a title');
});
