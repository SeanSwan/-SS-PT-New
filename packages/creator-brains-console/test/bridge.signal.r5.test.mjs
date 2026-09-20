/*
 * R5-03 — THE SIGNAL PATH MUST NOT OUTRUN THE DRAIN (Astra round 5, 2026-09-20).
 *
 * THE DEFECT. R4-02 made `shutdown()` a real drain, and Astra reproduced the ordering
 * on a real socket: admitted work awaited unbounded, then a bounded HTTP closure, then
 * a force-close, then release. The signal path bypassed all of it. `onSignal` had two
 * independent exits:
 *
 *   Promise.resolve(shutdown()).then(() => process.exit(0));
 *   setTimeout(() => process.exit(0), 2_000).unref();
 *
 * The timer fired `exit(0)` with work still admitted — manufacturing SUCCESSFUL
 * termination over abandoned dispatches, which is the defect the drain exists to
 * prevent, reached by a different door. Worse, the handler is registered PER BRIDGE,
 * so one signal runs every registered handler: in a two-bridge process the IDLE
 * bridge's promise resolved immediately and killed the process while the BUSY bridge
 * still owned an admitted dispatch. Astra measured both rows. That second row is why
 * removing the timer ALONE is not the fix, and why the tests below assert the absence
 * of an exit rather than the absence of a timer.
 *
 * HOW THE EXIT IS OBSERVED WITHOUT ENDING THE TEST PROCESS. `process.exit` is replaced
 * by a recorder for the duration of each test and restored in `finally`. This is the
 * same instrument Astra used, and it is the only way to see the difference between
 * "the process exited" and "the process would have exited" from inside the process.
 *
 * A DISPATCH IS HELD IN FLIGHT the same way round 4 held one: a POST whose
 * `content-length` exceeds the bytes sent, so the handler is dispatched and then
 * blocks in `readBody`. A real dispatch, on a real route, held by a real client.
 *
 * @module creator-brains-console/test/bridge.signal.r5
 */

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as net from 'node:net';
import { pathToFileURL } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { fixtureRoot } from './fixtures.mjs';
import { resetBridgeRegistry, startBridge } from '../server.mjs';
import { healthOwnerCount, releaseHealthOwner, resetHealthCache } from '../lib/health.mjs';
import { setProbeWorkerForTest } from '../lib/health-probe.mjs';
import { REQUIRED_HEADER, REQUIRED_MEDIA_TYPE } from '../lib/write-gate.mjs';

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

/** Long enough to outlive the 2,000 ms timer the old handler armed. */
const PAST_THE_OLD_TIMER_MS = 2500;

const FAST_WORKER = (() => {
  const dir = tempRoot('r503-workers');
  const file = join(dir, 'fast.mjs');
  writeFileSync(file, [
    "import { workerData } from 'node:worker_threads';",
    'const port = workerData.port;',
    "port.on('message', (m) => { if (!m || m.go !== true) return;",
    "  port.postMessage({ value: { ok: true, version: 'PROBE-1.0.0', reason: 'stub' },",
    '    atMs: Date.now(), epoch: m.epoch }); });',
  ].join('\n') + '\n', 'utf8');
  return pathToFileURL(file).href;
})();

function fresh(label) {
  resetBridgeRegistry();
  while (healthOwnerCount() > 0) releaseHealthOwner();
  resetHealthCache();
  setProbeWorkerForTest(FAST_WORKER);
  return fixtureRoot(label);
}

function rawSocket(port) {
  const sock = net.connect(port, '127.0.0.1');
  let buf = '';
  sock.setEncoding('utf8');
  sock.on('data', (d) => { buf += d; });
  const connected = new Promise((res, rej) => {
    sock.on('connect', res);
    sock.on('error', rej);
  });
  return {
    connected,
    text: () => buf,
    write: (s) => sock.write(s),
    destroy: () => { try { sock.destroy(); } catch { /* already gone */ } },
  };
}

async function until(pred, timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (pred()) return true;
    await sleep(10);
  }
  return pred();
}

const statuses = (text) => [...text.matchAll(/HTTP\/1\.1 (\d{3})/g)].map((m) => Number(m[1]));

const GATE = `Content-Type: ${REQUIRED_MEDIA_TYPE}\r\n${REQUIRED_HEADER}: 1\r\n`;
const HEAD = '{"r';
const TAIL = 'ef":""}';

/**
 * Record every `process.exit` ATTEMPT without performing one — for the WHOLE FILE.
 *
 * ⚠️ WHY THIS IS MODULE-SCOPE AND NOT PER-TEST, AND WHY IT IS THE WHOLE POINT.
 * The first version of this file installed the recorder per test and restored the
 * real `process.exit` in `finally`. Mutation M14 (revert the handler to the old
 * `process.exit(0)` pair) then produced a **GREEN** run — `# tests 1 … pass 1`,
 * no `not ok` anywhere — and it took a second look to see why:
 *
 *   1. the assertion at 2500 ms DID fail, as it should;
 *   2. the throw unwound into `finally`, which restored the REAL `process.exit`;
 *   3. the mutant's still-pending `shutdown().then(() => process.exit(0))` then ran
 *      and **killed the test process**;
 *   4. Node's runner reported the truncated file as a single passing test.
 *
 * So a test that kills the process on the defect was reporting as a PASS, and the
 * mutation harness's `not ok` grep could not see it. Two instrument defects in one
 * place, which is why the recorder now outlives every test and the assertion that
 * matters runs in `after()`.
 */
const EXITS = [];
const REAL_EXIT = process.exit;
process.exit = (code) => { EXITS.push(code); };

after(() => {
  const attempted = [...EXITS];
  process.exit = REAL_EXIT; // restored LAST, so the runner can still exit
  assert.deepEqual(
    attempted, [],
    'no signal handler may attempt to end the process — a drain that exits itself '
    + 'manufactures a successful stop over abandoned dispatches',
  );
});

async function holdOpenRequest(port, { settleMs = 150 } = {}) {
  const s = rawSocket(port);
  await s.connected;
  s.write(
    `POST /api/creators HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n${GATE}`
    + `Content-Length: ${HEAD.length + TAIL.length}\r\n\r\n${HEAD}`,
  );
  await sleep(settleMs);
  assert.equal(
    statuses(s.text()).length, 0,
    'precondition: the handler must still be reading the body, not already answered',
  );
  return s;
}

test('R5-03a: a signal does NOT exit while a dispatch is still in flight', async () => {
  const r = fresh('r503a');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  const s = await holdOpenRequest(b.port);
  try {
    process.emit('SIGTERM');

    // THE MEASUREMENT ASTRA TOOK, INVERTED INTO AN ASSERTION. The old handler's
    // timer fired here, with the handler still blocked in `readBody`, and recorded
    // `exit(0)` over one admitted dispatch and one owned lease.
    await sleep(PAST_THE_OLD_TIMER_MS);
    assert.deepEqual(
      EXITS, [],
      'a signal must not manufacture a successful exit over an in-flight dispatch',
    );
    assert.equal(healthOwnerCount(), 1, 'and the dispatch is still owned while it runs');

    s.write(TAIL);
    assert.ok(await until(() => b.admission.count() === 0), 'the dispatch must complete');
    // `shutdown()` is idempotent and returns the SAME drain promise the signal
    // handler started, so awaiting it here joins the drain rather than starting one.
    await b.shutdown();
    await new Promise((res) => { setImmediate(res); }); // let any queued `.then` run
    assert.deepEqual(EXITS, [], 'the process must exit on its own, not by this handler');
    assert.equal(healthOwnerCount(), 0, 'the lease is given back once the drain is done');
  } finally {
    s.destroy();
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R5-03b: an IDLE bridge must not end the process while a BUSY one has work', async () => {
  // TWO STORES, deliberately: the registry refuses a second bridge over the same
  // store ("already running in this process"), and the row under test is about two
  // bridges in one PROCESS, not two over one store.
  resetBridgeRegistry();
  while (healthOwnerCount() > 0) releaseHealthOwner();
  resetHealthCache();
  setProbeWorkerForTest(FAST_WORKER);
  const idle = await startBridge({ r: fixtureRoot('r503b-idle'), port: 0, open: false, log: () => {} });
  const busy = await startBridge({ r: fixtureRoot('r503b-busy'), port: 0, open: false, log: () => {} });
  const s = await holdOpenRequest(busy.port);
  try {
    assert.equal(healthOwnerCount(), 2, 'precondition: each bridge holds its own lease');
    // ONE signal runs EVERY registered handler — this is the row the timer-only fix
    // misses. The idle bridge's `shutdown()` resolves immediately, and the old code
    // then called `process.exit(0)` from it while `busy` still owned a dispatch.
    process.emit('SIGTERM');

    await sleep(PAST_THE_OLD_TIMER_MS);
    assert.deepEqual(
      EXITS, [],
      'the idle bridge must not terminate a process another bridge is still serving in',
    );
    assert.equal(healthOwnerCount(), 1, 'the busy bridge still owns its dispatch');

    s.write(TAIL);
    assert.ok(await until(() => busy.admission.count() === 0), 'the dispatch must complete');
    await idle.shutdown();
    await busy.shutdown();
    assert.deepEqual(EXITS, [], 'and no handler ever reached for the process');
  } finally {
    s.destroy();
    await idle.shutdown();
    await busy.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R5-03c: the handler is not inert — a signal with nothing in flight still shuts down', async () => {
  const r = fresh('r503c');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    // NOT `b.admission.admit()` as the probe: when admission is still OPEN that
    // call returns `true` AND takes a slot, so polling it would corrupt the very
    // state under test. The listener count is the non-mutating observable — the
    // drain removes its own signal listeners as its first act, so a handler that
    // ran is a handler that unregistered itself.
    const before = process.listenerCount('SIGTERM');
    process.emit('SIGTERM');
    assert.ok(
      await until(() => process.listenerCount('SIGTERM') < before),
      'the signal must actually run the drain, which removes its own listeners',
    );
    await b.shutdown();
    assert.equal(healthOwnerCount(), 0, 'and the idle drain releases ownership');
    assert.deepEqual(EXITS, [], 'without ending the process itself');
  } finally {
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});
