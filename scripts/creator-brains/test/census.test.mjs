#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/census.test.mjs
 * PURPOSE: HR22 — deletions are confirmed only by a periodic AUTHORITATIVE
 *          census, never by an incremental walk. Written BEFORE the repair.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THE DEFECT THESE TESTS PIN DOWN:
 *   DELETIONS WERE UNREACHABLE FROM THE DAILY JOB. Deletion confirmation requires
 *   `complete === true`, which an incremental walk can never be — it stops at the
 *   high-water mark by design (HR23). The daily job only ever walked
 *   incrementally, and there was no other path to a census: no cadence, no
 *   explicit sweep. The two agreeing observations the FSM requires could never
 *   both arrive, so `deleted_upstream` was dead code in production while its unit
 *   test passed.
 *
 * THE REPAIR'S SHAPE, ASSERTED HERE:
 *   - a census is DUE for a creator that has never been swept, and on a cadence
 *     after that (`schedule.authoritativeDue`);
 *   - `--full` forces one;
 *   - only a census — a walk that covered every tab and saw a non-empty corpus —
 *     may observe an absence;
 *   - the cadence clock does not advance on a partial or failed census.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/census.test.mjs
 * @module creator-brains/test/census
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, REVIEW_A } from './helpers.mjs';
import { readState, stateOrDefault, saveState, loadRegistry } from '../lib/store.mjs';
import { runDaily } from '../lib/run.mjs';
import { authoritativeDue, selectAuthoritative, AUTHORITATIVE_EVERY_DAYS } from '../lib/schedule.mjs';
import { COMMANDS } from '../commands.mjs';
import {
  DAY, tabEnumerator, rowsFor, storeWith, vid, depsWith,
} from './enumeration-fixtures.mjs';

/** A corpus that no longer contains `vid(0)`, with the newest row first. */
const corpusWithout = (vanished) => ({
  videos: [{ id: vid(9), title: 'newest', upload_date: '20260101' }, ...rowsFor('videos', 4, 10)]
    .filter((r) => r.id !== vanished),
  shorts: rowsFor('shorts', 1, 300),
  streams: rowsFor('streams', 1, 400),
});

const corpusWith = (extra) => ({
  videos: [{ id: vid(9), title: 'newest', upload_date: '20260101' }, ...rowsFor('videos', 4, 10), extra],
  shorts: rowsFor('shorts', 1, 300),
  streams: rowsFor('streams', 1, 400),
});

/** A store whose one stored video is eligible for deletion detection. */
async function storeWithFetchedVideo(tag) {
  const r = await storeWith(tag, {
    videos: [[vid(0), REVIEW_A]],
    registry: { highWaterMark: { videoId: vid(9), title: 'newest', uploadDate: '20260101' } },
  });
  const seeded = stateOrDefault(readState(r));
  seeded.videos[vid(0)].state = 'fetched';
  saveState(seeded, r);
  return r;
}

// ── the cadence rule, as a rule ──────────────────────────────────────────────

test('HR22d1 a creator that has never been swept is due; a recent one is not', () => {
  const now = Date.parse('2026-09-13T06:30:00Z');
  const never = { channelId: REVIEW_A, title: 'Alpha' };
  assert.equal(authoritativeDue(never, { now }).due, true,
    'no baseline means the first walk should be a deliberate census');

  const recent = { ...never, lastAuthoritativeAt: new Date(now - 2 * DAY).toISOString() };
  const stale = { ...never, lastAuthoritativeAt: new Date(now - (AUTHORITATIVE_EVERY_DAYS + 1) * DAY).toISOString() };
  assert.equal(authoritativeDue(recent, { now }).due, false, 'two days after a census is not due');
  assert.equal(authoritativeDue(stale, { now }).due, true, 'past the interval is due');
  assert.match(authoritativeDue(stale, { now }).reason, /last census/i, 'and the reason says when');

  const split = selectAuthoritative([never, recent, stale], { now });
  assert.equal(split.due.length, 2, 'the never-swept and the stale creator are both due');
  assert.equal(split.notDue.length, 1);
});

// ── a deletion needs a census, and a census is deliberate ────────────────────

test('HR22c a deletion is confirmed by an authoritative sweep, never by an incremental walk', async () => {
  const r = await storeWithFetchedVideo('hr22c');
  const clock = makeClock();
  const rows = { ...corpusWith({ id: vid(0), title: 'still here', upload_date: '20260101' }) };
  const enumerate = tabEnumerator({ rows, log: [] });
  const deps = depsWith(enumerate);

  // A BASELINE CENSUS FIRST, so the next run is genuinely incremental: a creator
  // that has never been swept is due for one immediately (HR22d).
  await runDaily({ r, deps, clock, only: ['discover'], bounds: { maxOps: 40 } });
  let state = stateOrDefault(readState(r));
  assert.ok(!state.videos[vid(0)].missingStreak, 'the baseline census saw every video, so nothing is missing');
  assert.equal(enumerate.log[0].stopAfterId, null, 'and it was a census, not an incremental walk');

  // Now the video disappears from the corpus, and the daily run walks
  // incrementally — which must NOT touch deletion bookkeeping.
  rows.videos = corpusWithout(vid(0)).videos;
  const inc = await runDaily({ r, deps, clock, only: ['discover'], bounds: { maxOps: 40 } });
  assert.equal(inc.counts.deleted, 0, 'an incremental walk cannot confirm a deletion');
  assert.equal(enumerate.log[1].stopAfterId, vid(9), 'the second run WAS incremental');
  state = stateOrDefault(readState(r));
  assert.equal(state.videos[vid(0)].state, 'fetched', 'and it does not park the video either');
  assert.ok(!state.videos[vid(0)].missingStreak, 'not even a suspicion is recorded from a partial walk');

  // An explicit census is the path that can.
  await runDaily({
    r, deps, clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  state = stateOrDefault(readState(r));
  assert.equal(state.videos[vid(0)].missingStreak, 1, 'the census observes the absence (first confirmation)');
  assert.equal(state.videos[vid(0)].state, 'fetched', 'one observation is not yet a deletion');

  // A SECOND census, after the interval, confirms it.
  clock.advance(8 * DAY);
  await runDaily({
    r, deps, clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  state = stateOrDefault(readState(r));
  assert.equal(state.videos[vid(0)].state, 'deleted_upstream',
    'two authoritative observations of absence are terminal');
});

test('HR22d the daily job sweeps on a cadence, and `discover --full` forces one', async () => {
  const r = await storeWithFetchedVideo('hr22d');
  const clock = makeClock();
  const rows = corpusWithout(vid(0));
  const enumerate = tabEnumerator({ rows, log: [] });
  const deps = depsWith(enumerate);

  // First daily run: nothing has ever been swept, so a census is due — and a
  // census does not stop at the high-water mark.
  await runDaily({ r, deps, clock, only: ['discover'], bounds: { maxOps: 40 } });
  let state = stateOrDefault(readState(r));
  assert.equal(enumerate.log[0].stopAfterId, null, 'a census walks the whole corpus');
  assert.ok(state.videos[vid(0)].missingStreak >= 1,
    'the first daily run performs the authoritative sweep that is due');
  assert.ok(loadRegistry(r).creators[REVIEW_A].lastAuthoritativeAt, 'and the cadence clock starts');

  // A second run the same day is NOT due for another census, so it walks
  // incrementally — observable in the one place it matters: it stops at the
  // high-water mark instead of re-reading the channel.
  await runDaily({ r, deps, clock, only: ['discover'], bounds: { maxOps: 40 } });
  assert.equal(enumerate.log[1].stopAfterId, vid(9), 'the second run is INCREMENTAL, not another census');
  assert.deepEqual(enumerate.log[1].walked, ['videos'],
    'and it stops inside the first tab rather than reading the rest of the corpus');

  // `--full` forces a census regardless of the cadence.
  const forced = await COMMANDS.discover({
    args: ['--full'], r, deps, clock,
  });
  assert.equal(forced, 0, 'the forced sweep succeeds');
  assert.equal(enumerate.log[2].stopAfterId, null, '--full walks the whole corpus');
  state = stateOrDefault(readState(r));
  assert.equal(state.videos[vid(0)].state, 'deleted_upstream',
    'the forced sweep supplies the second confirmation');
});

// ── the cadence clock only advances on a census that actually happened ───────

test('HR22h a FAILED census leaves the creator due for the next run', async () => {  const r = await storeWith('hr22h');
  const clock = makeClock();
  const enumerate = tabEnumerator({
    log: [],
    rows: corpusWith(null),
    fail: { streams: 'HTTP Error 500' },
  });
  const deps = depsWith(enumerate);

  await runDaily({ r, deps, clock, only: ['discover'], bounds: { maxOps: 40 } });
  const creator = loadRegistry(r).creators[REVIEW_A];
  assert.ok(!creator.lastAuthoritativeAt,
    'a census that lost a tab does not claim to have reconciled anything');

  // And with every tab answering, the next run completes it without being asked.
  const ok = tabEnumerator({ log: [], rows: corpusWith(null) });
  await runDaily({ r, deps: depsWith(ok), clock, only: ['discover'], bounds: { maxOps: 40 } });
  assert.ok(loadRegistry(r).creators[REVIEW_A].lastAuthoritativeAt,
    'the census that succeeded is what advances the cadence');
});

// KILLS MUTATION M8. Removing the `partial` guard from `discover.mjs` survived the
// first mutation run: no test called the walk with a SUBSET of the corpus and
// checked that it refuses to judge. (The sweep avoids this by passing
// `allowDeletion: false` and judging the checkpoint's UNION instead — which is why
// a resumed sweep ACROSS runs is legitimate once every tab is certified, and why
// this boundary needs its own test rather than an end-to-end one.)
test('HR22i a walk given PART of the corpus certifies nothing and judges nothing', async () => {
  const r = await storeWithFetchedVideo('hr22i');
  const clock = makeClock();
  const { discoverChannel } = await import('../lib/discover.mjs');
  const { TABS: ALL_TABS } = await import('../lib/enumerate.mjs');
  const state = stateOrDefault(readState(r));

  // A single tab, answering perfectly, whose rows simply do not include the
  // vanished video — the shape a naive caller would mistake for a census.
  const oneTab = tabEnumerator({ rows: corpusWithout(vid(0)), log: [] });
  const res = await discoverChannel(
    { channelId: REVIEW_A, title: 'Alpha' },
    {
      r, deps: depsWith(oneTab), now: clock, state, tabs: ['videos'], allTabs: ALL_TABS,
    },
  );

  assert.equal(res.partial, true, 'the walk knows it covered part of the corpus');
  assert.equal(res.complete, false, 'and therefore cannot be complete, however clean the answer was');
  assert.equal(res.judged, false, 'so it does not judge absences at all');
  const after = stateOrDefault(readState(r));
  assert.ok(!after.videos[vid(0)].missingStreak, 'the vanished video is not even suspected');
  assert.equal(oneTab.log[0].walked.length, 1, 'exactly one tab was walked');

  // AND THE CONTRAST: given the WHOLE corpus in one call, the same walk judges.
  const whole = tabEnumerator({ rows: corpusWithout(vid(0)), log: [] });
  const full = await discoverChannel(
    { channelId: REVIEW_A, title: 'Alpha' },
    {
      r, deps: depsWith(whole), now: clock, state, tabs: ALL_TABS, allTabs: ALL_TABS,
    },
  );
  assert.equal(full.complete, true, 'every tab covered');
  assert.equal(full.judged, true, 'a whole-corpus walk is the one allowed to judge');
  assert.equal(stateOrDefault(readState(r)).videos[vid(0)].missingStreak, 1, 'and it observes the absence');
});
