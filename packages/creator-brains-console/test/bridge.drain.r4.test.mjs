/*
 * R4-02 — SHUTDOWN IS A DRAIN, AND THE LEASE OUTLIVES THE LAST DISPATCH
 * (Astra round 4, 2026-09-20).
 *
 * WHY THIS FILE EXISTS. `shutdown()` used to call `server.close()` and release
 * instance ownership, the health lease and the registry slot SYNCHRONOUSLY.
 * `server.close()` is asynchronous and stops new CONNECTIONS, not in-flight
 * dispatches on connections that are already open — two different facts. Astra
 * drove the real handler and measured the gap: a pipelined `/api/canary`
 * constructed a probe worker while `owners` was already 0, so the last owner had
 * released a worker another request was still answering from.
 *
 * WHAT IS ASSERTED, AND WHY IT IS THE PROPERTY RATHER THAN THE MECHANISM.
 * These tests never inspect the drain's internals. They hold a real request open,
 * start a real shutdown, and then check the two things an operator would notice:
 *
 *   R4-02a  the lease is STILL HELD while a dispatch is in flight, and is given
 *           back only once that dispatch has finished.
 *   R4-02b  a request that reaches the server on a surviving connection during
 *           the drain is refused with 503 SHUTTING_DOWN instead of being
 *           dispatched against a store whose owner has gone.
 *   R4-02c  the drain is idempotent, resolves, and leaves the port free.
 *
 * HOW A DISPATCH IS KEPT IN FLIGHT. A POST with a `content-length` larger than
 * the bytes sent so far: the handler is invoked as soon as the headers are
 * parsed, then blocks in `readBody` awaiting the rest. That is a real dispatch,
 * on a real route, held open by a real client — not a stub handler, and not a
 * sleep.
 *
 * THE SECOND REQUEST IS PIPELINED, DELIBERATELY. It is written to the SAME
 * socket, AFTER `server.close()` has run, and only once the first request's body
 * is complete — because a pipelined request cannot be parsed while the previous
 * body is still being read. That is the exact shape Astra measured, and it is
 * the only shape that can reach the handler on a connection `close()` no longer
 * governs.
 *
 * @module creator-brains-console/test/bridge.drain.r4
 */

import { test } from 'node:test';
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

/**
 * A probe worker that answers at once.
 *
 * Injected so `/api/status` never reaches the real worker, which runs the
 * engine's blocking `selfCheck()` and would spawn a yt-dlp subprocess for a
 * question these tests are not asking. The lease is what is under test, and the
 * lease is taken at start whether or not a probe ever runs.
 */
const FAST_WORKER = (() => {
  const dir = tempRoot('r402-workers');
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

/** Fresh lease state, no bridge registered, and the stub probe installed. */
function fresh(label) {
  resetBridgeRegistry();
  while (healthOwnerCount() > 0) releaseHealthOwner();
  resetHealthCache();
  setProbeWorkerForTest(FAST_WORKER);
  return fixtureRoot(label);
}

/** A raw socket, so requests can be PIPELINED — `fetch` cannot express that. */
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

/** Poll a predicate. Returns as soon as it holds, or `false` at the deadline. */
async function until(pred, timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (pred()) return true;
    await sleep(10);
  }
  return pred();
}

/** Count the `HTTP/1.1 <status>` lines seen so far, in order. */
const statuses = (text) => [...text.matchAll(/HTTP\/1\.1 (\d{3})/g)].map((m) => Number(m[1]));

/** The gate headers a write must carry, so a POST reaches dispatch (A1-09). */
const GATE = `Content-Type: ${REQUIRED_MEDIA_TYPE}\r\n${REQUIRED_HEADER}: 1\r\n`;

/** A body of exactly 10 bytes, so `content-length` is honest and the read ends. */
const HEAD = '{"r';
const TAIL = 'ef":""}';

/**
 * Open a request and leave its body INCOMPLETE, so the handler is dispatched and
 * then blocks in `readBody`. A real dispatch, on a real route, held by a real
 * client.
 *
 * THE PRECONDITION IS DELIBERATELY NOT `admission.count()`. That counter is part
 * of the mechanism under test, and a mutant that removes the admission gate would
 * then fail these tests AT THEIR PRECONDITION — red for the wrong reason, with
 * the property they claim to check never reached. (Measured: it reddened three
 * tests on the string "precondition: a dispatch is in flight" and proved
 * nothing.) What is asserted instead is observable WITHOUT the mechanism: the
 * headers have had time to be parsed, and no response has arrived — which also
 * fails loudly if the request never reached dispatch at all.
 */
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

test('R4-02a: the lease is held while a dispatch is in flight, and only then given back', async () => {
  const r = fresh('r402a');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  const s = await holdOpenRequest(b.port);
  try {
    const drain = b.shutdown();
    // THE MEASUREMENT ASTRA TOOK, INVERTED INTO AN ASSERTION. The old shutdown
    // released synchronously, so this read 0 while the handler was still running.
    assert.equal(healthOwnerCount(), 1, 'ownership must be held while a dispatch is in flight');

    s.write(TAIL); // let the handler finish
    assert.ok(await until(() => b.admission.count() === 0), 'the dispatch must complete');
    await drain;
    assert.equal(healthOwnerCount(), 0, 'the lease is given back once the drain is done');
  } finally {
    s.destroy();
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R4-02b: a pipelined request on a SURVIVING connection is refused during the drain', async () => {
  const r = fresh('r402b');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  // A SECOND held-open dispatch, whose only job is to PIN THE DRAIN OPEN. While a
  // slot is held, `admission.settled()` cannot resolve, so the drain cannot reach
  // its bounded HTTP wait and force-close the pipelined socket underneath the
  // assertions below. Without this pin the test races the 250 ms grace: a
  // one-off failure was observed in 17 runs, and a flake that narrow is exactly
  // the kind that gets re-run until it passes and then hides a real regression.
  const pin = await holdOpenRequest(b.port);
  const s = await holdOpenRequest(b.port);
  try {
    const drain = b.shutdown();

    // The second request goes out AFTER `close()` — on the SAME socket, which
    // `close()` does not govern. It can only be parsed once the first body is
    // complete, so both are written together.
    s.write(`${TAIL}GET /api/status HTTP/1.1\r\nHost: 127.0.0.1:${b.port}\r\n\r\n`);

    assert.ok(
      await until(() => statuses(s.text()).length >= 2),
      `expected two responses on the pipelined socket, saw ${JSON.stringify(statuses(s.text()))}`,
    );
    // THE PROPERTY IS ASSERTED FIRST. A 503 here is the proof that the request
    // never reached `dispatch`: the admission check is the FIRST thing the
    // request handler does, ahead of the Host gate and ahead of any route. A 200
    // would mean `/api/status` ran against a store whose owner was leaving.
    assert.equal(statuses(s.text())[1], 503, 'the pipelined request must be refused, not dispatched');
    assert.match(s.text(), /SHUTTING_DOWN/, 'the refusal must name the reason');
    assert.doesNotMatch(s.text(), /"version"/, 'the refused request must not have produced a reading');

    pin.write(TAIL); // only now may the drain proceed
    await drain;
  } finally {
    pin.destroy();
    s.destroy();
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R4-02d: the drain does NOT resolve while a dispatch is still in flight', async () => {
  const r = fresh('r402d');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  const s = await holdOpenRequest(b.port);
  try {
    const drain = b.shutdown();
    let drained = false;
    drain.then(() => { drained = true; });

    // AWAITING THE DRAIN IS NOT THE PROPERTY — WAITING FOR THE WORK IS. Without
    // the wait on admitted dispatches, the drain would settle on the HTTP-close
    // grace (~250 ms) and resolve here; the dispatch is still held open, so the
    // assertion below is what separates "waits for the work" from "waits for a
    // timer". R4-02a alone cannot see the difference: it finishes the body before
    // it awaits, so both versions pass it.
    await sleep(600);
    assert.equal(drained, false, 'the drain must still be waiting on an unfinished dispatch');

    s.write(TAIL);
    await drain;
    assert.equal(drained, true, 'and it resolves once that dispatch finishes');
    assert.equal(healthOwnerCount(), 0);
  } finally {
    s.destroy();
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R4-02c: the drain is idempotent, resolves, and leaves the port free', async () => {
  const r = fresh('r402c');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  const { port } = b;
  try {
    const first = b.shutdown();
    const second = b.shutdown();
    assert.equal(first, second, 'a second shutdown must await the SAME drain, not race a second release');
    await Promise.all([first, second]);
    assert.equal(healthOwnerCount(), 0, 'released exactly once');
    assert.ok(await until(() => b.admission.count() === 0));

    // The port is genuinely free: a fresh connection is refused by the OS.
    const probe = rawSocket(port);
    await assert.rejects(probe.connected, 'nothing may still be listening after the drain');
    probe.destroy();

    // And the slot is free, so the same store can be started again in-process.
    const again = await startBridge({ r, port: 0, open: false, log: () => {} });
    try {
      assert.equal(healthOwnerCount(), 1, 'the restart takes its own lease');
    } finally {
      await again.shutdown();
    }
  } finally {
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});
