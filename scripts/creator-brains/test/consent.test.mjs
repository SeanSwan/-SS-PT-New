#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/consent.test.mjs
 * PURPOSE: The interactive consent flow — first consent, cancel, timeout, state
 *          mismatch and abort (HR10).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THE SERVER AND THE BROWSER ARE FAKE HERE, AND WHY THAT IS STILL A REAL TEST:
 *
 *   `runConsentFlow` takes `createServer` and `openUrl` as parameters precisely
 *   so its LOGIC can be exercised without a browser. What is under test is not
 *   "does node:http work" — it is the state machine the packet's acceptance list
 *   names: consent arrives, consent is DENIED, nothing arrives (timeout), a
 *   stray request arrives with the wrong `state`, and the owner cancels.
 *
 *   Every one of those has a distinct outcome, and the dangerous one is the
 *   state mismatch: a request to the loopback port that did not come from our
 *   consent page must NOT complete the flow.
 *
 *   The real `node:http` server is exercised separately by the live smoke; these
 *   tests keep the flow's branches covered on every run.
 *
 * RUN: node --test scripts/creator-brains/test/consent.test.mjs
 * @module creator-brains/test/consent
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runConsentFlow } from '../lib/consent.mjs';
import { OAuthError } from '../lib/oauth.mjs';

const CLIENT = { clientId: 'client-id-1234567890', clientSecret: 'client-secret-value' };

/** A `createServer` stand-in that captures the request handler and never binds. */
function fakeServerFactory() {
  let handler = null;
  const server = {
    on: () => server,
    listen: (port, host, cb) => { cb(); return server; },
    address: () => ({ port: 51234 }),
    close: (cb) => { if (cb) cb(); return server; },
  };
  const factory = (h) => { handler = h; return server; };
  factory.getHandler = () => handler;
  return factory;
}

/** Drive the captured handler with a synthetic loopback request. */
function callCallback(factory, query) {
  const handler = factory.getHandler();
  assert.ok(handler, 'the flow registered a request handler');
  const res = { writeHead: () => {}, end: () => {} };
  handler({ url: `/callback?${query}` }, res);
}

const tokenBody = {
  access_token: 'ya29.consent-flow-access',
  refresh_token: '1//consent-flow-refresh-token-value',
  expires_in: 3600,
  token_type: 'Bearer',
};

const okFetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify(tokenBody) });

/** Pull `state` out of the URL the flow asked us to open. */
const stateOf = (url) => new URL(url).searchParams.get('state');

// ── First consent ───────────────────────────────────────────────────────────

test('CT1 first consent: the callback exchanges the code and returns tokens', async () => {
  const factory = fakeServerFactory();
  let opened = null;
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async (url) => {
      opened = url;
      // The provider would redirect here after the owner approves.
      callCallback(factory, `code=AUTH-CODE&state=${stateOf(url)}`);
    },
  });

  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);
  assert.equal(result.tokens.access_token, tokenBody.access_token);
  assert.equal(result.tokens.refresh_token, tokenBody.refresh_token);

  // The URL we opened is a proper PKCE consent request on a loopback redirect.
  const url = new URL(opened);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.match(url.searchParams.get('redirect_uri'), /^http:\/\/127\.0\.0\.1:\d+\/callback$/);
});

test('CT2 the redirect URI is a loopback address on an OS-chosen port', async () => {
  const factory = fakeServerFactory();
  let redirect = null;
  await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async (url) => { redirect = new URL(url).searchParams.get('redirect_uri'); },
    timeoutMs: 30,
  });
  assert.match(redirect, /^http:\/\/127\.0\.0\.1:\d+\/callback$/,
    'loopback only — a code must never travel through a clipboard or a public host');
  assert.ok(!redirect.includes('localhost'), 'the literal 127.0.0.1 avoids a DNS round trip');
});

// ── Cancel and denial ───────────────────────────────────────────────────────

test('CT3 the owner DENIES consent: cancelled, with the provider error named', async () => {
  const factory = fakeServerFactory();
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async (url) => callCallback(factory, `error=access_denied&state=${stateOf(url)}`),
  });
  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true, 'a denial is a CANCEL, not a failure');
  assert.match(result.reason, /access_denied/);
});

test('CT4 an AbortSignal cancels a waiting flow', async () => {
  const factory = fakeServerFactory();
  const controller = new AbortController();
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async () => { controller.abort(); },
    signal: controller.signal,
    timeoutMs: 5_000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true, 'the owner cancelled');
  assert.equal(result.timedOut, undefined, 'and it was NOT a timeout — the two are distinct');
});

test('CT5 an already-aborted signal never opens a browser', async () => {
  const factory = fakeServerFactory();
  let opened = 0;
  const controller = new AbortController();
  controller.abort();
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async () => { opened += 1; },
    signal: controller.signal,
  });
  assert.equal(result.cancelled, true);
  assert.equal(opened, 0, 'no point asking for consent the owner already declined to give');
});

test('CT6 TIMEOUT is reported as a timeout, not as a cancel', async () => {
  const factory = fakeServerFactory();
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async () => { /* the owner walks away */ },
    timeoutMs: 40,
  });
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, undefined, 'timeout and cancel are different outcomes');
  assert.match(result.reason, /no consent within/);
});

// ── The security case ───────────────────────────────────────────────────────

test('CT7 a callback with the WRONG state does not complete the flow', async () => {
  const factory = fakeServerFactory();
  let exchanged = 0;
  const countingFetch = async () => { exchanged += 1; return { ok: true, status: 200, text: async () => JSON.stringify(tokenBody) }; };

  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: countingFetch,
    createServer: factory,
    openUrl: async () => {
      // A stray request to the loopback port: right path, wrong state.
      callCallback(factory, 'code=ATTACKER-CODE&state=not-our-state');
    },
    timeoutMs: 40,
  });

  assert.equal(result.ok, false, 'the flow must not complete');
  assert.equal(result.timedOut, true, 'it waits for the REAL callback and then times out');
  assert.equal(exchanged, 0, 'and no code was exchanged — the stray request got nowhere');
});

test('CT8 a callback with NO code and a correct state fails closed', async () => {
  const factory = fakeServerFactory();
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: okFetch,
    createServer: factory,
    openUrl: async (url) => callCallback(factory, `state=${stateOf(url)}`),
    timeoutMs: 60,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /no authorization code/);
});

test('CT9 an exchange failure surfaces as a failure with its kind', async () => {
  const factory = fakeServerFactory();
  const badFetch = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error: 'invalid_grant' }) });
  const result = await runConsentFlow({
    ...CLIENT,
    fetchImpl: badFetch,
    createServer: factory,
    openUrl: async (url) => callCallback(factory, `code=C&state=${stateOf(url)}`),
    timeoutMs: 200,
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorKind, 'oauth_revoked_or_expired');
});

// ── Input validation ────────────────────────────────────────────────────────

test('CT10 the flow refuses to start without the pieces it needs', async () => {
  await assert.rejects(() => runConsentFlow({ clientId: 'x', openUrl: () => {}, fetchImpl: okFetch }), OAuthError);
  await assert.rejects(() => runConsentFlow({ ...CLIENT, fetchImpl: okFetch }), OAuthError, 'openUrl required');
  await assert.rejects(() => runConsentFlow({ ...CLIENT, openUrl: () => {} }), OAuthError, 'fetch required');
});

test('CT11 a server that cannot bind is reported, not hung on', async () => {
  const factory = fakeServerFactory();
  const failing = (handler) => {
    const s = {
      on: (ev, fn) => { if (ev === 'error') setTimeout(() => fn(new Error('EADDRINUSE')), 0); return s; },
      listen: () => s,
      address: () => ({ port: 0 }),
      close: (cb) => { if (cb) cb(); return s; },
    };
    void handler;
    return s;
  };
  const result = await runConsentFlow({
    ...CLIENT, fetchImpl: okFetch, createServer: failing, openUrl: async () => {}, timeoutMs: 200,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /EADDRINUSE/);
  void factory;
});
