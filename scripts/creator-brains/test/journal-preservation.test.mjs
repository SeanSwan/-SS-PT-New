#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/journal-preservation.test.mjs
 * PURPOSE: The A1-06 gate — two runners against ONE store must never leave the
 *          shared run journal truncated or interleaved.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 19 §4)
 * SLICE GATE: binds S3 (repair) exactly as it binds S4 (daily run)
 * ADDED: 2026-09-21
 * ============================================================================
 *
 * WHY THIS FILE EXISTS AT ALL.
 *
 *   `19 §4` records A1-06: "a console mutex cannot protect the shared journal."
 *   `lib/run.mjs:107` writes the journal BEFORE attempting the engine lock at
 *   `:154` — so the console's own exclusion does not cover an EXTERNAL runner:
 *   the CLI, a scheduled task, or a second machine against a synced store.
 *   `09#H1` called the lock a sufficient backstop. It is not, and `19 §4`
 *   widened the gate from S4 alone to S3 AND S4, because repair reaches the same
 *   `runDaily` journal path — "gating one door and shipping the other is gating
 *   nothing."
 *
 * WHAT THE DEFECT ACTUALLY IS — MEASURED, NOT ASSUMED.
 *
 *   The journal is NOT byte-interleaved and NOT torn: `writeJsonAtomic`
 *   (`paths.mjs:136`) writes a pid-unique temp file and renames, so a reader
 *   never sees a half-written journal. Asserting only "the file parses" would
 *   therefore pass while the real damage happened. The journal is a SINGLE SLOT
 *   — one whole-file overwrite — and it is opened before the lock, so the two
 *   lost-update failures are:
 *
 *     (1) TRUNCATION BY OPEN. Two runners each open a journal; the second
 *         `writeRunJournal` replaces the first outright. One run's entry is
 *         simply gone.
 *
 *     (2) TRUNCATION BY REFUSAL. `finalizeRunJournal` (`store.mjs:249`) READS
 *         the current journal and overwrites it with the concluding record. A
 *         run that is REFUSED by the lock still concludes, so it stamps
 *         `status: failed` over whatever was there — including the entry of the
 *         very run holding the lock. The store's journal then names the refused
 *         run as the only run, and the run that did the work is absent.
 *
 *   Both reorderings were reproduced against the shipped engine before this
 *   test was written (see the two cases below, and `19 §4`).
 *
 * WHY REAL CHILD PROCESSES.
 *
 *   `concurrency.test.mjs` states the reason and it applies verbatim: two
 *   `acquireLock()` calls in one process test the FILE, not the ownership
 *   protocol. The claim here is stronger — that an EXTERNAL runner is not
 *   covered by the console's mutex — so a same-process test would be begging
 *   the question.
 *
 * IF THIS TEST FAILS, THE DEFECT GOES TO THE ENGINE OWNER. No console patch to
 * engine files: the boundary is additive-only (`19 §7.3`).
 *
 * RUN: node --test scripts/creator-brains/test/journal-preservation.test.mjs
 * @module creator-brains/test/journal-preservation
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { tempRoot, reviewDeps } from './helpers.mjs';
import { GATE_SNIPPET, startGun } from './start-gun.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore, readRunJournal, finalizeRunJournal } from '../lib/store.mjs';
import { acquireLock } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const A = 'UC' + 'a'.repeat(22);
const VA = 'a'.repeat(11);
const FROZEN = '2026-09-21T10:00:00Z';

/** A store with one enabled creator and one pending video — a run has work to do. */
function seed(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  writeFileSync(
    paths(r).registry,
    JSON.stringify({ version: 1, creators: { [A]: { channelId: A, title: 'Alpha', enabled: true, addedAt: new Date(0).toISOString() } } }),
    'utf-8',
  );
  writeFileSync(
    paths(r).state,
    JSON.stringify({ version: 1, videos: { [VA]: { videoId: VA, channelId: A, state: 'pending', attempts: 0, nextRetryAt: null, lastError: null, title: 'V' } } }),
    'utf-8',
  );
  return r;
}

/** Run a snippet in a REAL child process. Written to a file, not `-e`, so
 *  quoting can never be the thing under test. */
function runChild(source, { env = {}, timeoutMs = 60_000 } = {}) {
  const file = join(tempRoot('cb-jp-child'), 'child.mjs');
  writeFileSync(file, source, 'utf-8');
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: 'utf-8', timeout: timeoutMs, env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
  }
}

/** A `runDaily` invocation stub the child can print a JSON verdict from. */
const RUNNER_BODY = `
    import { runDaily } from ${JSON.stringify(pathToFileURL(join(LIB, 'run.mjs')).href)};
    import { paths } from ${JSON.stringify(pathToFileURL(join(LIB, 'paths.mjs')).href)};
    import { readRunJournal } from ${JSON.stringify(pathToFileURL(join(LIB, 'store.mjs')).href)};
    import { readFileSync } from 'node:fs';
${GATE_SNIPPET}    const clock = () => Date.parse(${JSON.stringify(FROZEN)});
    const rec = await runDaily({
      r: process.env.CB_ROOT, clock,
      deps: {
        version: 'journal-stub',
        probeSubs: () => ({ ok: true, kind: 'ok', languages: ['en-orig'], originals: ['en-orig'] }),
        fetchJson3: () => JSON.stringify({ events: [{ tStartMs: 2000, segs: [{ utf8: 'always lift the shadows before you touch the highlights' }] }] }),
        enumerate: () => ({ rows: [], invalid: [], complete: true, reason: null, perTab: {}, tabs: ['videos'] }),
      },
      only: ['fetch'],
    });
    const lockPhase = rec.phases.find((p) => p.name === 'lock');
    const raw = readFileSync(paths(process.env.CB_ROOT).journal, 'utf-8');
    process.stdout.write('VERDICT' + JSON.stringify({
      runId: rec.runId,
      ok: rec.ok,
      lockRefused: !!(lockPhase && !lockPhase.ok),
      journalRunId: (readRunJournal(process.env.CB_ROOT) || {}).runId,
      journalStatus: (readRunJournal(process.env.CB_ROOT) || {}).status,
      journalParses: (() => { try { JSON.parse(raw); return true; } catch { return false; } })(),
    }));
`;

/* ── (1) the ordered reordering: a REFUSED run must not erase the holder ───── */

test('A1-06 a run REFUSED by the lock does not erase the holder\'s journal entry', () => {
  const r = seed('a106-refusal');
  // An EXTERNAL runner owns the store — not a console peer, which is the whole
  // point: no console mutex can see this lock.
  const holder = acquireLock(r, { runId: 'HOLDER-RUN' });
  assert.equal(holder.ok, true, 'the external runner holds the store');

  // The holder has opened its journal, exactly as `run.mjs:107` does.
  const open = `
    import { writeRunJournal } from ${JSON.stringify(pathToFileURL(join(LIB, 'store.mjs')).href)};
    writeRunJournal(process.env.CB_ROOT, { runId: 'HOLDER-RUN', startedAt: '${FROZEN}', pid: 999, selection: null, phases: 'all' });
  `;
  assert.equal(runChild(open, { env: { CB_ROOT: r } }).code, 0, 'the holder opened its journal');

  const before = readRunJournal(r);
  assert.equal(before.runId, 'HOLDER-RUN', 'precondition: the journal names the holder');
  assert.equal(before.status, 'running', 'precondition: and it is still open');

  // A second, REAL process runs against the same store. It is refused.
  const child = runChild(RUNNER_BODY, { env: { CB_ROOT: r } });
  assert.equal(child.code, 0, `child failed: ${child.stderr}`);
  const out = JSON.parse(child.stdout.slice(child.stdout.indexOf('VERDICT') + 7));
  assert.equal(out.lockRefused, true, 'the second runner was refused by the lock');
  assert.equal(out.ok, false, 'and it did not claim success');

  // THE CLAIM. The refused run's own journal open + finalize must not overwrite
  // the entry of the run that actually holds the store.
  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER-RUN',
    `a REFUSED run erased the lock holder's journal entry (journal now names '${after.runId}', status '${after.status}') — the refusal was reported over a store it had already rewritten`);
  assert.equal(after.status, 'running', 'and the holder\'s open journal was left open, not marked failed');
  assert.equal(out.journalRunId, 'HOLDER-RUN', 'the child sees the same thing the store does');

  holder.release();
});

/* ── (2) the concurrent reordering, with the ORDER PINNED ─────────────────── */

test('A1-06 two runs on one store: the journal keeps the run that did the work', async () => {
  const { spawn } = await import('node:child_process');
  const r = seed('a106-concurrent');
  const file = join(tempRoot('cb-jp-race'), 'racer.mjs');
  writeFileSync(file, RUNNER_BODY, 'utf-8');

  const spawnOne = () => new Promise((resolve) => {
    const p = spawn(process.execPath, [file], {
      env: { ...process.env, CB_ROOT: r, ...gun.env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out));
    p.on('error', () => resolve('SPAWN_ERROR'));
  });

  // START GUN, not spawn-and-hope: both children finish loading, THEN go.
  // Without it they can serialize (B's lock attempt lands after A's release),
  // both proceed, zero refused — measured 2/11 isolation reds reading like a
  // lost mutex. See `start-gun.mjs` for the full rationale.
  const gun = startGun(2);
  const pending = [spawnOne(), spawnOne()];
  const seen = await gun.release();
  assert.equal(seen, 2,
    `start gun: both children must reach the gate before release, saw ${seen} `
    + '(0 means the gate snippet is gone — the mutation control for this harness)');
  const results = (await Promise.all(pending))
    .map((s) => { try { return JSON.parse(s.slice(s.indexOf('VERDICT') + 7)); } catch { return { raw: s }; } });
  gun.dispose();

  assert.equal(results.filter((x) => x.lockRefused).length, 1,
    `exactly one run is refused, got ${JSON.stringify(results)}`);
  assert.equal(results.filter((x) => x.ok && !x.lockRefused).length, 1,
    `exactly one run proceeds, got ${JSON.stringify(results)}`);

  // WHICH RUN TYPES ITS NAME LAST IS A RACE, AND MUST NOT BE THE CLAIM.
  // A first draft asserted `journal.runId === the-run-that-proceeded` here and
  // went green — but only because the proceeding run happened to finalize after
  // the refused one. Reversing the two finalize calls in the probe flipped it to
  // `REFUSED / failed`. A case that passes on a coin flip is not evidence, so
  // the order is pinned by case (2b) below and the assertion here is made
  // order-independent: whoever finalizes last, the store must be able to account
  // for the run that actually held it.
  const runFiles = readdirSync(paths(r).runsDir).filter((f) => f.endsWith('.json'));
  const records = runFiles.map((f) => JSON.parse(readFileSync(join(paths(r).runsDir, f), 'utf-8')));
  const refusedIds = records.filter((x) => (x.phases || []).some((p) => p.name === 'lock' && !p.ok)).map((x) => x.runId);
  const proceededIds = records.filter((x) => (x.phases || []).every((p) => p.ok)).map((x) => x.runId);
  assert.equal(refusedIds.length, 1, 'the refused run left a durable record');
  assert.equal(proceededIds.length, 1, 'the run that did the work left a durable record');

  // Both runners opened a journal at `:107`; the journal has ONE slot. So the
  // durable record and the journal must together be answerable: whatever the
  // journal names, the run that did the work is discoverable. Today the journal
  // names the refused run half the time, which is the lost update this gate is
  // for — asserted in (2b), where the order is not left to chance.
  const journal = readRunJournal(r);
  assert.ok(journal, 'the journal exists');
  assert.ok([...refusedIds, ...proceededIds].includes(journal.runId),
    `the journal names '${journal.runId}', which is neither run in this store`);
  assert.equal(results.every((x) => x.journalParses !== false), true,
    'and the journal is never left unparseable — the atomic writer already guarantees this, which is why it is not sufficient evidence of preservation');
});

/* ── (2b) THE WORST CASE, DETERMINISTIC: the refused run finalizes LAST ───── */

test('A1-06 (2b) the WORST finalize order — a refused run must not be the last word', () => {
  // Order is the whole finding, so it is set by hand rather than raced for.
  // This is the order the probe showed the real binary produces: the refused run
  // short-circuits at the lock but its journal was opened FIRST, so its finalize
  // can land after the worker's. The store then reports a failure as its only
  // run and the completed run vanishes from the journal.
  const r = seed('a106-worst-order');
  const open = (id) => writeFileSync(paths(r).journal, JSON.stringify({
    status: 'running', runId: id, startedAt: FROZEN, pid: 1, selection: null, phases: 'all', heartbeats: 0,
  }, null, 2), 'utf-8');

  open('REFUSED-RUN');                 // refused run opens at :107
  open('WORKER-RUN');                  // the lock holder opens at :107 — overwrites
  finalizeRunJournal(r, { runId: 'WORKER-RUN', endedAt: FROZEN, ok: true });   // worker finishes
  const midFlight = readRunJournal(r);
  finalizeRunJournal(r, { runId: 'REFUSED-RUN', endedAt: FROZEN, ok: false }); // refused concludes LATE
  const final = readRunJournal(r);

  assert.equal(midFlight.runId, 'WORKER-RUN', 'mid-flight the journal is truthful');

  assert.equal(final.runId, 'WORKER-RUN',
    `the journal REGRESSED from 'WORKER-RUN/completed' to '${final.runId}/${final.status}': the refused run's finalize overwrote the journal of the run that holds the store`);
  assert.notEqual(final.status, 'failed',
    'a store whose only visible run FAILED while a run is still holding it is the truncation A1-06 names');
});

/* ── (3) the atomic-writer control: what IS already guaranteed ───────────── */

test('A1-06 the atomic writer is not the thing under test — a refusal is never torn', () => {
  const r = seed('a106-atomic');
  const holder = acquireLock(r, { runId: 'HOLDER-RUN' });
  writeFileSync(paths(r).journal, JSON.stringify({ status: 'running', runId: 'HOLDER-RUN', heartbeats: 0 }, null, 2), 'utf-8');
  const child = runChild(RUNNER_BODY, { env: { CB_ROOT: r } });
  assert.equal(child.code, 0, `child failed: ${child.stderr}`);

  // A refusal must never leave a half-written or unparseable journal. This is
  // the property `writeJsonAtomic` DOES provide, and stating it here keeps the
  // two claims from being confused: atomicity is not preservation.
  const raw = readFileSync(paths(r).journal, 'utf-8');
  assert.doesNotThrow(() => JSON.parse(raw), 'the journal must never be torn by a refusal');
  assert.equal(raw.includes('HOLDER-RUN') || raw.includes('status'), true, 'and it holds a whole record, not a fragment');
  holder.release();
});

/** A control on the fixture itself: a store with no enabled creators still
 *  runs, so a green result above cannot come from "the run did nothing". */
test('A1-06 control — the seeded store gives a real run real work', async () => {
  const r = seed('a106-control');
  const { runDaily } = await import('../lib/run.mjs');
  const rec = await runDaily({ r, clock: () => Date.parse(FROZEN), deps: reviewDeps(), only: ['fetch'] });
  assert.equal(rec.ok, true, 'the fixture store runs to completion, so the cases above exercise a real run');
  assert.equal(rec.counts.fetched, 1, 'and it actually fetched the seeded pending video');
});
