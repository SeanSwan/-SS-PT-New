/**
 * serverBoot.test — the startup banner must not be able to lie about the request gate.
 * @module scripts/swan-brain-console/serverBoot.test
 *
 * WHY THIS SUITE EXISTS
 * Round 7 (2026-09-20) measured the console printing, on every start:
 *
 *     [console] read-only · localhost only · GET only · no engine writes
 *
 * while `HEAD /` returned **200**. The claim was false, and it was the false claim an
 * operator reads most often — printed to the terminal, not buried in a source comment. Round
 * 5 had already corrected the same sentence in `server.mjs`'s module header and missed this
 * copy, which is what a duplicated fact does.
 *
 * The fix is not "change the string". The banner now takes the server's allowed-method list
 * as an argument, so it holds no copy of the fact. This suite pins that property: the banner
 * NAMES EVERY method the gate allows, and it is derived from the server's own list rather
 * than from a literal typed into a test.
 *
 * Run: node --test scripts/swan-brain-console/serverBoot.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePort, bannerLines, bootServer } from './serverBoot.mjs';
import { ALLOWED_METHODS } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── the banner cannot disagree with the gate ─────────────────────────────── */

test('the banner names EVERY method the server allows', () => {
  // The RED case as found: ALLOWED_METHODS is ['GET','HEAD'], the old banner said "GET only",
  // and this assertion fails on it.
  const [, posture] = bannerLines('http://127.0.0.1:4599/', ALLOWED_METHODS);
  for (const m of ALLOWED_METHODS) {
    assert.ok(posture.includes(m), `the banner does not name ${m}, which the server allows`);
  }
  assert.match(posture, /read-only/);
  assert.match(posture, /localhost only/);
});

test('the banner is derived, not a literal — it follows a changed method list', () => {
  // If the banner were a literal, passing a different list would change nothing. This is the
  // assertion that proves the derivation is real rather than cosmetic.
  const [, a] = bannerLines('http://x/', ['GET']);
  const [, b] = bannerLines('http://x/', ['GET', 'HEAD']);
  assert.notEqual(a, b);
  assert.ok(a.includes('GET only'));
  assert.ok(b.includes('GET and HEAD only'));
});

test('the server really allows exactly the methods the banner names', () => {
  // Pins the OTHER half: if someone adds a method to the gate without adding it to
  // ALLOWED_METHODS, the banner becomes wrong again — so the list itself is asserted.
  assert.deepEqual([...ALLOWED_METHODS], ['GET', 'HEAD']);
});

/* ── port parsing ─────────────────────────────────────────────────────────── */

test('parsePort reads --port and defaults to 4599', () => {
  assert.equal(parsePort([]), 4599);
  assert.equal(parsePort(['--port', '4713']), 4713);
  assert.equal(parsePort(['--port', '4713', '--open']), 4713);
});

test('parsePort REFUSES an unusable port rather than coercing it', () => {
  // The old code returned `Number(...)` and validated afterwards; `null` is unambiguous, and
  // the caller exits non-zero on it. 0 and 1023 are privileged, 65536 is out of range.
  for (const bad of [['--port', 'nope'], ['--port', '0'], ['--port', '1023'], ['--port', '65536'],
    ['--port', '-1'], ['--port', '1.5']]) {
    assert.equal(parsePort(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('a --port with NO value falls back to the default, and that is deliberate', () => {
  // Distinct from an unusable value: `--port` bare or `--port ""` means "no port was asked
  // for", so the default applies. Refusing here would break `npm start` style invocations
  // that pass the flag through unconditionally.
  assert.equal(parsePort(['--port']), 4599);
  assert.equal(parsePort(['--port', '']), 4599);
});

/* ── boot wiring, without a socket ────────────────────────────────────────── */

test('bootServer refuses an invalid port, logs why, and never listens', () => {
  let listened = false;
  let logged = '';
  const port = bootServer({
    server: { listen() { listened = true; }, close() {} },
    host: '127.0.0.1',
    methods: ALLOWED_METHODS,
    argv: ['node', 'server.mjs', '--port', 'nope'],
    error: (m) => { logged = m; },
  });
  assert.equal(port, null);
  assert.equal(listened, false, 'it listened on an invalid port');
  assert.match(logged, /invalid --port/);
});

test('bootServer prints the banner through the injected log, not console.log', () => {
  const lines = [];
  const port = bootServer({
    server: { listen(p, h, cb) { cb(); }, close() {} },
    host: '127.0.0.1',
    methods: ALLOWED_METHODS,
    argv: ['node', 'server.mjs', '--port', '4713'],
    log: (m) => lines.push(m),
  });
  assert.equal(port, 4713);
  assert.equal(lines.length, 2, `expected 2 banner lines, got ${JSON.stringify(lines)}`);
  assert.match(lines[0], /running at http:\/\/127\.0\.0\.1:4713\//);
  assert.match(lines[1], /GET and HEAD only/);
});

test('bootServer wires both shutdown signals and closes before exiting', () => {
  const signals = {};
  let closed = false;
  let exited = null;
  bootServer({
    server: { listen(p, h, cb) { cb(); }, close(cb) { closed = true; cb(); } },
    host: '127.0.0.1',
    methods: ALLOWED_METHODS,
    argv: ['node', 'server.mjs'],
    log: () => {},
    onSignal: (sig, fn) => { signals[sig] = fn; },
    onExit: (code) => { exited = code; },
  });
  assert.deepEqual(Object.keys(signals).sort(), ['SIGINT', 'SIGTERM']);
  signals.SIGINT();
  assert.equal(closed, true, 'SIGINT did not close the server');
  assert.equal(exited, 0);
});

/* ── the source itself ───────────────────────────────────────────────────── */

test('the banner literal is gone from server.mjs', () => {
  /*
   * A regression guard for the exact sentence round 5 half-fixed and round 7 finished.
   *
   * The pattern is the BANNER, not the words "GET only" — `server.mjs` legitimately quotes
   * the old claim in its round-5 header note ("THIS BLOCK USED TO SAY \"GET only\""), and a
   * naive substring check would flag that quotation as a regression. What must not come back
   * is a hardcoded posture line: the banner now lives in this module and takes the method
   * list as an argument.
   */
  const src = readFileSync(join(HERE, 'server.mjs'), 'utf8');
  assert.ok(
    !/\[console\] read-only/.test(src),
    'server.mjs contains a hardcoded banner line again — it must come from bannerLines()',
  );
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the server and its boot module stay within 300 lines', () => {
  for (const f of ['server.mjs', 'serverBoot.mjs', 'serverBoot.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
