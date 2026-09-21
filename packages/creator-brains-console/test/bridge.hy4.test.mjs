#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.test.mjs
 * PURPOSE: Regression tests for the HY4 independent hostile review's findings
 *          against the HTTP SURFACE — traversal, DNS rebinding, and the LANE B
 *          no-leak invariant.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE BUILDER'S SUITE.
 *
 * These are not tests the builder thought of. They are the specific defects an
 * INDEPENDENT reviewer found, and the reason they matter is the repo's own
 * recorded lesson: a builder's test suite encodes the builder's assumptions, so
 * it structurally cannot catch the defects that arise from those assumptions.
 * Keeping the reviewer's findings in their own file makes it visible forever
 * that the builder missed them — and if one of these tests is ever deleted, the
 * deletion is conspicuous.
 *
 * The findings are split by SUBJECT, because they are about three different
 * things and a 400-line file would violate the very rule H7 is about:
 *
 *   this file                          H3 traversal · H4 DNS rebinding · H5 leak
 *   bridge.hy4.process.test.mjs        H1 pid race · H2 listen-failure leak
 *   bridge.hy4.structure.test.mjs      H6 route allowlist · H7 the 300-line rule
 *
 * ---------------------------------------------------------------------------
 * HY4's VERDICT WAS **REVISE**. ALL SEVEN FINDINGS AND THEIR DISPOSITION:
 * ---------------------------------------------------------------------------
 *
 *   H1  P1  pid claim race (check-then-act) → concurrent bridges on one store
 *           FIXED: atomic exclusive create. Tests in the process file.
 *   H2  P1  listen failure leaves a live pid file, blocking every future start
 *           FIXED: release the slot when `listen` rejects. Process file.
 *   H3  P2  the traversal test (then T-B12, renumbered T-B24 in round 5 pass 5
 *           after an ID collision with the S7 snapshot row) was VACUOUS —
 *           `WEB_DIST` does not exist yet, so
 *           every request fell through to the status page and the containment
 *           logic never executed. A test that passes because its code path is
 *           unreachable is worse than no test: it reads as coverage.
 *           FIXED here, against a real temp webroot.
 *   H4  P2  DNS rebinding: a remote page can use Sean's own browser as a client
 *           against the loopback write API. FIXED by requiring the Host header
 *           to name loopback AND the exact bound port.
 *   H5  P2  T-B7 was a fixture grep; a leak under an unmapped field name would
 *           pass. FIXED by schema-level shape detection in test/leak-guard.mjs.
 *   H6  P2  Plan/contract declared routes S0 does not implement. Structure file.
 *   H7  P2  Files over the 300-line cap. Structure file.
 *
 * ---------------------------------------------------------------------------
 * THE MOST INSTRUCTIVE THING IN HERE IS NOT A PRODUCTION BUG
 * ---------------------------------------------------------------------------
 *
 * H4's two live attack tests originally used
 * `fetch(url, { headers: { host: 'evil.com' } })` and BOTH FAILED `200 !== 403`.
 * The bridge looked vulnerable. It was not.
 *
 * undici treats `host` as a FORBIDDEN HEADER NAME and silently substitutes the
 * real authority — verified directly (`probe-host.mjs`): a request sent that way
 * arrives with `Host: 127.0.0.1:<port>`, the legitimate value, which the bridge
 * correctly allows. The test could not construct its own attack.
 *
 * That is the worst possible failure shape for a security regression test, and
 * it was only visible because the test was RUN rather than reasoned about. The
 * fix was a raw `node:http.request` helper (`rawRequest`, in fixtures.mjs) that
 * puts the hostile value on the wire for real. Any future test that needs a
 * header the fetch spec protects must use it rather than reaching for `fetch`
 * and quietly testing nothing.
 *
 * @module creator-brains-console/test/bridge.hy4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { startBridge, hostAllowed } from '../server.mjs';
import { CH_ONE, CANARY_PHRASE, fixtureRoot, getJson, rawRequest } from './fixtures.mjs';
import { assertNoTranscriptFields } from './leak-guard.mjs';

// The H3 static-resolution tests (which need `resolveStatic`, `escapes`, `tempRoot`,
// `join`, and the fs helpers) moved to `bridge.hy4.static.test.mjs` when this file
// crossed the 300-line cap. The imports went with them rather than lingering unused.


/* ── H4 · DNS rebinding ─────────────────────────────────────────────────── */

test('HY4-H4: the Host check refuses a rebound (non-loopback) Host header', () => {
  // The unit-level contract, stated exhaustively enough to pin the edges.
  assert.equal(hostAllowed('127.0.0.1:5173', 5173), true);
  assert.equal(hostAllowed('localhost:5173', 5173), true);
  assert.equal(hostAllowed('127.0.0.1', null), true);
  assert.equal(hostAllowed('[::1]:5173', 5173), true);

  // The attack: a page that rebound its own hostname to 127.0.0.1.
  assert.equal(hostAllowed('evil.com', 5173), false, 'a rebound hostname must be refused');
  assert.equal(hostAllowed('evil.com:5173', 5173), false);
  assert.equal(hostAllowed('attacker.example:80', 5173), false);

  // Wrong port on the right host: another loopback service, not this bridge.
  assert.equal(hostAllowed('127.0.0.1:9999', 5173), false);
  // Absent Host (HTTP/1.0 style) is refused rather than waved through.
  assert.equal(hostAllowed(undefined, 5173), false);
  assert.equal(hostAllowed('', 5173), false);
  // A Host that merely CONTAINS a loopback name is not loopback — this is the
  // prefix-matching bug that a naive `includes`/`startsWith` check would have.
  assert.equal(hostAllowed('127.0.0.1.evil.com', 5173), false);
  assert.equal(hostAllowed('notlocalhost', 5173), false);
  assert.equal(hostAllowed('localhost.evil.com:5173', 5173), false);
});

test('HY4-H4 (ATTACK): a write with a rebound Host header cannot mutate the store', async () => {
  const r = fixtureRoot('hy4-rebind');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    // This MUST go through rawRequest: fetch silently rewrites a `host` header
    // to the real authority, so a fetch-based version of this test sends
    // `Host: 127.0.0.1:<port>`, is allowed, and reports a false vulnerability.
    const res = await rawRequest(b.url, `/api/creators/${CH_ONE}`, {
      method: 'PATCH',
      host: 'evil.com',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(res.status, 403, 'a rebound write must be refused');
    assert.equal(res.body.error.code, 'FORBIDDEN_HOST');

    // Prove the refusal actually PREVENTED the write, rather than just answering.
    const after = await getJson(b.url, '/api/creators');
    const row = after.body.find((c) => c.channelId === CH_ONE);
    assert.equal(row.enabled, true, 'the creator must still be enabled — the write never happened');
  } finally { await b.shutdown(); }
});

test('HY4-H4: a rebound READ is refused too, not only writes', async () => {
  // Reads leak the creator catalog, coverage and staleness. There is no reason
  // to serve those cross-origin either, and a uniform rule is harder to regress
  // than a rule applied to two handlers.
  const r = fixtureRoot('hy4-rebind-read');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const res = await rawRequest(b.url, '/api/status', { host: 'evil.com' });
    assert.equal(res.status, 403, 'the creator catalog is not for cross-origin consumption either');
  } finally { await b.shutdown(); }
});

test('HY4-H4: a legitimate loopback request still works after a refusal', async () => {
  // The counterweight. Without this, a "fix" that 403s everything would satisfy
  // both attack tests above while breaking the console completely.
  const r = fixtureRoot('hy4-rebind-ok');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const viaFetch = await getJson(b.url, '/api/creators');
    assert.equal(viaFetch.status, 200, 'the real launcher path (127.0.0.1:<port>) must work');

    const viaRaw = await rawRequest(b.url, '/api/creators', { host: `127.0.0.1:${b.port}` });
    assert.equal(viaRaw.status, 200, 'an explicit loopback Host with the bound port must work');

    const viaLocalhost = await rawRequest(b.url, '/api/creators', { host: `localhost:${b.port}` });
    assert.equal(viaLocalhost.status, 200, 'localhost is loopback and must work');

    // The wrong port on a loopback host is a DIFFERENT service's page rebinding
    // into this bridge — the same attack class, and it must be refused.
    const wrongPort = await rawRequest(b.url, '/api/creators', { host: '127.0.0.1:9' });
    assert.equal(wrongPort.status, 403, 'a loopback Host naming a different port is another service');
  } finally { await b.shutdown(); }
});

/* ── H5 · the LANE B invariant, asserted at the schema level ─────────────── */

test('HY4-H5 (INVARIANT): no response carries a transcript-text field', async () => {
  const r = fixtureRoot('hy4-shape');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    for (const path of [
      '/api/status', '/api/creators', '/api/run', '/api/canary', '/api/backlog',
      `/api/brains/${CH_ONE}`, '/api/query?q=anything',
    ]) {
      const { body } = await getJson(b.url, path);
      assertNoTranscriptFields(body, path);
    }
  } finally { await b.shutdown(); }
});

test('HY4-H5 (META): the detector fires on a real leak and spares real prose', () => {
  // A GUARD IS WORTHLESS IF IT CANNOT FAIL, and a guard that fires on
  // everything is worse than none. Both halves are asserted: the detector must
  // catch the engine's actual LANE B shape, and it must tolerate the engine's
  // own contract-pinned display strings — otherwise it would "pass" by
  // demanding that working capabilities be deleted.
  assert.throws(
    () => assertNoTranscriptFields({
      videoId: 'v1111111111',
      channelId: CH_ONE,
      segments: [{ tStartMs: 0, text: CANARY_PHRASE }],
    }),
    /container field/,
    "the engine's own LANE B document must be caught",
  );

  assert.throws(
    () => assertNoTranscriptFields({ items: [{ tStartMs: 0, text: 'a spoken line' }] }),
    /timed caption cues/,
    'cue rows renamed to an innocuous key must STILL be caught — shape, not words',
  );

  assert.throws(
    () => assertNoTranscriptFields(
      { note: { text: 'A whole paragraph of spoken content. It runs on. And on.' } },
    ),
    /transcript-scale text/,
    'a long prose value under `text` must be caught',
  );

  // The legitimate shapes this detector MUST tolerate.
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { throttle: { active: false, text: 'none — traffic is allowed' } },
  ), 'throttle.text is a contract-pinned display sentence, not a transcript');
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { lines: ['2 videos due now', '1 video in 4h'] },
  ), 'formatted backlog lines are prose, not cues');
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { hits: [{ keyPhrase: 'shadow lift', statement: 'shadow lift is a crutch', tStartMs: 30000 }] },
  ), 'a LANE C cited claim is the product and must pass');
});
