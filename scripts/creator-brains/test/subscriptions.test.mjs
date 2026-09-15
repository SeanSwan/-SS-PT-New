#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/subscriptions.test.mjs
 * PURPOSE: The paginated subscriptions adapter, its COMPLETENESS gate, and
 *          secret containment (HR10).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THIS FILE IS ABOUT THE DANGEROUS OUTCOMES, WHICH ARE NOT "THE REQUEST FAILED".
 *
 *   They are the ones that LOOK like success: page one returns 50 rows and page
 *   two 500s; a `nextPageToken` repeats until the page cap; a 200 arrives with a
 *   renamed field and parses to zero rows. All three present an EMPTY OR PARTIAL
 *   result as authoritative absence, and a caller that believes it marks the
 *   owner's other creators `unsubscribed`.
 *
 *   "You follow nobody" and "page two failed" look identical downstream, and one
 *   of them silently discards the catalog.
 *
 * Sibling file: `oauth.test.mjs` (PKCE, exchange, refresh, expiry, revocation).
 *
 * RUN: node --test scripts/creator-brains/test/subscriptions.test.mjs
 * @module creator-brains/test/subscriptions
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from './helpers.mjs';
import {
  normalizeTokens, saveTokens, loadTokens, redactOAuth, exchangeCode, readClient, OAuthError,
} from '../lib/oauth.mjs';
import {
  listSubscriptions, listSubscriptionsWithRefresh, normalizeRow, isEmptyButComplete, PAGE_SIZE,
} from '../lib/subscriptions.mjs';
import { applySnapshot } from '../lib/subs.mjs';

const A = 'UC' + 'a'.repeat(22);
const B = 'UC' + 'b'.repeat(22);
const C = 'UC' + 'c'.repeat(22);

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
// ── Pagination and the completeness gate ────────────────────────────────────

test('OA7 MORE THAN 50 subscriptions are fetched across pages and reported complete', async () => {
  const p1 = Array.from({ length: 50 }, (_, i) => subItem(`UC${String(i).padStart(22, 'a').slice(0, 22)}`));
  const p2 = Array.from({ length: 50 }, (_, i) => subItem(`UC${String(i + 50).padStart(22, 'b').slice(0, 22)}`));
  const p3 = [subItem(C)];
  const fetchImpl = fakeFetch([page(p1, 'CURSOR-2'), page(p2, 'CURSOR-3'), page(p3)]);

  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.pages, 3, 'three pages walked');
  assert.equal(snap.rows.length, 101, 'one row per distinct channel');
  assert.equal(snap.complete, true, 'a full walk is COMPLETE');
  assert.equal(snap.invalid.length, 0);

  const [first] = fetchImpl.calls;
  assert.match(first.url, /mine=true/, 'it asks for the OWNER list');
  assert.match(first.url, new RegExp(`maxResults=${PAGE_SIZE}`));
  assert.match(first.init.headers.authorization, /^Bearer /);
});

test('OA7b a failure AFTER PAGE ONE is incomplete and names the reason', async () => {
  const p1 = Array.from({ length: 50 }, (_, i) => subItem(`UC${String(i).padStart(22, 'd').slice(0, 22)}`));
  const fetchImpl = fakeFetch([page(p1, 'CURSOR-2'), { status: 500, body: {} }]);

  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.complete, false, 'a partial walk is NOT the subscription list');
  assert.equal(snap.errorKind, 'subscriptions_http_error');
  assert.equal(snap.rows.length, 50, 'what arrived is kept');
  assert.match(snap.reason, /500/);
});

test('OA7c a VALID ZERO result is complete, and distinguishable from a failure', async () => {
  const fetchImpl = fakeFetch([page([])]);
  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.complete, true, 'following nobody is a legitimate complete answer');
  assert.equal(snap.rows.length, 0);
  assert.equal(isEmptyButComplete(snap), true);

  const failed = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl: fakeFetch([{ status: 500, body: {} }]) });
  assert.equal(failed.complete, false);
  assert.equal(isEmptyButComplete(failed), false, 'a FAILURE is not an empty subscription list');
});

test('OA8 a malformed page fails closed rather than parsing to zero rows', async () => {
  const fetchImpl = fakeFetch([{ status: 200, body: { kind: 'youtube#subscriptionListResponse' } }]);
  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.complete, false);
  assert.equal(snap.errorKind, 'subscriptions_malformed_response');
  assert.equal(snap.rows.length, 0);
});

test('OA8b a REPEATING cursor is refused instead of looping to the page cap', async () => {
  const p1 = [subItem(A)];
  const fetchImpl = fakeFetch([page(p1, 'SAME'), page(p1, 'SAME'), page(p1, 'SAME')]);
  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.cursorLoop, true);
  assert.equal(snap.complete, false);
  assert.equal(snap.pages, 2, 'it stops at the repeat, not at the cap');
});

test('OA8c an unreadable row is counted, and makes the walk incomplete', async () => {
  assert.equal(normalizeRow({ snippet: {} }).row, null, 'no channelId means no row');
  assert.equal(normalizeRow({ snippet: { resourceId: { channelId: 'nope' } } }).row, null);
  const fetchImpl = fakeFetch([page([subItem(A), { id: 'x', snippet: {} }])]);
  const snap = await listSubscriptions({ accessToken: 'ya29.x', fetchImpl });
  assert.equal(snap.rows.length, 1);
  assert.equal(snap.invalid.length, 1);
  assert.equal(snap.complete, false, 'an unreadable row means we do not know the full list');
});

test('OA8d a 401 refreshes ONCE and retries; a second 401 is reported as revoked', async () => {
  let refreshed = 0;
  const okFetch = fakeFetch([{ status: 401, body: {} }, page([subItem(A)])]);
  const ok = await listSubscriptionsWithRefresh({
    tokens: { access_token: 'stale' }, fetchImpl: okFetch,
    refresh: async () => { refreshed += 1; return { access_token: 'fresh' }; },
  });
  assert.equal(refreshed, 1, 'refreshed exactly once');
  assert.equal(ok.complete, true);
  assert.equal(ok.refreshed, true);

  let tries = 0;
  const deadFetch = fakeFetch([{ status: 401, body: {} }, { status: 401, body: {} }]);
  const dead = await listSubscriptionsWithRefresh({
    tokens: { access_token: 'stale' }, fetchImpl: deadFetch,
    refresh: async () => { tries += 1; return { access_token: 'still-bad' }; },
  });
  assert.equal(dead.revoked, true, 'a second 401 is REVOKED, not a retry loop');
  assert.equal(dead.complete, false);
  assert.equal(tries, 1, 'and it does not keep refreshing');
});

// ── The catalog gate ────────────────────────────────────────────────────────

test('OA9 an INCOMPLETE snapshot never marks a creator unsubscribed', () => {
  const reg = {
    version: 1,
    creators: {
      [A]: { channelId: A, lifecycle: 'subscribed', enabled: true, title: 'Alpha' },
      [B]: { channelId: B, lifecycle: 'subscribed', enabled: false, title: 'Beta — manually added' },
    },
  };
  // B is absent from a PARTIAL page.
  const partial = applySnapshot(reg, { rows: [{ channelId: A, title: 'Alpha' }], complete: false });
  assert.equal(reg.creators[B].lifecycle, 'subscribed', 'a partial snapshot must not unsubscribe B');
  assert.equal(partial.markedUnsubscribed, 0);

  // A complete snapshot that genuinely omits B may mark it.
  const full = applySnapshot(reg, { rows: [{ channelId: A, title: 'Alpha' }], complete: true });
  assert.equal(reg.creators[B].lifecycle, 'unsubscribed', 'a COMPLETE snapshot may mark it');
  assert.equal(full.markedUnsubscribed, 1);
});

test('OA9b a sync never enables a creator and never resurrects a disabled one', () => {
  const reg = {
    version: 1,
    creators: {
      [A]: { channelId: A, lifecycle: 'subscribed', enabled: false, title: 'Alpha' },
      [B]: { channelId: B, lifecycle: 'subscribed', enabled: true, title: 'Beta' },
    },
  };
  applySnapshot(reg, { rows: [{ channelId: A, title: 'Alpha' }, { channelId: B, title: 'Beta' }, { channelId: C, title: 'Gamma' }], complete: true });
  assert.equal(reg.creators[A].enabled, false, 'a disabled creator stays disabled');
  assert.equal(reg.creators[B].enabled, true, 'an enabled one is untouched');
  assert.equal(reg.creators[C].enabled, false, 'and a NEW one is born disabled');
  assert.equal(reg.creators[A].lifecycle, 'subscribed');
});

// ── Secret containment ──────────────────────────────────────────────────────

test('OA10 no secret reaches a log line, an error, an argv or an artifact', async () => {
  const SECRET = 'GOCSPX-super-secret-client-value';
  const ACCESS = 'ya29.this-is-a-real-looking-access-token';
  const REFRESH = '1//0abcdefghijklmnopqrstuvwxyz-REFRESH';

  // An error message that a transport wrapped around the request.
  const leaky = redactOAuth(`token exchange failed: access_token=${ACCESS} refresh=${REFRESH} secret=${SECRET}`);
  assert.ok(!leaky.includes(ACCESS), 'the access token is gone');
  assert.ok(!leaky.includes(REFRESH), 'the refresh token is gone');
  assert.ok(!leaky.includes(SECRET), 'the client secret is gone');
  assert.match(leaky, /REDACTED/);

  // A fetch that echoes the request back in its error must still not leak.
  const fetchImpl = fakeFetch([{ throws: `connect failed for Bearer ${ACCESS}`, name: 'Error' }]);
  await assert.rejects(
    () => exchangeCode({ code: 'c', verifier: 'v', clientId: 'id', clientSecret: SECRET, redirectUri: 'r', fetchImpl }),
    (e) => {
      assert.ok(!e.message.includes(SECRET), 'the secret is not in the error');
      return true;
    },
  );
});

test('OA10b tokens are stored 0600 outside the repo and never returned for display', async () => {
  const dir = tempRoot('cb-oauth-store');
  const path = join(dir, 'token.json');
  const tokens = normalizeTokens(tokenResponse().body, { now: 0 });
  saveTokens(tokens, path);

  const reread = loadTokens(path);
  assert.equal(reread.access_token, tokens.access_token, 'round-trips');
  const raw = readFileSync(path, 'utf-8');
  assert.ok(raw.includes('refresh_token'), 'the refresh token IS persisted (it must be)');
  // …but nothing in the API surface hands it back for printing.
  assert.equal(typeof redactOAuth(raw, [tokens.access_token]).includes(tokens.access_token), 'boolean');
  assert.ok(!redactOAuth(raw, [tokens.access_token]).includes(tokens.access_token), 'and it scrubs on demand');
});

test('OA10c readClient reports a NAMED problem for each malformed credential', async () => {
  const dir = tempRoot('cb-oauth-cred');
  const missing = join(dir, 'nope.json');
  assert.throws(() => readClient(missing), (e) => e.detail.kind === 'oauth_credentials_absent');

  const broken = join(dir, 'broken.json');
  writeFileSync(broken, '{ not json', 'utf-8');
  assert.throws(() => readClient(broken), (e) => e.detail.kind === 'oauth_credentials_unreadable');

  const partial = join(dir, 'partial.json');
  writeFileSync(partial, JSON.stringify({ installed: { client_id: 'only-id' } }), 'utf-8');
  assert.throws(() => readClient(partial), (e) => e.detail.kind === 'oauth_credentials_malformed');

  const good = join(dir, 'good.json');
  writeFileSync(good, JSON.stringify({ installed: { client_id: 'the-id', client_secret: 'the-secret' } }), 'utf-8');
  assert.deepEqual(readClient(good), { clientId: 'the-id', clientSecret: 'the-secret' });
});
