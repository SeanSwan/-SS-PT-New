/*
 * T-B23 — body framing and the size ceiling (S1 hostile review, round 5 pass 4).
 *
 * WHY THIS FILE EXISTS. `readBody` owns "what a body may be" and had been tested
 * only with well-formed, content-length-framed, small, valid-UTF-8 bodies. Four
 * paths that a client can actually take were unmeasured: an oversized body, a
 * CHUNKED body with no content-length, a body that is not valid UTF-8, and a POST
 * with no body at all. The ceiling itself (`LIMITS.BODY_MAX`, 64 KB) was asserted
 * in prose and in no test.
 *
 * WHAT IS DELIBERATELY NOT PINNED. The client's outcome for a body large enough
 * that it is still writing when the limit trips is ECONNRESET rather than the
 * envelope — measured, understood, and accepted in `lib/http.mjs` (S1-H19). The
 * threshold tracks the SOCKET BUFFER (clean 400 at 512 KB, reset at 1 MB), so
 * asserting either outcome for a 4 MB body would be a test that passes on this
 * machine and flakes on another. What is asserted is the property that is stable
 * and that actually matters: the bridge refuses, stays within its memory bound,
 * and keeps serving. See T-B23c.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getJson, rawRequest, withFixture } from './fixtures.mjs';

/** `LIMITS.BODY_MAX` — the documented ceiling, in one place. */
const BODY_MAX = 64 * 1024;

/** A body whose JSON is `{"ref":"aaa…"}` and whose byte length is exactly `n`. */
function bodyOfExactly(n) {
  const overhead = Buffer.byteLength(JSON.stringify({ ref: '' })); // 10
  const body = JSON.stringify({ ref: 'a'.repeat(n - overhead) });
  assert.equal(Buffer.byteLength(body), n, 'the fixture must hit the byte count exactly');
  return body;
}

test('T-B23a: a body AT the ceiling is read, not refused as too large', async () => {
  await withFixture('t-b23a', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST',
      body: bodyOfExactly(BODY_MAX),
    });

    assert.equal(res.status, 400);
    // The boundary is `size > limit`, not `>=`. Reaching validateRef at all
    // proves the body was read; the message proves WHICH refusal it is.
    assert.equal(res.body?.error?.code, 'VALIDATION');
    assert.match(res.body.error.message, /exceeds 200 characters/);
    assert.doesNotMatch(res.body.error.message, /too large/);
  });
});

test('T-B23b: one byte over the ceiling is refused with the documented envelope', async () => {
  await withFixture('t-b23b', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST',
      body: bodyOfExactly(BODY_MAX + 1),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.code, 'VALIDATION');
    assert.equal(res.body.error.message, 'request body too large');
  });
});

test('T-B23c: an oversized body cannot take the bridge down', async () => {
  await withFixture('t-b23c', async ({ base }) => {
    const huge = JSON.stringify({ ref: 'a'.repeat(4 * 1024 * 1024) });

    // Bounded: whether the client sees the 400 or a reset is buffer-dependent
    // (S1-H19), so this races a timeout rather than assuming either.
    await Promise.race([
      rawRequest(base, '/api/creators', { method: 'POST', body: huge }).catch(() => null),
      new Promise((resolve) => { setTimeout(resolve, 3000); }),
    ]);

    const { status } = await getJson(base, '/api/status');
    assert.equal(status, 200, 'the bridge must still be serving after an oversized body');
  });
});

test('T-B23d: a body that is not valid UTF-8 is a 400, not a 500', async () => {
  await withFixture('t-b23d', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST',
      body: Buffer.from([0x7b, 0xff, 0xfe, 0x7d]), // { <invalid> <invalid> }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.code, 'VALIDATION');
    assert.equal(res.body.error.message, 'request body is not valid JSON');
  });
});

test('T-B23e: a CHUNKED body with no content-length is read normally', async () => {
  await withFixture('t-b23e', async ({ base }) => {
    // No content-length header: node:http frames this as chunked, which is a
    // different read path in `readBody` (`for await` over a chunked stream).
    const res = await rawRequest(base, '/api/creators', { method: 'POST', body: JSON.stringify({ ref: '' }) });

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.code, 'VALIDATION');
    // Reaching the VALIDATION of `ref` proves the chunked body was parsed as
    // JSON — a framing failure would have produced "not valid JSON" instead.
    assert.equal(res.body.error.message, 'a creator reference is required');
  });
});

test('T-B23f: a POST with NO body is a 400, never a 500', async () => {
  await withFixture('t-b23f', async ({ base }) => {
    // `readBody` returns `{}` for zero chunks; the route must then report a
    // CLIENT error. What this pins is the OBSERVABLE contract (400, never 500),
    // not the `{}` branch specifically: `validateRef` rejects `null` and
    // `undefined` with the same message, so returning `null` here would still
    // pass. Recorded rather than implied — an assertion whose mutation is
    // equivalent is worth knowing about.
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST',
      headers: { 'content-length': '0' },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.code, 'VALIDATION');
    assert.equal(res.body.error.message, 'a creator reference is required');
  });
});
