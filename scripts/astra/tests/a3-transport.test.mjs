/**
 * a3-transport.test.mjs — slice A3's transport boundary.
 *
 * T-I-10  a mutation without the token is 401, and the gate runs BEFORE the handler
 *         the token cookie is SameSite=Strict
 * AC2.1   `/api/directions` is free and makes no provider call
 *         the rendered brainVersion comes from code, not a literal
 *         the brief is escaped, and static traversal is refused
 *
 * SPLIT FROM `a3-surface.test.mjs`, which reached 312 of Rule 4's 300 lines once A4 taught
 * its inventory sweep to visit `/tune`. The seam is PANES versus TRANSPORT: that file
 * proves the markup and the registry agree; this one proves what the server refuses, what
 * it costs, and what it will not let through.
 *
 * THE TRAVERSAL TEST USES A RAW SOCKET ON PURPOSE. `fetch` normalises `..` out of a path
 * before anything is sent, so a traversal test written with `fetch` tests the URL parser
 * and passes whether or not the server is safe. A3 shipped exactly that mistake; the
 * socket is the fix, and the comment is here so it is not "simplified" back.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';

import { readBrainVersion } from '../core/brain.mjs';
import { startServer } from '../surface/server.mjs';

const TOKEN = 'a3-test-token';
const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

async function withServer(fn) {
  const s = await startServer({ port: 0, token: TOKEN });
  const base = s.url.replace(/\/$/, '');
  const req = async (path, opts = {}) => {
    const r = await fetch(base + path, opts);
    return { status: r.status, text: await r.text(), headers: r.headers };
  };
  const post = (route, body, token) => req(`/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-astra-token': token } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  try {
    return await fn({ base, req, post });
  } finally {
    await s.close();
  }
}

// ---------------------------------------------------------------------------
// T-I-10 — the mutation token
// ---------------------------------------------------------------------------

test('T-I-10 a mutation without the token is 401 and changes nothing', async () => {
  await withServer(async ({ post }) => {
    for (const route of ['compile', 'reject', 'preview', 'tuning-commit']) {
      const r = await post(route, {});
      assert.equal(r.status, 401, `${route} without a token must be 401`);
      assert.equal(JSON.parse(r.text).error.code, 'E_TOKEN_REQUIRED');
    }
    const wrong = await post('compile', {}, 'not-the-token');
    assert.equal(wrong.status, 401);
    assert.equal(JSON.parse(wrong.text).error.code, 'E_TOKEN_INVALID');

    // A read must NOT need the token — otherwise the 401 proves nothing about writes.
    const read = await post('directions', BRIEF);
    assert.equal(read.status, 200, 'directions is a read and must not require a token');
  });
});

test('T-I-10 the token gate runs BEFORE the handler, so a 501 is unreachable without it', async () => {
  await withServer(async ({ post }) => {
    // The vehicle must be a route that is REFUSED for a reason other than the token,
    // otherwise the two statuses cannot be told apart. `preview` is the last such
    // mutation route: it refuses with `E_GENERATION_DISABLED`, because generation
    // costs money and is off by default.
    //
    // A3 used `tuning-commit` here, which was then unbuilt. A4 built it, and the route
    // now answers 400 `E_TUNING_NO_CHANGES` when nothing is staged — so the old
    // assertion went stale the moment the slice landed. That is the correct direction
    // for a test to break, and it is why the vehicle is named explicitly rather than
    // picked as "whatever is left".
    const noToken = await post('preview', {});
    assert.equal(noToken.status, 401, 'a refused slice must still be behind the token gate');
    const withToken = await post('preview', {}, TOKEN);
    assert.equal(withToken.status, 501);
    assert.equal(JSON.parse(withToken.text).error.code, 'E_GENERATION_DISABLED');
  });
});

test('T-I-10 the token cookie is SameSite=Strict', async () => {
  await withServer(async ({ req }) => {
    const r = await req('/');
    const cookie = r.headers.get('set-cookie') ?? '';
    assert.match(cookie, /astra_token=/);
    assert.match(cookie, /SameSite=Strict/, 'the CSRF defence is the cookie attribute, not obscurity');
  });
});

// ---------------------------------------------------------------------------
// The zero-cost claim, the version, and the escaping boundary
// ---------------------------------------------------------------------------

test('AC2.1 /api/directions is free and makes no provider call', async () => {
  await withServer(async ({ post }) => {
    const r = await post('directions', BRIEF);
    const j = JSON.parse(r.text);
    assert.equal(r.status, 200);
    assert.equal(j.directions.length, 3);
    assert.equal(j.spent, 0, 'Gate 0 must report zero spend');
    assert.equal(j.generated, 0, 'Gate 0 must report nothing generated');
    assert.equal(j.brainVersion, readBrainVersion(), 'the version must be read from code');
    for (const d of j.directions) {
      assert.ok(d.tierReason && d.tierReason.length > 0, 'tierReason is ALWAYS present');
      assert.ok(['evidence', 'prior'].includes(d.tier));
      assert.ok(Array.isArray(d.swatches) && d.swatches.length > 0);
      // Cold start: no evidence is injected, so nothing may claim `evidence`.
      assert.equal(d.tier, 'prior', 'with no injected picks every direction is prior');
    }
  });
});

test('the rendered brainVersion comes from code, not a literal', async () => {
  await withServer(async ({ req }) => {
    const r = await req('/');
    const shown = /data-brain-version>([^<]+)</.exec(r.text)?.[1];
    assert.equal(shown, readBrainVersion());
  });
});

test('the brief is escaped — a loopback origin still runs script', async () => {
  await withServer(async ({ req, post }) => {
    const payload = '<script>window.__astra_xss=1</script>';
    await post('directions', { text: payload });
    const r = await req('/');
    assert.doesNotMatch(r.text, /<script>window\.__astra_xss/, 'the payload must not render as markup');
    assert.match(r.text, /&lt;script&gt;window\.__astra_xss/, 'and it must render, escaped');
  });
});

test('static traversal is refused', async () => {
  const s = await startServer({ port: 0, token: TOKEN });
  try {
    // A raw socket, because `fetch` normalises `..` out of the path before sending —
    // a traversal test that used fetch would test the URL parser, not the server.
    const raw = await new Promise((res) => {
      const sock = connect(s.port, '127.0.0.1', () => {
        sock.write('GET /static/../../../package.json HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
      });
      let out = '';
      sock.on('data', (d) => { out += d; });
      sock.on('close', () => res(out));
      sock.on('error', () => res('ERROR'));
    });
    const status = Number(/HTTP\/1\.1 (\d{3})/.exec(raw)?.[1]);
    assert.ok([403, 404].includes(status), `traversal must not be served, got status ${status}`);
    assert.doesNotMatch(raw, /"name":\s*"-SS-PT-New"/, 'the repo package.json must not be readable');
  } finally {
    await s.close();
  }
});
