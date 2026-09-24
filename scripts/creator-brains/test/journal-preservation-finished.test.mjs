#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/journal-preservation-finished.test.mjs
 * PURPOSE: A1-06's OTHER half — the lock holder whose entry has already
 *          FINISHED. The gate proves a refused run cannot erase a holder that
 *          is still open; this proves it cannot erase one that is done.
 * PART OF: Creator Brains — SS-PT acquisition engine (A1-06)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY THIS IS A SIBLING AND NOT MORE LINES IN THE GATE.
 *
 *   `journal-preservation.test.mjs` is at 286 lines against rule 4's 300-line
 *   cap, so there is no room for this case there — and the case is not an
 *   elaboration, it is the one the gate could not see.
 *
 * WHY THE GATE COULD NOT SEE IT, WHICH IS THE WHOLE POINT.
 *
 *   The gate's refusal case seeds the holder with `status: 'running'` — an entry
 *   that is STILL OPEN. `writeRunJournal` declines to erase another run's open
 *   entry, so that case passes. But the ownership guard was written as
 *   `prior.status === 'running' && prior.runId !== entry.runId`, and a FINISHED
 *   prior entry is DELIBERATELY replaceable (test O2 in
 *   `journal-ownership.test.mjs` — otherwise the journal is write-once and no
 *   later run can ever open its own slot).
 *
 *   The consequence, measured end-to-end and not inferred: a run that opens at
 *   `run.mjs` step 0 and is THEN refused by the lock has already replaced the
 *   holder's finished entry, and the gate's fixture — always `running` — never
 *   touched that path. A green gate therefore coexisted with a live lost update.
 *   `HOLDER-FINISHED` is the ordinary end state of nearly every journal, so the
 *   unguarded case was the COMMON one, not an edge.
 *
 * THE FIX BEING PINNED:
 *   1. `writeRunJournal` returns the entry it displaced, so the caller can undo
 *      its own open.
 *   2. The lock-refusal path in `run.mjs` passes that entry as `record.restore`.
 *   3. `finalizeRunJournal` puts it back — guarded on the slot still naming the
 *      refused run, so a newer writer is never clobbered by a stale snapshot.
 *   4. `recordStartupOutcome` stopped writing the journal with a raw
 *      `writeJsonAtomic` and goes through `writeRunJournal` instead. It is the
 *      most common writer in the system (every startup refusal, every no-op) and
 *      it consulted neither the lock nor the runId.
 *
 * A test whose name says only what it does tells the next reader nothing about
 * why it may not be deleted. Each case below names the defect it catches.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { tempRoot } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore, readRunJournal } from '../lib/store.mjs';
import { acquireLock } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const FROZEN = '2026-09-21T10:00:00Z';

function store(tag) {
  const r = tempRoot(`cb-jpf-${tag}`);
  ensureStore(r);
  return r;
}

/** Run a snippet in a REAL child process — written to a file, never `-e`, so
 *  shell quoting can never be the thing under test. */
function runChild(source, { env = {}, timeoutMs = 60_000 } = {}) {
  const file = join(tempRoot('cb-jpf-child'), 'child.mjs');
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

/** A real `runDaily` against a store whose ONLY creator is disabled, so the run
 *  reaches the lock and returns without any fetch work. The lock phase is what
 *  is under test, and this keeps the fixture from needing a seeded pipeline. */
const RUNNER = `
    import { runDaily } from ${JSON.stringify(pathToFileURL(join(LIB, 'run.mjs')).href)};
    import { readRunJournal } from ${JSON.stringify(pathToFileURL(join(LIB, 'store.mjs')).href)};
    const rec = await runDaily({ r: process.env.CB_ROOT, clock: () => Date.parse(${JSON.stringify(FROZEN)}) });
    const lockPhase = rec.phases.find((p) => p.name === 'lock');
    const j = readRunJournal(process.env.CB_ROOT) || {};
    process.stdout.write('VERDICT' + JSON.stringify({
      runId: rec.runId,
      lockRefused: !!(lockPhase && !lockPhase.ok),
      journalRunId: j.runId,
      journalStatus: j.status,
    }));
`;

/* ── (1) the finished holder: what the gate's `running` fixture never covered ─ */

test('A1-06 a REFUSED run does not erase the holder\'s FINISHED entry', () => {
  const r = store('finished-holder');
  const holder = acquireLock(r, { runId: 'HOLDER-FINISHED' });
  assert.equal(holder.ok, true, 'an external runner owns the store');

  // The holder has COMPLETED — this is the ordinary end state of a journal, and
  // the state the gate's fixture never produced.
  const seed = `
    import { writeFileSync } from 'node:fs';
    import { paths } from ${JSON.stringify(pathToFileURL(join(LIB, 'paths.mjs')).href)};
    writeFileSync(paths(process.env.CB_ROOT).journal, JSON.stringify({
      status: 'completed', runId: 'HOLDER-FINISHED', ok: true,
      startedAt: '${FROZEN}', endedAt: '${FROZEN}', reason: null,
    }));
  `;
  assert.equal(runChild(seed, { env: { CB_ROOT: r } }).code, 0, 'seeded the finished entry');

  const before = readRunJournal(r);
  assert.equal(before.runId, 'HOLDER-FINISHED', 'precondition: the journal names the finished holder');
  assert.equal(before.status, 'completed', 'precondition: and it is closed');

  const child = runChild(RUNNER, { env: { CB_ROOT: r } });
  assert.equal(child.code, 0, `child failed: ${child.stderr}`);
  const out = JSON.parse(child.stdout.slice(child.stdout.indexOf('VERDICT') + 7));
  assert.equal(out.lockRefused, true, 'the second runner was refused by the lock');

  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER-FINISHED',
    `a REFUSED run replaced the holder's FINISHED entry (journal now names '
     + '${after.runId}', status '${after.status}') — its step-0 open erased a verdict it had no right to touch`);
  assert.equal(after.ok, true, 'and the holder\'s success was not downgraded to the refusal\'s failure');
  assert.equal(after.status, 'completed', 'the holder\'s terminal status stands');

  holder.release();
});

/* ── (2) the same case through the startup-outcome writer ──────────────────── */

test('A1-06 a STARTUP OUTCOME does not erase a live holder\'s entry', async () => {
  const r = store('startup-outcome');
  const holder = acquireLock(r, { runId: 'HOLDER-LIVE' });
  assert.equal(holder.ok, true, 'a runner owns the store');

  const seed = `
    import { writeFileSync } from 'node:fs';
    import { paths } from ${JSON.stringify(pathToFileURL(join(LIB, 'paths.mjs')).href)};
    writeFileSync(paths(process.env.CB_ROOT).journal, JSON.stringify({
      status: 'running', runId: 'HOLDER-LIVE', ok: false, startedAt: '${FROZEN}',
    }));
  `;
  assert.equal(runChild(seed, { env: { CB_ROOT: r } }).code, 0, 'the holder is mid-run');

  // `recordStartupOutcome` runs on EVERY startup refusal and every no-op — it is
  // the most common writer in the system, and it used to write the journal
  // directly with `writeJsonAtomic`: no lock, no runId comparison.
  const { recordStartupOutcome } = await import('../run-daily.mjs');
  recordStartupOutcome(r, { kind: 'no-op', reason: 'synthetic — no enabled creators' });

  const after = readRunJournal(r);
  assert.equal(after.runId, 'HOLDER-LIVE',
    `a startup outcome erased a live holder's entry (journal now names '${after.runId}')`);
  assert.equal(after.status, 'running', 'and left it open rather than closing it on the holder\'s behalf');

  holder.release();
});

/* ── (3) the control: a normal run still writes its own journal ───────────── */

test('A1-06 control — an unheld store still gets its journal written', async () => {
  const r = store('unheld-control');
  assert.equal(readRunJournal(r), null, 'precondition: no journal yet');

  const { recordStartupOutcome } = await import('../run-daily.mjs');
  const rec = recordStartupOutcome(r, { kind: 'no-op', reason: 'synthetic' });

  const after = readRunJournal(r);
  assert.equal(after.ok, false, 'the outcome is recorded');
  assert.equal(after.runId, rec.runId,
    'an ownership guard that ALSO blocked this would make the journal write-once — a no-op on a free store must still record itself');
});
