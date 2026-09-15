#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/oauth.mjs
 * PURPOSE: The Google OAuth 2.0 desktop flow the subscription lane needs —
 *          PKCE, loopback callback, token exchange, refresh, and token storage
 *          OUTSIDE every git tree.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS EXISTS (review finding HR10):
 *   The previous version reported `oauth_credentials_absent` and framed a missing
 *   FILE as the only blocker. The reviewer supplied a valid synthetic credential
 *   and got `oauth_exchange_not_implemented` — the exchange had never been
 *   written. Supplying a secret would not have made the documented workflow work.
 *
 * WHAT IS AND IS NOT DONE HERE:
 *   The OFFLINE-CONTRACT half is implemented and fully testable without a
 *   network: PKCE, URL construction, code exchange, refresh, expiry, revocation
 *   detection, and token persistence. The INTERACTIVE half — the loopback
 *   redirect — lives in `consent.mjs` and takes its I/O as injected functions.
 *
 *   **Live authorization has NOT been performed.** No consent has been granted,
 *   no real token exists, and `sync` reports BLOCKED until an owner completes
 *   consent. That boundary is stated rather than implied.
 *
 * SECRET CONTAINMENT:
 *   - The client secret and tokens are read from `%LOCALAPPDATA%\SwanGuard\`,
 *     never from the repo, never from `.env`, never from argv.
 *   - Nothing in this module logs a token, and `redactOAuth` scrubs the shapes a
 *     token takes before a message can reach a digest or a run record.
 *   - Token files are written with `mode: 0o600` where the platform honours it.
 *
 * @module creator-brains/oauth
 */

import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** The only scope this lane needs. Read-only, and enough for subscriptions.list. */
export const YOUTUBE_READONLY = 'https://www.googleapis.com/auth/youtube.readonly';

export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/** Refresh this long before actual expiry, so a daily run never races it. */
export const EXPIRY_SKEW_MS = 5 * 60_000;

/** Default bound on the interactive wait. Cancel is always available. */
export const DEFAULT_CONSENT_TIMEOUT_MS = 5 * 60_000;

export class OAuthError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'OAuthError';
    this.detail = detail;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PKCE (RFC 7636)
// ─────────────────────────────────────────────────────────────────────────────

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A fresh PKCE verifier + S256 challenge. The verifier never leaves the process. */
export function makePkce(bytes = 32) {
  const verifier = b64url(randomBytes(bytes));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

/** An opaque `state` for CSRF. Compared on the way back, constant-time-ish. */
export function makeState(bytes = 16) {
  return b64url(randomBytes(bytes));
}

// ─────────────────────────────────────────────────────────────────────────────
// URLs and requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The consent URL. `access_type=offline` + `prompt=consent` is what makes Google
 * return a REFRESH token; without either, a second authorization silently
 * returns only an access token and the daily job dies an hour later.
 */
export function buildAuthUrl({
  clientId, redirectUri, challenge, state, scope = YOUTUBE_READONLY,
} = {}) {
  if (!clientId) throw new OAuthError('clientId is required');
  if (!redirectUri) throw new OAuthError('redirectUri is required');
  if (!challenge) throw new OAuthError('code challenge is required (PKCE)');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    state: state || '',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** POST a form and return parsed JSON, or throw a NAMED error. */
async function postForm(endpoint, form, fetchImpl, { timeoutMs = 30_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    // A timeout and a transport failure are both TRANSIENT and both named.
    const kind = e && e.name === 'AbortError' ? 'oauth_timeout' : 'oauth_transport_error';
    throw new OAuthError(`${kind}: ${e && e.message ? e.message : e}`, { kind });
  }
  clearTimeout(timer);

  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* keep null; reported below */ }

  if (!res.ok) {
    const error = (body && body.error) || `http_${res.status}`;
    const description = (body && body.error_description) || '';
    // `invalid_grant` is how Google reports an expired or revoked refresh token.
    const kind = error === 'invalid_grant' ? 'oauth_revoked_or_expired' : 'oauth_token_endpoint_error';
    throw new OAuthError(`${kind}: ${error}${description ? ` — ${description}` : ''}`, { kind, status: res.status, error });
  }
  if (!body || typeof body !== 'object') {
    throw new OAuthError('oauth_malformed_response: token endpoint did not return JSON', { kind: 'oauth_malformed_response' });
  }
  return body;
}

/** Turn a token response into our stored shape. Validates what we depend on. */
export function normalizeTokens(body, { now = Date.now(), prior = null } = {}) {
  if (!body || typeof body.access_token !== 'string' || !body.access_token) {
    throw new OAuthError('oauth_malformed_response: no access_token', { kind: 'oauth_malformed_response' });
  }
  const expiresIn = Number(body.expires_in);
  return {
    access_token: body.access_token,
    // A refresh response usually omits refresh_token; KEEP the one we have.
    refresh_token: typeof body.refresh_token === 'string' && body.refresh_token
      ? body.refresh_token
      : (prior && prior.refresh_token) || null,
    token_type: body.token_type || 'Bearer',
    scope: body.scope || (prior && prior.scope) || null,
    expires_at: Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(now + expiresIn * 1000).toISOString()
      : null,
    obtained_at: new Date(now).toISOString(),
  };
}

export async function exchangeCode({
  code, verifier, clientId, clientSecret, redirectUri, fetchImpl, now = Date.now(), timeoutMs,
} = {}) {
  if (!code) throw new OAuthError('authorization code is required');
  if (!verifier) throw new OAuthError('PKCE verifier is required');
  const body = await postForm(TOKEN_ENDPOINT, {
    code,
    code_verifier: verifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }, fetchImpl, { timeoutMs });
  return normalizeTokens(body, { now });
}

export async function refreshAccessToken({
  refreshToken, clientId, clientSecret, fetchImpl, now = Date.now(), prior = null, timeoutMs,
} = {}) {
  if (!refreshToken) throw new OAuthError('refresh token is required', { kind: 'oauth_no_refresh_token' });
  const body = await postForm(TOKEN_ENDPOINT, {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  }, fetchImpl, { timeoutMs });
  return normalizeTokens(body, { now, prior });
}

/** Best-effort revocation. Never throws — a failed revoke must not mask the rest. */
export async function revokeToken({ token, fetchImpl, timeoutMs = 15_000 } = {}) {
  try {
    await postForm(REVOKE_ENDPOINT, { token }, fetchImpl, { timeoutMs });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expiry
// ─────────────────────────────────────────────────────────────────────────────

/** Is the access token expired (or close enough that a run would race it)? */
export function isExpired(tokens, { now = Date.now(), skewMs = EXPIRY_SKEW_MS } = {}) {
  if (!tokens || !tokens.access_token) return true;
  if (!tokens.expires_at) return false; // no expiry recorded: try it, refresh on 401
  const at = Date.parse(tokens.expires_at);
  if (!Number.isFinite(at)) return true;
  return at - skewMs <= now;
}

export function isRevoked(tokens) {
  return !!(tokens && tokens.revoked_at);
}

/** Mark a token document revoked, so a later run reports a REASON, not a crash. */
export function markRevoked(tokens, { now = Date.now(), reason = 'invalid_grant' } = {}) {
  return { ...tokens, revoked_at: new Date(now).toISOString(), revoked_reason: reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage — outside every git tree
// ─────────────────────────────────────────────────────────────────────────────

/** The owner-private directory. Mirrors `subs.defaultCredentialPath`'s base. */
export function oauthDir(env = process.env) {
  const base = env.LOCALAPPDATA || env.APPDATA || join(homedir(), 'AppData', 'Local');
  return join(base, 'SwanGuard');
}

export function defaultTokenPath(env = process.env) {
  return join(oauthDir(env), 'token.json');
}

export function defaultCredentialPath(env = process.env) {
  return join(oauthDir(env), 'client_secret.json');
}

/** Read the installed-app client. Returns the two secrets, never logs them. */
export function readClient(path) {
  if (!existsSync(path)) throw new OAuthError(`no OAuth client at ${path}`, { kind: 'oauth_credentials_absent' });
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    throw new OAuthError(`OAuth client at ${path} is unreadable: ${e.message}`, { kind: 'oauth_credentials_unreadable' });
  }
  const block = doc.installed || doc.web || doc;
  if (typeof block.client_id !== 'string' || typeof block.client_secret !== 'string') {
    throw new OAuthError(`OAuth client at ${path} is missing client_id or client_secret`, { kind: 'oauth_credentials_malformed' });
  }
  return { clientId: block.client_id, clientSecret: block.client_secret };
}

export function saveTokens(tokens, path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(tokens, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 });
  try { chmodSync(path, 0o600); } catch { /* best effort on platforms without modes */ }
  return path;
}

export function loadTokens(path) {
  if (!existsSync(path)) return null;
  try {
    const doc = JSON.parse(readFileSync(path, 'utf-8'));
    return doc && typeof doc === 'object' ? doc : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redaction
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_SHAPES = [
  /\bya29\.[A-Za-z0-9._~-]{10,}/g,
  /\b1\/\/[A-Za-z0-9._-]{20,}/g,
  /\bGOCSPX-[A-Za-z0-9_-]{5,}/g,
  /\b[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,}/g,
];

/** Scrub anything token-shaped, plus any literal value the caller names. */
export function redactOAuth(text, extra = []) {
  let out = String(text ?? '');
  for (const value of extra) {
    if (typeof value === 'string' && value.length >= 8) out = out.split(value).join('<REDACTED>');
  }
  for (const re of TOKEN_SHAPES) out = out.replace(re, '<REDACTED>');
  return out;
}
