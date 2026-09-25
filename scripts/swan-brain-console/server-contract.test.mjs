#!/usr/bin/env node
/**
 * server-contract.test — the console's request boundary, tested at the socket.
 * @module scripts/swan-brain-console/server-contract.test
 *
 * WHY THIS EXISTS (round 2, 2026-09-19)
 * Astra (gpt-6-astra) falsified a documented claim in `server.mjs`: the Host allowlist
 * comment said the check ran "FIRST, before any route work", but `new URL()` sat above it.
 * A malformed request target therefore threw out of the async handler BEFORE the Host
 * check ran, and the request got no response at all — a silent hang rather than a 403.
 *
 * The decisive test is not "does a bad Host get 403" (it did, for well-formed targets).
 * It is the ORDER: send a bad Host AND a malformed target together and assert 403. If the
 * URL is parsed first the answer is 400 or a hang; only a genuinely-first Host check can
 * return 403 for that pair. That is the assertion below, and it is why this file talks to
 * the socket instead of calling a function.
 *
 * Run: node --test scripts/swan-brain-console/server-contract.test.mjs
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILD_FINGERPRINT, BACKEND_FILES } from './buildIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const PORT = Number(process.env.CONSOLE_TEST_PORT ?? 4691);

let child;

/** Send a raw request line + headers and resolve with the status code. */
function rawRequest(requestLine, hostHeader, port = PORT) {
  return new Promise((res, rej) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.write(`${requestLine}\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`);
    });
    let data = '';
    socket.setEncoding('utf8');
    socket.on('data', (c) => { data += c; });
    socket.on('error', rej);
    socket.on('close', () => {
      const m = /^HTTP\/1\.1 (\d{3})/.exec(data);
      res(m ? { status: Number(m[1]), body: data } : { status: null, body: data });
    });
    setTimeout(() => { socket.destroy(); rej(new Error('no response within 5s (the handler hung)')); }, 5000);
  });
}

before(async () => {
  child = spawn(process.execPath, ['scripts/swan-brain-console/server.mjs', '--port', String(PORT)], {
    cwd: REPO, stdio: 'ignore',
  });
  for (let i = 0; i < 50; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`console server did not start on :${PORT}`);
});

after(() => { child?.kill(); });

describe('server boundary — the Host allowlist must be genuinely unskippable', () => {
  test('THE ORDERING TEST: a bad Host AND a malformed target returns 403, not 400', async () => {
    // If the URL is parsed before the Host check, this pair can only be 400 or a hang.
    // 403 is reachable only if Host is checked first — which is what the comment claims.
    const r = await rawRequest('GET http://[ HTTP/1.1', 'evil.com');
    assert.equal(r.status, 403, `expected 403 (Host checked first), got ${r.status ?? 'NO RESPONSE'}`);
  });

  test('a well-formed request with a bad Host is refused', async () => {
    const r = await rawRequest('GET / HTTP/1.1', 'evil.com');
    assert.equal(r.status, 403);
  });

  test('a malformed target with an ALLOWED Host is a bounded 400, not a hang', async () => {
    const r = await rawRequest('GET http://[ HTTP/1.1', `127.0.0.1:${PORT}`);
    assert.equal(r.status, 400, `expected 400, got ${r.status ?? 'NO RESPONSE'}`);
  });

  test('a malformed target does not echo the attacker-controlled target back', async () => {
    const r = await rawRequest('GET http://[ HTTP/1.1', `127.0.0.1:${PORT}`);
    assert.ok(!r.body.includes('http://['), 'the malformed target was reflected into the response body');
  });

  test('an allowed Host on a real route still works', async () => {
    const r = await rawRequest('GET / HTTP/1.1', `127.0.0.1:${PORT}`);
    assert.equal(r.status, 200);
  });

  test('a non-GET method is still refused on an allowed Host', async () => {
    const r = await rawRequest('POST /api/state HTTP/1.1', `127.0.0.1:${PORT}`);
    assert.equal(r.status, 405);
  });

  /*
   * ROUND 12 (2026-09-20), Astra F21. The allowlist predicate used to be a PREFIX match —
   * `host.startsWith(`${h}:`)` — so any text after an allowed hostname's colon passed.
   * `Host: localhost:bad-port` returned 200. These cases go through the real socket because the
   * point is that the HANDLER uses the narrowed predicate; `hostGuard.test.mjs` owns the
   * predicate's own matrix, including the inputs a client cannot send.
   */
  test('a malformed port on an allowed hostname is refused', async () => {
    for (const host of ['localhost:bad-port', 'localhost:0', 'localhost:65536', 'localhost:-1']) {
      const r = await rawRequest('GET / HTTP/1.1', host);
      assert.equal(r.status, 403, `Host: ${host} → expected 403, got ${r.status ?? 'NO RESPONSE'}`);
    }
  });

  test('a well-formed port on an allowed hostname still works', async () => {
    const r = await rawRequest('GET / HTTP/1.1', `localhost:${PORT}`);
    assert.equal(r.status, 200, 'narrowing the port check must not refuse ordinary traffic');
  });

  /*
   * ROUND 12 (2026-09-20), Astra F15. The socket-level half of the backend-identity probe: the
   * real server, spawned from this checkout, must publish the fingerprint this process computes.
   * `verifyTarget.test.mjs` covers the REJECTION cases with stubs; this covers the ACCEPTANCE case
   * against the actual process, which is the only way to know the route is wired at all.
   */
  test('the server publishes the backend fingerprint it actually loaded', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/build`);
    assert.equal(r.status, 200, 'the server does not answer /api/build');
    const body = await r.json();
    assert.match(body.fingerprint, /^[0-9a-f]{64}$/, 'the fingerprint is not a sha256 digest');
    assert.equal(
      body.fingerprint, BUILD_FINGERPRINT,
      'the running server loaded different backend code than this checkout — a stale process',
    );
    assert.equal(body.files, BACKEND_FILES.length);
  });
});
