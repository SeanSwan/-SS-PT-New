/*
 * R2-04 — THE WORKER'S FAILURE LIFECYCLE, PROVEN BY CONSTRUCTING FAILURES.
 *
 * WHY THE OLD TEST WAS NOT ENOUGH (R2-08). `health.offthread.test.mjs:121`
 * asserted that a reset cleared the in-flight flag. That is a statement about a
 * Boolean, and it was the whole of the coverage for a worker that had no `'error'`
 * handler, no `'exit'` handler, no deadline, and no closure. Astra round 2 put it
 * plainly: the worker had no owned failure lifecycle.
 *
 * THE CLAIM BEING TESTED IS "IT BECOMES A READING". Not "a handler is attached" —
 * a handler can be attached and never fire, and a structural pin is not a
 * behavioural proof. So every worker below is a REAL worker script on disk, and
 * each one fails in a different way:
 *
 *   throws            an uncaught throw while the module loads → `'error'`
 *   exits             `process.exit(3)` without answering → `'exit'`
 *   silent            accepts the port and never answers → the deadline
 *   slow              answers after 400 ms, so a result can be made obsolete
 *   answersThenExits  answers and then exits — must NOT read as a crash
 *
 * WITHOUT A SEAM THIS FILE COULD NOT EXIST. The real worker starts perfectly, so
 * no test can reach the failure handlers through it. `setProbeWorkerForTest` is
 * what makes the failures constructible; the seam is documented in
 * `lib/health-probe.mjs` as the reason it exists.
 *
 * THE FIRST TEST IS ALSO THE PROOF THAT THE PROCESS SURVIVES. With no `'error'`
 * listener, a worker's uncaught throw is an uncaughtException and this file would
 * never report a result at all.
 *
 * @module creator-brains-console/test/health.lifecycle
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import {
  PROBE_TIMEOUT_MS, requestProbe, resetProbeChannel, setProbeWorkerForTest, takeProbe,
} from '../lib/health-probe.mjs';

const PORT = "import { workerData } from 'node:worker_threads';\nconst port = workerData.port;\n";

const WORKER_DIR = tempRoot('r204-workers');

/** A file the `heartbeat` worker appends to, so termination is OBSERVABLE. */
const BEAT_FILE = join(WORKER_DIR, 'beat.txt');
writeFileSync(BEAT_FILE, '', 'utf8');

/** The failing workers. Written to disk so they are real, not simulated. */
const SCRIPTS = {
  throws: 'throw new Error("this worker cannot initialise");\n',
  exits: 'process.exit(3);\n',
  silent: `${PORT}port.on('message', () => { /* deliberately never answers */ });\n`,
  slow: `${PORT}port.on('message', (msg) => {\n`
    + "  if (!msg || msg.go !== true) return;\n"
    + '  setTimeout(() => {\n'
    + "    port.postMessage({ value: { ok: true, version: 'STALE' }, atMs: Date.now(), epoch: msg.epoch });\n"
    + '  }, 400);\n'
    + '});\n',
  // Answers at ~200 ms and exits at ~500 ms, so a test can read AFTER both events.
  answersThenExits: `${PORT}port.on('message', (msg) => {\n`
    + "  if (!msg || msg.go !== true) return;\n"
    + "  port.postMessage({ value: { ok: true, version: '9.9.9' }, atMs: Date.now(), epoch: msg.epoch });\n"
    + '  setTimeout(() => { process.exit(0); }, 300);\n'
    + '});\n',
  // Appends a byte every 40 ms. THE ONLY DIRECT OBSERVABLE OF `terminate()`:
  // `process.getActiveResourcesInfo()` does not report unref'd workers or ports
  // (measured), so liveness has to be watched from inside the thread.
  heartbeat: [
    "import { workerData } from 'node:worker_threads';",
    "import { appendFileSync } from 'node:fs';",
    "workerData.port.on('message', () => {});",
    `setInterval(() => { appendFileSync(${JSON.stringify(BEAT_FILE)}, 'x'); }, 40);`,
  ].join('\n') + '\n',
};

const URLS = {};
for (const [name, body] of Object.entries(SCRIPTS)) {
  const file = join(WORKER_DIR, `${name}.mjs`);
  writeFileSync(file, body, 'utf8');
  URLS[name] = pathToFileURL(file).href;
}

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

/** Poll for a reading the way the bridge does — the library itself never waits. */
async function waitForReading(budgetMs = 5000) {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const got = takeProbe();
    if (got) return got;
    if (Date.now() >= deadline) return null;
    await sleep(20);
  }
}

/** Run a test body against one failing worker, and always restore the real one. */
async function withWorker(name, fn) {
  setProbeWorkerForTest(URLS[name]);
  try {
    return await fn();
  } finally {
    setProbeWorkerForTest(null);
  }
}

/* ── the three ways a probe can fail to answer ──────────────────────────── */

test('R2-04a: a worker that cannot START becomes a READING, not a process error', async () => {
  await withWorker('throws', async () => {
    assert.equal(requestProbe(), true,
      'the request is accepted before the worker has had a chance to fail');
    const got = await waitForReading();
    assert.ok(got, 'the startup failure must arrive as a reading');
    assert.equal(got.value.ok, false);
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /worker failed/);
    // Delivered ONCE. A failure that replayed on every read would pin the badge
    // to "failed" forever, which is its own kind of lie.
    assert.equal(takeProbe(), null, 'the failure is consumed, not replayed');
  });
});

test('R2-04b: a worker that DIES mid-probe becomes a reading', async () => {
  await withWorker('exits', async () => {
    assert.equal(requestProbe(), true);
    const got = await waitForReading();
    assert.ok(got, 'the exit must arrive as a reading, not as silence');
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /exited before answering \(code 3\)/);
  });
});

test('R2-04c: SILENCE becomes a reading — the watchdog', async () => {
  await withWorker('silent', async () => {
    assert.equal(requestProbe(), true);
    // No waiting: the deadline is evaluated against an injected clock, so the
    // 45 s budget is exercised without spending 45 s.
    assert.equal(takeProbe(), null, 'before the deadline there is still no verdict');
    const got = takeProbe(Date.now() + PROBE_TIMEOUT_MS + 1);
    assert.ok(got, 'a probe that neither answers nor dies must still produce a reading');
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /did not answer within/);
  });
});

/* ── closure, and the result that must never be adopted ─────────────────── */

test('R2-04d: a result from a RETIRED channel is never adopted', async () => {
  await withWorker('slow', async () => {
    // (i) THE FIXTURE CAN DELIVER. Without this half, "nothing arrived" below
    // would pass for a fixture that could never have delivered anything — the
    // vacuous-pass shape this suite has already been bitten by.
    assert.equal(requestProbe(), true);
    const arrived = await waitForReading(3000);
    assert.ok(arrived, 'precondition: the slow worker does answer when left alone');
    assert.equal(arrived.value.version, 'STALE', 'precondition: and with its own payload');

    // (ii) And after a reset it cannot.
    assert.equal(requestProbe(), true, 'a new probe starts on a fresh channel');
    resetProbeChannel();
    await sleep(900); // comfortably past the slow worker's 400 ms reply
    assert.equal(takeProbe(), null,
      'a result produced for a channel that has been retired must never become a reading');
  });
});

test('R2-04e: reset is a real reset — idempotent, and it un-sticks the flag', async () => {
  await withWorker('silent', async () => {
    resetProbeChannel();
    resetProbeChannel(); // must not throw when there is no channel at all
    assert.equal(requestProbe(), true, 'the first request starts a probe');
    assert.equal(requestProbe(), false, 'a second is refused while one is already running');
    resetProbeChannel();
    assert.equal(requestProbe(), true, 'the reset must clear the in-flight state');
  });
});

/* ── the mirror image: a death we were not waiting on ───────────────────── */

test('R2-04f: a worker that answers and THEN exits is not reported as a crash', async () => {
  await withWorker('answersThenExits', async () => {
    assert.equal(requestProbe(), true);
    // DELIBERATELY LATE POLLING. The answer lands at ~200 ms and the worker exits
    // at ~500 ms, so by the time this test reads, the answer is sitting in the
    // port buffer AND the worker is already dead. A handler that declared failure
    // on exit without draining first would report a crash for a probe that
    // SUCCEEDED — which is why the read must come after both events, not before.
    await sleep(900);
    const got = takeProbe();
    assert.ok(got, 'the answer must still be delivered after the worker has gone');
    assert.equal(got.value.version, '9.9.9', 'the answer must be ADOPTED, not discarded');
    assert.equal(got.value.workerFailed, undefined, 'and not dressed up as a failure');
    assert.equal(takeProbe(), null, 'and the death must not be replayed as a failure');
  });
});

/* ── closure: the thread must actually stop ─────────────────────────────── */

test('R2-04h: a death AFTER the answer was taken is still not a failure', async () => {
  await withWorker('answersThenExits', async () => {
    assert.equal(requestProbe(), true);
    // Here the answer is taken EARLY, so nothing is in flight when the worker
    // exits at ~500 ms. A handler that recorded a failure on any exit would turn
    // a healthy answer into a crash notice on the next read.
    const got = await waitForReading(3000);
    assert.ok(got);
    assert.equal(got.value.version, '9.9.9');

    await sleep(800); // past the exit
    assert.equal(takeProbe(), null,
      'a worker death with nothing in flight must not be recorded as a failure');
  });
});

test('R2-04g: reset TERMINATES the worker — it does not merely forget it', async () => {
  await withWorker('heartbeat', async () => {
    assert.equal(requestProbe(), true);
    await sleep(400);
    const beating = statSync(BEAT_FILE).size;
    assert.ok(beating > 0, 'precondition: the worker is alive and writing heartbeats');

    resetProbeChannel();
    // TERMINATION IS ASYNCHRONOUS (measured). Reading the size immediately after
    // the reset sees ONE straggler beat, because the worker can complete an
    // interval tick before the termination is processed — 7 → 8 bytes on this
    // machine. The property is therefore "it stops", not "it stops instantly",
    // and an assertion written the stricter way fails for a correct
    // implementation.
    await sleep(300);
    const settled = statSync(BEAT_FILE).size;
    await sleep(500); // twelve more heartbeat intervals
    assert.equal(statSync(BEAT_FILE).size, settled,
      'a retired worker must stop running, not linger as a leaked thread');
  });
});
