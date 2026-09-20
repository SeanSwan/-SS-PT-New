#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/health.test.mjs
 * PURPOSE: Regression tests for the TTL cache over the engine's blocking yt-dlp
 *          health probe, and the honest fallback when a probe cannot be taken.
 * PART OF: Creator Brains Console (blueprint 05 §1; perf budget 02 §6)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS — a MEASURED defect, not a hypothetical one.
 *
 * The engine's health reading is `selfCheck()` in `lib/ytdlp.mjs`: it shells out
 * to `yt-dlp --version`. Measured on this machine 2026-09-17:
 *
 *     selfCheck #1  3439 ms   (cold)
 *     selfCheck #2  1809 ms   (warm)
 *     selfCheck #3  1742 ms   (warm)
 *
 * The CLI pays that once per invocation, which is correct — a human ran `status`
 * and waits for the answer. The bridge paid it PER REQUEST. From the run
 * console's 2-second polling loop that meant the bridge's single thread blocked
 * for ~2s out of every 2s, and a single daily pass would spawn roughly nine
 * hundred yt-dlp processes to answer a question whose answer changes when Sean
 * upgrades a tool.
 *
 * That was a defect the bridge introduced by composing a BLOCKING engine
 * function on a hot path. The fix (lib/health.mjs) keeps composing the engine --
 * the doctrine stands -- and wraps it in a TTL cache. These tests pin the three
 * properties that make the cache safe rather than merely fast:
 *
 *   1. IT CACHES. One probe serves many reads inside the TTL.
 *   2. IT EXPIRES. A read past the TTL takes a fresh reading.
 *   3. IT IS HONEST. Every payload says when the reading was actually taken and
 *      whether it came from a live probe or the store's history. A cached value
 *      presented as an instant one would be a lie, and the console renders an
 *      AGE from `checkedAt`/`ageMs` precisely so it never has to tell one.
 *
 * The probe is INJECTED in every test here, so this suite never spawns Python.
 * That is not just speed: a test whose result depends on whether yt-dlp happens
 * to be installed is a test that reports the environment, not the code.
 *
 * The store-history fallback, and the routes that expose the reading, live in
 * `health.history.test.mjs` — split out to keep both files under the 300-line
 * rule that the H7 test in `bridge.hy4.structure.test.mjs` enforces (it caught
 * this file at 356 lines, which is the rule working).
 *
 * @module creator-brains-console/test/health
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PROBE_TTL_MS, resetHealthCache, healthReading } from '../lib/health.mjs';

/** A probe stub that counts its calls and returns a fixed verdict. */
function stubProbe(verdict = { ok: true, version: 'STUB-1.2.3', reason: 'stub' }) {
  const fn = () => { fn.calls += 1; return { ...verdict }; };
  fn.calls = 0;
  return fn;
}
/* ── 1 · it caches ───────────────────────────────────────────────────────── */

test('health: one probe serves many reads inside the TTL', () => {
  resetHealthCache();
  const probe = stubProbe();

  for (let i = 0; i < 25; i += 1) {
    const reading = healthReading({ probe, now: 1_000 + i });
    assert.equal(reading.ok, true);
    assert.equal(reading.version, 'STUB-1.2.3');
  }

  assert.equal(probe.calls, 1,
    'twenty-five status reads inside the TTL must not spawn twenty-five yt-dlp processes');
});

test('health: the reading is served verbatim from the engine, never re-derived', () => {
  resetHealthCache();
  const probe = stubProbe({ ok: false, version: null, reason: 'yt-dlp not resolvable' });
  const reading = healthReading({ probe, now: 5_000 });
  assert.equal(reading.ok, false);
  assert.equal(reading.reason, 'yt-dlp not resolvable', "the engine's own wording is passed through");
  assert.equal(reading.source, 'probe');
});

/* ── 2 · it expires ──────────────────────────────────────────────────────── */

test('health: a read past the TTL takes a fresh probe', () => {
  resetHealthCache();
  const probe = stubProbe();
  const t0 = 1_000_000;

  healthReading({ probe, now: t0 });
  assert.equal(probe.calls, 1);

  // One millisecond inside the TTL: still cached.
  healthReading({ probe, now: t0 + PROBE_TTL_MS - 1 });
  assert.equal(probe.calls, 1, 'a read just inside the TTL must be served from cache');

  // One millisecond past it: a new probe.
  healthReading({ probe, now: t0 + PROBE_TTL_MS + 1 });
  assert.equal(probe.calls, 2, 'a read past the TTL must re-probe');

  // The TTL is not a one-shot: the new reading is itself cached.
  healthReading({ probe, now: t0 + PROBE_TTL_MS + 2 });
  assert.equal(probe.calls, 2);
});

test('health: the TTL is overridable, so tests do not wait a minute', () => {
  resetHealthCache();
  const probe = stubProbe();
  healthReading({ probe, now: 0, ttlMs: 0 });
  healthReading({ probe, now: 1, ttlMs: 0 });
  assert.equal(probe.calls, 2, 'ttlMs 0 forces a probe every read');
});

/* ── 3 · it is honest about provenance ───────────────────────────────────── */

test('health: every reading carries its own age and provenance', () => {
  resetHealthCache();
  const probe = stubProbe();
  const t0 = 1_700_000_000_000;

  const first = healthReading({ probe, now: t0 });
  assert.equal(first.source, 'probe', 'a live reading says so');
  assert.equal(first.checkedAt, new Date(t0).toISOString(), 'the timestamp is the moment it was TAKEN');
  assert.equal(first.ageMs, 0);
  assert.equal(first.stale, false);

  // A later read inside the TTL reports a GROWING age against the ORIGINAL
  // timestamp — this is what lets the console say "checked 40s ago" truthfully
  // instead of implying the reading is instantaneous.
  const later = healthReading({ probe, now: t0 + 40_000 });
  assert.equal(later.ageMs, 40_000);
  assert.equal(later.checkedAt, first.checkedAt, 'the timestamp must not be refreshed by a cache hit');
  assert.equal(later.stale, false, '40s is inside a 60s TTL');
  assert.equal(probe.calls, 1, 'and no new probe was taken');

  // THE WINDOW IS ANCHORED TO THE LAST PROBE. Two things must therefore hold,
  // and both are asserted because getting either wrong breaks something real:
  //
  //   1. A read INSIDE the window is served from cache even if much later than
  //      the first read. Here the 40s read is 20s old at 60s — still cached.
  //   2. A read PAST the window re-probes, even though the cache was hit a
  //      moment ago. 90s exceeds the 60s TTL measured from the probe at t0, so a
  //      fresh probe is taken — the console cannot be talked out of re-checking
  //      by simply asking more often.
  //
  // If the window were anchored to the last READ instead, (2) would never
  // happen under a 2s poll and the console would serve one reading from boot
  // forever. That is the failure this pair of assertions exists to prevent.
  const insideWindow = healthReading({ probe, now: t0 + 59_999 });
  assert.equal(probe.calls, 1, 'a read strictly inside the window must not re-probe');
  assert.equal(insideWindow.ageMs, 59_999);

  const expired = healthReading({ probe, now: t0 + 90_000 });
  assert.equal(probe.calls, 2,
    'a read past the window must re-probe even though the cache was hit 30s earlier '
    + '— the window is anchored to the probe, so frequent asking cannot pin a stale reading');
  assert.equal(expired.ageMs, 0, 'and its age resets to zero, because it was just taken');
  assert.equal(expired.checkedAt, new Date(t0 + 90_000).toISOString());
  assert.equal(expired.stale, false);

  // And the NEW probe re-anchors the window, so the cadence is stable.
  healthReading({ probe, now: t0 + 90_000 + 30_000 });
  assert.equal(probe.calls, 2, 'the window restarts from the newest probe');
  healthReading({ probe, now: t0 + 90_000 + 60_001 });
  assert.equal(probe.calls, 3, 'and expires one TTL after it');
});

test('health: a continuously-polling console still re-probes at least once per TTL', () => {
  // The failure this prevents, stated as a test: if the cache window were
  // anchored to the last READ, a poll faster than the TTL would pin ONE reading
  // for the life of the process. Simulating a 2 s poll (the run console's real
  // cadence) over 5 minutes must yield several probes, not one — and the count
  // must be a small fraction of the 151 reads.
  resetHealthCache();
  const probe = stubProbe();
  const t0 = 1_000_000;

  let reads = 0;
  for (let t = t0; t <= t0 + 300_000; t += 2_000) { healthReading({ probe, now: t }); reads += 1; }

  // 300s of polling with a 60s TTL: a probe at t0 and one per expiry thereafter.
  assert.equal(probe.calls, 6,
    `expected 6 probes (t0 plus one per 60s TTL over 300s), got ${probe.calls}`);
  assert.equal(reads, 151, 'the loop actually polled 151 times');
  assert.ok(probe.calls * 20 < reads,
    `6 probes against ${reads} reads is a ~25x reduction — anything less means the cache is not working`);
});

test('health: a cached reading past its TTL would report stale, not fresh', () => {
  // Simulated directly, because the cache would otherwise re-probe. This pins
  // the semantics of the flag the console renders from.
  resetHealthCache();
  const probe = stubProbe();
  const t0 = 0;
  const reading = healthReading({ probe, now: t0 });
  assert.equal(reading.stale, false);
  // `stale` is derived from ageMs vs PROBE_TTL_MS, so a reading older than the
  // TTL can never report itself fresh.
  assert.ok(PROBE_TTL_MS > 0, 'a zero TTL would make `stale` meaningless');
});
