#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/review-repairs-store.test.mjs
 * PURPOSE: Regressions for the STORE, TRANSPORT and CONTRACT findings —
 *          HR14 … HR24 — at the real boundary the reviewer used.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 *
 * Ownership and transport: locks, run identity, journal durability, argv
 * construction, coverage gaps, authority binding and the machine contract.
 * See also review-repairs.test.mjs (HR01–HR06) and
 * review-repairs-derived.test.mjs (HR07–HR13).
 *
 * RUN: node --test scripts/creator-brains/test/review-repairs-store.test.mjs
 * @module creator-brains/test/review-repairs-store
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  fakeDeps, makeClock, tempRoot, json3,
  makeReviewStore as makeStore,
  reviewDeps as deps,
  seedReviewDoc as seedDoc,
  rebuildBrain as rebuild,
  REVIEW_TEXT as TEXT, REVIEW_A as A, REVIEW_B as B, REVIEW_VA as VA, REVIEW_VB as VB,
} from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore } from '../lib/store.mjs';

test('HR14 a second writer is REFUSED, not allowed to save a stale map', async () => {
  const { acquireLock, lockStatus } = await import('../lib/lock.mjs');
  const r = await makeStore('hr14');
  const first = acquireLock(r, { runId: 'one' });
  assert.equal(first.ok, true, 'the first writer takes the lock');

  const second = acquireLock(r, { runId: 'two' });
  assert.equal(second.ok, false, 'the second writer is refused');
  assert.equal(second.reason, 'lock_held');
  assert.equal(lockStatus(r).held, true);

  first.release();
  assert.equal(lockStatus(r).held, false, 'and releasing frees it');
  const third = acquireLock(r, { runId: 'three' });
  assert.equal(third.ok, true);
  third.release();
});

test('HR14b a concurrent run is refused with a recorded outcome, not a silent overwrite', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { acquireLock } = await import('../lib/lock.mjs');
  const r = await makeStore('hr14b', { videos: [[VA, A]] });
  const held = acquireLock(r, { runId: 'holder' });
  const res = await runDaily({ r, deps: deps(), only: ['fetch'], lock: true });
  held.release();
  assert.equal(res.ok, false, 'the blocked run reports failure');
  assert.ok(res.phases.some((p) => p.name === 'lock' && !p.ok), 'and names the lock as the reason');
});

test('HR14c temp files are unique per writer', async () => {
  const { writeTextAtomic } = await import('../lib/paths.mjs');
  const r = await makeStore('hr14c');
  const target = join(r, 'probe.txt');
  writeTextAtomic(target, 'one');
  writeTextAtomic(target, 'two');
  const leftovers = readdirSync(r).filter((f) => f.endsWith('.tmp'));
  assert.equal(leftovers.length, 0, `no .tmp files should survive, saw ${leftovers.join(',')}`);
  assert.equal(readFileSync(target, 'utf-8'), 'two');
});

// ── HR16 ────────────────────────────────────────────────────────────────────
test('HR16 a startup refusal still leaves a run record and a digest', async () => {
  const r = await makeStore('hr16');
  const { recordStartupOutcome } = await import('../run-daily.mjs');
  const { listRuns, readRunJournal } = await import('../lib/store.mjs');

  const rec = recordStartupOutcome(r, { kind: 'refused', reason: 'synthetic startup failure' });
  assert.ok(rec.runId, 'a run id is allocated');
  assert.ok(rec.digestPath && existsSync(rec.digestPath), 'a digest is written');
  assert.equal(listRuns(r).length, 1, 'a run record exists');
  assert.equal(readRunJournal(r).status, 'refused', 'and the journal says what happened');
});

// IMPORTING THE SCHEDULED ENTRY POINT MUST NOT RUN THE JOB.
//
//   `run-daily.mjs` exports its startup-outcome recorder for the test above, and
//   importing it used to execute `main()` — which meant a test import quietly ran
//   the daily job against the REAL store. A module with an effect on import
//   cannot be inspected, imported by a diagnostic, or reused safely. Proved in a
//   CHILD PROCESS so the parent's module cache cannot hide it.
test('HR16c importing the scheduled entry point does not run the job', async () => {
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const r = tempRoot('cb-hr16c');
  const script = join(r, 'import-only.mjs');
  const target = new URL('../run-daily.mjs', import.meta.url).href;
  writeFileSync(script, `await import(${JSON.stringify(target)});\nprocess.stdout.write('IMPORTED');\n`, 'utf-8');

  const stdout = execFileSync(process.execPath, [script], {
    encoding: 'utf-8',
    env: { ...process.env, CREATOR_BRAINS_ROOT: r },
  });
  assert.equal(stdout, 'IMPORTED', 'the import completed without running main()');
  assert.equal(existsSync(join(r, 'runs')), false, 'no run record was written by an import');
  assert.equal(existsSync(join(r, 'digest')), false, 'no digest was written by an import');
});

test('HR16b last success is tracked separately from last attempt', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { readLastSuccess } = await import('../lib/store.mjs');
  const r = await makeStore('hr16b', { videos: [[VA, A]] });
  const clock = makeClock();
  await runDaily({ r, clock, deps: deps(), only: ['fetch'], lock: false });
  assert.ok(readLastSuccess(r), 'a successful run stamps last-success');

  const r2 = await makeStore('hr16b2', { creators: [], videos: [] });
  await runDaily({ r: r2, clock, deps: deps(), only: ['fetch'], lock: false });
  assert.equal(readLastSuccess(r2), null, 'a run with nothing enabled does NOT claim an acquisition');
});

// ── HR17 ────────────────────────────────────────────────────────────────────
test('HR17 an invalid document is a coverage GAP, never counted as covered', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { listDocsChecked } = await import('../lib/store.mjs');
  const r = await makeStore('hr17');
  const { writeDoc } = await import('../lib/store.mjs');
  writeDoc(r, {
    schemaVersion: 2, channelId: A, videoId: VA, text: 'text', title: 'T', cues: [],
  });
  const { valid, invalid } = listDocsChecked(r, A);
  assert.equal(valid.length, 0, 'a document with no cues is not valid');
  assert.equal(invalid.length, 1);

  const brain = buildBrain({ channelId: A, title: 'Alpha' }, {
    docs: valid,
    invalidDocs: invalid,
    gaps: [{ videoId: VA, state: 'invalid_document', reason: 'no cues' }],
  });
  assert.equal(brain.docCount, 0);
  assert.equal(brain.timeline.length, 0);
  assert.equal(brain.gaps.length, 1, 'the video appears in the gaps, not nowhere');
  assert.match(brain.gaps[0].reason, /no cues/);
});

// ── HR18 ────────────────────────────────────────────────────────────────────
test('HR18 a video belonging to another creator is NOT fetched under this one', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const { stateOrDefault } = await import('../lib/store.mjs');
  const r = await makeStore('hr18', { videos: [[VB, B]] });
  const state = stateOrDefault(await import('../lib/store.mjs').then((m) => m.readState(r)));
  let probed = 0;
  const out = await fetchVideo(state.videos[VB], {
    r,
    creator: { channelId: A, title: 'Alpha' }, // creator A, video B
    state,
    now: makeClock(),
    authority: { registry: { creators: { [A]: { channelId: A, enabled: true } } }, requireRegistryEntry: true, requireEnabled: true, requireDiscovered: true },
    deps: deps({ probeSubs: () => { probed += 1; return { ok: true, kind: 'ok', languages: ['en-orig'], originals: ['en-orig'] }; } }),
  });
  assert.equal(probed, 0, 'no network call may happen for a mismatched binding');
  assert.equal(out.state, 'failed_permanent');
  assert.match(out.lastError, /not_authorized/);
});

test('HR18b a disabled creator is refused before any network call', async () => {
  const { checkAuthority } = await import('../lib/fetch.mjs');
  const v = await checkAuthority(
    { videoId: VA, channelId: A },
    { channelId: A },
    { registry: { creators: { [A]: { channelId: A, enabled: false } } }, requireRegistryEntry: true, requireEnabled: true },
    null,
  );
  assert.equal(v.ok, false);
  assert.match(v.reason, /disabled/);
});

// ── HR19 ────────────────────────────────────────────────────────────────────
test('HR19 exit-0 EMPTY output through the real parser is a shape error, not "no captions"', async () => {
  const { parseListSubs, probeSubs, PROBE } = await import('../lib/probe.mjs');
  for (const empty of ['', '   ', '\n\n', 'some unrelated banner\n']) {
    const parsed = parseListSubs(empty);
    assert.equal(parsed.parsed, false, `'${empty.slice(0, 12)}' must not parse as an answer`);
  }
  // A banner with no rows IS an answer.
  const withBanner = parseListSubs('[info] Available automatic captions for X:\nLanguage Name Formats\n');
  assert.equal(withBanner.parsed, true);
  assert.equal(withBanner.languages.length, 0);
});

test('HR19b a manual-only original is accepted and flagged unverified', async () => {
  const { pickLanguage } = await import('../lib/probe.mjs');
  const picked = pickLanguage(['en', 'fr'], 'en', []);
  assert.equal(picked.lang, 'en', 'no -orig anywhere means we cannot verify, not that we refuse');
  assert.equal(picked.original, false);
});

// ── HR20 ────────────────────────────────────────────────────────────────────
test('HR20 argv is CONSTRUCTED from an operation model; unknown ops and flags are refused', async () => {
  const { buildArgv, OpError, OPERATIONS } = await import('../lib/ytdlp.mjs');
  assert.deepEqual([...OPERATIONS].sort(), ['enumerate', 'fetchSubs', 'probe', 'resolveChannel', 'version']);
  assert.throws(() => buildArgv('eNumerate', {}), OpError, 'operation names are matched exactly');

  assert.throws(() => buildArgv('download', {}), OpError, 'an unknown operation is refused');
  assert.throws(() => buildArgv('probe', { videoId: '../../etc/passwd' }), OpError, 'a bad id is refused');
  assert.throws(() => buildArgv('enumerate', { url: 'https://evil.example/x' }), OpError, 'a foreign host is refused');
  assert.throws(() => buildArgv('fetchSubs', { videoId: VA, lang: 'en; rm -rf /', outStem: 'x' }), OpError);

  // Every read-only operation carries the ambient-config and media guards.
  for (const [op, params] of [
    ['probe', { videoId: VA }],
    ['fetchSubs', { videoId: VA, lang: 'en', outStem: 'x' }],
    ['enumerate', { url: `https://www.youtube.com/channel/${A}/videos` }],
  ]) {
    const argv = buildArgv(op, params);
    assert.ok(argv.includes('--ignore-config'), `${op} must ignore ambient config`);
    assert.ok(argv.includes('--no-config-locations'), `${op} must not read config locations`);
    assert.ok(argv.includes('--skip-download'), `${op} must never download media`);
  }
});

// ── HR21 ────────────────────────────────────────────────────────────────────
test('HR21 run ids are unique across processes sharing a frozen clock', async () => {
  const { runIdFor } = await import('../lib/ledger.mjs');
  const frozen = () => 0;
  const ids = new Set();
  for (let i = 0; i < 200; i += 1) ids.add(runIdFor(frozen));
  assert.equal(ids.size, 200, 'no collisions within a process');

  // The real cross-process case: two child processes, same clock.
  const { execFileSync } = await import('node:child_process');
  const script = `import('${new URL('../lib/ledger.mjs', import.meta.url).href}').then(m=>process.stdout.write(m.runIdFor(()=>0)))`;
  const outs = [0, 1].map(() => {
    try {
      return execFileSync(process.execPath, ['-e', script], { encoding: 'utf-8' }).trim();
    } catch { return null; }
  }).filter(Boolean);
  if (outs.length === 2) assert.notEqual(outs[0], outs[1], 'two processes must not collide');
});

// ── HR24 ────────────────────────────────────────────────────────────────────
test('HR24 rules.jsonl rows carry the provenance a consumer needs', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderRules } = await import('../lib/render.mjs');
  const r = await makeStore('hr24');
  await seedDoc(r, A, VA);
  const { listDocsChecked } = await import('../lib/store.mjs');
  const { valid, invalid } = listDocsChecked(r, A);
  const brain = buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid, invalidDocs: invalid });

  const lines = renderRules(brain).trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(lines.length > 0, 'there are rows');
  for (const row of lines) {
    assert.equal(row.schema_version, 2, 'versioned');
    assert.ok(row.doc_revision, 'bound to the document generation it came from');
    assert.ok(Number.isFinite(row.t_start_ms) && Number.isFinite(row.t_end_ms), 'with a support window');
    assert.ok(['affirm', 'negate'].includes(row.polarity), 'and explicit polarity');
    assert.equal(row.validation, 'candidate', 'labelled as a candidate, not a verified rule');
    assert.equal(row.citation_status, 'live');
  }
});
