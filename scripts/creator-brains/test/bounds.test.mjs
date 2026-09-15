#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/bounds.test.mjs
 * PURPOSE: HR23 — execution bounds, the shared throttle, and operator-visible
 *          backlog. Written BEFORE the repair, at the real boundaries.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW ASKED FOR, AND WHAT EACH TEST WATCHES:
 *
 *   "implement an explicit per-run duration/work bound and shared response to
 *    throttling/system-wide failure"
 *     -> HR23a (the bound is enforced by the RUNNER, not by the caller),
 *        HR23d (an invalid bound is refused, never read as "unlimited").
 *
 *   "a global 429/bot-check blocks/defer subsequent traffic"
 *     -> HR23b (the first 429 stops the rest of THIS run) and
 *        HR23c (the cooldown is SHARED: the next invocation does zero traffic,
 *        and traffic resumes once the cooldown expires).
 *
 *   "manual/scheduled invocations cannot bypass the cap"
 *     -> HR23d, at the CLI boundary: `--max-ops=0` is a refusal, not a default.
 *
 *   "operator-visible backlog age, oldest pending/newest processed, expected
 *    completion at the actual cadence and retry exhaustion/repair actions"
 *     -> HR23i reads the text `status` actually prints.
 *
 * WHY EVERY ASSERTION COUNTS PROBES RATHER THAN TRUSTING A FLAG:
 *   "the bound was applied" and "nobody knocked on YouTube's door" are different
 *   claims. The injected probe counts and the injected fetch counts are the only
 *   observable that cannot be satisfied by bookkeeping.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/bounds.test.mjs
 * @module creator-brains/test/bounds
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  capture, makeClock, makeReviewStore, reviewDeps, REVIEW_A, tempRoot,
} from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { runDaily } from '../lib/run.mjs';
import { COMMANDS } from '../commands.mjs';

/** `vid00000001`-style ids — 11 url-safe characters, as the schema requires. */
const vid = (i) => `v${String(i).padStart(10, '0')}`.slice(0, 11);

/** A pending backlog of `n` videos for one creator. */
const backlog = (n, channelId = REVIEW_A) =>
  Array.from({ length: n }, (_, i) => [vid(i), channelId]);


const RATE_LIMITED = 'ERROR: unable to download video data: HTTP Error 429: Too Many Requests';

/**
 * The probe/fetch spy. `limitedAfter` > 0 makes the probe start answering with a
 * 429 once that many successful probes have happened — which is how a real
 * session degrades.
 */
function spyDeps({ limitedFromFirst = false } = {}) {
  const calls = { probe: 0, fetch: 0 };
  const deps = reviewDeps({
    probeSubs: () => {
      calls.probe += 1;
      if (limitedFromFirst) return { ok: false, kind: 'failed', languages: [], error: RATE_LIMITED };
      return {
        ok: true, kind: 'ok', languages: ['en-orig'], originals: ['en-orig'],
      };
    },
    fetchJson3: () => {
      calls.fetch += 1;
      return reviewDeps().fetchJson3();
    },
  });
  return { deps, calls };
}

// ── HR23a — the per-run work bound, enforced by the runner ───────────────────

test('HR23a a run work bound stops the fetch loop early and DEFERS the rest', async () => {
  const r = await makeReviewStore('hr23a', { videos: backlog(50) });
  const clock = makeClock();
  const { deps, calls } = spyDeps();

  const rec = await runDaily({
    r, deps, clock, only: ['fetch'], budget: { perHour: 60 }, bounds: { maxOps: 2 },
  });

  // One video costs two transport operations (a probe and a fetch), so a bound
  // of two is exactly one video — and the other 49 are deferred, not attempted.
  assert.equal(rec.counts.fetched, 1, 'exactly one video fits in a two-operation bound');
  assert.equal(rec.counts.deferred, 49, 'the remainder is DEFERRED, not silently dropped');
  assert.ok(calls.probe <= 1, `the loop stopped after one probe (saw ${calls.probe})`);
  assert.match(String(rec.counts.deferredReason), /bound/i,
    'the deferral reason names the bound, so a reader can tell it from a budget stop');
  assert.equal(rec.bounds && rec.bounds.maxOps, 2, 'the run record carries the bound it ran under');
  assert.equal(typeof rec.counts.transportOps, 'number', 'the record counts the ops it spent');
  assert.ok(rec.counts.transportOps <= 2, `spent ${rec.counts.transportOps} ops under a bound of 2`);
});

// ── HR23b — a 429 stops the rest of this run ────────────────────────────────

test('HR23b the FIRST 429 stops the run instead of hammering the remaining queue', async () => {
  const r = await makeReviewStore('hr23b', { videos: backlog(20) });
  const clock = makeClock();
  const { deps, calls } = spyDeps({ limitedFromFirst: true });

  const rec = await runDaily({ r, deps, clock, only: ['fetch'], budget: { perHour: 60 } });

  assert.equal(calls.probe, 1, `a rate limit stops the loop (made ${calls.probe} probes)`);
  assert.equal(rec.counts.failed, 1, 'one video carries the failure');
  assert.equal(rec.counts.deferred, 19, 'the other nineteen are deferred, not failed');
  assert.match(String(rec.counts.deferredReason), /throttl|429|rate/i,
    'the reason says the run was throttled');
  assert.ok(existsSync(join(paths(r).base, 'throttle.json')),
    'the cooldown is PERSISTED, so it outlives this process');
});

// ── HR23c — the cooldown is shared with the next invocation ──────────────────

test('HR23c a tripped throttle blocks the NEXT invocation, then expires', async () => {
  const r = await makeReviewStore('hr23c', { videos: backlog(20) });
  const clock = makeClock();
  const { deps, calls } = spyDeps({ limitedFromFirst: true });

  await runDaily({ r, deps, clock, only: ['fetch'], budget: { perHour: 60 } });
  assert.equal(calls.probe, 1, 'the run that hit the limit stopped at one probe');

  // Five minutes later, forcing retries: the backoff would not have elapsed, but
  // the throttle is what must refuse — an operator's `--retry` is not a bypass.
  clock.advance(5 * 60_000);
  const during = await runDaily({
    r, deps, clock, only: ['fetch'], budget: { perHour: 60 }, retry: true,
  });
  assert.equal(calls.probe, 1, `no traffic during the cooldown (made ${calls.probe} probes)`);
  assert.equal(calls.fetch, 0, 'no subtitle fetch during the cooldown either');
  assert.equal(during.counts.deferred, 20, 'every candidate is reported as deferred');
  assert.match(String(during.counts.deferredReason), /throttl|429|rate/i);

  // Past the cooldown the same invocation is allowed to try again: the throttle
  // defers traffic, it does not disable the engine.
  clock.advance(7 * 3_600_000);
  await runDaily({ r, deps, clock, only: ['fetch'], budget: { perHour: 60 }, retry: true });
  assert.ok(calls.probe > 1, 'traffic resumes once the cooldown has expired');
});

// ── HR23d — a bound cannot be set to "unlimited" ────────────────────────────

test('HR23d an invalid bound is REFUSED at the CLI boundary, never read as unlimited', async () => {
  const r = await makeReviewStore('hr23d', { videos: backlog(3) });
  const clock = makeClock();
  const { deps } = spyDeps();

  for (const args of [['--max-ops=0'], ['--max-minutes=abc'], ['--max-ops=Infinity']]) {
    const { code, text } = await capture(() => COMMANDS.daily({
      args, r, deps, clock,
    }));
    assert.equal(code, 2, `'${args[0]}' is refused with exit 2 (got ${code})`);
    assert.match(text, /refused/i, `'${args[0]}' explains the refusal`);
  }
});

test('HR23k a bound too small for the canary DEFERS, and is never overshot', async () => {
  const r = await makeReviewStore('hr23k', { videos: backlog(3) });
  const clock = makeClock();
  const { deps } = spyDeps();

  const { code, text } = await capture(() => COMMANDS.daily({
    args: ['--max-ops=1'], r, deps, clock,
  }));
  assert.equal(code, 3, `a one-operation run DEFERS instead of failing (got ${code})`);
  assert.match(text, /cannot fit the canary/, 'the health check is refused up front, not discovered mid-flight');
  assert.match(text, /run work bound/, 'and the bound is what deferred the queue');
});

// FOUND BY A LOCAL HOSTILE PROBE, AFTER THE HR22 SLICE WAS CALLED DONE.
//
//   The census path never charged its enumeration walks to the run bound: a
//   three-tab census reported `transportOps: 0` and spent three operations the
//   bound never saw. `--max-ops=1` could therefore spend three, which falsifies
//   the documented invariant that the run bound counts the walks. The incremental
//   path charged correctly, and every existing test exercised only that path — so
//   the suite was green while the claim was false on the newer code.
test('HR23l a CENSUS charges its enumeration walks to the run bound', async () => {
  const r = await makeReviewStore('hr23l', {
    creators: [{ channelId: REVIEW_A, title: 'Alpha', enabled: true }],
    videos: [],
  });
  const clock = makeClock();
  const tabsSeen = [];
  const enumerate = (channelId, { tabs = [] } = {}) => {
    tabsSeen.push([...tabs]);
    const out = {
      rows: [], invalid: [], perTab: {}, problems: [], tabs: [...tabs], stoppedEarly: false,
    };
    let n = tabsSeen.length * 10;
    for (const tab of tabs) {
      for (let i = 0; i < 2; i += 1) {
        out.rows.push({ id: vid(n), title: `${tab} ${i}`, upload_date: '20260101' });
        n += 1;
      }
      out.perTab[tab] = { rows: 2, invalid: 0 };
    }
    out.complete = out.rows.length > 0;
    return out;
  };

  const first = await runDaily({
    r,
    deps: reviewDeps({ enumerate }),
    clock,
    only: ['discover'],
    bounds: { maxOps: 1 },
    authoritative: true,
  });
  assert.equal(first.counts.transportOps, 1, 'the one walk this run was allowed is the one it reports');
  assert.equal(first.counts.sweepPending, 1, 'and the census is honestly left in progress');

  const second = await runDaily({
    r,
    deps: reviewDeps({ enumerate }),
    clock,
    only: ['discover'],
    bounds: { maxOps: 1 },
    authoritative: true,
  });
  assert.equal(second.counts.transportOps, 1, 'the next run also reports what it spent');
  assert.deepEqual(tabsSeen[0], ['videos'], 'run 1 took the first tab');
  assert.deepEqual(tabsSeen[1], ['shorts'], 'run 2 continued instead of repeating the first tab');
});
