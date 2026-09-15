#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/oauth.test.mjs
 * PURPOSE: The OAuth lane's offline acceptance suite — PKCE, exchange, refresh,
 *          expiry, revocation, pagination, the completeness gate, and secret
 *          containment. No network.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * The packet's acceptance list for HR10, each case a test below:
 *   "first consent/cancel/timeout, refresh, expiry/revocation, >50 subscriptions,
 *    failure after page one, valid zero subscriptions, malformed response and
 *    preserving disabled/manual creators. No secrets in argv, logs, errors or
 *    artifacts."
 *
 * The interactive half (consent/cancel/timeout) is in `consent.test.mjs`; this
 * file covers the token and data contracts.
 *
 * EVERY TRANSPORT IS INJECTED. A suite that needs Google to pass is a suite that
 * gets skipped, and a skipped suite is how the OAuth lane stayed unimplemented
 * while the README implied otherwise.
 *
 * RUN: node --test scripts/creator-brains/test/oauth.test.mjs
 * @module creator-brains/test/oauth
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from './helpers.mjs';
import {
  makePkce, makeState, buildAuthUrl, exchangeCode, refreshAccessToken, normalizeTokens,
  isExpired, isRevoked, markRevoked, saveTokens, loadTokens, readClient, redactOAuth,
  OAuthError, AUTH_ENDPOINT, EXPIRY_SKEW_MS,
} from '../lib/oauth.mjs';
import {
  listSubscriptions, listSubscriptionsWithRefresh, normalizeRow, isEmptyButComplete, PAGE_SIZE,
} from '../lib/subscriptions.mjs';
import { applySnapshot } from '../lib/subs.mjs';

const A = 'UC' + 'a'.repeat(22);
const B = 'UC' + 'b'.repeat(22);
const C = 'UC' + 'c'.repeat(22);

/** A fetch that answers from a queue of canned responses. */
function fakeFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = queue.shift();
    if (!next) throw new Error('fakeFetch: no response queued');
    if (next.throws) throw Object.assign(new Error(next.throws), { name: next.name });
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => (typeof next.body === 'string' ? next.body : JSON.stringify(next.body)),
    };
  };
  fn.calls = calls;
  return fn;
}

const tokenResponse = (extra = {}) => ({
  status: 200,
  body: {
    access_token: 'ya29.primary-access-token-value',
    refresh_token: '1//refresh-token-value-that-is-long',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    ...extra,
  },
});

const subItem = (id, title = `Chan ${id.slice(-2)}`) => ({
  id: `sub-${id}`,
  snippet: { title, resourceId: { channelId: id }, publishedAt: '2026-01-01T00:00:00Z' },
});

const page = (items, nextPageToken) => ({ status: 200, body: { items, ...(nextPageToken ? { nextPageToken } : {}) } });

// ── PKCE and the consent URL ────────────────────────────────────────────────

test('OA1 PKCE is S256 and the verifier is not derivable from the challenge', () => {
  const a = makePkce();
  const b = makePkce();
  assert.equal(a.method, 'S256');
  assert.notEqual(a.verifier, b.verifier, 'a fresh verifier each time');
  assert.notEqual(a.verifier, a.challenge, 'the challenge is not the verifier');
  assert.match(a.challenge, /^[A-Za-z0-9_-]{43}$/, 'base64url of a sha256 digest');
  assert.match(a.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(makeState(), makeState(), 'state is random');
});

test('OA2 the consent URL asks for OFFLINE access and forces a refresh token', () => {
  const pkce = makePkce();
  const url = new URL(buildAuthUrl({
    clientId: 'client-123', redirectUri: 'http://127.0.0.1:9999/callback', challenge: pkce.challenge, state: 'st',
  }));
  assert.equal(`${url.origin}${url.pathname}`, AUTH_ENDPOINT);
  // Both of these are load-bearing: without either, a SECOND authorization
  // returns only an access token and the daily job dies an hour later.
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), pkce.challenge);
  assert.equal(url.searchParams.get('state'), 'st');
  assert.equal(url.searchParams.get('response_type'), 'code');
});

test('OA2b buildAuthUrl refuses to build an insecure request', () => {
  assert.throws(() => buildAuthUrl({ redirectUri: 'x', challenge: 'c' }), OAuthError, 'clientId required');
  assert.throws(() => buildAuthUrl({ clientId: 'x', challenge: 'c' }), OAuthError, 'redirectUri required');
  assert.throws(() => buildAuthUrl({ clientId: 'x', redirectUri: 'y' }), OAuthError, 'PKCE required');
});

// ── Exchange and refresh ────────────────────────────────────────────────────

test('OA3 the code exchange normalizes tokens and NEVER keeps the raw response', async () => {
  const fetchImpl = fakeFetch([tokenResponse()]);
  const tokens = await exchangeCode({
    code: 'auth-code', verifier: makePkce().verifier, clientId: 'cid', clientSecret: 'sec',
    redirectUri: 'http://127.0.0.1:1/callback', fetchImpl, now: Date.parse('2026-09-13T10:00:00Z'),
  });
  assert.equal(tokens.access_token, 'ya29.primary-access-token-value');
  assert.ok(tokens.refresh_token, 'a refresh token is stored');
  assert.equal(tokens.expires_at, '2026-09-13T11:00:00.000Z', 'expiry computed from expires_in');
  // The secret travels in the BODY, never the query string or a header we log.
  const [call] = fetchImpl.calls;
  assert.ok(!call.url.includes('sec'), 'the client secret is not in the URL');
  assert.match(call.init.body, /client_secret=sec/, 'it is in the form body');
});

test('OA4 a rejected exchange is a NAMED error, not a generic failure', async () => {
  const fetchImpl = fakeFetch([{ status: 400, body: { error: 'invalid_grant', error_description: 'Bad Request' } }]);
  await assert.rejects(
    () => exchangeCode({ code: 'x', verifier: 'v', clientId: 'c', clientSecret: 's', redirectUri: 'r', fetchImpl }),
    (e) => e.detail.kind === 'oauth_revoked_or_expired',
    'invalid_grant is reported as revoked/expired, which is the recoverable case',
  );
});

test('OA4b a malformed token response fails closed', async () => {
  const fetchImpl = fakeFetch([{ status: 200, body: '<html>not json</html>' }]);
  await assert.rejects(
    () => exchangeCode({ code: 'x', verifier: 'v', clientId: 'c', clientSecret: 's', redirectUri: 'r', fetchImpl }),
    (e) => e.detail.kind === 'oauth_malformed_response',
  );
  assert.throws(() => normalizeTokens({ nope: true }), OAuthError, 'no access_token is refused');
});

test('OA5 a refresh keeps the EXISTING refresh token when Google omits a new one', async () => {
  const prior = normalizeTokens(tokenResponse().body, { now: 0 });
  const fetchImpl = fakeFetch([{ status: 200, body: { access_token: 'ya29.second-value', expires_in: 3600 } }]);
  const fresh = await refreshAccessToken({
    refreshToken: prior.refresh_token, clientId: 'c', clientSecret: 's', fetchImpl, prior, now: 1000,
  });
  assert.equal(fresh.access_token, 'ya29.second-value');
  assert.equal(fresh.refresh_token, prior.refresh_token, 'the old refresh token survives the refresh');
  assert.equal(fresh.scope, prior.scope, 'and so does the scope');
});

test('OA5b refresh with no refresh token is refused before any request', async () => {
  const fetchImpl = fakeFetch([]);
  await assert.rejects(
    () => refreshAccessToken({ refreshToken: null, clientId: 'c', clientSecret: 's', fetchImpl }),
    (e) => e.detail.kind === 'oauth_no_refresh_token',
  );
  assert.equal(fetchImpl.calls.length, 0, 'no network call was made');
});

// ── Expiry and revocation ───────────────────────────────────────────────────

test('OA6 expiry is evaluated with a skew so a run never races it', () => {
  const now = Date.parse('2026-09-13T10:00:00Z');
  const t = normalizeTokens(tokenResponse().body, { now });
  assert.equal(isExpired(t, { now }), false, 'fresh');
  assert.equal(isExpired(t, { now: now + 3600_000 - EXPIRY_SKEW_MS + 1 }), true, 'inside the skew window');
  assert.equal(isExpired(t, { now: now + 1000 }), false);
  assert.equal(isExpired({ access_token: 'x' }, { now }), false, 'no expiry recorded: try it');
  assert.equal(isExpired(null, { now }), true, 'no token at all is expired');
  assert.equal(isExpired({ access_token: 'x', expires_at: 'garbage' }, { now }), true, 'unparseable expiry fails closed');
});

test('OA6b revocation is RECORDED so the next run reports a reason, not a crash', () => {
  const t = normalizeTokens(tokenResponse().body, { now: 0 });
  assert.equal(isRevoked(t), false);
  const dead = markRevoked(t, { now: 0, reason: 'invalid_grant' });
  assert.equal(isRevoked(dead), true);
  assert.equal(dead.revoked_reason, 'invalid_grant');
});

