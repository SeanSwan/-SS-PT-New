#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/system.test.mjs
 * PURPOSE: Tests T-09, T-10, T-13 and T-15 — the daily run's observability,
 *          the OAuth lane's fail-closed contract, secret containment, and
 *          whole-engine idempotence.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 *
 * RUN: node --test scripts/creator-brains/test/system.test.mjs
 * @module creator-brains/test/system
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { fakeDeps, makeClock, tempRoot, uploadRow, rollingJson3 } from './helpers.mjs';
import { paths, listDir } from '../lib/paths.mjs';
import { STATES } from '../lib/fsm.mjs';

/** A creator row as the registry stores it. */
function creatorRow(channelId, title = 'Creator') {
  return { channelId, title, handle: '@creator', url: `https://www.youtube.com/channel/${channelId}/videos`, enabled: true };
}

function depsWithUploads(channelId, n) {
  return fakeDeps({
    listUploads: () => Array.from({ length: n }, (_, i) => uploadRow(i, { id: `v${String(i).padStart(10, '0')}`.slice(0, 11) })),
    resolveCreator: () => ({ channelId, title: 'Creator', url: 'https://x' }),
  });
}

/** Write a registry directly — these tests are about the run, not about `add`. */
async function seedRegistry(r, creators) {
  const { loadRegistry, saveRegistry, upsertCreator } = await import('../lib/store.mjs');
  const reg = loadRegistry(r);
  for (const c of creators) upsertCreator(reg, c);
  saveRegistry(reg, r);
}

// ── T-09 (CB-09) — silence must be distinguishable from death ───────────────

test('T-09 a run with a FAILING canary still writes a digest and reports ok:false', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const r = tempRoot('cb-t09');
  const clock = makeClock();
  const ch = `UC${'a'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const deps = depsWithUploads(ch, 2);
  deps.probeSubs = () => ({ ok: false, error: 'bot check' }); // canary will fail too

  const record = await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk', expectCues: true } });

  assert.equal(record.ok, false, 'the run reports failure');
  assert.ok(record.phases.some((p) => p.name === 'canary' && !p.ok), 'canary phase is recorded');
  const digestPath = join(paths(r).digestDir, `${record.runId}.md`);
  assert.ok(existsSync(digestPath), 'the digest is written on FAILURE too');
  const digest = readFileSync(digestPath, 'utf-8');
  assert.match(digest, /canary/i, 'the digest names the canary');
  assert.ok(record.endedAt, 'run record has an end time');
});

test('T-09b a run with NO new videos still writes a digest and reports ok:true', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const r = tempRoot('cb-t09b');
  const clock = makeClock();
  const ch = `UC${'b'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const deps = depsWithUploads(ch, 0);
  deps.probeSubs = () => ({ ok: true, languages: ['en'] });
  const record = await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk', expectCues: true } });

  const digestPath = join(paths(r).digestDir, `${record.runId}.md`);
  assert.ok(existsSync(digestPath), 'a quiet day is still reported — absence must mean something');
  assert.match(readFileSync(digestPath, 'utf-8'), /creator brains/i);
});

test('T-09c every run is persisted as a run record with phases', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { listRuns } = await import('../lib/store.mjs');
  const r = tempRoot('cb-t09c');
  const clock = makeClock();
  await seedRegistry(r, [creatorRow(`UC${'c'.repeat(22)}`)]);
  const deps = depsWithUploads(`UC${'c'.repeat(22)}`, 0);
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  const runs = listRuns(r);
  assert.equal(runs.length, 1);
  assert.ok(Array.isArray(runs[0].phases) && runs[0].phases.length >= 3, 'phases are recorded');
});

// ── T-10 (CB-10) — OAuth fail-closed ────────────────────────────────────────

test('T-10 sync with no credential is BLOCKED with steps — never an empty success', async () => {
  const { syncSubscriptions } = await import('../lib/subs.mjs');
  const r = tempRoot('cb-t10');
  const missing = join(r, 'definitely', 'not', 'client_secret.json');

  const res = await syncSubscriptions({ r, credentialPath: missing, now: makeClock() });
  assert.equal(res.ok, false);
  assert.equal(res.blocked, true);
  assert.equal(res.reason, 'oauth_credentials_absent');
  assert.ok(Array.isArray(res.steps) && res.steps.length >= 3, 'the unblock path is spelled out');
  assert.match(res.steps.join(' '), /In production/i, 'the consent-screen trap is named');

  const { loadRegistry } = await import('../lib/store.mjs');
  assert.equal(Object.keys(loadRegistry(r).creators).length, 0, 'no catalog write on a blocked sync');
});

test('T-10b a credential file that exists but is unreadable is a FAILURE, not a success', async () => {
  const { syncSubscriptions } = await import('../lib/subs.mjs');
  const r = tempRoot('cb-t10b');
  const broken = join(r, 'client_secret.json');
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync(r, { recursive: true });
  writeFileSync(broken, '{ not json', 'utf-8');

  const res = await syncSubscriptions({ r, credentialPath: broken, now: makeClock() });
  assert.equal(res.ok, false);
  assert.equal(res.blocked, true);
  assert.equal(res.reason, 'oauth_credentials_unreadable');
});

// ── T-13 (CB-13) — secret containment ───────────────────────────────────────

test('T-13 a credential token never reaches a run record, digest, or ledger', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { writeDoc, loadRegistry, saveRegistry, upsertCreator, listRuns, readLedger } = await import('../lib/store.mjs');
  const r = tempRoot('cb-t13');
  const clock = makeClock();
  const ch = `UC${'d'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const SECRET = 'ya29.SUPERSECRETTOKENVALUE';
  const deps = depsWithUploads(ch, 1);
  const record = await runDaily({
    r, deps, clock, now: clock, secrets: { GOOGLE_REFRESH_TOKEN: SECRET }, canary: { videoId: 'aircAruvnKk' },
  });

  const haystack = [
    JSON.stringify(record),
    readFileSync(join(paths(r).digestDir, `${record.runId}.md`), 'utf-8'),
    JSON.stringify(listRuns(r)),
    JSON.stringify(readLedger(r)),
  ].join('\n');
  assert.ok(!haystack.includes(SECRET), 'the token value appears nowhere');
  assert.ok(!haystack.includes('SUPERSECRET'), 'no fragment of the token appears');
});

test('T-13b the run record redacts any key-shaped string it is handed', async () => {
  const { redact } = await import('../lib/digest.mjs');
  const out = redact('token=ya29.abcdefghijklmnop and key sk_live_ABC123DEF456 and AIzaSyABCDEFGHIJKLMNOPQRSTUV');
  assert.ok(!out.includes('ya29.abcdefghijklmnop'));
  assert.ok(!out.includes('sk_live_ABC123DEF456'));
  assert.ok(!out.includes('AIzaSyABCDEFGHIJKLMNOPQRSTUV'));
  assert.match(out, /REDACTED/);
});

// ── T-15 (INV-1) — whole-engine idempotence ─────────────────────────────────

test('T-15 running the daily job twice over the same corpus is a no-op the second time', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { listDocs, loadState } = await import('../lib/store.mjs');
  const r = tempRoot('cb-t15');
  const clock = makeClock();
  const ch = `UC${'e'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const deps = depsWithUploads(ch, 4);
  const first = await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  const docsAfterFirst = listDocs(r).length;
  assert.equal(docsAfterFirst, 4, 'four transcripts stored');

  clock.advance(6 * 3_600_000);
  const second = await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });

  assert.equal(listDocs(r).length, 4, 'no duplicate documents');
  assert.equal(second.counts.fetched, 0, 'second run fetched nothing');
  assert.equal(second.counts.discovered, 0, 'second run discovered nothing');
  assert.notEqual(first.runId, second.runId, 'each run gets its own record');
});

test('T-15b a budget-tripped run reports DEFERRED with a reason, never a clean zero', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const r = tempRoot('cb-t15b');
  const clock = makeClock();
  const ch = `UC${'f'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  const deps = depsWithUploads(ch, 10);
  const record = await runDaily({
    r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' }, budget: { perHour: 3 },
  });

  assert.ok(record.counts.deferred > 0, 'overflow was deferred, not dropped');
  assert.ok(record.counts.deferredReason, 'the deferral carries a reason');
  const fetchPhase = record.phases.find((p) => p.name === 'fetch');
  assert.ok(fetchPhase.reason, 'the phase records why it stopped');
});

// ── discovery-driven delete detection ───────────────────────────────────────

test('T-18 a video that vanished from a COMPLETE enumeration is marked deleted_upstream', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { loadState } = await import('../lib/store.mjs');
  const r = tempRoot('cb-t18');
  const clock = makeClock();
  const ch = `UC${'g'.repeat(22)}`;
  await seedRegistry(r, [creatorRow(ch)]);

  let rows = [uploadRow(0), uploadRow(1)];
  const deps = fakeDeps({ listUploads: () => rows });
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  const after1 = loadState(r).videos;
  assert.equal(Object.values(after1).filter((v) => v.state === STATES.FETCHED).length, 2);

  // ONE miss is a suspicion, not a deletion. `deleted_upstream` is terminal, and
  // a video also leaves an uploads playlist by being made private, made
  // members-only, or region-blocked — or because a playlist continuation came
  // back short and still exited 0. Retiring it on a single observation would be
  // a claim the engine cannot support.
  rows = [uploadRow(0)];
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  let videos = Object.values(loadState(r).videos);
  assert.equal(videos.filter((v) => v.state === STATES.DELETED_UPSTREAM).length, 0, 'one miss is not a deletion');
  assert.equal(videos.find((v) => v.videoId === 'vid00000001').missingStreak, 1, 'the miss is recorded');

  // …and if it is seen again, the suspicion clears.
  rows = [uploadRow(0), uploadRow(1)];
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  assert.equal(Object.values(loadState(r).videos).find((v) => v.videoId === 'vid00000001').missingStreak, 0,
    'reappearing clears the streak');

  // A SECOND consecutive complete enumeration without it is a supported claim.
  rows = [uploadRow(0)];
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  await runDaily({ r, deps, clock, now: clock, canary: { videoId: 'aircAruvnKk' } });
  videos = Object.values(loadState(r).videos);
  const gone = videos.filter((v) => v.state === STATES.DELETED_UPSTREAM);
  assert.equal(gone.length, 1, 'two agreeing observations mark it, not silently orphan it');
  // The reason now names the TABS the walk covered, so a reader can tell what
  // `complete` actually meant for this creator.
  assert.match(gone[0].lastError, /consecutive complete enumerations/);
  assert.match(gone[0].lastError, /videos/);
});


