/*
 * A1-10 — the yt-dlp probe runs OFF the event loop, and the reading says so.
 *
 * THE FINDING, AND WHY IT IS NOT ABOUT THE CACHE. The packet's `13#3.5` declared
 * the blocking class closed on the strength of the TTL cache. A1-10 answered
 * that precisely: "caching reduces blocking frequency, not blocking duration."
 * MEASURED 2026-09-20 on this machine, cold cache vs warm:
 *
 *   COLD  latency 1709 ms   maxEventLoopStall 1699 ms
 *   WARM  latency    4 ms   maxEventLoopStall    2 ms
 *
 * 99.4% of the cold request was the bridge being unable to answer anything else,
 * and the underlying `execFileSync` has a **60 s** timeout — so on a slow or
 * hung yt-dlp the whole console stops for a minute. `selfCheck()` is the engine's
 * own function and the engine is additive-only, so the fix is a worker thread:
 * the subprocess still runs the engine's code, just not on the thread that
 * answers HTTP.
 *
 * WHAT CHANGED OBSERVABLY. A cold read can no longer return a fresh verdict,
 * because waiting for one is the thing being removed. It returns
 * `source: 'unknown'` with a null timestamp, `stale: true`, and a note that says
 * the probe is running — and the result appears on a later read, before the TTL
 * expires. That is a real contract change, which is why it has its own file
 * rather than a paragraph inside another one.
 *
 * @module creator-brains-console/test/health.offthread
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { fixtureRoot, getJson, withFixture } from './fixtures.mjs';
import { statusInstrument } from '../lib/status.mjs';
import { resetHealthCache } from '../lib/health.mjs';
import { requestProbe } from '../lib/health-probe.mjs';

/**
 * Read `/api/status` until the off-thread probe settles.
 *
 * The bridge must not wait for the probe; the TEST must. Expiring the budget
 * returns the last reading, whose `unknown` source then fails the caller's own
 * assertion — so a timeout is a failure, never a silent pass.
 */
async function waitForProbe(r, budgetMs = 30_000) {
  const deadline = Date.now() + budgetMs;
  let reading = statusInstrument(r);
  while (reading.ytdlp.source === 'unknown' && Date.now() < deadline) {
    await new Promise((res) => { setTimeout(res, 25); });
    reading = statusInstrument(r);
  }
  return reading;
}

/* ── the property the user sees: the bridge stays answerable ─────────────── */

test('A1-10a: a COLD read does not wait for the probe, and says it has no verdict', () => {
  resetHealthCache();
  const r = fixtureRoot('a110-cold');

  const t0 = performance.now();
  const reading = statusInstrument(r);
  const coldMs = performance.now() - t0;

  // Pre-fix this line took 1709 ms. The bound is generous on purpose: the claim
  // is "does not wait for a subprocess", not "is fast on this machine".
  assert.ok(coldMs < 500, `a cold read must not wait for the probe; took ${coldMs.toFixed(0)} ms`);
  assert.equal(reading.ytdlp.source, 'unknown',
    'a probe that has been STARTED is not a probe that has RESULTED');
  assert.equal(reading.ytdlp.checkedAt, null);
  assert.equal(reading.ytdlp.ageMs, null);
  assert.equal(reading.ytdlp.stale, true, 'no timestamp means no freshness claim');
  assert.match(reading.ytdlp.note, /off-thread/, 'the operator is told why there is no verdict yet');
});

test('A1-10b: the bridge answers ANOTHER route while the probe is still running', async () => {
  resetHealthCache();
  await withFixture('a110-concurrent', async ({ base }) => {
    const t0 = performance.now();
    const status = await getJson(base, '/api/status'); // cold: starts the probe
    const coldMs = performance.now() - t0;
    assert.equal(status.body.ytdlp.source, 'unknown');

    // The probe takes ~1.7 s, so it is certainly still running here. Pre-fix this
    // request queued behind it; the whole console was frozen for that window.
    const t1 = performance.now();
    const other = await getJson(base, '/api/creators');
    const otherMs = performance.now() - t1;

    assert.equal(other.status, 200);
    assert.ok(coldMs < 500, `the cold read waited ${coldMs.toFixed(0)} ms`);
    assert.ok(otherMs < 500,
      `a concurrent route must not queue behind the probe; took ${otherMs.toFixed(0)} ms`);
  });
});

/* ── the result still arrives, and the reading still composes ───────────── */

test('A1-10c: the off-thread result is collected on a later read, inside the TTL', async () => {
  resetHealthCache();
  const r = fixtureRoot('a110-settle');

  assert.equal(statusInstrument(r).ytdlp.source, 'unknown', 'first read starts the probe');

  const settled = await waitForProbe(r);
  assert.ok(['probe', 'history'].includes(settled.ytdlp.source),
    `expected a settled source, got '${settled.ytdlp.source}'`);
  assert.equal(typeof settled.ytdlp.checkedAt, 'string',
    'the console needs a timestamp to render an age');
  assert.equal(typeof settled.ytdlp.ageMs, 'number');
  assert.equal(typeof settled.ytdlp.stale, 'boolean');

  // The cache identity, observed after the probe landed.
  const again = statusInstrument(r);
  assert.equal(again.ytdlp.checkedAt, settled.ytdlp.checkedAt,
    'two reads inside the TTL must report the SAME probe timestamp');
});

/* ── the seam, and the thread that must not outlive its usefulness ──────── */

test('A1-10d: resetHealthCache forgets the in-flight probe, not just the cache', () => {
  resetHealthCache();
  assert.equal(requestProbe(), true, 'the first request starts a probe');
  assert.equal(requestProbe(), false, 'a second is refused while one is already running');

  // The cache was the whole of this seam's state until A1-10; now "a probe is
  // running" is state too, and a reset that left it set would make the seam's
  // own promise — no inherited probe — quietly false.
  resetHealthCache();
  assert.equal(requestProbe(), true, 'the seam must clear the in-flight flag as well');
});
