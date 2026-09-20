/*
 * R4-03 — THE SERVING ORIGIN IS CANONICALIZED, NOT ASSUMED CANONICAL
 * (Astra round 4, 2026-09-20).
 *
 * WHY THIS FILE EXISTS. R3-04 made the write gate compare the supplied `Origin`
 * against the origin the request was actually SERVED BY, and required BOTH to be
 * byte-equal to their own serialization. That requirement is right for the
 * supplied value — it is what refuses `http://user@h:1/p?q#f`, which `new URL`
 * parses happily and whose `.origin` silently drops the extra — but it was
 * applied to the serving value as well, and the serving value is built from a
 * Host header the Host gate has ALREADY approved.
 *
 * `hostAllowed` lowercases before comparing and accepts `127.0.0.1`,
 * `localhost` and `[::1]`. It therefore approves Host spellings that are not
 * canonical origins:
 *
 *     Host: LOCALHOST:8787   serializes to  http://localhost:8787   (case)
 *     Host: 127.0.0.1:80     serializes to  http://127.0.0.1        (default port)
 *
 * Interpolating those into `http://<Host>` produced a serving origin that failed
 * its own byte-equality check, so the gate answered 403 "cross-origin write" to a
 * request that was SAME-ORIGIN by construction. A valid write was refused for how
 * its Host was spelled.
 *
 * WHAT IS ASSERTED. The canonicalization table, the live write that used to fail,
 * and — most importantly — the two things the fix must NOT have loosened: a
 * non-canonical CLAIMED origin is still refused, and the cross-alias case
 * (`localhost` Host with a `127.0.0.1` Origin) is still refused. A fix for "too
 * strict" that widens the rule is a worse bug than the one it repairs.
 *
 * WHY THESE LIVE IN THEIR OWN FILE RATHER THAN BESIDE T-B26e2/T-B26f. Those tests
 * own the Origin rule and the new cases belong with them, but
 * `bridge.writegate.test.mjs` is at 288 lines against the repo's 300-line cap
 * (rule 4), so adding them there would mean either breaching the cap or deleting
 * an existing test to make room. The cap is kept and the cases sit here, at the
 * canonicalization seam — the concern this round introduced.
 *
 * @module creator-brains-console/test/bridge.origin.r4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { originAllowed, servingOriginFor, REQUIRED_HEADER, REQUIRED_MEDIA_TYPE } from '../lib/write-gate.mjs';
import { hostAllowed } from '../lib/http.mjs';
import { withFixture, rawRequest, CH_TWO } from './fixtures.mjs';

/** The headers a legitimate write client sends. */
const satisfied = (extra = {}) => ({
  'content-type': REQUIRED_MEDIA_TYPE, [REQUIRED_HEADER]: '1', ...extra,
});

/* ── R4-03a · the defect, on the live path ───────────────────────────────── */

test('R4-03a: a write from an APPROVED but non-canonical Host spelling is accepted', async () => {
  await withFixture('r403a', async ({ base, port }) => {
    // `LOCALHOST:<port>` is approved by `hostAllowed` (it lowercases before
    // comparing). A page served from that authority writes back to it, so Host
    // and Origin AGREE and this is a same-origin write. Before the fix the gate
    // serialized the Host only for the comparison and not for the expected value,
    // so it answered 403 cross-origin.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      host: `LOCALHOST:${port}`,
      headers: satisfied({ origin: `http://localhost:${port}` }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 200, 'an approved Host spelling must not make a same-origin write cross-origin');
    assert.equal(res.body.channelId, CH_TWO);
  });
});

test('R4-03e: the cross-alias write is STILL refused (the fix must not widen the rule)', async () => {
  await withFixture('r403e', async ({ base, port }) => {
    // The negative control for R4-03a, and the R3-04 finding itself: same socket,
    // same port, DIFFERENT origin. Canonicalizing the serving value must not
    // collapse these two — they serialize to different origins and a page served
    // by `localhost` may not write as `127.0.0.1`.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      host: `LOCALHOST:${port}`,
      headers: satisfied({ origin: `http://127.0.0.1:${port}` }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403, 'a different spelling is a different origin');
    assert.match(res.body.error.message, /cross-origin write/);
  });
});

/* ── R4-03b/c · the rule, as a table ─────────────────────────────────────── */

test('R4-03b: servingOriginFor canonicalizes an approved Host, and is total', () => {
  // Host case: approved by `hostAllowed`, and NOT a canonical origin as written.
  assert.equal(servingOriginFor('LOCALHOST:8787'), 'http://localhost:8787');
  assert.equal(servingOriginFor('LocalHost:8787'), 'http://localhost:8787');

  // A scheme-default port is dropped by serialization, so an explicit `:80` and
  // an omitted port are the SAME origin — which is what "an omitted port means
  // 80" means once the value is an origin rather than a string.
  assert.equal(servingOriginFor('127.0.0.1:80'), 'http://127.0.0.1');
  assert.equal(servingOriginFor('127.0.0.1'), 'http://127.0.0.1');

  // Non-default ports are preserved, and an IPv6 literal keeps its brackets.
  assert.equal(servingOriginFor('127.0.0.1:8787'), 'http://127.0.0.1:8787');
  assert.equal(servingOriginFor('[::1]:8787'), 'http://[::1]:8787');

  // TOTAL: absent or unparseable is `null`, which `writeGateFailure` turns into a
  // refusal. A throw here would be a dead bridge on the request path.
  for (const bad of [undefined, null, '', 42, {}, 'a b']) {
    assert.equal(servingOriginFor(bad), null, `${String(bad)} must not produce an origin`);
  }
});

test('R4-03c: canonicalizing the SERVING origin did not relax the CLAIMED one', () => {
  const serving = servingOriginFor('LOCALHOST:8787'); // http://localhost:8787

  // The asymmetry, stated as assertions. The serving value is derived from an
  // approved header and only has to BE an origin; the claimed value is
  // attacker-controlled and must already BE a serialized origin.
  assert.equal(originAllowed('http://localhost:8787', serving), true, 'the same origin is accepted');

  for (const bad of [
    'http://user@localhost:8787',   // R3-04: parses, and `.origin` drops the userinfo
    'http://localhost:8787/path',   // ...and the path
    'http://localhost:8787?q=1',    // ...and the query
    'http://localhost:8787#frag',   // ...and the fragment
    'HTTP://LOCALHOST:8787',        // not a serialized origin: scheme and host case
    'http://127.0.0.1:8787',        // cross-alias — the R3-04 finding
    'http://localhost:5173',        // R2-05: another port
    'https://localhost:8787',       // the bridge serves no TLS
    'http://localhost',             // :80 is not :8787
    'http://localhost.evil.example:8787',
    '', null, 'not a url',
  ]) {
    assert.equal(originAllowed(bad, serving), false, `${String(bad)} must still be refused`);
  }
});

/* ── R4-03d · an omitted Host port means 80 ──────────────────────────────── */

test('R4-03d: an omitted Host port means 80, and no other bound port accepts it', () => {
  // `http://127.0.0.1/` IS the origin `http://127.0.0.1:80`, so a Host of
  // `127.0.0.1` must be compared against 80 rather than refused outright. The
  // rule previously rejected a portless Host for EVERY bound port, which was a
  // refusal for a case that has a defined answer.
  assert.equal(hostAllowed('127.0.0.1', 80), true, 'an omitted port means 80');
  assert.equal(hostAllowed('localhost', 80), true);
  assert.equal(hostAllowed('127.0.0.1:80', 80), true, 'and it may be written explicitly');

  // THE DIRECTION OF THE CHANGE: this is a corrected comparison, not a
  // relaxation. Every other bound port still refuses a portless Host exactly as
  // it did before, so the case this rule exists for — another loopback service on
  // a different port — is untouched.
  for (const port of [8787, 5173, 1, 65535]) {
    assert.equal(hostAllowed('127.0.0.1', port), false, `a portless Host is not port ${port}`);
  }
  assert.equal(hostAllowed('127.0.0.1:8788', 8787), false, 'a neighbouring port is still refused');

  // And the loopback allowlist is unchanged.
  for (const host of ['evil.example', '127.0.0.1.evil.example', '0.0.0.0', '[::1]:8787']) {
    assert.equal(hostAllowed(host, 80), false, `${host} is not this bridge`);
  }
});
