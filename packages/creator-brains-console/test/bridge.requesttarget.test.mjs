/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.requesttarget.test.mjs
 * PURPOSE: T-B18 — a malformed request target is a 400, never a process death.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md, 05 §2 envelope)
 * SLICE: S0 hardening (round-4 hostile review, S1-H8)
 * ============================================================================
 *
 * THE DEFECT THIS PINS. `new URL(req.url, base)` is not total. `//`, `///`,
 * `//@`, `//:80`, `http://`, `http:///` and `https://` are protocol-relative or
 * scheme-only forms with no host, and each raises `TypeError ERR_INVALID_URL`.
 * The bridge ran that parse OUTSIDE its try block, so the throw escaped the
 * request handler — and Node turns an uncaught throw there into a PROCESS EXIT.
 *
 * Measured 2026-09-18 against a real child process: `GET // HTTP/1.1` →
 * bridge exited with code 1, client saw ECONNRESET and no response at all. One
 * malformed line was a remote denial of service on the console.
 *
 * WHY THESE TESTS USE A RAW SOCKET. `fetch` and `node:http.request` both parse
 * the target into a URL before writing it, which normalizes every malformed
 * form away — a test written with either would have passed against the broken
 * code. `rawRequestLine` in fixtures.mjs exists for exactly this.
 *
 * @module creator-brains-console/test/bridge.requesttarget
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createBridge } from '../server.mjs';
import { parseRequestUrl } from '../lib/http.mjs';
import { ApiError, CODE } from '../lib/errors.mjs';
import { fixtureRoot, rawRequest, rawRequestLine } from './fixtures.mjs';

/** Every target measured to kill the bridge before the fix. */
const HOSTILE_TARGETS = ['//', '///', '////', '//@', '//:80', 'http://', 'http:///', 'https://'];

async function boot(t, label) {
  const r = fixtureRoot(label);
  const bridge = createBridge({ r, log: () => {}, port: null });
  await new Promise((res) => bridge.listen(0, '127.0.0.1', res));
  t.after(() => bridge.close());
  return `http://127.0.0.1:${bridge.address().port}`;
}

test('T-B18a: every malformed target answers 400 and the bridge survives all of them', async (t) => {
  const base = await boot(t, 't-b18a');

  const wrong = [];
  for (const target of HOSTILE_TARGETS) {
    const res = await rawRequestLine(base, `GET ${target} HTTP/1.1`);
    if (res.status !== 400 || !/VALIDATION/.test(res.text)) {
      wrong.push(`GET ${target} -> ${res.status ?? res.error} ${res.text.slice(0, 60)}`);
    }
  }
  assert.deepEqual(wrong, [], `these targets were not answered as 400 VALIDATION:\n${wrong.join('\n')}`);

  // The load-bearing assertion. If any of the above had thrown out of the
  // handler, this process would already be gone and the suite would have died
  // before reaching here — but assert it explicitly so the intent is on record.
  const alive = await rawRequest(base, '/api/canary');
  assert.equal(alive.status, 200, 'the bridge must still be serving after every malformed target');
});

test('T-B18b: the Host gate still runs BEFORE the target is parsed', async (t) => {
  const base = await boot(t, 't-b18b');

  // Ordering is load-bearing: the DNS-rebinding defence must refuse a hostile
  // Host without the parser ever seeing the target. If the parse moved above the
  // gate, a rebound page could reach it — and a 403 is the only correct answer.
  const res = await rawRequestLine(base, 'GET // HTTP/1.1', { host: 'evil.com' });
  assert.equal(res.status, 403, `expected FORBIDDEN_HOST, got ${res.status ?? res.error}`);
  assert.match(res.text, /FORBIDDEN_HOST/);
});

test('T-B18c: parseRequestUrl is total for good targets and TYPED for bad ones', () => {
  assert.equal(parseRequestUrl('/api/status').pathname, '/api/status');
  assert.equal(parseRequestUrl('/api/query?q=a+b').searchParams.get('q'), 'a b');
  assert.equal(parseRequestUrl('/').pathname, '/');

  for (const bad of HOSTILE_TARGETS) {
    assert.throws(
      () => parseRequestUrl(bad),
      (err) => err instanceof ApiError && err.code === CODE.VALIDATION,
      `${bad} must raise ApiError(VALIDATION), not a raw TypeError`,
    );
  }

  // The echoed target is attacker-controlled and unbounded — it must be clipped.
  // (`//` + padding PARSES as a protocol-relative host, so the long sample has to
  // be an actually-invalid form: `//:xxxx` is an empty host with a junk port.)
  const huge = `//:${'x'.repeat(5000)}`;
  assert.throws(() => parseRequestUrl(huge), (err) => err.message.length < 200);
});
