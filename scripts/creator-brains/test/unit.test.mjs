#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/unit.test.mjs
 * PURPOSE: Requirement-linked unit tests T-01…T-07 and T-14 — creator refs,
 *          discovery high-water mark, transcript idempotence, the F2 no-track
 *          vs fetch-failure split, retry lanes, FSM legality, the budget cap,
 *          and the discovery-bound fetch law.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 *
 * RUN: node --test scripts/creator-brains/test/unit.test.mjs
 * @module creator-brains/test/unit
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, tempRoot, fakeDeps, uploadRow, rollingJson3 } from './helpers.mjs';
import { DAY_MS, HOUR_MS, readJson } from '../lib/paths.mjs';
import { STATES, newVideoState, transition, applyOutcome, shouldAttempt, nextRetryFor, FsmError, expireNoTrack, NO_TRACK_RETRY_HOURS } from '../lib/fsm.mjs';

// ── T-01 (CB-01) ────────────────────────────────────────────────────────────

test('T-01 registry accepts @handle, channel URL and UC id; rejects a phrase', async () => {
  const { addCreator } = await import('../lib/registry.mjs');
  const r = tempRoot('cb-t01');
  const clock = makeClock();
  const deps = fakeDeps({
    resolveCreator: (ref) => {
      if (String(ref).includes('not-a-channel')) return null;
      return { channelId: `UC${'b'.repeat(22)}`, title: `T ${ref}`, url: String(ref) };
    },
  });

  const ok1 = await addCreator({ ref: '@someone', r, deps, now: clock });
  const ok2 = await addCreator({ ref: 'https://www.youtube.com/@someone', r, deps, now: clock });
  const ok3 = await addCreator({ ref: `UC${'c'.repeat(22)}`, r, deps, now: clock });
  assert.equal(ok1.ok, true, '@handle accepted');
  assert.equal(ok2.ok, true, 'channel URL accepted');
  assert.equal(ok3.ok, true, 'UC id accepted');

  const bad = await addCreator({ ref: 'not-a-channel at all', r, deps, now: clock });
  assert.equal(bad.ok, false, 'a phrase is rejected');
  assert.match(bad.reason, /not a creator reference|not_a_creator_ref/i);
});

test('T-01b a new creator is born DISABLED (trigger law)', async () => {
  const { addCreator, listCreators } = await import('../lib/registry.mjs');
  const r = tempRoot('cb-t01b');
  await addCreator({ ref: '@someone', r, deps: fakeDeps(), now: makeClock() });
  const list = listCreators(r);
  assert.equal(list.length, 1);
  assert.equal(list[0].enabled, false, 'creators must never auto-enable');
});

// ── T-02 (CB-02) ────────────────────────────────────────────────────────────

test('T-02 discovery enumerates past 200 videos and a second run finds 0 new', async () => {
  const { discoverChannel } = await import('../lib/discover.mjs');
  const r = tempRoot('cb-t02');
  const clock = makeClock();
  const big = Array.from({ length: 260 }, (_, i) => uploadRow(i));
  const deps = fakeDeps({ enumerate: () => ({ rows: big, invalid: [], complete: true, tabs: ['videos'] }) });
  const creator = { channelId: `UC${'d'.repeat(22)}`, url: 'https://www.youtube.com/@x/videos', title: 'X' };

  const first = await discoverChannel(creator, { r, deps, now: clock, limit: 0 });
  assert.ok(first.newIds.length > 200, `expected >200 discovered, got ${first.newIds.length}`);
  assert.equal(first.complete, true, 'an unbounded walk is complete');

  const second = await discoverChannel(creator, { r, deps, now: clock, limit: 0 });
  assert.equal(second.newIds.length, 0, 'second run discovers nothing new');
});

test('T-02b a TRUNCATED walk is flagged, so a delta is never mistaken for completeness', async () => {
  const { discoverChannel } = await import('../lib/discover.mjs');
  const r = tempRoot('cb-t02b');
  const deps = fakeDeps({ enumerate: (channelId, { limit }) => ({ rows: Array.from({ length: Math.min(limit, 500) }, (_, i) => uploadRow(i)), invalid: [], complete: false, reason: 'stopped at the requested limit', tabs: ['videos'] }) });
  const creator = { channelId: `UC${'e'.repeat(22)}`, url: 'https://www.youtube.com/@y/videos', title: 'Y' };
  const res = await discoverChannel(creator, { r, deps, now: makeClock(), limit: 50 });
  assert.equal(res.complete, false, 'hitting the limit must be reported');
  assert.match(res.reason, /limit/i);
});

// ── T-03 (CB-03) + INV-1 ────────────────────────────────────────────────────

test('T-03 fetching twice stores one document and reports unchanged', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t03');
  const clock = makeClock();
  const creator = { channelId: `UC${'f'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });

  const one = await fetchVideo(video, { r, creator, deps: fakeDeps(), now: clock });
  assert.equal(one.state, STATES.FETCHED, 'first fetch succeeds');
  assert.equal(one.wrote, true, 'first fetch writes the document');

  const two = await fetchVideo(one, { r, creator, deps: fakeDeps(), now: clock });
  assert.equal(two.state, STATES.FETCHED);
  assert.equal(two.wrote, false, 'second fetch rewrites nothing');
  assert.equal(two.reason, 'unchanged');
});

test('T-03b the creator-brains store has NO pruning path — scout pruning cannot reach it', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const { listDocs } = await import('../lib/store.mjs');
  const store = await import('../lib/store.mjs');
  const r = tempRoot('cb-t03b');
  const clock = makeClock();
  const creator = { channelId: `UC${'g'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
  await fetchVideo(video, { r, creator, deps: fakeDeps(), now: clock });

  // The scout cache prunes on a TTL. This store must not expose that concept at
  // all — an archive you can accidentally reap is not an archive.
  assert.equal(typeof store.prune, 'undefined', 'store exposes no prune()');
  assert.ok(!Object.keys(store).some((k) => /prune|ttl|expire/i.test(k)), 'no TTL-shaped export exists');

  const { pruneCache } = await import('../../swan-scout/yt-scout-transcript.mjs');
  const reaped = pruneCache(r, { all: true }); // reap-everything, pointed at OUR root
  assert.equal(reaped, 0, 'the scout pruner reaps nothing of ours by filename pattern');
  assert.equal(listDocs(r).length, 1, 'the transcript document survived a full reap');
});

// ── T-04 (CB-04) — the F2 split ─────────────────────────────────────────────

test('T-04 a probe that cannot answer is failed_transient, never no_track_confirmed', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t04');
  const clock = makeClock();
  const creator = { channelId: `UC${'h'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });

  const networkDown = fakeDeps({ probeSubs: () => ({ ok: false, error: 'HTTP 429 Too Many Requests' }) });
  const out = await fetchVideo(video, { r, creator, deps: networkDown, now: clock });
  assert.equal(out.state, STATES.FAILED_TRANSIENT, 'a failed probe is transient');
  assert.notEqual(out.state, STATES.NO_TRACK_CONFIRMED);
  assert.match(out.lastError, /429/);
});

test('T-04b an answered probe with no wanted track IS no_track_confirmed', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t04b');
  const clock = makeClock();
  const creator = { channelId: `UC${'i'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
  const noEnglish = fakeDeps({ probeSubs: () => ({ ok: true, languages: ['de', 'fr'] }) });
  const out = await fetchVideo(video, { r, creator, deps: noEnglish, now: clock });
  assert.equal(out.state, STATES.NO_TRACK_RETRY, 'answered-with-no-track parks in the retry lane');
  assert.equal(out.lastError, null, 'no error — this is an ANSWER, not a failure');
});

test('T-04c a probe answered YES but an empty payload is a FAILURE, not a no-track', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t04c');
  const clock = makeClock();
  const creator = { channelId: `UC${'j'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
  const lies = fakeDeps({
    probeSubs: () => ({ ok: true, languages: ['en'] }),
    fetchJson3: () => { throw new Error('empty json3 payload'); },
  });
  const out = await fetchVideo(video, { r, creator, deps: lies, now: clock });
  assert.equal(out.state, STATES.FAILED_TRANSIENT, 'absence after declared presence is a failure');
});

test('T-04d malformed json3 fails CLOSED with a shape reason', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t04d');
  const clock = makeClock();
  const creator = { channelId: `UC${'k'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
  const shaped = fakeDeps({ fetchJson3: () => JSON.stringify({ unexpected: true }) });
  const out = await fetchVideo(video, { r, creator, deps: shaped, now: clock });
  assert.equal(out.state, STATES.FAILED_TRANSIENT);
  assert.match(out.lastError, /shape|no cues|unexpected/i);
});

// ── T-05 (CB-05) + T-06 (CB-06) ─────────────────────────────────────────────

test('T-05 a fresh no-track video waits, then goes unavailable after the window', () => {
  const clock = makeClock();
  const v = newVideoState('aircAruvnKk', 'UCx', { now: clock.iso() });
  const parked = applyOutcome(v, { kind: 'no_track' }, { now: clock() });
  assert.equal(parked.state, STATES.NO_TRACK_RETRY);

  const early = shouldAttempt(parked, { now: clock() });
  assert.equal(early.work, false, 'not attempted inside the window');
  assert.equal(early.reason, 'no_track_waiting');

  const later = clock() + (NO_TRACK_RETRY_HOURS - 1) * HOUR_MS;
  assert.equal(shouldAttempt(parked, { now: later }).work, false, 'still inside the window');

  const after = clock() + (NO_TRACK_RETRY_HOURS + 1) * HOUR_MS;
  assert.equal(shouldAttempt(parked, { now: after }).work, true, 'due after the window');
  const dead = expireNoTrack(parked, { now: after });
  assert.equal(dead.state, STATES.UNAVAILABLE);
});

test('T-06 the FSM retries a failure but never re-fetches a success', () => {
  const clock = makeClock();
  const v = newVideoState('aircAruvnKk', 'UCx', { now: clock.iso() });
  const failed = applyOutcome(v, { kind: 'error', error: 'boom' }, { now: clock() });

  assert.equal(failed.state, STATES.FAILED_TRANSIENT);
  assert.equal(failed.attempts, 1, 'a transient failure counts an attempt');
  assert.equal(shouldAttempt(failed, { now: clock() }).work, false, 'backoff is respected');
  assert.equal(shouldAttempt(failed, { now: Date.parse(failed.nextRetryAt) }).work, true, 'due at nextRetryAt');
  assert.equal(shouldAttempt(failed, { now: clock(), retry: true }).work, true, '--retry forces it');

  const done = applyOutcome(failed, { kind: 'ok' }, { now: clock() });
  assert.equal(shouldAttempt(done, { now: clock() }).work, false);
  assert.equal(shouldAttempt(done, { now: clock() }).reason, 'already_fetched');
});

test('T-06b illegal transitions throw rather than corrupting the record', () => {
  const clock = makeClock();
  const v = newVideoState('aircAruvnKk', 'UCx', { now: clock.iso() });
  const done = applyOutcome(v, { kind: 'ok' }, { now: clock() });
  assert.throws(() => transition(done, STATES.PENDING), FsmError, 'fetched -> pending is illegal');
  const dead = transition(done, STATES.DELETED_UPSTREAM, { now: clock() });
  assert.throws(() => transition(dead, STATES.FETCHED), FsmError, 'a terminal state is terminal');
});

test('T-06c repeated transient failures become permanent after MAX_ATTEMPTS', () => {
  const clock = makeClock();
  let v = newVideoState('aircAruvnKk', 'UCx', { now: clock.iso() });
  for (let i = 0; i < 6; i += 1) {
    v = shouldAttempt(v, { now: clock(), retry: true }).work
      ? applyOutcome(v, { kind: 'error', error: `fail ${i}` }, { now: clock() })
      : v;
    if (v.state === STATES.FAILED_PERMANENT) break;
    clock.advance(8 * DAY_MS);
  }
  assert.equal(v.state, STATES.FAILED_PERMANENT, 'exhausted attempts stop the retry loop');
  assert.equal(nextRetryFor(v), null, 'terminal states have no next retry');
});

// ── T-07 (CB-07) ────────────────────────────────────────────────────────────

test('T-07 a tripped budget REFUSES with a reason and never reports a clean zero', async () => {
  const { openBudget, reserveCost } = await import('../lib/ledger.mjs');
  const clock = makeClock();
  // The budget is PERSISTENT and its unit is one yt-dlp transport operation.
  const budget = openBudget({ r: tempRoot('cb-t07'), cap: 2, now: clock });

  assert.equal(reserveCost(budget, { op: 'probe' }).ok, true, 'first allowed');
  assert.equal(reserveCost(budget, { op: 'fetch' }).ok, true, 'second allowed');
  const third = reserveCost(budget, { op: 'probe' });
  assert.equal(third.ok, false, 'third refused');
  assert.ok(third.reason && third.reason.length > 0, 'a refusal MUST carry a reason');
  assert.equal(third.remaining, 0);

  clock.advance(HOUR_MS + 1000);
  assert.equal(reserveCost(budget, { op: 'probe' }).ok, true, 'the window rolls');
});

// ── T-14 (INV-3) ────────────────────────────────────────────────────────────

test('T-14 a video id NOT produced by discovery is refused before any network call', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t14');
  const clock = makeClock();
  let probed = 0;
  const deps = fakeDeps({ probeSubs: () => { probed += 1; return { ok: true, languages: ['en'] }; } });

  const orphan = newVideoState('ZZZZZZZZZZZ', 'UC-not-in-registry', { now: clock.iso() });
  const out = await fetchVideo(orphan, { r, creator: { channelId: 'UC-not-in-registry' }, deps, now: clock, requireDiscovered: true });
  assert.equal(out.state, STATES.FAILED_PERMANENT);
  assert.match(out.lastError, /not_discovered|not discovered/i);
  assert.equal(probed, 0, 'no network call may happen for an undiscovered id');
});

