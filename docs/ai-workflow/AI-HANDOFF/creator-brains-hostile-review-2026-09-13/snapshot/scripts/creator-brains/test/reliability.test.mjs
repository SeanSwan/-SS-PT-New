#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/reliability.test.mjs
 * PURPOSE: Tests T-21 … T-25 — the schedule the runner must honour, the run
 *          verdict, mid-loop failure accounting, state-map corruption, run-id
 *          uniqueness, and transcript revision records.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THESE ARE TOGETHER: every one of them was written in response to a REAL
 * defect found by running the engine or by an independent hostile review, not
 * to a specification. Four of the five were present while the offline suite was
 * fully green, which is the property this file documents:
 *
 *   T-21  the runner computed a backoff schedule and never consulted it
 *   T-21b 'unavailable' was unreachable — a caption-less video retried forever
 *   T-22  record.ok was the CANARY's verdict, so a run with 0 fetched / N failed
 *         printed COMPLETED and exited 0
 *   T-22b a throw mid-loop discarded the accounting for work already done
 *   T-23  a corrupt state.json read as empty and was written back empty
 *   T-24  same-millisecond runs overwrote each other's run record
 *   T-25  edited captions replaced the archive with no revision trace
 *
 * RUN: node --test scripts/creator-brains/test/reliability.test.mjs
 * @module creator-brains/test/reliability
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fakeDeps, makeClock, tempRoot, uploadRow, rollingJson3, fixtureDoc } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { STATES } from '../lib/fsm.mjs';

/** A creator row as the registry stores it. */
function creatorRow(channelId, title = 'Creator') {
  return {
    channelId, title, handle: '@creator', url: 'https://www.youtube.com/channel/' + channelId + '/videos', enabled: true,
  };
}

async function seedRegistry(r, creators) {
  const { loadRegistry, saveRegistry, upsertCreator } = await import('../lib/store.mjs');
  const reg = loadRegistry(r);
  for (const c of creators) upsertCreator(reg, c);
  saveRegistry(reg, r);
}

function depsWithUploads(channelId, n) {
  return fakeDeps({
    listUploads: () => Array.from({ length: n }, (_, i) => uploadRow(i, { id: ('v' + String(i).padStart(10, '0')).slice(0, 11) })),
    resolveCreator: () => ({ channelId, title: 'Creator', url: 'https://x' }),
  });
}
// ── T-21 — the runner must honour the schedule the FSM computes ─────────────
//
// Both assertions below FAILED against the first implementation. The backoff and
// the no-track retry window were computed in fsm.mjs and covered by passing unit
// tests, while run.mjs filtered candidates on `state` alone — so the schedule was
// never consulted by the only code that fetches. A passing unit test on a helper
// nobody calls is not coverage.

test('T-21 a video inside its backoff window is NOT retried by the runner', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const r = tempRoot('cb-t21');
  const clock = makeClock();
  const ch = `UC${'j'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const state = loadState(r);
  state.videos.bbbbbbbbbbb = {
    ...newVideoState('bbbbbbbbbbb', ch, {}),
    state: 'failed_transient',
    attempts: 1,
    nextRetryAt: new Date(clock() + 6 * 3_600_000).toISOString(), // 6h away
  };
  saveState(state, r);

  let probed = 0;
  const deps = depsWithUploads(ch, 0);
  deps.probeSubs = () => { probed += 1; return { ok: true, languages: ['en'] }; };

  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(probed, 0, 'a video in backoff must not be fetched');
  assert.equal(loadState(r).videos.bbbbbbbbbbb.state, 'failed_transient', 'and its state is untouched');

  // …and once the window elapses it IS retried.
  clock.advance(7 * 3_600_000);
  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(probed, 1, 'the backoff elapsed and the retry happened');
});

test('T-21b a no-track video is re-probed once, then goes terminal — it does not loop forever', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const r = tempRoot('cb-t21b');
  const clock = makeClock();
  const ch = `UC${'k'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  // Seed the pending video directly: `only: ['fetch']` deliberately skips
  // discovery, so nothing would populate the state map for us.
  const state = loadState(r);
  state.videos.vvvvvvvvvvv = newVideoState('vvvvvvvvvvv', ch, { now: clock.iso() });
  saveState(state, r);

  const deps = depsWithUploads(ch, 0);
  deps.probeSubs = () => ({ ok: true, languages: ['de'] }); // never any English track
  const only = () => Object.values(loadState(r).videos).find((v) => v.videoId === 'vvvvvvvvvvv');

  // First pass: answered "no track" -> parked in the retry lane.
  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(only().state, 'no_track_retry', 'parked, not terminal');

  // Before the window: untouched.
  clock.advance(24 * 3_600_000);
  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(only().state, 'no_track_retry', 'still waiting inside the window');

  // After the window: ONE more chance.
  clock.advance(30 * 3_600_000);
  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(only().state, 'unavailable', 'a second confirmed absence is terminal');

  // And it stays terminal — no further probes, ever.
  let probed = 0;
  deps.probeSubs = () => { probed += 1; return { ok: true, languages: ['de'] }; };
  clock.advance(90 * 24 * 3_600_000);
  await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(probed, 0, 'a terminal video is never retried again');
});

// ── T-22 — failures must not report COMPLETED (review F4) ───────────────────
//
// The digest fires on success as well as failure, which only carries
// information if "success" is real. `record.ok` used to be the CANARY's
// verdict: a run where the canary passed and every catalog fetch failed
// reported `ok: true`, printed `**COMPLETED**`, and exited 0 — the silent-rot
// outcome the digest exists to prevent, arriving through the digest itself.

test('T-22 a run whose fetches all fail does NOT report ok (review F4)', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const r = tempRoot('cb-t22');
  const clock = makeClock();
  const ch = `UC${'l'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const state = loadState(r);
  for (const id of ['fffffffffff', 'ggggggggggg']) {
    state.videos[id] = newVideoState(id, ch, { now: clock.iso() });
  }
  saveState(state, r);

  const deps = depsWithUploads(ch, 0);
  deps.probeSubs = () => ({ ok: false, error: 'HTTP 429 Too Many Requests' }); // canary fails too
  const bad = await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.ok(bad.counts.failed > 0, 'the failures are counted');
  assert.equal(bad.ok, false, 'a run with failures must not report ok');

  // And the canary is not the deciding vote: let it succeed while the catalog
  // fetches still fail. The clock must move first — the previous run parked both
  // videos in `failed_transient` with a backoff, and the runner correctly
  // refuses to touch them until it elapses.
  clock.advance(48 * 3_600_000);
  deps.probeSubs = (id) => (id === 'aircAruvnKk'
    ? { ok: true, languages: ['en'] }
    : { ok: false, error: 'HTTP 429 Too Many Requests' });
  const mixed = await runDaily({
    r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' }, only: ['fetch'],
  });
  assert.equal(mixed.counts.failed, 2, 'both catalog fetches failed');
  assert.equal(mixed.ok, false, 'a passing canary does not make a failing run ok');
});

test('T-22b a mid-loop failure still reports the fetches already done (review F11)', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const r = tempRoot('cb-t22b');
  const clock = makeClock();
  const ch = `UC${'m'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const state = loadState(r);
  for (const id of ['hhhhhhhhhhh', 'iiiiiiiiiii', 'jjjjjjjjjjj']) {
    state.videos[id] = newVideoState(id, ch, { now: clock.iso() });
  }
  saveState(state, r);

  let calls = 0;
  const deps = depsWithUploads(ch, 0);
  deps.probeSubs = () => ({ ok: true, languages: ['en'] });
  deps.fetchJson3 = () => {
    calls += 1;
    if (calls === 3) throw new Error('simulated failure on the third video');
    return rollingJson3();
  };

  const record = await runDaily({ r, deps, clock, now: clock, only: ['fetch'] });
  assert.equal(record.counts.fetched, 2, 'the two successful fetches are reported');
  assert.equal(record.counts.failed, 1, 'the third is reported as a failure, not lost');
});

// ── T-23 — a corrupt state map is a STOP, not an empty map (review F6) ──────

test('T-23 an unparseable state.json refuses the run instead of overwriting it (review F6)', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { writeFileSync } = await import('node:fs');
  const r = tempRoot('cb-t23');
  const clock = makeClock();
  const ch = `UC${'n'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  // A truncated write, an AV lock, or an EACCES read all look like this.
  writeFileSync(paths(r).state, '{"version":1,"videos":{"aaaaa', 'utf-8');
  const before = readFileSync(paths(r).state, 'utf-8');

  const record = await runDaily({ r, deps: depsWithUploads(ch, 0), clock, now: clock });
  assert.equal(record.ok, false, 'the run refuses');
  assert.ok(record.phases.some((p) => p.name === 'preflight' && !p.ok), 'a preflight phase names the problem');
  assert.match(record.notes.join(' '), /unreadable/i);
  assert.equal(readFileSync(paths(r).state, 'utf-8'), before, 'the damaged file is left EXACTLY as found');
  assert.ok(existsSync(join(paths(r).digestDir, `${record.runId}.md`)), 'and the refusal is reported');
});

// ── T-24 — run ids are unique within a millisecond (review F14) ─────────────

test('T-24 two runs at the same instant get different ids (review F14)', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { listRuns } = await import('../lib/store.mjs');
  const r = tempRoot('cb-t24');
  const clock = makeClock(); // frozen: every run shares one timestamp
  const ch = `UC${'o'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const a = await runDaily({ r, deps: depsWithUploads(ch, 0), clock, now: clock, only: ['fetch'] });
  const b = await runDaily({ r, deps: depsWithUploads(ch, 0), clock, now: clock, only: ['fetch'] });
  assert.notEqual(a.runId, b.runId, 'same-millisecond runs must not collide');
  assert.equal(listRuns(r).length, 2, 'both run records survive');
});

// ── T-25 — a changed transcript keeps a revision record (review S1) ─────────

test('T-25 re-fetching EDITED captions records a revision rather than overwriting silently', async () => {
  const { writeDoc, readDoc } = await import('../lib/store.mjs');
  const { fixtureDoc } = await import('./helpers.mjs');
  const r = tempRoot('cb-t25');
  const ch = `UC${'r'.repeat(22)}`;
  const v1 = fixtureDoc({ channelId: ch, videoId: 'rrr00000001', text: 'first generation of the captions' });
  const first = writeDoc(r, v1);
  assert.equal(first.reason, 'created');
  assert.deepEqual(readDoc(r, ch, 'rrr00000001').revisions, [], 'no revisions on first write');

  const v2 = fixtureDoc({ channelId: ch, videoId: 'rrr00000001', text: 'second generation, captions were edited' });
  const second = writeDoc(r, v2);
  assert.equal(second.reason, 'updated');
  const doc = readDoc(r, ch, 'rrr00000001');
  assert.equal(doc.revisions.length, 1, 'the previous generation is recorded');
  assert.equal(doc.revisions[0].contentHash, first.hash);
  // `chars` is asserted against the FIELD the document carried, not against
  // `text.length`: the fixture sets `chars` explicitly, and the revision record
  // is a snapshot of what the stored document said.
  assert.equal(doc.revisions[0].chars, v1.chars);

  // Re-writing identical text is still a no-op.
  assert.equal(writeDoc(r, v2).reason, 'unchanged');
  assert.equal(readDoc(r, ch, 'rrr00000001').revisions.length, 1, 'an unchanged rewrite adds no revision');
});


