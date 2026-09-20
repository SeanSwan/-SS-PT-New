#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/test/health.history.test.mjs
 * PURPOSE: The store-history fallback for the health reading, and the routes
 *          that expose it.
 * PART OF: Creator Brains Console (blueprint 05 §1; perf budget 02 §6)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THE FALLBACK EXISTS, AND WHY IT IS NOT A LIE.
 *
 * `selfCheck()` can report `{ok:false, reason:'yt-dlp not resolvable'}` — and it
 * can do so TRANSIENTLY, e.g. when a spawned process is refused by a confined
 * environment or a first run races a cache warm-up. A console that painted
 * "yt-dlp MISSING" the moment the last-good reading aged out would be crying
 * wolf about a healthy install, and Sean would learn to ignore the badge. That
 * is a worse failure than showing nothing.
 *
 * So when a live probe fails, the reading prefers the engine's OWN last recorded
 * canary (`canary.json`, appended by the daily pass) and labels the payload
 *
 *     source: 'history'   +   checkedAt: <the real canary timestamp>
 *
 * Two properties make this honest rather than convenient, and both are tested:
 *
 *   1. A FAILED canary in the history is reported as a FAILURE. The fallback
 *      rescues an unavailable probe; it does not launder a bad result.
 *   2. `version` is NULL, never fabricated. A canary record proves a probe and a
 *      fetch succeeded at that time. It contains no `--version` string, so
 *      inventing one would be a fabrication — and the console renders a null
 *      version as "unknown", which is the truth.
 *
 * The cache mechanics themselves live in `health.test.mjs`; this file is only
 * about where a reading comes from when the live path cannot answer.
 *
 * @module creator-brains/console/test/health.history
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { resetHealthCache, healthReading } from '../lib/health.mjs';
import { statusInstrument, canaryState } from '../lib/status.mjs';
import { ensureStore } from '../../lib/store.mjs';
import { tempRoot } from '../../test/helpers.mjs';
import { fixtureRoot } from './fixtures.mjs';

/** An empty but well-formed store, for the history-fallback tests. */
function emptyStore(label) {
  const r = tempRoot(label);
  ensureStore(r);
  return r;
}

/** Write a canary history exactly as the engine's daily pass would. */
function seedCanary(r, entries) {
  writeFileSync(join(r, 'canary.json'), JSON.stringify(entries), 'utf8');
}

const FAILING_PROBE = () => ({ ok: false, version: null, reason: 'yt-dlp not resolvable' });

/* ── the history fallback ────────────────────────────────────────────────── */

test('health: a failed probe prefers the store\'s last canary over a false alarm', () => {
  resetHealthCache();
  const r = emptyStore('health-history');
  seedCanary(r, [
    { ts: '2026-09-16T10:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 42, lang: 'en' },
  ]);

  const reading = healthReading({
    r,
    now: Date.parse('2026-09-16T10:05:00.000Z'),
    probe: FAILING_PROBE,
  });

  assert.equal(reading.ok, true, 'a healthy canary five minutes ago beats an alarming "MISSING"');
  assert.equal(reading.source, 'history', 'and it must SAY it is history, not a live probe');
  assert.equal(reading.checkedAt, '2026-09-16T10:00:00.000Z', 'the real canary timestamp, not now');
  assert.equal(reading.ageMs, 300_000);
  assert.equal(reading.stale, true, 'five minutes old is past the TTL and must read as stale');
  assert.match(reading.note, /live probe did not resolve/,
    'the operator must be told WHY they are seeing a historical reading');
});

test('health: a failed canary in the history is reported as a failure, not a success', () => {
  resetHealthCache();
  const r = emptyStore('health-history-fail');
  seedCanary(r, [
    { ts: '2026-09-16T10:00:00.000Z', videoId: 'aircAruvnKk', ok: false, error: 'probe FAILED (bot_check)' },
  ]);

  const reading = healthReading({
    r,
    now: Date.parse('2026-09-16T10:05:00.000Z'),
    probe: FAILING_PROBE,
  });

  assert.equal(reading.ok, false,
    'the fallback rescues an unavailable probe — it must not launder a bad result into a good one');
  assert.match(reading.reason, /bot_check/, "the engine's recorded reason is carried through");
});

test('health: version is null rather than fabricated when the reading came from history', () => {
  resetHealthCache();
  const r = emptyStore('health-history-version');
  seedCanary(r, [
    { ts: '2026-09-16T10:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 42, lang: 'en' },
  ]);

  const reading = healthReading({
    r, now: Date.parse('2026-09-16T10:05:00.000Z'), probe: FAILING_PROBE,
  });

  assert.equal(reading.version, null,
    'a canary record proves a probe+fetch worked; it does NOT contain a --version string, '
    + "so inventing one would be a fabrication");
  assert.match(reading.reason, /last canary ok/,
    'what the canary DOES prove is stated instead');
});

test('health: only the LATEST canary entry is used, not the first', () => {
  resetHealthCache();
  const r = emptyStore('health-history-latest');
  seedCanary(r, [
    { ts: '2026-09-14T10:00:00.000Z', videoId: 'aircAruvnKk', ok: false, error: 'old failure' },
    { ts: '2026-09-15T10:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 11, lang: 'en' },
    { ts: '2026-09-16T10:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 42, lang: 'en' },
  ]);

  const reading = healthReading({
    r, now: Date.parse('2026-09-16T10:01:00.000Z'), probe: FAILING_PROBE,
  });

  assert.equal(reading.ok, true, 'the newest entry is the one that describes the present');
  assert.equal(reading.checkedAt, '2026-09-16T10:00:00.000Z');
  assert.match(reading.reason, /42 cues/, 'and its detail is the one reported');
});

test('health: with no history at all, the failure is stated plainly', () => {
  resetHealthCache();
  const r = emptyStore('health-no-history');
  const reading = healthReading({ r, now: 1_000, probe: FAILING_PROBE });

  assert.equal(reading.ok, false);
  assert.equal(reading.source, 'probe', 'there was nothing to fall back to, and we say so');
  assert.equal(reading.checkedAt, new Date(1_000).toISOString());
  assert.match(reading.note, /live probe did not resolve/, 'and the reason is still surfaced');
});

test('health: an EMPTY canary history falls back to the plain failure', () => {
  resetHealthCache();
  const r = emptyStore('health-empty-canary');
  seedCanary(r, []);
  const reading = healthReading({ r, now: 1_000, probe: FAILING_PROBE });
  assert.equal(reading.ok, false);
  assert.equal(reading.source, 'probe');
});

test('health: a damaged canary file degrades to the plain failure, never a 500', () => {
  resetHealthCache();
  const r = emptyStore('health-damaged-canary');
  writeFileSync(join(r, 'canary.json'), '{ this is not json', 'utf8');

  const reading = healthReading({ r, now: 1_000, probe: FAILING_PROBE });
  assert.equal(reading.ok, false, 'a broken canary must not take down the status board');
  assert.equal(reading.source, 'probe');
});

test('health: a canary entry with no timestamp is not used as history', () => {
  // A record with no `ts` cannot be aged, and reporting it with `checkedAt:null`
  // and `stale:false` would claim freshness we cannot support.
  resetHealthCache();
  const r = emptyStore('health-ts-less');
  seedCanary(r, [{ videoId: 'aircAruvnKk', ok: true, cues: 3 }]);

  const reading = healthReading({ r, now: 1_000, probe: FAILING_PROBE });
  assert.equal(reading.ok, false, 'an un-ageable record is not evidence');
  assert.equal(reading.source, 'probe');
});

test('health: a SUCCESSFUL probe never consults history, even if it exists', () => {
  // The fallback must not become the primary path. A live reading always wins,
  // because it is the only one that reflects the machine right now.
  resetHealthCache();
  const r = emptyStore('health-live-wins');
  seedCanary(r, [
    { ts: '2020-01-01T00:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 42, lang: 'en' },
  ]);

  const reading = healthReading({
    r,
    now: 1_000,
    probe: () => ({ ok: true, version: 'LIVE-9.9.9', reason: 'live' }),
  });

  assert.equal(reading.source, 'probe');
  assert.equal(reading.version, 'LIVE-9.9.9');
  assert.equal(reading.checkedAt, new Date(1_000).toISOString(),
    'an ancient canary must not be preferred over a fresh successful probe');
});

/* ── the routes that expose the reading ──────────────────────────────────── */

test('health: /api/status carries the provenance fields the console renders from', () => {
  resetHealthCache();
  const r = fixtureRoot('health-status');

  // Two plain reads: `statusInstrument(r)` with no injection uses the REAL
  // engine probe. That is deliberate — this assertion is about the payload SHAPE
  // the route returns, and a shape test that never touched the composed path
  // would not prove the route is wired to the cache at all.
  const first = statusInstrument(r);
  const second = statusInstrument(r);

  for (const key of ['ok', 'version', 'reason', 'checkedAt', 'ageMs', 'source', 'stale', 'note']) {
    assert.ok(key in first.ytdlp, `status.ytdlp is missing '${key}'`);
    assert.ok(key in second.ytdlp, `status.ytdlp is missing '${key}' on the second read`);
  }
  assert.ok(['probe', 'history'].includes(first.ytdlp.source));
  assert.equal(typeof first.ytdlp.checkedAt, 'string',
    'the console needs a timestamp to render an age');
  assert.equal(typeof first.ytdlp.ageMs, 'number');
  assert.equal(typeof first.ytdlp.stale, 'boolean');
  // The second read is inside the TTL, so it MUST share the first read's
  // timestamp — that equality IS the cache, observed through the real route.
  assert.equal(second.ytdlp.checkedAt, first.ytdlp.checkedAt,
    'two status reads inside the TTL must report the SAME probe timestamp');
});

test('health: injected reads share one cache, so a hot poll costs one probe', () => {
  resetHealthCache();
  const r = fixtureRoot('health-status-injected');
  let calls = 0;
  const probe = () => { calls += 1; return { ok: true, version: 'STUB', reason: 'stub' }; };

  const a = statusInstrument(r, { probe, now: 1_000 });
  const b = statusInstrument(r, { probe, now: 2_000 });
  const c = statusInstrument(r, { probe, now: 3_000 });

  assert.equal(calls, 1,
    'three status reads inside the TTL must spawn one yt-dlp process, not three');
  assert.equal(a.ytdlp.source, 'probe');
  assert.equal(b.ytdlp.checkedAt, a.ytdlp.checkedAt);
  assert.equal(c.ytdlp.ageMs, 2_000, 'the age grows with each read, which is what makes it honest');
});

test('health: /api/canary takes the store root so the fallback can work', () => {
  // Passing `r` is what makes the fallback reachable at all. The first version of
  // the route called `canaryState()` with no argument, so the history path could
  // never run and the "fallback" was dead code that looked implemented.
  resetHealthCache();
  const r = emptyStore('health-canary-route');
  seedCanary(r, [
    { ts: '2026-09-16T10:00:00.000Z', videoId: 'aircAruvnKk', ok: true, cues: 7, lang: 'en' },
  ]);

  const reading = canaryState(r, {
    now: Date.parse('2026-09-16T10:01:00.000Z'),
    probe: FAILING_PROBE,
  });
  assert.equal(reading.source, 'history',
    'the route must pass `r` — without it the fallback silently cannot read history');
  assert.equal(reading.ok, true);
});

test('health: /api/canary and /api/status agree, because they share one reading', () => {
  resetHealthCache();
  const r = fixtureRoot('health-agree');
  let calls = 0;
  const probe = () => { calls += 1; return { ok: true, version: 'SHARED', reason: 'shared' }; };

  const s = statusInstrument(r, { probe, now: 5_000 });
  const c = canaryState(r, { probe, now: 6_000 });

  assert.equal(calls, 1, 'the two routes must not each hold their own probe');
  assert.equal(c.version, s.ytdlp.version, 'a console showing two different yt-dlp versions '
    + 'for one store is the drift the compose-dont-reimplement rule exists to prevent');
  assert.equal(c.checkedAt, s.ytdlp.checkedAt);
});
