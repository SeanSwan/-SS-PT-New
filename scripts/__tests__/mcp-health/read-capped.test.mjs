/**
 * read-capped.test.mjs — the bounded response read.
 * Run: node --test scripts/__tests__/mcp-health/read-capped.test.mjs
 *
 * WHY THIS FILE EXISTS SEPARATELY: these four tests lived in `check-mcp-health.test.mjs`, which
 * carried them past the 300-line cap (Rule 4). They test a DIFFERENT module than that file's
 * subject, so the split is doctrinally free — and it gives `lib/read-capped.mjs` the co-located
 * test file its own extraction already earned (Kimi round 16, L1).
 *
 * The contract under test: the read is bounded in MEMORY, not merely in time. `await r.text()`
 * buffers the entire body before slicing, so a fast enough stream can buffer gigabytes inside a
 * 15s timeout. `readCapped` stops at the cap and CANCELS rather than draining.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readCapped } from '../../lib/read-capped.mjs';

test('REGRESSION: a null-body status returns zero bytes instead of throwing', () => {
  // 101/204/205/304 have `body === null` per the fetch spec. A previous version asserted a stream
  // ALWAYS exists and threw here, so a server answering 204 to `initialize` reported UNREACHABLE
  // despite having been reached. A null body is zero bytes — bounded by definition, not a fallback.
  return readCapped({ body: null }, 1024).then((r) => {
    assert.deepEqual(r, { text: '', bytes: 0, truncated: false });
  });
});

test('a genuinely stream-less runtime throws rather than buffering', async () => {
  // The one case that SHOULD throw: a body object with no getReader. Throwing keeps the bound
  // unconditional; silently falling back to .text() is the unbounded defect this replaced.
  await assert.rejects(() => readCapped({ body: {} }, 1024), /web streams/);
});

test('a body under the cap is returned whole and not marked truncated', async () => {
  const body = 'hello world';
  const stream = { getReader: () => { let sent = false; return {
    read: async () => (sent ? { done: true } : (sent = true, { done: false, value: Buffer.from(body) })),
    cancel: async () => {},
  }; } };
  const r = await readCapped({ body: stream }, 1024);
  assert.equal(r.text, body);
  assert.equal(r.bytes, body.length);
  assert.equal(r.truncated, false);
});

// `timeout` matters here: this test feeds an INFINITE stream, so a regression in the cap check
// does not fail — it HANGS. node:test has no default timeout, so the suite would stall rather than
// go red, and a stuck runner reads as "still working" in CI. 5s is ~100x the passing runtime, which
// turns a cap regression into a fast, explicit failure (Kimi round 9, N1).
test('a body over the cap is truncated, reported as such, and the stream is cancelled', { timeout: 5000 }, async () => {
  let cancelled = false;
  const chunk = Buffer.alloc(64, 0x61); // 'a' * 64
  const stream = { getReader: () => ({
    read: async () => ({ done: false, value: chunk }), // infinite — the cap must stop it
    cancel: async () => { cancelled = true; },
  }) };
  const r = await readCapped({ body: stream }, 100);
  assert.equal(r.truncated, true);
  assert.equal(r.text.length, 100, 'text must be clamped to the cap');
  assert.ok(r.bytes > 100, 'bytes reports what was actually read');
  assert.ok(cancelled, 'the stream must be cancelled, not drained');
});
