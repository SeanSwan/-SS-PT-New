#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/subs.mjs
 * PURPOSE: Sync the owner's real YouTube subscriptions into the creator
 *          catalog — and REFUSE CLEANLY when the OAuth credential is absent.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S7)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHAT THIS CAN AND CANNOT DO (the distinction the whole slice rests on):
 *   The Desktop OAuth client with `youtube.readonly` unlocks
 *   `subscriptions.list(mine=true)` — 1 unit per 50 channels. That is the
 *   owner's real subscription list, and it answers "the creators I already
 *   have" literally.
 *   It does NOT unlock third-party captions. `captions.download` requires
 *   authority to EDIT the video regardless of scope. No OAuth configuration
 *   changes that; timed-text via yt-dlp is the only path that returns
 *   third-party transcript text.
 *
 * WHY THIS IS FAIL-CLOSED AND LOUD:
 *   The dangerous outcome here is not a crash — it is a sync that returns "0
 *   subscriptions" and gets read as "you follow nobody". That would quietly
 *   empty a catalog. So a missing or unreadable credential is a BLOCKED result
 *   carrying the exact unblock steps, never an empty success.
 *
 * SECRET HANDLING:
 *   The client secret is read from `%LOCALAPPDATA%\SwanGuard\`. Never from the
 *   repo, never from `.env`, never placed on a subprocess command line (the
 *   argv is visible to any process on the machine), and never echoed into a run
 *   record or digest.
 *
 * STATUS: the credential does not exist on this machine as of 2026-09-12, so
 * this module currently always returns the blocked result. That is the correct
 * behaviour, and it is asserted by a test.
 *
 * @module creator-brains/subs
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadRegistry, saveRegistry, upsertCreator } from './store.mjs';
import { nowIso } from './paths.mjs';

/** Where the owner's OAuth material lives. Outside every git tree, by design. */
export function defaultCredentialPath(env = process.env) {
  const base = env.LOCALAPPDATA || env.APPDATA || join(homedir(), 'AppData', 'Local');
  return join(base, 'SwanGuard', 'client_secret.json');
}

export function tokenPath(env = process.env) {
  const base = env.LOCALAPPDATA || env.APPDATA || join(homedir(), 'AppData', 'Local');
  return join(base, 'SwanGuard', 'token.json');
}

/** The unblock path, spelled out. Shown verbatim when the lane is blocked. */
export const OAUTH_STEPS = [
  '1. Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID -> type "Desktop app".',
  '2. OAuth consent screen -> Publishing status: set to "In production".',
  '   Leaving it in "Testing" with user type "External" makes Google expire the refresh',
  '   token after 7 days, so the catalog silently freezes on day 8. Internal is not',
  '   available on a personal Google account (Workspace only).',
  '3. Enable the YouTube Data API v3 on that project. Scope needed: youtube.readonly.',
  '4. Save the downloaded JSON as %LOCALAPPDATA%\\SwanGuard\\client_secret.json',
  '   (never in the repo, never in .env, never on a command line).',
  '5. Re-run: node scripts/creator-brains/cli.mjs sync',
];

/** Read + shape-check the credential WITHOUT ever returning its contents. */
function inspectCredential(path) {
  if (!existsSync(path)) return { ok: false, reason: 'oauth_credentials_absent' };
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { ok: false, reason: 'oauth_credentials_unreadable' };
  }
  const block = doc.installed || doc.web || doc;
  const hasId = typeof block.client_id === 'string' && block.client_id.length > 10;
  const hasSecret = typeof block.client_secret === 'string' && block.client_secret.length > 5;
  if (!hasId || !hasSecret) return { ok: false, reason: 'oauth_credentials_malformed' };
  // Return a BARE SHAPE DESCRIPTION — never the values.
  return { ok: true, kind: doc.installed ? 'installed' : 'web', redirects: Array.isArray(block.redirect_uris) ? block.redirect_uris.length : 0 };
}

/**
 * Sync subscriptions into the catalog.
 *
 * `deps.listSubscriptions(credentialPath)` is injected; the default would
 * perform the OAuth exchange. It is never reached while the credential is
 * missing — the gate is before the dependency, not after it.
 *
 * Every new subscription is inserted DISABLED and an unsubscribed channel is
 * marked `lifecycle='unsubscribed'`, never deleted (the F0 upsert rule: could
 * the owner have changed this since the source was authored? then do not
 * overwrite it).
 */
export async function syncSubscriptions({ r, credentialPath = null, now, deps = {} } = {}) {
  const path = credentialPath || defaultCredentialPath();
  const cred = inspectCredential(path);

  if (!cred.ok) {
    return {
      ok: false,
      blocked: true,
      reason: cred.reason,
      credentialPath: path,
      steps: OAUTH_STEPS,
      upserted: 0,
      message: cred.reason === 'oauth_credentials_absent'
        ? `No OAuth client secret at ${path}. The subscription lane is blocked; the manual creator list still works.`
        : `The credential at ${path} could not be used (${cred.reason}).`,
    };
  }

  const list = deps.listSubscriptions;
  if (typeof list !== 'function') {
    return {
      ok: false,
      blocked: true,
      reason: 'oauth_exchange_not_implemented',
      credentialPath: path,
      steps: OAUTH_STEPS,
      upserted: 0,
      message: 'Credential found, but the OAuth exchange is not wired in this build. '
        + 'Use the manual creator list (`add`) until it is.',
    };
  }

  let subs;
  try {
    subs = await list(path);
  } catch (e) {
    // A failed exchange is TRANSIENT, not an empty catalog.
    return {
      ok: false, blocked: true, reason: 'oauth_exchange_failed',
      credentialPath: path, steps: OAUTH_STEPS, upserted: 0, message: e.message,
    };
  }
  if (!Array.isArray(subs)) {
    return { ok: false, blocked: true, reason: 'oauth_returned_non_array', credentialPath: path, steps: OAUTH_STEPS, upserted: 0 };
  }

  const reg = loadRegistry(r);
  const seen = new Set();
  let upserted = 0;
  for (const s of subs) {
    if (!s || !/^UC[A-Za-z0-9_-]{22}$/.test(String(s.channelId || ''))) continue;
    seen.add(s.channelId);
    const existing = reg.creators[s.channelId];
    const creator = upsertCreator(reg, {
      channelId: s.channelId,
      title: s.title || s.channelId,
      url: `https://www.youtube.com/channel/${s.channelId}/videos`,
      lifecycle: 'subscribed',
      lastSyncAt: nowIso(now),
    }, { now: now ? now() : Date.now() });
    // Never auto-enable, and never resurrect a channel the owner disabled.
    if (!existing) creator.enabled = false;
    upserted += 1;
  }
  for (const c of Object.values(reg.creators)) {
    if (c.lifecycle === 'subscribed' && !seen.has(c.channelId)) {
      c.lifecycle = 'unsubscribed'; // marked, NOT deleted
    }
  }
  saveRegistry(reg, r);

  return { ok: true, blocked: false, reason: null, upserted, credentialPath: path, steps: [] };
}
