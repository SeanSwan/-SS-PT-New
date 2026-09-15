#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/freshness.test.mjs
 * PURPOSE: HR23 — freshness against a real backlog, and the configurable
 *          no-caption retry window. Written BEFORE the repair.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW ASKED FOR:
 *
 *   "a new upload plus a 4,000-item backlog is served within the stated freshness
 *    objective" -> HR23f, at the fetch boundary, with the ops budgeted so that
 *    only one video can be served: the answer must be the new upload.
 *
 *   "every enabled creator advances" -> HR23g, with a budget that fits exactly
 *    one video per creator.
 *
 *   "Benchmark the real intended store size" -> HR23f measures the ordering of a
 *    4,000-row queue rather than asserting a number nobody measured.
 *
 *   "Source includes no configurable 48-hour setting at the public runner/CLI
 *    despite that acceptance criterion; implement it or correct the contract"
 *    -> HR23h proves `--no-track-hours` reaches the state machine through the
 *    CLI, and that the DEFAULT is still 48h.
 *
 * THE DEFECT HR23e PINS DOWN:
 *   `priorityTier` read `Number(video.publishedAt)`, but discovery stores
 *   yt-dlp's `upload_date` (`20260913`) and the subscription lane stores an ISO
 *   timestamp (`2026-09-13T04:30:00Z`). NEITHER is epoch milliseconds, so the
 *   "fresh" tier was unreachable in both real formats — a tier that no real
 *   record can enter is not a feature. `publishedMs` normalizes all three forms.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/freshness.test.mjs
 * @module creator-brains/test/freshness
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, makeReviewStore, reviewDeps, REVIEW_A, REVIEW_B } from './helpers.mjs';
import { priorityTier, orderCandidates } from '../lib/schedule.mjs';
import { readState, stateOrDefault } from '../lib/store.mjs';
import { runDaily } from '../lib/run.mjs';
import { COMMANDS } from '../commands.mjs';

const vid = (i) => `v${String(i).padStart(10, '0')}`.slice(0, 11);
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** yt-dlp's `upload_date` format: YYYYMMDD, no separators. */
function uploadDate(ms) {
  return new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
}

/** A state row with just the fields the scheduler reads. */
function row(videoId, publishedAt, channelId = REVIEW_A, extra = {}) {
  return {
    videoId, channelId, state: 'pending', attempts: 0, nextRetryAt: null, publishedAt, ...extra,
  };
}

async function capture(fn) {
  const chunks = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(String(s)); return true; };
  try {
    const code = await fn();
    return { code, text: chunks.join('') };
  } finally {
    process.stdout.write = original;
  }
}

// ── HR23e — the fresh tier must be reachable with the formats we actually store

test('HR23e the "fresh" tier is reachable in BOTH real date formats', async () => {
  const now = Date.parse('2026-09-13T06:30:00Z');
  const recent = now - 2 * HOUR;
  const ancient = now - 3 * 365 * DAY;

  assert.equal(priorityTier(row(vid(1), uploadDate(recent)), now), 2,
    'a video published today via discovery is FRESH');
  assert.equal(priorityTier(row(vid(2), new Date(recent).toISOString()), now), 2,
    'a video published today via the subscription lane is FRESH');
  assert.equal(priorityTier(row(vid(3), uploadDate(ancient)), now), 3,
    'a three-year-old upload is backfill');

  // The normalizer behind the tier, asserted directly. Loaded dynamically so the
  // RED run above is a BEHAVIOURAL failure rather than a module-load error.
  const { publishedMs } = await import('../lib/schedule.mjs');
  assert.equal(publishedMs(uploadDate(recent)), Date.parse('2026-09-13T00:00:00Z'),
    'yt-dlp upload_date (YYYYMMDD) is understood');
  assert.equal(publishedMs(new Date(recent).toISOString()), recent,
    'an ISO timestamp is understood');
  assert.equal(publishedMs(String(recent)), recent, 'epoch milliseconds are understood');
  assert.equal(publishedMs(null), null, 'an absent date stays absent rather than becoming 0');
});

test('HR23e2 a fresh upload is ordered ahead of an older backlog', () => {
  const now = Date.parse('2026-09-13T06:30:00Z');
  const fresh = row(vid(0), new Date(now - 3 * HOUR).toISOString());
  const old = Array.from({ length: 25 }, (_, i) => row(vid(i + 1), uploadDate(now - (400 + i) * DAY)));

  const ordered = orderCandidates([...old, fresh], { now });
  assert.equal(ordered[0].videoId, fresh.videoId, 'the new upload is served first');
});

// ── HR23f — the reviewer's own scenario: one new upload, a 4,000-item backlog ─

test('HR23f one new upload outranks a 4,000-item backlog, and planning stays cheap', async () => {
  const rows = Array.from({ length: 4_000 }, (_, i) => [vid(i), REVIEW_A]);
  const r = await makeReviewStore('hr23f', { videos: rows });
  const clock = makeClock();

  // Give the queue real dates: 3,999 old uploads and one published an hour ago.
  const state = stateOrDefault(readState(r));
  const freshId = vid(3999);
  for (const v of Object.values(state.videos)) {
    v.publishedAt = uploadDate(clock() - 500 * DAY);
    v.discoveredAt = new Date(clock() - 500 * DAY).toISOString();
  }
  state.videos[freshId].publishedAt = uploadDate(clock() - 2 * HOUR);
  state.videos[freshId].discoveredAt = new Date(clock() - 2 * HOUR).toISOString();
  const { saveState } = await import('../lib/store.mjs');
  saveState(state, r);

  // Benchmark the thing that scales with the store: ordering 4,000 candidates.
  const candidates = Object.values(state.videos);
  const t0 = process.hrtime.bigint();
  const ordered = orderCandidates(candidates, { now: clock() });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(ordered.length, 4_000, 'every candidate survives ordering');
  assert.equal(ordered[0].videoId, freshId, 'the new upload is first');
  assert.ok(ms < 2_000, `ordering 4,000 candidates took ${ms.toFixed(0)}ms`);

  // At the real boundary: with a budget that fits exactly one video (two
  // transport operations), the video that gets served must be the new upload.
  const rec = await runDaily({
    r,
    deps: reviewDeps(),
    clock,
    only: ['fetch'],
    budget: { perHour: 2 },
  });
  assert.equal(rec.counts.fetched, 1, 'one video fits in the budget');
  const after = stateOrDefault(readState(r));
  assert.equal(after.videos[freshId].state, 'fetched',
    'the freshness objective is met even with 3,999 older videos queued');
});

// ── HR23g — fairness: every enabled creator advances ─────────────────────────

test('HR23g a budget that fits one video per creator advances every creator', async () => {
  const r = await makeReviewStore('hr23g', {
    creators: [
      { channelId: REVIEW_A, title: 'Alpha', enabled: true },
      { channelId: REVIEW_B, title: 'Beta', enabled: true },
    ],
    videos: [
      ...Array.from({ length: 6 }, (_, i) => [vid(i), REVIEW_A]),
      ...Array.from({ length: 60 }, (_, i) => [vid(100 + i), REVIEW_B]),
    ],
  });
  const clock = makeClock();
  const state = stateOrDefault(readState(r));
  for (const v of Object.values(state.videos)) v.publishedAt = uploadDate(clock() - 200 * DAY);
  const { saveState } = await import('../lib/store.mjs');
  saveState(state, r);

  // Six operations: three videos' worth, round-robined across the two creators.
  const rec = await runDaily({
    r, deps: reviewDeps(), clock, only: ['fetch'], budget: { perHour: 6 },
  });
  const after = stateOrDefault(readState(r));
  const fetchedBy = (id) => Object.values(after.videos).filter((v) => v.channelId === id && v.state === 'fetched').length;
  assert.equal(rec.counts.fetched, 3, 'three videos were served');
  assert.ok(fetchedBy(REVIEW_A) >= 1, 'the small channel advanced');
  assert.ok(fetchedBy(REVIEW_B) >= 1, 'the large channel advanced too — it does not monopolise the budget');
});

// ── HR23h — the 48-hour window is configurable, and still defaults to 48h ────

test('HR23h the no-caption retry window is configurable at the CLI', async () => {
  const deps = reviewDeps({
    // An ANSWER, not a failure: the probe understands the response and there is
    // no English track — which is what routes a video into the retry lane.
    probeSubs: () => ({
      ok: true, kind: 'ok', languages: ['de'], originals: [],
    }),
  });

  const clock = makeClock();
  const configured = await makeReviewStore('hr23h', { videos: [[vid(0), REVIEW_A]] });
  const { code } = await capture(() => COMMANDS.daily({
    args: ['--no-track-hours=2'], r: configured, deps, clock,
  }));
  const rowAfter = stateOrDefault(readState(configured)).videos[vid(0)];
  assert.equal(rowAfter.state, 'no_track_retry', `the video entered the retry lane (exit ${code})`);
  const hours = (Date.parse(rowAfter.nextRetryAt) - clock()) / HOUR;
  assert.equal(Math.round(hours), 2, 'the configured 2-hour window is what was scheduled');

  const clock2 = makeClock();
  const dflt = await makeReviewStore('hr23h-default', { videos: [[vid(0), REVIEW_A]] });
  await capture(() => COMMANDS.daily({
    args: [], r: dflt, deps, clock: clock2,
  }));
  const dfltRow = stateOrDefault(readState(dflt)).videos[vid(0)];
  const dfltHours = (Date.parse(dfltRow.nextRetryAt) - clock2()) / HOUR;
  assert.equal(Math.round(dfltHours), 48, 'the documented 48h default is unchanged');
});

test('HR23h2 a nonsense window is refused rather than silently defaulted', async () => {
  const r = await makeReviewStore('hr23h2', { videos: [[vid(0), REVIEW_A]] });
  const clock = makeClock();
  const { code, text } = await capture(() => COMMANDS.daily({
    args: ['--no-track-hours=0'], r, deps: reviewDeps(), clock,
  }));
  assert.equal(code, 2, `a zero-hour window is a refusal, not a default (got ${code})`);
  assert.match(text, /refused/i, 'and it says so');
});
