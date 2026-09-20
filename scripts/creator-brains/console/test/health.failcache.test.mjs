/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/test/health.failcache.test.mjs
 * PURPOSE: Regression pin for the FAILURE-CACHING defect (hostile round 2, H1).
 * PART OF: Creator Brains Console (blueprint 06 T-B14; 12-hy4-review-round2)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS AND WHY health.history.test.mjs DID NOT CATCH IT.
 *
 * The 12 tests in health.history.test.mjs all exercised the history fallback on
 * the SAME call that took the probe — the natural way to write the test, and
 * therefore the one blind spot that mattered. The defect was that the fallback
 * fired on exactly one read: a failed probe was cached BEFORE history was
 * consulted, so every later read in the TTL window served the cached failure
 * with `source:'probe'`, `stale:false` and `note:null`.
 *
 * Read 1 said: "ok, from history, checked yesterday, here is why."
 * Read 2 said: "MISSING, from a live probe, checked 10 seconds ago, fresh."
 *
 * That second reading is the worst possible output: a FALSE ALARM presented as
 * a FRESH authoritative verdict, with no note explaining that the probe failed.
 * It is the exact crying-wolf behaviour the fallback was written to prevent, and
 * it would be visible to Sean as the health badge flipping to red on its own.
 *
 * The invariant these tests pin is therefore not "history is used" (already
 * covered) but: **a reading is STABLE across the whole TTL window.** Whatever we
 * decided to show on the probe-taking call, we keep showing until the next probe
 * is allowed. A console whose story changes without a new measurement is lying.
 *
 * @module creator-brains/console/test/health.failcache
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { healthReading, resetHealthCache } from '../lib/health.mjs';

const T0 = 1_800_000_000_000;

/** A temp store whose canary history records a healthy, working install. */
function storeWithHistory() {
  const r = mkdtempSync(join(tmpdir(), 'cb-health-fc-'));
  mkdirSync(r, { recursive: true });
  writeFileSync(join(r, 'canary.json'), JSON.stringify([
    { ts: new Date(T0 - 86_400_000).toISOString(), ok: true, cues: 312, lang: 'en' },
  ]));
  return r;
}

/** A probe that can never resolve yt-dlp (transient environment refusal). */
const failingProbe = () => ({ ok: false, version: null, reason: 'yt-dlp not resolvable' });

test('H1: a failed probe does not evict the history fallback on later reads', () => {
  const r = storeWithHistory();
  resetHealthCache();

  const first = healthReading({ now: T0, r, probe: failingProbe });
  assert.equal(first.source, 'history', 'first read should prefer store history');
  assert.equal(first.ok, true);

  // The read that matters: no new probe is allowed here, so we must still be
  // showing the same reasoned answer — not the raw failure.
  const second = healthReading({ now: T0 + 10_000, r, probe: failingProbe });
  assert.equal(second.source, 'history', 'history must survive the whole TTL window');
  assert.equal(second.ok, true, 'ok must not flip to false without a new measurement');
  assert.match(second.note ?? '', /last recorded canary/);
});

test('H1: the fallback reading never presents itself as a fresh live probe', () => {
  const r = storeWithHistory();
  resetHealthCache();

  healthReading({ now: T0, r, probe: failingProbe });
  const later = healthReading({ now: T0 + 30_000, r, probe: failingProbe });

  // `stale:false` here is the tell: it tells the UI "this is current", which is
  // precisely what a fallback is not.
  assert.equal(later.stale, true, 'a history reading is never "fresh"');
  assert.notEqual(later.note, null, 'a fallback must always explain itself');
});

test('H1: the answer is stable across every read inside the window', () => {
  const r = storeWithHistory();
  resetHealthCache();

  const readings = [0, 1_000, 15_000, 44_000, 59_000].map((dt) => healthReading({
    now: T0 + dt, r, probe: failingProbe,
  }));

  for (const reading of readings) {
    assert.equal(reading.source, 'history');
    assert.equal(reading.ok, true);
    assert.match(reading.note ?? '', /last recorded canary/);
  }
  // All readings carry the SAME checkedAt — the history record's own timestamp,
  // not a moving "now".
  const stamps = new Set(readings.map((x) => x.checkedAt));
  assert.equal(stamps.size, 1, 'checkedAt must not advance without a new measurement');
});

test('H1: a later successful probe does replace the fallback', () => {
  const r = storeWithHistory();
  resetHealthCache();

  const fallback = healthReading({ now: T0, r, probe: failingProbe });
  assert.equal(fallback.source, 'history');

  // Past the TTL the window reopens, and a healthy probe must win.
  const later = healthReading({
    now: T0 + 61_000,
    r,
    probe: () => ({ ok: true, version: '2026.01.01', reason: '' }),
  });
  assert.equal(later.source, 'probe');
  assert.equal(later.ok, true);
  assert.equal(later.version, '2026.01.01');
  assert.equal(later.stale, false, 'a just-taken probe is fresh');
});

test('H1: with no history at all, the failure is reported plainly', () => {
  const r = mkdtempSync(join(tmpdir(), 'cb-health-nohist-'));
  resetHealthCache();

  const reading = healthReading({ now: T0, r, probe: failingProbe });
  assert.equal(reading.ok, false);
  assert.equal(reading.source, 'probe');
  assert.match(reading.note ?? '', /did not resolve/);
  // And it stays plainly-reported, rather than oscillating.
  const again = healthReading({ now: T0 + 5_000, r, probe: failingProbe });
  assert.equal(again.ok, false);
  assert.equal(again.source, 'probe');
  assert.match(again.note ?? '', /did not resolve/);
});
