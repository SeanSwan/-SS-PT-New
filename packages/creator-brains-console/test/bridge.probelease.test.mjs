/*
 * R3-03 — the shared probe worker follows BRIDGE OWNERSHIP (Astra round 3).
 *
 * WHY THIS FILE EXISTS. R2-04 gave the worker a failure lifecycle and a reset, and
 * then nothing in the bridge ever called the reset: `api.mjs` re-exported it,
 * `server.mjs` shut down without it, and a source search found no production
 * caller. An embedding host that stopped a bridge while its process stayed alive
 * kept an idle worker thread and a live cache entry.
 *
 * THE LIFECYCLE SUITE COULD NOT SEE IT, AND THAT IS THE POINT. `health.lifecycle`
 * and `health.cachekey` call the reset DIRECTLY — which is the right way to test
 * the reset, and structurally incapable of noticing that production never calls
 * it. A test that performs the cleanup itself cannot observe a missing connection
 * to the cleanup. These tests therefore drive the REAL `startBridge` and the REAL
 * route, and never call the reset to set up or tear down the property under test.
 *
 * LIVENESS IS OBSERVED FROM INSIDE THE THREAD. `process.getActiveResourcesInfo()`
 * does not report unref'd workers or ports (measured, R2-04), so the heartbeat
 * file is the only direct observable of `terminate()` that this platform offers.
 *
 * @module creator-brains-console/test/bridge.probelease
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { fixtureRoot, rawRequest } from './fixtures.mjs';
import { resetBridgeRegistry, startBridge } from '../server.mjs';
import { healthOwnerCount, healthReading, releaseHealthOwner, resetHealthCache } from '../lib/health.mjs';
import { setProbeWorkerForTest } from '../lib/health-probe.mjs';

const WORKER_DIR = tempRoot('r303-workers');
/** A file the heartbeat worker appends to, so termination is OBSERVABLE. */
const BEAT_FILE = join(WORKER_DIR, 'beat.txt');

const HEARTBEAT_URL = (() => {
  const file = join(WORKER_DIR, 'heartbeat.mjs');
  writeFileSync(file, [
    "import { workerData } from 'node:worker_threads';",
    "import { appendFileSync } from 'node:fs';",
    "workerData.port.on('message', () => {});",
    `setInterval(() => { appendFileSync(${JSON.stringify(BEAT_FILE)}, 'x'); }, 40);`,
  ].join('\n') + '\n', 'utf8');
  return pathToFileURL(file).href;
})();

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });
const beats = () => statSync(BEAT_FILE).size;

/**
 * Wait until the heartbeat STOPS ADVANCING, or `timeoutMs` passes (R4-02b).
 *
 * WHY NOT A FIXED SLEEP (Astra round 4). `terminate()` is asynchronous, so
 * sampling once after a fixed delay asserts only "the worker had not beaten again
 * *yet*" — a race whose verdict depends on how loaded the machine is, and one
 * that passes for the wrong reason on a fast one. This waits for the observable
 * to actually SETTLE and reports whether it did. A worker that never stops
 * beating is the failure, and it is caught by the bound rather than by luck.
 *
 * `quietMs` is comfortably longer than the worker's 40 ms beat interval, so a
 * live worker can never look quiet.
 */
async function waitForBeatsToSettle(timeoutMs = 3000, quietMs = 200) {
  const started = Date.now();
  let last = beats();
  let quietSince = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(25);
    const now = beats();
    if (now !== last) { last = now; quietSince = Date.now(); continue; }
    if (Date.now() - quietSince >= quietMs) return { settled: true, beats: last };
  }
  return { settled: false, beats: last };
}

/** Wait until the heartbeat ADVANCES at least once, or `timeoutMs` passes. */
async function waitForBeatsToAdvance(timeoutMs = 3000) {
  const from = beats();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(25);
    if (beats() > from) return true;
  }
  return false;
}

/**
 * Give back every lease a PREVIOUS test left behind.
 *
 * WHY THIS IS HERE, AND WHY IT IS NOT CHEATING. Without it, one failing test
 * cascades: a leaked lease makes the next test's precondition false, and the third
 * test then fails for a reason that has nothing to do with what it asserts. With
 * it, each test fails only on its own property. The mutants below are exactly how
 * this was found — the first version of these tests HUNG under the missing-release
 * mutation, because the leak also skipped the cleanup that let the process exit. A
 * test that hangs on the defect is worse than one that fails: it spends the suite's
 * budget and can wedge a pipeline.
 */
function drainLeases() {
  while (healthOwnerCount() > 0) releaseHealthOwner();
}

/** Fresh lease state, a fresh heartbeat worker, and no bridge left registered. */
function fresh(label) {
  resetBridgeRegistry();
  drainLeases();
  resetHealthCache();
  setProbeWorkerForTest(HEARTBEAT_URL);
  writeFileSync(BEAT_FILE, '', 'utf8');
  return fixtureRoot(label);
}

/** Drive a REAL probe through the REAL route — the production trigger, not a stub. */
async function startProbeThrough(handle) {
  const res = await rawRequest(handle.url, '/api/status');
  assert.equal(res.status, 200, 'status must answer while the probe is still in flight');
  await sleep(300);
  assert.ok(beats() > 0, 'precondition: the probe worker is running and beating');
}

test('R3-03a: a real bridge takes the lease, and shutdown gives it back', async () => {
  const r = fresh('r303a');
  assert.equal(healthOwnerCount(), 0, 'precondition: no owner before start');

  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    assert.equal(healthOwnerCount(), 1, 'a running bridge owns the shared probe');
    await startProbeThrough(b);

    // SHUTDOWN IS AN ASYNC DRAIN (R4-02), so it must be AWAITED before the lease
    // is asserted. Sampling immediately after requesting termination is the flaky
    // assertion Astra round 4 flagged — it happens to pass while the release is
    // synchronous and cannot see the drain it is meant to prove.
    await b.shutdown();
    assert.equal(healthOwnerCount(), 0, 'shutdown gives the lease back');

    // RETIRED, not merely forgotten — the observable R2-04g established. Measured
    // inside the try, because the `finally` below terminates the worker and would
    // make the assertion unreachable if it ran first. Observed by SETTLING, not by
    // one sample after a fixed delay (R4-02b).
    const retirement = await waitForBeatsToSettle();
    assert.ok(retirement.settled, 'the last owner must terminate the worker, not leave it idle');
  } finally {
    await b.shutdown(); // idempotent — safe whether or not the line above ran
    setProbeWorkerForTest(null);
  }
});

test('R3-03b: two bridges share the probe, and only the LAST one retires it', async () => {
  const ra = fresh('r303b-a');
  const rb = fixtureRoot('r303b-b');
  const a = await startBridge({ r: ra, port: 0, open: false, log: () => {} });
  const b = await startBridge({ r: rb, port: 0, open: false, log: () => {} });
  try {
    assert.equal(healthOwnerCount(), 2, 'both bridges own the shared probe');
    await startProbeThrough(a);

    // A stops while B is still serving. Retiring the shared worker here would be
    // a shutdown that breaks a running service — which is why the lease exists.
    // AWAITED: the release now happens at the end of a drain (R4-02).
    await a.shutdown();
    assert.equal(healthOwnerCount(), 1, 'one owner remains');
    assert.ok(
      await waitForBeatsToAdvance(),
      'the worker must outlive the first bridge to stop',
    );

    // The last owner goes, and NOW it retires.
    await b.shutdown();
    assert.equal(healthOwnerCount(), 0);
    const retirement = await waitForBeatsToSettle();
    assert.ok(retirement.settled, 'the LAST owner retires the worker');
  } finally {
    await a.shutdown();
    await b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R3-03c: a release with no matching acquire is a NO-OP, not a reset', () => {
  resetBridgeRegistry();
  drainLeases();
  resetHealthCache();
  assert.equal(healthOwnerCount(), 0, 'precondition: no bridge is running');

  // Prime the cache from an INJECTED probe, so no worker is involved and the only
  // thing under test is the reset rule itself.
  const probe = () => ({ ok: true, version: 'CACHED-1.0.0', reason: 'stub' });
  assert.equal(healthReading({ probe, now: 1_000 }).version, 'CACHED-1.0.0');

  // A caller that never took a lease must not be able to retire anything. `owners`
  // is checked BEFORE it is decremented: a release from zero is not "the last
  // owner left", it is a caller that never took one.
  assert.equal(releaseHealthOwner(), 0, 'a stray release leaves the count at zero');

  // And the proof that nothing was RESET: the cached reading survives. A reset
  // empties the cache, so the next read would have to probe again — and this probe
  // throws if it is ever called.
  const again = healthReading({
    probe: () => { throw new Error('the stray release cleared the cache'); },
    now: 1_001,
  });
  assert.equal(again.version, 'CACHED-1.0.0', 'a stray release must not clear the cache');
});
