/**
 * egress-fetch.test.mjs — run: node --test scripts/lib/egress-fetch.test.mjs
 *
 * The load-bearing test is the GUARD at the bottom: it enumerates every consult launcher
 * and fails if any of them calls bare `fetch` again. Without it this wiring is a convention,
 * and a convention is what the 2026-08-22 incident already got past — a control existed and
 * the leaking path simply did not use it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, userInfo } from 'node:os';

import { fetchRedacted } from './egress-fetch.mjs';

const SCRIPTS = dirname(dirname(fileURLToPath(import.meta.url)));
const OP = basename(homedir() || '') || userInfo().username;

// Assembled at runtime so no literal secret-shaped string sits in this committed file —
// the same discipline the gateway's own egress test uses.
const S = (...p) => p.join('');

function capture() {
  const calls = [];
  return { calls, impl: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; } };
}

test('redacts the assembled BODY, not just a document', async () => {
  const { calls, impl } = capture();
  const body = JSON.stringify({
    messages: [{ role: 'user', content:
      `## Git diff\n+ C:\\Users\\${OP}\\Desktop\\x\n(failed to read: ENOENT /home/${OP}/y)\n` +
      `key ${S('sk-', 'or-v1-', 'abcdefghijklmnopqrstuvwxyz0123')}` }],
  });
  await fetchRedacted('https://example.invalid/v1', { method: 'POST', body }, { quiet: true, fetchImpl: impl });

  const sent = calls[0].init.body;
  assert.ok(!sent.toLowerCase().includes(OP.toLowerCase()), `username reached the socket: ${sent}`);
  assert.ok(!sent.includes(S('sk-', 'or-v1-')), 'api key reached the socket');
  assert.doesNotThrow(() => JSON.parse(sent), 'redacted body is still valid JSON');
});

test('headers are untouched — the API key belongs there', async () => {
  const { calls, impl } = capture();
  const auth = `Bearer ${S('sk-', 'or-v1-', 'realkeyrealkeyrealkey0123')}`;
  await fetchRedacted('https://example.invalid/v1',
    { method: 'POST', headers: { Authorization: auth }, body: '{"a":1}' },
    { quiet: true, fetchImpl: impl });
  assert.equal(calls[0].init.headers.Authorization, auth);
});

test('refuses a non-string body rather than passing it through unscanned', async () => {
  const { impl } = capture();
  await assert.rejects(
    () => fetchRedacted('https://example.invalid/v1', { body: { not: 'a string' } }, { quiet: true, fetchImpl: impl }),
    /must be a string/,
  );
});

test('ordinary content is not mangled', async () => {
  const { calls, impl } = capture();
  const body = JSON.stringify({ q: 'see /home/runner/work and commit 72ef9ae40 on 2026-08-27' });
  await fetchRedacted('https://example.invalid/v1', { body }, { quiet: true, fetchImpl: impl });
  assert.equal(calls[0].init.body, body);
});

// ── THE GUARD ─────────────────────────────────────────────────────────────────
// A wiring pass protects the scripts that existed on the day it ran. This fails the
// moment someone adds an eleventh launcher that calls fetch directly.
test('GUARD: no consult launcher calls bare fetch', () => {
  // Launchers that reach the network only via context-gateway have no fetch of their own;
  // they are covered by transport.mjs and are expected to appear here with zero hits.
  const offenders = [];
  const files = readdirSync(SCRIPTS).filter((f) => /^consult-.*\.mjs$/.test(f));
  assert.ok(files.length >= 10, `expected to find the consult launchers, found ${files.length}`);

  for (const f of files) {
    const src = readFileSync(join(SCRIPTS, f), 'utf-8');
    // An outbound call: fetch( followed by a URL literal, a template literal, or a url var.
    if (/(?:await\s+|^\s*|=\s*)fetch\(\s*(?:['"`]https?:|url\b)/m.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `these launchers bypass the egress gate: ${offenders.join(', ')}`);
});

test('GUARD: every fetchRedacted caller actually imports it', () => {
  const broken = [];
  for (const f of readdirSync(SCRIPTS).filter((x) => /^consult-.*\.mjs$/.test(x))) {
    const src = readFileSync(join(SCRIPTS, f), 'utf-8');
    if (/\bfetchRedacted\(/.test(src) && !/import\s*\{[^}]*fetchRedacted[^}]*\}\s*from/.test(src)) broken.push(f);
  }
  assert.deepEqual(broken, [], `fetchRedacted used without import: ${broken.join(', ')}`);
});
