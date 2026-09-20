/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/test/fixtures.mjs
 * PURPOSE: Shared S0 test fixtures — a realistic store, a live bridge, and a
 *          guaranteed teardown. No network, no shared state.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * THE IDS ARE REAL-SHAPED ON PURPOSE. The engine validates its store strictly
 * (`lib/schema.mjs`): a channel key must match `UC` + 22 url-safe characters,
 * and a `state.videos` key must be an 11-character YouTube id whose value's
 * `videoId` matches its own key. A fixture using `v1` / `UC_fixture_one` is not
 * a store the engine would ever write, and the engine correctly refuses to read
 * it — reporting the store as DAMAGED. That failure mode is worse than a crash:
 * every assertion built on such a fixture tests the error path while claiming to
 * test the happy path. The first version of this suite made exactly that
 * mistake, and the fix was to make the fixture honest rather than to relax the
 * assertion.
 *
 * The LANE B document carries the canary phrase T-B7 greps the whole HTTP
 * surface for.
 *
 * @module creator-brains/console/test/fixtures
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as httpModule from 'node:http';
import * as net from 'node:net';

import { tempRoot } from '../../test/helpers.mjs';
import { ensureStore } from '../../lib/store.mjs';
import { startBridge } from '../server.mjs';

/** The distinctive 10-word phrase T-B7 hunts across every route. */
export const CANARY_PHRASE = 'quarantine the spare hydraulic manifold before the second ascent';

export const CH_ONE = `UC${'a'.repeat(22)}`;
export const CH_TWO = `UC${'b'.repeat(22)}`;
export const VID_1 = `v${'1'.repeat(10)}`;
export const VID_2 = `v${'2'.repeat(10)}`;
export const VID_3 = `v${'3'.repeat(10)}`;

/**
 * Seed a schema-valid store: two creators (one enabled), three videos across
 * them, one private transcript, a completed journal and a last-success stamp.
 */
export function seedStore(r) {
  ensureStore(r);
  mkdirSync(join(r, 'docs', CH_ONE), { recursive: true });
  mkdirSync(join(r, 'brains'), { recursive: true });

  writeFileSync(join(r, 'registry.json'), JSON.stringify({
    version: 1,
    creators: {
      [CH_ONE]: { channelId: CH_ONE, title: 'Fixture One', enabled: true, addedAt: '2026-09-01T00:00:00.000Z' },
      [CH_TWO]: { channelId: CH_TWO, title: 'Fixture Two', enabled: false, addedAt: '2026-09-02T00:00:00.000Z' },
    },
  }), 'utf8');

  writeFileSync(join(r, 'state.json'), JSON.stringify({
    version: 1,
    videos: {
      [VID_1]: { videoId: VID_1, channelId: CH_ONE, state: 'fetched', attempts: 0, nextRetryAt: null, lastError: null, title: 'One' },
      [VID_2]: { videoId: VID_2, channelId: CH_ONE, state: 'pending', attempts: 0, nextRetryAt: null, lastError: null, title: 'Two' },
      [VID_3]: { videoId: VID_3, channelId: CH_TWO, state: 'fetched', attempts: 0, nextRetryAt: null, lastError: null, title: 'Three' },
    },
  }), 'utf8');

  // LANE B — owner-private transcript text. MUST NEVER appear on any route.
  writeFileSync(join(r, 'docs', CH_ONE, `${VID_1}.json`), JSON.stringify({
    videoId: VID_1,
    channelId: CH_ONE,
    segments: [{ tStartMs: 0, text: CANARY_PHRASE }],
  }), 'utf8');

  writeFileSync(join(r, 'journal.json'), JSON.stringify({
    status: 'completed', runId: 'run-fixture-1', ok: true,
  }), 'utf8');
  writeFileSync(join(r, 'last-success.json'), JSON.stringify({ at: '2026-09-16T00:00:00.000Z' }), 'utf8');
}

/** A fresh seeded store root. */
export function fixtureRoot(label) {
  const r = tempRoot(label);
  seedStore(r);
  return r;
}

/** The namespace `seedPublishedBrain` publishes under. */
export const BRAIN_NS = 'fixture-brain';

/**
 * Seed a PUBLISHED brain (LANE C) in the layout the engine actually writes.
 *
 * WHY THE SUITE NEEDED THIS (S1-H16, 2026-09-19). `seedStore` creates an EMPTY
 * `brains/` directory, so **every** `/api/brains/:slug` assertion in the suite
 * hit the 404 branch and the route's 200 path had no coverage at all. That is
 * how S1-H15 survived: `brainDoc` joined `brains/<slug>` and read `index.md`
 * there, while the engine publishes into `brains/<slug>/<generation>/` — so the
 * route answered 200 with all three documents empty, and nothing in the suite
 * could see it. **A fixture that cannot represent a published brain cannot test
 * one.**
 *
 * The layout is copied from `lib/render.mjs` `publishBrain`: the generation
 * directory holds the documents, and `current.json` is written LAST.
 */
export function seedPublishedBrain(
  r, ns = BRAIN_NS, { title = 'Fixture Brain', generation = 'gen-0001' } = {},
) {
  const genDir = join(r, 'brains', ns, generation);
  mkdirSync(genDir, { recursive: true });
  writeFileSync(join(genDir, 'index.md'), `# ${title}\n\nA published claim about the fixture.`, 'utf8');
  writeFileSync(join(genDir, 'topics.md'), '- fixture topic\n- second topic', 'utf8');
  writeFileSync(join(genDir, 'timeline.md'), `- 00:00 intro (${VID_1})`, 'utf8');
  writeFileSync(join(genDir, 'rules.jsonl'), `${JSON.stringify({
    claim_id: 'fixture-claim-1',
    creator_id: ns,
    video_id: VID_1,
    t_start_ms: 1000,
    topic: 'fixture',
    statement: 'the fixture claims something',
    key_phrase: 'fixture claims',
    cites: [`https://youtu.be/${VID_1}`],
    modality: 'asserts',
    polarity: 'affirms',
  })}\n`, 'utf8');
  writeFileSync(join(r, 'brains', ns, 'current.json'), JSON.stringify({
    schema_version: 1,
    creator_id: ns,
    label: ns,
    title,
    generation,
    files: ['index.md', 'topics.md', 'timeline.md'],
    publishedAt: '2026-09-16T00:00:00.000Z',
    stats: { videos: 1, claims: 1, doctrine: 0, gaps: 0, invalidDocs: 0 },
  }), 'utf8');
  return { ns, generation, genDir };
}

/**
 * Start a bridge on a fresh fixture store and guarantee teardown.
 *
 * `stop()` awaits the server's real `close` event rather than firing a
 * fire-and-forget shutdown — a test that returns while a port is still bound
 * leaks a listener into the next test and makes an unrelated test fail later.
 *
 * WHY THIS LIVES IN A NON-TEST MODULE (S1-H13, found 2026-09-19). It used to be
 * exported from `bridge.boundary.test.mjs`, and three other test files imported
 * it from there. Importing a module that CALLS `test(...)` registers that
 * module's tests in the importing file's process, so the entire boundary suite
 * ran four times: the bridge suite reported **111 tests for 93 real ones**, and
 * the boundary file's `/api/status` calls — which spawn a yt-dlp probe on a cold
 * cache, ~3.7 s measured — were paid once per importer, taking the suite from a
 * documented 4.3 s to 20 s.
 *
 * The rule this restores: A HARNESS IS NOT A TEST. Anything a test file imports
 * must not itself register tests, or the suite's own count stops measuring what
 * it claims to measure — and a re-registered test can pass in one file while
 * the file that owns it is failing.
 */
export async function withFixture(label, fn) {
  const r = fixtureRoot(label);
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  const stop = () => new Promise((res) => {
    b.shutdown();
    if (!b.server.listening) return res();
    b.server.once('close', res);
    return res();
  });
  try {
    return await fn({ r, base: b.url, port: b.port });
  } finally {
    await stop();
  }
}

/** GET a route and parse JSON, tolerating a non-JSON body. */
export async function getJson(base, path) {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** GET a route as raw text, for leak and traversal assertions. */
export async function getRaw(base, path) {
  const res = await fetch(base + path);
  return { status: res.status, text: await res.text() };
}

/**
 * Issue a request with a Host header that fetch REFUSES to let us set.
 *
 * WHY THIS NODE-LEVEL HELPER EXISTS (found 2026-09-17). The DNS-rebinding attack
 * test originally used `fetch(url, { headers: { host: 'evil.com' } })`. That
 * looks right and does nothing: undici treats `host` as a **forbidden header
 * name** and silently substitutes the real authority, so the request arrived at
 * the bridge with `Host: 127.0.0.1:<port>` — the LEGITIMATE value, which the
 * bridge correctly allowed. The test then asserted a 403, failed, and reported
 * the bridge as vulnerable when the actual fault was that the test could not
 * express the attack.
 *
 * That is the worst possible failure shape: a security regression test that
 * cannot construct its own attack. `node:http.request` performs no such
 * rewriting, so the hostile Host value genuinely reaches the wire. Any future
 * test that needs to forge a header the fetch spec protects must come here
 * rather than reaching for `fetch` and quietly testing nothing.
 */
export function rawRequest(base, path, { method = 'GET', host, headers = {}, body = null } = {}) {
  const { request } = httpModule;
  const url = new URL(base + path);
  return new Promise((resolve, reject) => {
    const req = request({
      host: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...headers, ...(host ? { host } : {}) },
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch { /* not every route is JSON */ }
        resolve({ status: res.statusCode, text, body: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

/**
 * Send a RAW request line over a socket, bypassing every URL parser.
 *
 * WHY (S1-H8, 2026-09-18). `fetch` and `node:http.request` both turn the target
 * into a URL before writing it, and that normalizes the malformed forms away:
 * `rawRequest` above derives `path` from `new URL(...)`, so `//` can never reach
 * the wire through it. A test that cannot construct its own attack proves
 * nothing — the same lesson the `rawRequest` docstring above records for
 * forbidden headers, in a different disguise. The `GET //` crash was found by
 * hand with exactly this shape of socket, so the shape belongs in the fixtures
 * rather than in a throwaway script.
 *
 * The socket is destroyed after the first response or `timeoutMs`, so a handler
 * that neither answers nor closes fails the test instead of hanging the suite.
 */
export function rawRequestLine(base, line, { timeoutMs = 2000, host = null } = {}) {
  const url = new URL(base);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch { /* already gone */ }
      resolve(v);
    };
    const sock = net.connect(Number(url.port), url.hostname, () => {
      sock.write(
        `${line}\r\nHost: ${host ?? `${url.hostname}:${url.port}`}\r\nConnection: close\r\n\r\n`,
      );
    });
    let buf = '';
    sock.setEncoding('latin1');
    sock.on('data', (d) => { buf += d; });
    sock.on('close', () => finish(parseRaw(buf)));
    sock.on('error', (e) => finish({ status: null, text: buf, error: e.code }));
    setTimeout(() => finish({ status: null, text: buf, error: 'TIMEOUT' }), timeoutMs);
  });
}

function parseRaw(raw) {
  const status = Number((raw.match(/^HTTP\/1\.\d (\d+)/) || [])[1]) || null;
  const text = raw.split('\r\n\r\n').slice(1).join('\r\n\r\n');
  return { status, text, error: null };
}
