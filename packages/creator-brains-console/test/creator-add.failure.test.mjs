/**
 * creator-add.failure.test.mjs — the S1-H12 worker's failure lifecycle.
 *
 * WHY THESE CASES CONSTRUCT FAILURES INSTEAD OF ASSERTING HANDLERS EXIST.
 * A structural pin ("the module has an 'error' listener") passes for a listener
 * that does nothing. R2-04 established the rule for the health probe: build a
 * worker that actually throws at load, one that exits, one that stays silent, and
 * require each to produce an ANSWER. This file does the same for the add path.
 *
 * THE STAKES ARE HIGHER HERE THAN FOR THE HEALTH PROBE. `health-probe.worker.mjs`
 * must never be able to take down a process that is merely reporting health; this
 * one must never be able to take down a process the operator is WRITING to, or
 * leave a POST hanging with no answer. Every case below is one way that could
 * happen.
 *
 * The worker URL is injectable (`__setCreateWorkerUrl`) specifically so these
 * cases can point at a broken worker. The fixtures are written to a temp dir at
 * run time rather than committed, so no source file contains a deliberately
 * broken module that a future linter or build step would reasonably object to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  addCreatorOffLoop, shouldUseWorker, __setCreateWorkerUrl, __resetCreateWorkerUrl,
} from '../lib/creator-add.mjs';
import { addCreatorRow } from '../lib/creators.mjs';
import { CODE } from '../lib/errors.mjs';

const dir = mkdtempSync(join(tmpdir(), 'creator-add-'));
const fixture = (name, source) => {
  const p = join(dir, name);
  writeFileSync(p, source, 'utf8');
  return pathToFileURL(p);
};

// A worker that fails to LOAD. Node emits 'error' for this, and without a handler
// an unhandled 'error' on a Worker is an UNCAUGHT EXCEPTION — the bridge dies.
const WORKER_THROWS = fixture('throws.mjs', 'throw new Error("deliberate load failure");\n');
// A worker that loads, then exits immediately without answering.
const WORKER_EXITS = fixture('exits.mjs', 'process.exit(3);\n');
// A worker that loads, accepts the message, and stays silent forever.
const WORKER_SILENT = fixture('silent.mjs', "import { workerData } from 'node:worker_threads';\nworkerData.port; // hold, never reply\nsetInterval(() => {}, 1000);\n");
// A worker that answers on its OWN channel rather than the port it was handed —
// the exact mistake the first draft of lib/creator-add.mjs made, which failed with
// no error and no answer, only a timeout. Pinned so it cannot come back.
const WORKER_WRONG_CHANNEL = fixture('wrong-channel.mjs', "import { parentPort } from 'node:worker_threads';\nparentPort.on('message', () => parentPort.postMessage({ value: { ok: true }, epoch: 0 }));\n");
// A worker that echoes a STALE epoch. The result must be discarded, not adopted.
const WORKER_STALE_EPOCH = fixture('stale-epoch.mjs', "import { workerData } from 'node:worker_threads';\nworkerData.port.on('message', (m) => workerData.port.postMessage({ value: { ok: true, reason: 'STALE' }, epoch: m.epoch - 1 }));\n");

test.after(() => {
  __resetCreateWorkerUrl();
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
});

test('a worker that throws at LOAD rejects instead of killing the process', async () => {
  __setCreateWorkerUrl(WORKER_THROWS);
  await assert.rejects(
    () => addCreatorOffLoop('UCaaaaaaaaaaaaaaaaaaaaaa', 'C:/tmp/x', { timeoutMs: 5000 }),
    (e) => /worker failed/.test(e.message),
  );
});

test('a worker that EXITS before answering rejects', async () => {
  __setCreateWorkerUrl(WORKER_EXITS);
  await assert.rejects(
    () => addCreatorOffLoop('UCaaaaaaaaaaaaaaaaaaaaaa', 'C:/tmp/x', { timeoutMs: 5000 }),
    (e) => /exited before answering/.test(e.message),
  );
});

test('a worker that stays SILENT times out with a reason, not a hang', async () => {
  __setCreateWorkerUrl(WORKER_SILENT);
  const t0 = Date.now();
  await assert.rejects(
    () => addCreatorOffLoop('UCaaaaaaaaaaaaaaaaaaaaaa', 'C:/tmp/x', { timeoutMs: 600 }),
    (e) => /did not answer within 600 ms/.test(e.message),
  );
  // The deadline must be the deadline, not "whenever the OS gets round to it".
  assert.ok(Date.now() - t0 < 5000, 'the timeout must fire on its own schedule');
});

test('an answer posted on the WRONG channel is not mistaken for one on the port', async () => {
  // This worker answers on `parentPort`, which the main thread does NOT listen on.
  // It must therefore TIME OUT — if this test ever starts resolving, the main
  // thread has grown a second listener and the delivery route is ambiguous.
  __setCreateWorkerUrl(WORKER_WRONG_CHANNEL);
  await assert.rejects(
    () => addCreatorOffLoop('UCaaaaaaaaaaaaaaaaaaaaaa', 'C:/tmp/x', { timeoutMs: 600 }),
    (e) => /did not answer/.test(e.message),
  );
});

test('an answer carrying a STALE epoch is discarded, not adopted', async () => {
  __setCreateWorkerUrl(WORKER_STALE_EPOCH);
  await assert.rejects(
    () => addCreatorOffLoop('UCaaaaaaaaaaaaaaaaaaaaaa', 'C:/tmp/x', { timeoutMs: 600 }),
    (e) => /did not answer/.test(e.message),
  );
});

test('the worker path is used when no deps are supplied, and NOT when they are', () => {
  assert.equal(shouldUseWorker({}), true, 'production (no deps) must go off-loop');
  assert.equal(shouldUseWorker(undefined), true);
  assert.equal(shouldUseWorker({ resolveCreator: () => {} }), false, 'a test seam stays in-process');
});

test('a resolver failure becomes RESOLVER_UNAVAILABLE (503), not REFUSED (422)', async () => {
  __setCreateWorkerUrl(WORKER_THROWS);
  await assert.rejects(
    () => addCreatorRow('UCaaaaaaaaaaaaaaaaaaaaaa', { r: 'C:/tmp/x' }),
    (e) => {
      assert.equal(e.code, CODE.RESOLVER_UNAVAILABLE);
      assert.notEqual(e.code, CODE.REFUSED, 'a broken resolver is not the engine refusing a ref');
      return true;
    },
  );
});
