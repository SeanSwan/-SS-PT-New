/*
 * T-B26 — the SAME-ORIGIN WRITE GATE (A1-09, Astra adjudication 2026-09-20).
 *
 * WHY THIS FILE EXISTS. The packet treated "binds loopback + checks Host" as the
 * complete trust boundary. It is not. `hostAllowed` stops DNS REBINDING — a page
 * whose hostname re-resolves to 127.0.0.1 after load. It does nothing about the
 * simpler attack the review actually named:
 *
 *   A remote page that already knows the bridge is on 127.0.0.1:<port> POSTs to
 *   it directly. The browser supplies `Host: 127.0.0.1:<port>` itself, so the
 *   Host gate passes; and a `Content-Type: text/plain` body is a CORS "simple
 *   request", so no preflight is sent. The write lands.
 *
 * A1-09's own correction text asked for exactly one test: "Test a foreign page
 * sending a simple `text/plain` request to the loopback URL." That is T-B26a.
 *
 * THE GATE'S THIRD DEFECT, FOUND BY BUILDING THE CLIENT. The first draft of the
 * gate required the custom header, and the console's own web adapter did not
 * send it — so the fix would have refused every write the app makes. Six
 * existing tests failed on contact, which is what caught it. T-B26k exists so
 * the two sides cannot drift apart silently again: the adapter lives under
 * `web/src`, which may not import this module (T-W2), so the header string is
 * duplicated and asserted equal here.
 *
 * @module creator-brains-console/test/bridge.writegate
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { originAllowed, writeGateFailure, REQUIRED_HEADER, REQUIRED_MEDIA_TYPE } from '../lib/write-gate.mjs';
import { withFixture, rawRequest, CH_TWO } from './fixtures.mjs';

/** The headers a legitimate write client sends. `gate:false` plus these is a valid write. */
const satisfied = (extra = {}) => ({ 'content-type': REQUIRED_MEDIA_TYPE, [REQUIRED_HEADER]: '1', ...extra });

/* ── T-B26a/b · the attack, and the header that de-simplifies it ─────────── */

test('T-B26a: a foreign page sending a simple text/plain POST is refused', async () => {
  await withFixture('t-b22a', async ({ base }) => {
    // Exactly the A1-09 attack: no custom header, a "simple" media type, so the
    // browser would have sent no preflight at all.
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST', gate: false,
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ ref: 'UC' + 'z'.repeat(22) }),
    });
    assert.equal(res.status, 403, 'a simple cross-site write must not reach the route table');
    assert.equal(res.body.error.code, 'FORBIDDEN_WRITE');
  });
});

test('T-B26b: a JSON write with no custom header is refused', async () => {
  await withFixture('t-b22b', async ({ base }) => {
    // Content-type alone is not enough — that is the "does not rest on one
    // property" requirement. A fetch() with a JSON body is trivially written by
    // any page; a custom header is not, because it forces a preflight.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: { 'content-type': REQUIRED_MEDIA_TYPE },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /must carry the x-console-write header/);
  });
});

test('T-B26b2: a non-JSON media type is refused even when the header is present', async () => {
  await withFixture('t-b22b2', async ({ base }) => {
    const body = JSON.stringify({ enabled: true });
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false, body,
      headers: {
        'content-type': 'text/plain',
        [REQUIRED_HEADER]: '1',
        // Pinned rather than left to node's chunked default, so this asserts the
        // media rule and not the body-detection heuristic.
        'content-length': String(Buffer.byteLength(body)),
      },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /must be application\/json/);
  });
});

/* ── T-B26c/e · the Origin rule ──────────────────────────────────────────── */

test('T-B26c: a remote Origin is refused even with the header and media type satisfied', async () => {
  await withFixture('t-b22c', async ({ base }) => {
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: satisfied({ origin: 'https://evil.example' }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403, 'Origin is the requirement that actually refuses a browser write');
    assert.match(res.body.error.message, /cross-origin write/);
  });
});

test('T-B26e: a loopback Origin on ANOTHER port is refused (R2-05)', async () => {
  await withFixture('t-b22e', async ({ base }) => {
    // THIS TEST USED TO ASSERT THE OPPOSITE, and the inversion is the finding.
    // It accepted `http://localhost:5173` on the argument that refusing it would
    // break the Vite dev server. That argument was wrong twice over: the write
    // carries a custom header, so a cross-origin attempt triggers a preflight the
    // bridge never approves (no CORS permission is ever granted), and
    // `vite.config.ts` has no proxy — so a dev-server write never reaches the
    // bridge anyway. The old rule therefore refused nobody legitimate while
    // admitting every local origin, including a hostile local page. Astra round 2
    // found it (R2-05); the probe that found it used this exact origin.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: satisfied({ origin: 'http://localhost:5173' }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403, 'another port is another origin, whatever the host resolves to');
    assert.match(res.body.error.message, /cross-origin write/);
  });
});

test('T-B26e2: the origin the request was SERVED BY is accepted, and nothing else', async () => {
  await withFixture('t-b22e2', async ({ base, port }) => {
    // The positive control for T-B26e: the rule must not be "refuse everything",
    // which would pass the test above and break the app.
    //
    // R3-04 INVERTED THIS TEST'S SECOND HALF. It used to loop over BOTH loopback
    // spellings and expect 200 from each — and that loop is what encoded the
    // socket-alias allowlist. `localhost` and `127.0.0.1` are DIFFERENT origins.
    // What is true, and what a browser actually does, is that a page writes back
    // to the authority it was served by: `LocalEngineAdapter.ts:46` defaults
    // `baseUrl` to `window.location.origin`, so Host and Origin agree.
    const send = (host, origin) => rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false, host,
      headers: satisfied({ origin }),
      body: JSON.stringify({ enabled: true }),
    });

    const own = await send(`127.0.0.1:${port}`, `http://127.0.0.1:${port}`);
    assert.equal(own.status, 200, 'the origin this request was served by IS this bridge\'s origin');

    // CROSS-ALIAS: same socket, same port, different origin — the case the alias
    // table admitted and exact equality refuses.
    const cross = await send(`localhost:${port}`, `http://127.0.0.1:${port}`);
    assert.equal(cross.status, 403, 'a different spelling is a different origin');

    // ...but the SAME spelling still writes, so the refusal above is about the
    // MISMATCH and not about the word `localhost`.
    const alias = await send(`localhost:${port}`, `http://localhost:${port}`);
    assert.equal(alias.status, 200, 'a page served by localhost writes back to localhost');
  });
});

test('T-B26f: originAllowed requires EXACT equality with the serving origin (R2-05, R3-04)', () => {
  const serving = 'http://127.0.0.1:8787';

  // Exactly the origin the request was served by, and nothing else.
  assert.equal(originAllowed('http://127.0.0.1:8787', serving), true, 'the serving origin is accepted');

  // The defect, one case per way to be a different origin.
  for (const bad of [
    'http://localhost:8787',      // R3-04: same socket, DIFFERENT origin — no alias table
    'HTTP://LOCALHOST:8787',      // not already a serialized origin (scheme/host case)
    'http://localhost:5173',      // R2-05 itself: loopback host, another port
    'http://127.0.0.1:8788',      // one port over
    'http://127.0.0.1',           // no port => :80, which is not 8787
    'http://[::1]:8787',          // a DIFFERENT socket — the bridge binds 127.0.0.1 only
    'https://127.0.0.1:8787',     // wrong scheme; the bridge serves no TLS
    // R3-04: `new URL` parses all four of these and `.origin` drops the extra, so
    // a normalised-field comparison accepts a value no browser ever sends.
    'http://127.0.0.1:8787/path',
    'http://user@127.0.0.1:8787',
    'http://127.0.0.1:8787?q=1',
    'http://127.0.0.1:8787#frag',
    'https://evil.example',
    'http://127.0.0.1.evil.example:8787',
    'http://localhost.evil.example:8787',
    'http://0.0.0.0:8787',
    '', null, 'null', 'not a url',
  ]) {
    assert.equal(originAllowed(bad, serving), false, `${String(bad)} is not this bridge's origin`);
  }

  // A caller that cannot supply the serving origin gets a refusal, not a pass.
  for (const noServing of [undefined, null, '', 42]) {
    assert.equal(
      originAllowed('http://127.0.0.1:8787', noServing), false,
      'a rule whose right-hand side is missing must fail closed',
    );
  }
});

/* ── T-B26g · the property that makes the preflight fail ─────────────────── */

test('T-B26g: no response ever carries access-control-allow-origin', async () => {
  await withFixture('t-b22g', async ({ base }) => {
    const responses = [
      await rawRequest(base, '/api/creators', { method: 'GET' }),
      await rawRequest(base, '/api/creators', { method: 'POST', gate: false, headers: { 'content-type': 'text/plain' }, body: 'x' }),
      await rawRequest(base, '/api/creators', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }),
      await rawRequest(base, '/api/creators', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ ref: 'x' }) }),
    ];
    for (const res of responses) {
      assert.equal(res.headers['access-control-allow-origin'], undefined,
        'granting CORS here would make the preflight succeed and the gate pointless');
    }
  });
});

/* ── T-B26h/i/j · the gate must not refuse a legitimate client ───────────── */

test('T-B26h: a bodyless DELETE passes on the header alone', async () => {
  await withFixture('t-b22h', async ({ base }) => {
    // A bodyless DELETE has no natural media type. Requiring one would make the
    // gate unsatisfiable by a legitimate client — the exact defect class this
    // whole review hunts. It must therefore reach the route table (404: no such
    // route) rather than being refused by the gate (403).
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'DELETE', gate: false, headers: { [REQUIRED_HEADER]: '1' },
    });
    assert.equal(res.status, 404, 'the gate must not be the thing that refused this');
  });
});

test('T-B26i: reads are unaffected by the gate', async () => {
  await withFixture('t-b22i', async ({ base }) => {
    // A media-type rule on GET would break the address bar.
    const res = await rawRequest(base, '/api/creators', { method: 'GET', gate: false });
    assert.equal(res.status, 200);
    const preflight = await rawRequest(base, '/api/status', { method: 'HEAD', gate: false });
    assert.notEqual(preflight.status, 403);
  });
});

test('T-B26j: a satisfied gate still reaches the route — validation is unchanged', async () => {
  await withFixture('t-b22j', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators/not-a-channel', {
      method: 'PATCH', body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 400, 'the gate must be transparent to a well-formed client');
    assert.equal(res.body.error.code, 'VALIDATION');
  });
});

test('T-B26l: non-write methods are never gated (unit)', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'TRACE']) {
    assert.equal(writeGateFailure({ method, headers: {} }), null, `${method} is not a write`);
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(writeGateFailure({ method, headers: {} })?.code, 'FORBIDDEN_WRITE');
  }
});

/* ── T-B26k · the client must satisfy its own bridge's gate ──────────────── */

test('T-B26k: the web adapter sends the same header this gate requires', () => {
  // The adapter may not import this module (T-W2 forbids web/src from escaping
  // itself), so the string is duplicated. That duplication is a silent-failure
  // seam: change one side and every write the console makes becomes a 403 with
  // no clue why. This is the cheapest possible guard against that.
  const adapter = readFileSync(
    join(import.meta.dirname, '..', 'web', 'src', 'adapters', 'LocalEngineAdapter.ts'), 'utf8',
  );
  assert.ok(adapter.includes(REQUIRED_HEADER),
    `web/src/adapters/LocalEngineAdapter.ts must send '${REQUIRED_HEADER}' on every request`);
});

test('T-B26k2: the browser-shaped write the adapter builds is accepted', async () => {
  await withFixture('t-b22k2', async ({ base, port }) => {
    // Node cannot reproduce a browser's forbidden-header handling, so the
    // browser shape is assembled from what the adapter actually sets: accept,
    // the gate header, a JSON media type, and the Origin the bridge serves the
    // app from. This is the end-to-end proof that the app can write.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: {
        accept: 'application/json',
        [REQUIRED_HEADER]: '1',
        'content-type': REQUIRED_MEDIA_TYPE,
        origin: `http://127.0.0.1:${port}`,
      },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 200, 'the console must be able to write to its own bridge');
    assert.equal(res.body.channelId, CH_TWO);
  });
});
