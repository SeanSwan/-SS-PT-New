#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/backlog.test.mjs
 * PURPOSE: HR23 — what the operator can SEE: backlog age, the projection, retry
 *          exhaustion, the cooldown, and the exit code a scheduler reads.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `bounds.test.mjs`, which reached the Rule 4 cap when the census
 * charging test (HR23l) landed. The seam is real rather than cosmetic: that file
 * proves what the engine REFUSES to spend, and this one proves what it REPORTS —
 * different subjects, different failure modes, and the reporting half is what the
 * original finding called "operator-visible backlog age, oldest pending/newest
 * processed, expected completion at the actual cadence and retry exhaustion/repair
 * actions".
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/backlog.test.mjs
 * @module creator-brains/test/backlog
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  capture, makeClock, makeReviewStore, reviewDeps, REVIEW_A, tempRoot,
} from './helpers.mjs';
import { runDaily } from '../lib/run.mjs';
import { COMMANDS } from '../commands.mjs';

const vid = (i) => `v${String(i).padStart(10, '0')}`.slice(0, 11);
const backlog = (n, channelId = REVIEW_A) =>
  Array.from({ length: n }, (_, i) => [vid(i), channelId]);
const RATE_LIMITED = 'ERROR: unable to download video data: HTTP Error 429: Too Many Requests';

/** A probe that always answers with a 429 — the shape of a blocked session. */
function limitedDeps() {
  return reviewDeps({
    probeSubs: () => ({
      ok: false, kind: 'failed', languages: [], error: RATE_LIMITED,
    }),
  });
}

// ── HR23i — the backlog is visible where the operator already looks ──────────

test('HR23i `status` reports backlog age, projection and retry exhaustion', async () => {
  const r = await makeReviewStore('hr23i', { videos: backlog(120) });
  const clock = makeClock();

  // Age the queue deliberately: one video discovered 400 days ago (no publish
  // date recorded, so the age must come from discovery time), and one transient
  // failure whose attempts are exhausted, so both lines have content.
  const { readState, stateOrDefault, saveState } = await import('../lib/store.mjs');
  const state = stateOrDefault(readState(r));
  const old = new Date(clock() - 400 * 86_400_000).toISOString();
  for (const v of Object.values(state.videos)) { v.discoveredAt = old; v.publishedAt = null; }
  state.videos[vid(119)].state = 'failed_transient';
  state.videos[vid(119)].attempts = 99;
  state.videos[vid(119)].nextRetryAt = new Date(clock() + 86_400_000).toISOString();
  saveState(state, r);

  const { code, text } = await capture(() => COMMANDS.status({ r, args: [] }));
  assert.equal(code, 0, 'status still succeeds');
  assert.match(text, /backlog/i, 'the backlog is reported');
  assert.match(text, /oldest ready/i, 'the oldest ready item is named with its age');
  // The age is computed against the REAL clock, because that is the clock the
  // operator is reading the screen with.
  const expectedAge = Math.floor((Date.now() - Date.parse(old)) / 86_400_000);
  assert.match(text, new RegExp(`${expectedAge}d old`), 'the age is in days, not a raw timestamp');
  assert.match(text, /projection/i, 'expected completion at the actual cadence is stated');
  assert.match(text, /exhausted/i, 'retry exhaustion is surfaced');
  assert.match(text, /repair|--retry/i, 'and with the action that repairs it');
});

test('HR23j a throttled run reports DEFERRED, not a failure and not a success', async () => {
  const r = await makeReviewStore('hr23j', { videos: backlog(5) });
  // The clock starts at REAL now, because `status` reads the real clock: a frozen
  // clock in the past would make a live cooldown look already expired.
  const clock = makeClock(Date.now());

  const { code } = await capture(() => COMMANDS.daily({
    args: [], r, deps: limitedDeps(), clock,
  }));
  // Rule: 0 ok · 1 work failed · 2 refused · 3 deferred (nothing wrong, nothing
  // done). A throttle is the third case, and the CLI must say so.
  assert.equal(code, 3, `a throttled run exits 3 (got ${code})`);

  const { text } = await capture(() => COMMANDS.status({ r, args: [] }));
  assert.match(text, /throttl/i, 'status names the active cooldown before the next run');
  assert.match(text, /until|resume/i, 'and says when traffic may resume');
});

// A store with no state at all must not make `status` pretend it has a backlog.
test('HR23i2 status on an empty store still reports a backlog line', async () => {
  const r = tempRoot('cb-hr23i2');
  const { text } = await capture(() => COMMANDS.status({ r, args: [] }));
  assert.match(text, /backlog/i, 'the line is always present, so its absence is never ambiguous');
  assert.match(text, /nothing ready|0 ready|empty/i, 'and it says there is nothing to do');
});
