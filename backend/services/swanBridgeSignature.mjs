/**
 * swanBridgeSignature.mjs
 * ========================
 * HMAC-SHA256 verification for the SwanGuard → SwanStudios Spotlight bridge.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.1
 *
 * Wire format:
 *   X-Swan-Signature: sha256=<hex>
 *   X-Swan-Timestamp: <ISO 8601>
 *   X-Swan-Idempotency-Key: <itemId>@<revision>
 *   canonical string = `${timestamp}.${rawBody}`
 *
 * Safety properties inherited from the PLAUD precedent (services/plaudWebhookSignature.mjs),
 * which exists because of Codex CR/M findings on this exact class of code:
 *   - hex shape is validated BEFORE crypto.timingSafeEqual, so a malformed signature
 *     returns 401 instead of throwing a length-mismatch 500 (M-1)
 *   - comparison is constant-time
 *   - a missing/short secret never leaks which env var was consulted
 */
import crypto from 'node:crypto';

const SIG_REGEX = /^sha256=[0-9a-f]{64}$/i;
export const DEFAULT_SKEW_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;

/** Read + shape-validate the signature header. */
export function parseSignatureHeader(value) {
  if (typeof value !== 'string' || !SIG_REGEX.test(value.trim())) return null;
  return value.trim().slice('sha256='.length).toLowerCase();
}

/** ISO timestamp must parse and sit inside the skew window. */
export function isTimestampInWindow(timestamp, nowMs = Date.now(), skewSeconds = DEFAULT_SKEW_SECONDS) {
  if (typeof timestamp !== 'string' || timestamp.length === 0) return false;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(nowMs - parsed) <= skewSeconds * 1000;
}

export function buildCanonicalPayload(timestamp, rawBody) {
  if (!Buffer.isBuffer(rawBody)) throw new Error('buildCanonicalPayload: rawBody must be a Buffer');
  return `${timestamp}.${rawBody.toString('utf8')}`;
}

/** Constant-time HMAC compare. `sigHex` must already be shape-validated. */
export function verifyHmac(canonicalPayload, sigHex, secret) {
  const expected = crypto.createHmac('sha256', secret).update(canonicalPayload).digest();
  let provided;
  try {
    provided = Buffer.from(sigHex, 'hex');
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/** Signer used by tests and by any local tooling that needs a valid payload. */
export function signPayload(timestamp, rawBody, secret) {
  return `sha256=${crypto
    .createHmac('sha256', secret)
    .update(buildCanonicalPayload(timestamp, rawBody))
    .digest('hex')}`;
}

/**
 * Resolve the shared secret. Throws on missing/short — the caller maps that to a 401
 * WITHOUT echoing the message, so the env var name is never disclosed.
 */
export function resolveBridgeSecret(env = process.env) {
  const secret = env.SWAN_BRIDGE_SECRET_V1;
  if (!secret) throw new Error('SWAN_BRIDGE_SECRET_V1 not set');
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SWAN_BRIDGE_SECRET_V1 too short (${secret.length} < ${MIN_SECRET_LENGTH})`);
  }
  return secret;
}

/**
 * Verify an inbound bridge request.
 * -> { ok: true }
 * -> { ok: false, status, code }   (status is 401 for every authentication failure)
 */
export function verifyBridgeRequest(req, { nowMs = Date.now(), secretResolver = resolveBridgeSecret } = {}) {
  const sigHex = parseSignatureHeader(req.headers['x-swan-signature']);
  if (!sigHex) return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };

  const timestamp = req.headers['x-swan-timestamp'];
  if (!isTimestampInWindow(timestamp, nowMs)) {
    return { ok: false, status: 401, code: 'SIGNATURE_EXPIRED' };
  }

  if (!Buffer.isBuffer(req.rawBody)) {
    // The bridge path must be excluded from the global JSON parser so raw bytes survive
    // (backend/core/middleware/index.mjs path filter). If this fires, the mount order regressed.
    return { ok: false, status: 500, code: 'RAW_BODY_UNAVAILABLE' };
  }

  let secret;
  try {
    secret = secretResolver();
  } catch {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }

  const canonical = buildCanonicalPayload(timestamp, req.rawBody);
  if (!verifyHmac(canonical, sigHex, secret)) {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }
  return { ok: true };
}
