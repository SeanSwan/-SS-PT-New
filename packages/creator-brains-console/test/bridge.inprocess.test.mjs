/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.inprocess.test.mjs
 * PURPOSE: The IN-PROCESS single-instance guard (hostile round 3, H3).
 * PART OF: Creator Brains Console (blueprint 08 Operations; 13-hostile-round3)
 * SLICE: S0
 * ============================================================================
 *
 * THE DEFECT THIS PINS. The module header of `lib/instance.mjs` promises that
 * "one console at a time" is "a property of the system rather than a convention
 * Sean has to remember." That promise was not true at the `startBridge` layer.
 *
 * `claimInstance` deliberately lets the SAME pid re-claim — it must, or a restart
 * inside one process would be impossible, and `bridge.hy4.process.test.mjs`
 * asserts exactly that. But the consequence was never traced to the caller:
 * calling `startBridge` twice in one process produced **two live bridges on one
 * store**, both bound, both writing `registry.json`. That is the silent
 * lost-update the guard exists to prevent, and it is reachable precisely by the
 * caller slice S7 introduces — an in-process host (SwanGuard) that could start
 * the bridge twice via a retry, a hot reload, or a module initialised twice.
 *
 * The fix adds a second, complementary guard: a process-local registry keyed by
 * store root. The pid file stops a second PROCESS; the registry stops a second
 * CALL. Both are required — neither subsumes the other.
 *
 * WHAT MUST NOT REGRESS: the guard must not become a lockout. A restart inside
 * the same process after a clean shutdown, and a retry after a FAILED start,
 * must both still succeed. Those are the two ways a naive "refuse if a pid file
 * exists" implementation locks Sean out of his own console.
 *
 * @module creator-brains-console/test/bridge.inprocess
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fixtureRoot, seedStore, getJson } from './fixtures.mjs';
import {
  startBridge, InstanceError, liveBridgeFor, resetBridgeRegistry,
} from '../server.mjs';
import { createServer } from 'node:http';

test('H3: a second startBridge in one process is refused, not silently allowed', async () => {
  const r = fixtureRoot('r3-inproc');
  seedStore(r);
  const a = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    await assert.rejects(
      startBridge({ r, port: 0, open: false, log: () => {} }),
      (err) => err instanceof InstanceError && /already running in this process/.test(err.message),
      'two bridges on one store is the lost-update scenario and must be refused',
    );
  } finally {
    a.shutdown();
  }
});

test('H3: the refusal names the live bridge, so the operator can find it', async () => {
  const r = fixtureRoot('r3-inproc-named');
  seedStore(r);
  const a = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    await assert.rejects(
      startBridge({ r, port: 0, open: false, log: () => {} }),
      (err) => err.message.includes(a.url),
    );
  } finally {
    a.shutdown();
  }
});

test('H3: a clean shutdown frees the slot for a restart in the SAME process', async () => {
  const r = fixtureRoot('r3-inproc-restart');
  seedStore(r);

  const a = await startBridge({ r, port: 0, open: false, log: () => {} });
  a.shutdown();
  assert.equal(liveBridgeFor(r), null, 'shutdown must release the in-process slot');

  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const { status } = await getJson(b.url, '/api/status');
    assert.equal(status, 200, 'a restart after a clean shutdown must work');
  } finally {
    b.shutdown();
  }
});

test('H3: a FAILED start does not lock the process out of its own store', async () => {
  const r = fixtureRoot('r3-inproc-fail');
  seedStore(r);

  // Occupy a port so the bind fails after the slot was claimed.
  const squatter = createServer(() => {});
  await new Promise((res) => squatter.listen(0, '127.0.0.1', res));
  const taken = squatter.address().port;

  try {
    await assert.rejects(startBridge({ r, port: taken, open: false, log: () => {} }));
    // The failed attempt must have released BOTH guards.
    assert.equal(liveBridgeFor(r), null, 'a failed start must not leave the slot held');

    await new Promise((res) => squatter.close(res));
    const ok = await startBridge({ r, port: 0, open: false, log: () => {} });
    try {
      const { status } = await getJson(ok.url, '/api/status');
      assert.equal(status, 200, 'the store must be startable again after a failed bind');
    } finally { ok.shutdown(); }
  } finally {
    try { await new Promise((res) => squatter.close(res)); } catch { /* already closed */ }
  }
});

test('H3: concurrent starts in one process cannot both win', async () => {
  const r = fixtureRoot('r3-inproc-race');
  seedStore(r);

  // The pid file cannot stop this: both calls share one pid and are allowed to
  // re-claim. Only the synchronous registry claim can.
  const settled = await Promise.allSettled([
    startBridge({ r, port: 0, open: false, log: () => {} }),
    startBridge({ r, port: 0, open: false, log: () => {} }),
  ]);

  const wins = settled.filter((s) => s.status === 'fulfilled');
  const losses = settled.filter((s) => s.status === 'rejected');
  try {
    assert.equal(wins.length, 1, `exactly one start may win, got ${wins.length}`);
    assert.equal(losses.length, 1);
    assert.ok(losses[0].reason instanceof InstanceError);
  } finally {
    for (const w of wins) w.value.shutdown();
    resetBridgeRegistry();
  }
});
