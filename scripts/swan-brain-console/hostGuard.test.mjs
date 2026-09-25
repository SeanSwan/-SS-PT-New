/**
 * hostGuard-contract — the Host allowlist predicate, at the boundary that matters.
 * @module scripts/swan-brain-console/hostGuard.test
 *
 * WHY THIS IS SPLIT FROM `server-contract.test.mjs`
 * That file tests the request boundary AT THE SOCKET, and its decisive assertion is ORDERING —
 * that a bad Host is refused before the request target is parsed. This file tests the PREDICATE,
 * where the malformed-authority cases live. A socket test cannot practically enumerate them
 * (`Host: localhost:80 ` with a trailing space is not a header a normal client sends), and the
 * predicate used to be inline in the handler precisely so nothing could reach it directly. Two
 * subjects: the boundary, and the decision the boundary is built on.
 *
 * THE ROUND-12 FINDING (Astra F21). The predicate was
 * `ALLOWED_HOSTS.some((h) => host === h || host.startsWith(`${h}:`))`, which accepts ANY text
 * after the colon. `Host: localhost:bad-port` returned 200. Astra graded it [low] and NOT a
 * reachable browser bypass — a browser cannot emit that authority from a normal URL — but the
 * guard's predicate was broader than its name, which is this round's whole defect class.
 *
 * THE REGRESSION IS SELF-PROVING. `legacyHostAllowed` below is the replaced predicate, kept
 * verbatim, and the suite asserts it ACCEPTS the malformed inputs the shipped predicate refuses.
 * If someone ever restores the prefix match, these tests fail on the assertions that matter
 * rather than on a wording change.
 *
 * Run: node --test scripts/swan-brain-console/hostGuard.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOWED_HOSTS, hostAllowed } from './hostGuard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The predicate this module replaced, kept as the RED baseline. It is here to be asserted
 * AGAINST, never called by production code.
 */
function legacyHostAllowed(hostHeader) {
  const host = String(hostHeader ?? '');
  return ALLOWED_HOSTS.some((h) => host === h || host.startsWith(`${h}:`));
}

describe('hostGuard — the authorities this server answers to', () => {
  test('the three bindable authorities are accepted bare', () => {
    for (const h of ['127.0.0.1', 'localhost', '[::1]']) {
      assert.equal(hostAllowed(h), true, `${h} must be accepted`);
    }
  });

  test('an optional numeric port is accepted, including on an IPv6 literal', () => {
    for (const h of [
      '127.0.0.1:4599', 'localhost:4599', 'localhost:80', 'localhost:1',
      'localhost:65535', '[::1]:4599', '[::1]:65535',
    ]) {
      assert.equal(hostAllowed(h), true, `${h} must be accepted`);
    }
  });

  test('a missing or empty Host header is refused', () => {
    for (const h of ['', null, undefined]) {
      assert.equal(hostAllowed(h), false, `${JSON.stringify(h)} must be refused`);
    }
  });

  test('a foreign hostname is refused, with and without a port', () => {
    for (const h of ['evil.com', 'evil.com:4599', 'localhost.evil.com', '127.0.0.1.evil.com']) {
      assert.equal(hostAllowed(h), false, `${h} must be refused`);
    }
  });

  test('a suffix hostname cannot pass by starting with an allowed host', () => {
    // `localhost.evil.com` is the shape a naive `startsWith(h)` would accept; this documents
    // that the check compares the whole host token, not a prefix of the header.
    assert.equal(hostAllowed('localhost.evil.com'), false);
    assert.equal(hostAllowed('localhost:4599.evil.com'), false);
  });
});

describe('hostGuard — malformed authorities are refused (Astra F21)', () => {
  const MALFORMED = [
    'localhost:bad-port',
    'localhost:',
    'localhost:0',
    'localhost:65536',
    'localhost:99999',
    'localhost:80 ',
    'localhost:+80',
    'localhost:-1',
    'localhost:8.0',
    'localhost:4599:80',
    '127.0.0.1:bad-port',
    '[::1',
    '[::1]:bad-port',
    '[::1]x',
    '[::1]x:4599',
  ];

  test('every malformed authority is refused', () => {
    for (const h of MALFORMED) {
      assert.equal(hostAllowed(h), false, `${JSON.stringify(h)} must be refused`);
    }
  });

  test('the predicate this replaced ACCEPTED them — the regression is load-bearing', () => {
    /*
     * This is the mutation proof, written down rather than performed and forgotten: the old
     * predicate is not merely "less strict in theory". It returns TRUE for these inputs, which
     * is why `Host: localhost:bad-port` produced a 200 and not a 403. A regression test that
     * passes against the code it replaced proves nothing; this one fails against it.
     */
    const acceptedByLegacy = MALFORMED.filter((h) => legacyHostAllowed(h));
    assert.ok(
      acceptedByLegacy.includes('localhost:bad-port'),
      'the legacy predicate no longer accepts `localhost:bad-port` — re-derive this test',
    );
    assert.ok(
      acceptedByLegacy.length >= 8,
      `expected the legacy predicate to accept most of these; it accepted only ${acceptedByLegacy.length}`,
    );
    // And the shipped predicate refuses every one of them, including the ones the old one took.
    for (const h of acceptedByLegacy) {
      assert.equal(hostAllowed(h), false, `${h} was accepted by the legacy predicate and must not be`);
    }
  });
});

describe('hostGuard — the allowlist is data, and the handler uses it', () => {
  test('ALLOWED_HOSTS is frozen and holds exactly the three authorities', () => {
    assert.ok(Object.isFrozen(ALLOWED_HOSTS), 'ALLOWED_HOSTS must be frozen');
    assert.deepEqual([...ALLOWED_HOSTS].sort(), ['127.0.0.1', '[::1]', 'localhost']);
  });

  test('WIRING: server.mjs calls hostAllowed rather than matching a prefix itself', () => {
    /*
     * A pure predicate can stay correct while its caller stops calling it — the F04 lesson, and
     * the reason every fix in this round that moved a decision carries a wiring assertion. This
     * is a SOURCE assertion, deliberately labelled as one: the socket suite proves the behaviour
     * end to end, and this catches the narrower case where the handler grows its own check again.
     *
     * COMMENTS ARE STRIPPED FIRST, and that is not a detail. `server.mjs` deliberately QUOTES the
     * replaced predicate in the comment recording why it changed — so a naive source match fails
     * on the very prose that documents the fix. The first version of this test did exactly that,
     * which is the same defect as a guard whose scope is narrower than its name: it was asserting
     * about text while claiming to assert about code.
     */
    const code = readFileSync(join(HERE, 'server.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    assert.match(code, /if \(!hostAllowed\(req\.headers\.host\)\)/, 'server.mjs no longer calls hostAllowed');
    assert.doesNotMatch(
      code,
      /headers\.host[^\n]*startsWith/,
      'server.mjs has re-grown a prefix match on the Host header — that is the predicate that '
      + 'accepted `localhost:bad-port`',
    );
  });
});
