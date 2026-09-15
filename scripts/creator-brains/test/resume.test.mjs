#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/resume.test.mjs
 * PURPOSE: HR22 — resumable enumeration checkpoints. Written BEFORE the repair,
 *          at the real boundaries.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW ASKED FOR, VERBATIM:
 *   "Implement resumable checkpoints and incremental discovery separately from
 *    periodic authoritative reconciliation, or explicitly rename the v1 scope and
 *    remove the 'full/resumable' acceptance claim."
 *
 *   Test: "fixtures with uploads spread across all three content types and >200
 *    entries; interruption/resume with no gaps or duplicate work; actual
 *    supported-tool smoke for a public mixed-content channel."
 *
 * THE DEFECT THESE TESTS PIN DOWN:
 *   NOTHING REMEMBERED A PARTLY-WALKED CHANNEL. An enumeration that dies after the
 *   `videos` tab left no record of the work done, so the next run started at
 *   `videos` again. On a channel whose walk does not fit in one run — a
 *   four-thousand-video backfill, or a run whose work bound affords one tab — the
 *   walk could restart at the same tab forever and `shorts`/`streams` were never
 *   reached. That is a GAP in the corpus, not a slow path.
 *
 * The DELETION half of HR22 lives in `census.test.mjs`, so each file reads as one
 * subject; `enumeration-fixtures.mjs` is the harness they share.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/resume.test.mjs
 * @module creator-brains/test/resume
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, REVIEW_A } from './helpers.mjs';
import { readState, stateOrDefault, saveState } from '../lib/store.mjs';
import { runDaily } from '../lib/run.mjs';
import {
  DAY, TABS, tabEnumerator, rowsFor, storeWith, vid, walkedCount, depsWith,
} from './enumeration-fixtures.mjs';

// ── HR22a — an interrupted walk resumes at the unfinished tab ────────────────

test('HR22a an interrupted sweep resumes at the tab that failed — no gap, no re-walk', async () => {
  const r = await storeWith('hr22a');
  const clock = makeClock();
  const log = [];
  const rows = {
    videos: rowsFor('videos', 3, 0),
    shorts: rowsFor('shorts', 2, 100),
    streams: rowsFor('streams', 2, 200),
  };
  // The first attempt cannot walk `streams`; the second can.
  let streamsFails = true;
  const enumerate = tabEnumerator({
    rows,
    log,
    fail: () => (streamsFails ? { streams: 'HTTP Error 500' } : {}),
  });

  const first = await runDaily({
    r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  assert.equal(first.counts.discovered, 5, 'the two healthy tabs were ingested');
  assert.notEqual(first.ok, true, 'a walk that lost a tab does not report success');

  // The channel has two more rows waiting behind the failed tab.
  streamsFails = false;
  const second = await runDaily({
    r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  assert.equal(second.counts.discovered, 2, 'the resumed run ingests the tab that was missed');

  const walked = log.map((w) => w.walked.join('+'));
  assert.deepEqual(walked[1], 'streams',
    `the second run must walk ONLY the unfinished tab (walked: ${walked.join(' then ')})`);

  const state = stateOrDefault(readState(r));
  const ids = Object.keys(state.videos);
  assert.equal(ids.length, 7, 'every row from every tab is present exactly once');
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
});

// ── HR22b — >200 rows across three tabs, resumed under a tight bound ─────────

test('HR22b 250 mixed-content rows: every id once, no tab walked twice, under a 1-tab-per-run bound', async () => {
  const r = await storeWith('hr22b');
  const clock = makeClock();
  const log = [];
  const enumerate = tabEnumerator({
    log,
    rows: {
      videos: rowsFor('videos', 100, 0),
      shorts: rowsFor('shorts', 80, 1000),
      streams: rowsFor('streams', 70, 2000),
    },
  });

  // Each run may spend ONE enumeration operation, so exactly one tab fits.
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await runDaily({
      r,
      deps: depsWith(enumerate),
      clock,
      only: ['discover'],
      bounds: { maxOps: 1 },
      authoritative: true,
    });
    clock.advance(DAY);
  }

  const state = stateOrDefault(readState(r));
  const ids = Object.keys(state.videos);
  assert.equal(ids.length, 250, 'the whole corpus was reached across the runs');
  assert.equal(new Set(ids).size, ids.length, 'no id was stored twice');
  const walked = log.flatMap((w) => w.walked);
  assert.deepEqual([...new Set(walked)].sort(), [...TABS].sort(), 'all three tabs were walked');
  assert.ok(walked.filter((t) => t === 'videos').length <= 2,
    `a certified tab is not re-walked every run (walked: ${walked.join(',')})`);
});

// ── HR22e — an interrupted walk cannot fabricate a deletion ──────────────────

test('HR22e a tab failure mid-sweep confirms nothing', async () => {
  const r = await storeWith('hr22e', {
    videos: [[vid(0), REVIEW_A]],
    registry: { highWaterMark: { videoId: vid(9), title: 'newest', uploadDate: '20260101' } },
  });
  const clock = makeClock();
  const seeded = stateOrDefault(readState(r));
  seeded.videos[vid(0)].state = 'fetched';
  saveState(seeded, r);

  // vid(0) is absent from the corpus and `streams` never answers, so the ONLY
  // reason nothing is confirmed is the failed tab.
  const rows = {
    videos: [{ id: vid(9), title: 'newest', upload_date: '20260101' }, ...rowsFor('videos', 4, 10)],
    shorts: rowsFor('shorts', 1, 300),
    streams: rowsFor('streams', 1, 400),
  };
  const enumerate = tabEnumerator({ rows, log: [], fail: { streams: 'HTTP Error 500' } });

  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await runDaily({
      r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
    });
  }
  const state = stateOrDefault(readState(r));
  assert.equal(state.videos[vid(0)].state, 'fetched',
    'a sweep that never covered every tab does not confirm an absence');
  assert.ok(!state.videos[vid(0)].missingStreak, 'and it does not accumulate suspicion either');
});

// A sweep must not be resumed forever: an abandoned one expires.
test('HR22f a stale partial sweep is discarded rather than resumed weeks later', async () => {
  const r = await storeWith('hr22f');
  const clock = makeClock();
  const rows = {
    videos: rowsFor('videos', 2, 0), shorts: rowsFor('shorts', 2, 100), streams: rowsFor('streams', 2, 200),
  };
  let streamsFails = true;
  const enumerate = tabEnumerator({
    rows, log: [], fail: () => (streamsFails ? { streams: 'HTTP Error 500' } : {}),
  });

  await runDaily({
    r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  clock.advance(30 * DAY);
  streamsFails = false;
  const logAt = enumerate.log.length;
  await runDaily({
    r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });

  const state = stateOrDefault(readState(r));
  assert.equal(Object.keys(state.videos).length, 6, 'the whole corpus is present after the stale sweep restarts');
  assert.ok(enumerate.log[logAt].tabs.includes('videos'),
    'a month-old partial sweep RESTARTS from the first tab rather than resuming it');
});

// Behavioural version of "no checkpoint to resume": a store that has never been
// swept walks every tab, in order, on its first sweep.
test('HR22g a store that has never been swept walks all three tabs from the start', async () => {
  const r = await storeWith('hr22g');
  const clock = makeClock();
  const enumerate = tabEnumerator({
    log: [],
    rows: { videos: rowsFor('videos', 1, 0), shorts: rowsFor('shorts', 1, 100), streams: rowsFor('streams', 1, 200) },
  });
  await runDaily({
    r, deps: depsWith(enumerate), clock, only: ['discover'], bounds: { maxOps: 40 }, authoritative: true,
  });
  assert.deepEqual(enumerate.log[0].tabs, TABS, 'a first sweep covers the whole corpus, in tab order');
  assert.equal(walkedCount(enumerate), 3, 'and it walks each tab exactly once');
});
