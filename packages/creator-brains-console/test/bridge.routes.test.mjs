#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.routes.test.mjs
 * PURPOSE: S0 exit evidence, part 2 — ROUTE BEHAVIOR. What each handler returns,
 *          and how it refuses.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * Behavioral companion to bridge.boundary.test.mjs. These tests assert the
 * data-truth contract of blueprint 05 §3: every value a panel will render comes
 * from the engine's own functions, so the console and the CLI cannot disagree
 * about the same store.
 *
 * The single-instance tests (T-B11) live here too rather than in the boundary
 * file: they are about lifecycle, and the failure they prevent — two writers
 * against one `registry.json` — is a state-safety property of the process, not
 * of the route surface.
 *
 * @module creator-brains-console/test/bridge.routes
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { startBridge, claimInstance, releaseInstance, InstanceError, pidPath, consoleDir } from '../server.mjs';
import { ApiError, CODE, validateRef, validateQuery, validatePerHour, validateChannelId } from '../api.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { mkdirSync } from 'node:fs';
import { CH_ONE, CH_TWO, fixtureRoot, getJson, rawRequest, withFixture } from './fixtures.mjs';

/* ── T-B1 · status shape ─────────────────────────────────────────────────── */

test('T-B1: GET /api/status returns the full status instrument', async () => {
  await withFixture('s0-status', async ({ base }) => {
    const { status, body } = await getJson(base, '/api/status');
    assert.equal(status, 200);
    for (const key of [
      'ytdlp', 'creators', 'state', 'budget', 'backlog', 'throttle',
      'census', 'lock', 'lastRun', 'lastGood', 'documents', 'publishedBrains', 'recentRuns',
    ]) {
      assert.ok(key in body, `status is missing '${key}'`);
    }
    assert.equal(body.creators.total, 2);
    assert.equal(body.creators.enabled, 1);
    assert.equal(body.creators.damaged, null);
    // Videos come from state.json through the engine's own summarize().
    assert.equal(body.state.videos.total, 3);
    assert.equal(body.state.videos.fetched, 2);
    assert.equal(typeof body.budget.perHour, 'number');
    // Engine-formatted truth, not client re-derivation (blueprint H6).
    assert.ok(Array.isArray(body.backlog.lines));
    assert.equal(typeof body.throttle.text, 'string');
    assert.equal(body.lastRun.status, 'completed');
    assert.equal(body.lastGood.at, '2026-09-16T00:00:00.000Z');
    assert.equal(body.lock.held, false);
    assert.equal(body.documents, 1, 'one private transcript counted, never read');
  });
});

test('T-B1: staleness is honest when no acquisition ever succeeded', async () => {
  const r = fixtureRoot('s0-stale');
  const { rmSync } = await import('node:fs');
  rmSync(join(r, 'last-success.json'), { force: true });
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const { body } = await getJson(b.url, '/api/status');
    assert.equal(body.lastGood, null, 'no last-success file must render as null, never a fabricated date');
    assert.equal(body.staleWarning, false, 'null staleness is not a warning — it is "never ran", reported as null');
  } finally { await b.shutdown(); }
});

/* ── T-B2 · creators shape ───────────────────────────────────────────────── */

test('T-B2: GET /api/creators returns per-creator video and fetched counts', async () => {
  await withFixture('s0-creators', async ({ base }) => {
    const { status, body } = await getJson(base, '/api/creators');
    assert.equal(status, 200);
    assert.equal(body.length, 2);

    const one = body.find((c) => c.channelId === CH_ONE);
    assert.equal(one.title, 'Fixture One');
    assert.equal(one.enabled, true);
    assert.equal(one.videos, 2, 'both fixture-one videos tracked');
    assert.equal(one.fetched, 1, 'one fetched');

    const two = body.find((c) => c.channelId === CH_TWO);
    assert.equal(two.enabled, false);
    assert.equal(two.videos, 1);
    assert.equal(two.fetched, 1);
  });
});

/* ── T-B3 · writes go through the engine ─────────────────────────────────── */

/*
 * These four used `fetch` with a bare `content-type`. That stopped working when
 * the A1-09 write gate landed (2026-09-20): every write now needs the fixed
 * custom header too, and `fetch` here did not send it — so all four got 403
 * FORBIDDEN_WRITE. The fix is not to hand-add a header at each call site (a test
 * that must remember to satisfy a gate will eventually forget) but to route
 * writes through `rawRequest`, which injects the gate headers for every write in
 * the suite. `bridge.writegate.test.mjs` owns the gate's own behaviour.
 */

test('T-B3: PATCH enable/disable mutates the registry through the engine setter', async () => {
  await withFixture('s0-write', async ({ base }) => {
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 200);
    const row = res.body;
    assert.equal(row.channelId, CH_TWO);
    assert.equal(row.enabled, true);
    assert.equal(row.videos, 1, 'the returned row carries real counts, same shape as the roster');

    const after = await getJson(base, '/api/creators');
    assert.equal(after.body.find((c) => c.channelId === CH_TWO).enabled, true);
  });
});

test('T-B3: POST adds a creator DISABLED (enabling stays a deliberate act)', async () => {
  await withFixture('s0-add', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST',
      body: JSON.stringify({ ref: 'UC' + 'z'.repeat(22) }),
    });
    // Either the engine accepts the ref (201) or refuses it by name (422).
    // What must NEVER happen is a 200 with enabled:true.
    assert.ok([201, 422].includes(res.status), `unexpected status ${res.status}`);
    if (res.status === 201) {
      assert.equal(res.body.enabled, false, 'a newly added creator must arrive DISABLED');
    } else {
      assert.equal(res.body.error.code, 'REFUSED');
    }
  });
});

test('T-B3: an unknown channel id is refused, not silently accepted', async () => {
  await withFixture('s0-bad-id', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators/not-a-channel', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION');
  });
});

test('T-B3: a non-boolean enabled flag is refused', async () => {
  await withFixture('s0-bad-bool', async ({ base }) => {
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: 'yes' }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION');
  });
});

/* ── T-B4 · query and brains ─────────────────────────────────────────────── */

test('T-B4: an empty query is refused rather than returning every claim', async () => {
  await withFixture('s0-query', async ({ base }) => {
    const res = await fetch(`${base}/api/query?q=`);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'VALIDATION');
  });
});

test('T-B4: a query longer than the documented bound is refused', async () => {
  await withFixture('s0-query-long', async ({ base }) => {
    const res = await fetch(`${base}/api/query?q=${'x'.repeat(301)}`);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'VALIDATION');
  });
});

test('T-B4: a missing published brain is a 404, not an empty document', async () => {
  await withFixture('s0-brain-404', async ({ base }) => {
    const res = await fetch(`${base}/api/brains/does-not-exist`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });
});

/* ── T-B11 · single instance ─────────────────────────────────────────────── */

test('T-B11: a second bridge refuses instead of sharing the store', async () => {
  const r = fixtureRoot('s0-single');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    assert.throws(
      () => claimInstance(r, { pid: process.pid + 999_999 }),
      (err) => err instanceof InstanceError && /already running \(pid \d+\)/.test(err.message),
      'a live pid file must refuse the second instance and name the holder',
    );
  } finally {
    await b.shutdown();
  }
});

test('T-B11: a STALE pid file is reclaimed rather than locking Sean out', async () => {
  const r = fixtureRoot('s0-stale-pid');
  mkdirSync(consoleDir(r), { recursive: true });
  writeFileSync(pidPath(r), '999999999', 'utf8');
  const pid = claimInstance(r, { pid: process.pid });
  assert.equal(pid, process.pid);
  releaseInstance(r, { pid });
});

/* ── T-B5 · pure validation units ────────────────────────────────────────── */

test('T-B5: validation helpers enforce the documented bounds', () => {
  assert.equal(validateRef('  @Someone  '), '@Someone');
  assert.throws(() => validateRef(''), (e) => e instanceof ApiError && e.code === CODE.VALIDATION);
  assert.throws(() => validateRef('x'.repeat(201)), (e) => e.code === CODE.VALIDATION);

  assert.equal(validateQuery('shadow lift'), 'shadow lift');
  assert.throws(() => validateQuery('   '), (e) => e.code === CODE.VALIDATION);
  assert.throws(() => validateQuery('y'.repeat(301)), (e) => e.code === CODE.VALIDATION);

  assert.equal(validatePerHour('20'), 20);
  assert.equal(validatePerHour(1), 1);
  assert.throws(() => validatePerHour('0'), (e) => e.code === CODE.VALIDATION);
  assert.throws(() => validatePerHour('2.5'), (e) => e.code === CODE.VALIDATION);
  assert.throws(() => validatePerHour('abc'), (e) => e.code === CODE.VALIDATION);

  assert.equal(validateChannelId('UCabcdef123'), 'UCabcdef123');
  assert.equal(
    validateChannelId(CH_ONE, [{ channelId: CH_ONE }]),
    CH_ONE,
    'an existing registry key is valid even if it does not match the UC… shape',
  );
  assert.throws(() => validateChannelId('nope'), (e) => e.code === CODE.VALIDATION);
});
