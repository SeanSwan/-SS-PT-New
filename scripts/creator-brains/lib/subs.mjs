#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/subs.mjs
 * PURPOSE: Sync the owner's YouTube subscriptions into the catalog — with the
 *          completeness gate, honest status, and NO secret ever leaving the
 *          owner-private directory.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHERE THIS STANDS — read this before trusting a status line:
 *
 *   The OAuth EXCHANGE is now implemented (`oauth.mjs`), the interactive consent
 *   flow is implemented (`consent.mjs`), and the paginated adapter with its
 *   completeness verdict is implemented (`subscriptions.mjs`). All three are
 *   covered by offline tests with injected transports.
 *
 *   **Live authorization has NOT been performed.** No owner has completed
 *   consent, no real token exists on this machine, and this function therefore
 *   reports `oauth_not_authorized` with the command to run. That is a different
 *   statement from "it works" and it is the one being made.
 *
 * THE RULE THAT DECIDES THE WHOLE FILE:
 *   Marking a creator `unsubscribed` requires `complete === true` from the
 *   adapter. An incomplete snapshot updates what it has and leaves lifecycle
 *   ALONE, and says so. "You follow nobody" and "page two failed" look identical
 *   downstream, and one of them silently discards the owner's catalog.
 *
 * @module creator-brains/subs
 */

import {
  oauthDir, defaultCredentialPath, defaultTokenPath, readClient, loadTokens, saveTokens,
  isExpired, isRevoked, markRevoked, refreshAccessToken, redactOAuth, OAuthError,
} from './oauth.mjs';
import { listSubscriptionsWithRefresh } from './subscriptions.mjs';
import {
  readRegistry, registryOrDefault, isDamaged, describeRead, saveRegistry, upsertCreator,
} from './store.mjs';

export { defaultCredentialPath, defaultTokenPath, oauthDir };

/** Implementation status, stated once so every surface reports the same thing. */
export const OAUTH_STATUS = Object.freeze({
  exchangeImplemented: true,
  consentImplemented: true,
  liveAuthorizationPerformed: false,
  reason: 'oauth_not_authorized',
  detail: 'The OAuth exchange, consent flow and paginated subscriptions adapter are '
    + 'implemented and offline-tested. No owner has completed consent on this machine, '
    + 'so no token exists and live sync is BLOCKED until that happens. '
    + 'Run: node scripts/creator-brains/cli.mjs authorize',
});

/** The unblock path, spelled out. Shown verbatim when the lane is blocked. */
export const OAUTH_STEPS = [
  '1. Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID -> "Desktop app".',
  '2. OAuth consent screen -> Publishing status: "In production".',
  '   Left in "Testing" with user type "External", Google expires the refresh token after',
  '   7 days and the catalog silently freezes on day 8. "Internal" is Workspace-only.',
  '3. Enable the YouTube Data API v3. Scope: https://www.googleapis.com/auth/youtube.readonly',
  '4. Save the downloaded JSON to %LOCALAPPDATA%\\SwanGuard\\client_secret.json',
  '   (never in the repo, never in .env, never on a command line).',
  '5. Run: node scripts/creator-brains/cli.mjs authorize',
  '6. Then: node scripts/creator-brains/cli.mjs sync',
];

/** Read + shape-check the credential WITHOUT ever returning its contents. */
export function inspectCredential(path) {
  try {
    const { clientId } = readClient(path);
    // A BARE SHAPE DESCRIPTION — never the values, not even a prefix.
    return { ok: true, clientIdLength: clientId.length };
  } catch (e) {
    return { ok: false, reason: (e.detail && e.detail.kind) || 'oauth_credentials_unreadable' };
  }
}

/**
 * Apply a subscription snapshot to the registry.
 *
 * THE COMPLETENESS GATE: `snapshot.complete` must be true before any creator is
 * marked unsubscribed. A partial snapshot updates what it has and leaves
 * lifecycle alone.
 */
export function applySnapshot(reg, snapshot, { now = Date.now() } = {}) {
  const subs = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const seen = new Set();
  let added = 0;
  let refreshed = 0;

  for (const s of subs) {
    if (!s || !/^UC[A-Za-z0-9_-]{22}$/.test(String(s.channelId || ''))) continue;
    seen.add(s.channelId);
    const existing = reg.creators[s.channelId];
    const creator = upsertCreator(reg, {
      channelId: s.channelId,
      title: s.title || s.channelId,
      lifecycle: 'subscribed',
      lastSyncAt: new Date(now).toISOString(),
    }, { now });
    // Never auto-enable, and never resurrect a channel the owner disabled.
    if (!existing) creator.enabled = false;
    if (existing) refreshed += 1; else added += 1;
  }

  let markedUnsubscribed = 0;
  if (snapshot.complete === true) {
    for (const c of Object.values(reg.creators)) {
      if (c.lifecycle === 'subscribed' && !seen.has(c.channelId)) {
        c.lifecycle = 'unsubscribed'; // marked, NOT deleted
        markedUnsubscribed += 1;
      }
    }
  }

  return {
    added, refreshed, markedUnsubscribed, complete: snapshot.complete === true,
  };
}

/** A blocked result, so the shape is identical on every refusal path. */
function blocked(reason, message, extra = {}) {
  return {
    ok: false, blocked: true, reason, message, steps: OAUTH_STEPS, upserted: 0, ...extra,
  };
}

/**
 * Produce the tokens to call the API with, refreshing if needed.
 * Returns `{ ok, tokens }` or `{ ok: false, reason, message }`.
 */
export async function ensureAccessToken({
  tokenPath, client, fetchImpl, now = Date.now(), save = saveTokens, load = loadTokens,
} = {}) {
  const tokens = load(tokenPath);
  if (!tokens) {
    return { ok: false, reason: 'oauth_not_authorized', message: OAUTH_STATUS.detail };
  }
  if (isRevoked(tokens)) {
    return {
      ok: false,
      reason: 'oauth_revoked',
      message: `The stored token was revoked (${tokens.revoked_reason || 'reason unknown'}). Re-run: cli.mjs authorize`,
    };
  }
  if (!isExpired(tokens, { now })) return { ok: true, tokens, refreshed: false };

  if (!tokens.refresh_token) {
    return {
      ok: false,
      reason: 'oauth_no_refresh_token',
      message: 'The stored token has expired and carries no refresh token. Re-run: cli.mjs authorize',
    };
  }
  try {
    const fresh = await refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      fetchImpl,
      now,
      prior: tokens,
    });
    save(fresh, tokenPath);
    return { ok: true, tokens: fresh, refreshed: true };
  } catch (e) {
    const kind = (e.detail && e.detail.kind) || 'oauth_refresh_failed';
    if (kind === 'oauth_revoked_or_expired') {
      // Mark it, so the NEXT run reports a reason instead of retrying a dead token.
      save(markRevoked(tokens, { now, reason: 'invalid_grant' }), tokenPath);
      return {
        ok: false,
        reason: 'oauth_revoked',
        message: 'Google rejected the refresh token — it was revoked or expired. Re-run: cli.mjs authorize',
      };
    }
    return { ok: false, reason: kind, message: redactOAuth(e.message) };
  }
}

/**
 * Sync subscriptions into the catalog.
 *
 * `deps` may inject `fetchImpl`, `client`, `load`, `save` and `now` for tests.
 * Nothing here needs a network to exercise every branch.
 */
export async function syncSubscriptions({
  r, credentialPath = null, tokenStorePath = null, now, deps = {},
} = {}) {
  const credPath = credentialPath || defaultCredentialPath();
  const tokPath = tokenStorePath || defaultTokenPath();
  const fetchImpl = deps.fetchImpl;
  const clock = now || (() => Date.now());

  // The registry is authoritative owner state; a damaged one blocks the write.
  const registryRead = readRegistry(r);
  if (isDamaged(registryRead)) {
    return blocked(
      'registry_unreadable',
      `registry.json is ${describeRead(registryRead)} — refusing to write over the creator catalog.`,
    );
  }

  const cred = inspectCredential(credPath);
  if (!cred.ok) {
    return blocked(cred.reason, cred.reason === 'oauth_credentials_absent'
      ? `No OAuth client secret at ${credPath}. The subscription lane is BLOCKED.`
      : `The credential at ${credPath} could not be used (${cred.reason}).`);
  }

  let client;
  try {
    client = deps.client || readClient(credPath);
  } catch (e) {
    return blocked((e.detail && e.detail.kind) || 'oauth_credentials_unreadable', redactOAuth(e.message));
  }

  const tokenResult = await ensureAccessToken({
    tokenPath: tokPath,
    client,
    fetchImpl,
    now: clock(),
    load: deps.load || loadTokens,
    save: deps.save || saveTokens,
  });
  if (!tokenResult.ok) {
    return blocked(tokenResult.reason, tokenResult.message, { tokenPath: tokPath });
  }

  const snapshot = await listSubscriptionsWithRefresh({
    tokens: tokenResult.tokens,
    pageSize: deps.pageSize,
    maxPages: deps.maxPages,
    fetchImpl,
    now: clock(),
    refresh: async () => {
      const again = await ensureAccessToken({
        tokenPath: tokPath,
        client,
        fetchImpl,
        now: clock(),
        load: () => ({ ...tokenResult.tokens, expires_at: new Date(0).toISOString() }),
        save: deps.save || saveTokens,
      });
      if (!again.ok) throw new OAuthError(again.message, { kind: again.reason });
      return again.tokens;
    },
  });

  const reg = registryOrDefault(registryRead);
  const applied = applySnapshot(reg, snapshot, { now: clock() });
  // Even a partial snapshot's ROWS are worth keeping; only lifecycle is gated.
  saveRegistry(reg, r);

  return {
    ok: snapshot.complete === true,
    blocked: false,
    reason: snapshot.complete ? null : (snapshot.errorKind || 'subscriptions_incomplete'),
    credentialPath: credPath,
    tokenPath: tokPath,
    steps: [],
    pages: snapshot.pages,
    snapshotComplete: applied.complete,
    invalidRows: snapshot.invalid.length,
    upserted: applied.added + applied.refreshed,
    ...applied,
    note: applied.complete
      ? null
      : `snapshot was INCOMPLETE (${snapshot.reason}) — no creator was marked unsubscribed`,
  };
}
