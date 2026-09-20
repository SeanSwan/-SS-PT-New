#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/test/bridge.boundary.test.mjs
 * PURPOSE: S0 exit evidence, part 1 — the BOUNDARY and CONTRACT tests. What the
 *          bridge must never expose, and what shape it must always return.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * These are the tests that guard properties rather than features. Their failure
 * modes are the ones that hurt:
 *
 *   T-B7  LANE B leaking. The bridge fronts a store whose `docs/` directory holds
 *         the owner's private transcript text. The console renders published
 *         CLAIMS. This test is what keeps that true as the route table grows.
 *   T-B8  a `restore` / `rollback` / `authorize` route appearing later. Those are
 *         T3/T4 and stay human-CLI-gated. Absence is a requirement, so absence
 *         gets an assertion — an omission from a route table is invisible to
 *         review, a failing test is not.
 *   T-B9  a raw stack trace reaching the browser instead of a named refusal.
 *   T-B11 two bridges writing one store.
 *   T-B6  binding to anything but loopback.
 *
 * Behavior tests live in bridge.routes.test.mjs.
 *
 * @module creator-brains/console/test/bridge.boundary
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { startBridge, HOST } from '../server.mjs';
import {
  BRAIN_NS, CANARY_PHRASE, CH_ONE, VID_1, fixtureRoot, getJson, getRaw, rawRequestLine, seedPublishedBrain, withFixture,
} from './fixtures.mjs';

/*
 * `withFixture` lives in `fixtures.mjs`, NOT here. It was exported from this
 * file until 2026-09-19, and because importing a module that calls `test(...)`
 * registers its tests, every importer re-ran this whole suite (S1-H13). A
 * harness is not a test — see the note on `withFixture` in fixtures.mjs.
 */

/* ── T-B6 · loopback only ────────────────────────────────────────────────── */

test('T-B6: the bridge binds loopback and nothing else', async () => {
  assert.equal(HOST, '127.0.0.1', 'HOST must be the loopback constant, never a parameter');
  await withFixture('s0-loopback', async ({ base }) => {
    const res = await fetch(`${base}/api/creators`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));
    assert.equal(res.headers.get('cache-control'), 'no-store',
      'a cached store view would show a stale roster after a write');
  });
});

/* ── T-B7 · the LANE B no-leak invariant ─────────────────────────────────── */

test('T-B7 (INVARIANT): no route exposes owner-private transcript text', async () => {
  await withFixture('s0-leak', async ({ r, base }) => {
    // A PUBLISHED brain must exist, or every `/api/brains/*` probe below hits the
    // 404 branch and the route's live path is never swept (S1-H16).
    seedPublishedBrain(r);

    const surface = [
      '/api/status', '/api/creators', '/api/run', '/api/canary', '/api/backlog',
      // Query routes chosen to hit words that ONLY exist in the transcript.
      '/api/query?q=hydraulic', '/api/query?q=manifold',
      `/api/brains/${CH_ONE}`, '/api/brains/nonexistent',
      // Round-5 pass 2: the two parameters that reach the store by OPPOSITE
      // routes — `:slug` arrives un-decoded, `?creator=` arrives decoded — plus
      // the live published namespace, so the sweep covers the 200 path too.
      `/api/brains/${BRAIN_NS}`,
      '/api/brains/%2e%2e%2f%2e%2e%2fregistry.json',
      `/api/brains/..%2F..%2Fdocs%2F${CH_ONE}%2F${VID_1}.json`,
      '/api/brains/..%5C..%5Cregistry.json',
      `/api/query?q=fixture&creator=..%2F..%2Fdocs%2F${CH_ONE}`,
      `/api/query?q=fixture&creator=${encodeURIComponent(`../../docs/${CH_ONE}`)}`,
      '/api/restore', '/api/rollback', '/api/authorize', '/',
    ];
    for (const path of surface) {
      const { text } = await getRaw(base, path);
      assert.ok(
        !text.includes(CANARY_PHRASE),
        `LANE B LEAK: '${path}' served owner-private transcript text`,
      );
      assert.ok(
        !text.includes('hydraulic manifold'),
        `LANE B LEAK (fragment) on '${path}'`,
      );
    }
  });
});

/* ── T-B8 · dangerous operations have no route ───────────────────────────── */

test('T-B8: restore / rollback / authorize have NO route (T3/T4 stay CLI-only)', async () => {
  await withFixture('s0-absent', async ({ base }) => {
    const dangerous = [
      ['GET', '/api/restore'], ['POST', '/api/restore'],
      ['GET', '/api/rollback'], ['POST', '/api/rollback'],
      ['GET', '/api/authorize'], ['POST', '/api/authorize'],
      ['GET', '/api/verify-backup'],
    ];
    for (const [method, path] of dangerous) {
      const res = await fetch(base + path, { method });
      assert.equal(res.status, 404, `${method} ${path} must not exist`);
      assert.equal((await res.json()).error.code, 'NOT_FOUND');
    }
  });
});

/* ── T-B9 · error envelope on a damaged store ────────────────────────────── */

test('T-B9: a damaged registry.json produces a named envelope, not a stack trace', async () => {
  const r = fixtureRoot('s0-damaged');
  writeFileSync(join(r, 'registry.json'), '{ this is not json', 'utf8');

  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const { status, body } = await getJson(b.url, '/api/creators');
    assert.equal(status, 409, 'a damaged store is a conflict, not a 500');
    assert.equal(body.error.code, 'STORE_DAMAGED');
    assert.equal(body.error.file, 'registry.json');
    assert.ok(body.error.message.length > 0);
    assert.ok(
      !/at .*\.mjs:\d+/.test(JSON.stringify(body)),
      'no stack frames may reach the client',
    );

    // Status must still ANSWER, naming the damage — a console that refuses to
    // load at all tells the operator less than one that names the broken file.
    const st = await getJson(b.url, '/api/status');
    assert.equal(st.status, 200);
    assert.notEqual(st.body.creators.damaged, null);
    assert.equal(
      st.body.creators.total, 0,
      'a damaged registry must not render as an empty catalog that looks real',
    );
  } finally { b.shutdown(); }
});

/* ── T-B24 · static traversal ────────────────────────────────────────────── */

/*
 * ID COLLISION, FIXED (S1-H21, round 5 pass 5). This test was called `T-B12`,
 * but `06-test-plan.md:26` reserves **T-B12 for the S7 snapshot verification**
 * (per-file SHA-256s vs the recorded manifest, mapped to R15) — and
 * `readiness.json` carries a `T-B12` row for exactly that, status NOT RUN. Two
 * unrelated tests under one ID is a traceability defect: the gate's row and the
 * code's test agreed on a name and on nothing else, and the traversal property
 * was traced to no requirement at all. Renumbered to the next free ID, which is
 * T-B24, and traced to R13 with T-B23.
 */
test('T-B24: a traversal target is collapsed before dispatch, and reaches nothing', async () => {
  // S1-H20 (round 5, pass 5). This test was VACUOUS for two independent reasons,
  // both measured:
  //
  //   1. It used `getRaw`, which is `fetch` — and `fetch` builds a `URL`, which
  //      normalises `/../` away CLIENT-SIDE. `GET /../registry.json` left this
  //      process as `GET /registry.json`. The test could not construct its own
  //      attack, which is the same trap the `rawRequest` docstring in
  //      fixtures.mjs records for forbidden headers. It now sends a raw request
  //      line, which is the only way a `..` reaches the wire.
  //   2. Its assertion was `!text.includes(CH_ONE)` against paths that resolve to
  //      files which do not exist beside `web/dist`. A missing file gets
  //      `200` + the bridge page (server.mjs:165), and the bridge page contains no
  //      channel id, so ANY 404 satisfied it.
  //
  // WHAT THIS NOW ESTABLISHES, EXACTLY. That a traversal target is
  // indistinguishable from its normalised equivalent at the live server, and that
  // neither reaches the store. It is deliberately NOT claimed as a mutation-
  // observable guard: the static path is defended by THREE mutually redundant
  // layers — `new URL` normalisation in `parseRequestUrl`, `normalize()` in
  // `resolveStatic`, and that function's containment check — and no single one of
  // them can be broken alone without the other two compensating. Measured:
  // removing the containment check leaves 105/105 green; removing BOTH resolver
  // guards also leaves this test green (the `new URL` collapse already removed the
  // `..`). The resolver-level property, where the guards are actually reachable,
  // is pinned by HY4-H3 against a real document root — and HY4-H3 DOES fail when
  // both resolver guards are removed. This test's job is the live-server half.
  await withFixture('s0-traversal', async ({ base }) => {
    for (const path of [
      '/../registry.json',
      '/..%2Fregistry.json',
      '/%2e%2e/registry.json',
      '/../../../../etc/passwd',
      '/../package.json', // a file that genuinely EXISTS beside dist
    ]) {
      const attacked = await rawRequestLine(base, `GET ${path} HTTP/1.1`);
      // The equivalent target as URL parsing alone would produce it — which is
      // the invariant being asserted, so it is derived rather than hand-written.
      const plain = await rawRequestLine(base, `GET ${new URL(path, 'http://127.0.0.1').pathname} HTTP/1.1`);

      assert.ok(!attacked.text.includes(CH_ONE), `traversal '${path}' must not reach the store`);
      // The collapse is the live-server defence. If the path were ever dispatched
      // un-normalised, these two would differ.
      assert.equal(
        attacked.text,
        plain.text,
        `'${path}' must be collapsed by URL parsing before dispatch`,
      );
    }
  });
});

/* ── T-B13 · construction is side-effect free ────────────────────────────── */

test('T-B13: the module does not bind a port on import', async () => {
  const { createBridge } = await import('../server.mjs');
  const r = fixtureRoot('s0-nolisten');
  const server = createBridge({ r });
  assert.equal(server.listening, false, 'construction must not bind a port');
  await new Promise((res) => server.close(res));
});
