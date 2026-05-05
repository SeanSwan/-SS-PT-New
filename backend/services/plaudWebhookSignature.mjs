/**
 * plaudWebhookSignature.mjs
 * ==========================
 * HMAC-SHA256 signature verification + atomic nonce claim for incoming
 * PLAUD webhook events (Applaud bridge in v1; future sources via §4.3
 * key-version pattern).
 *
 * Phase 5 Slice 5.2 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §4.
 *
 * Public API (composes into the verify() flow described in plan §4.2):
 *   parseSignatureHeader(value) -> {t, nonce, sig} | null
 *   validateSignatureShape({t, nonce, sig}) -> bool   (hex format + length, M-1)
 *   isTimestampInWindow(t, nowSec, windowSec=300) -> bool
 *   computeBodyHash(rawBody) -> hex string
 *   buildCanonicalPayload({t, nonce, eventType, recordingId, bodyHash}) -> string
 *   verifyHmac(canonicalPayload, sigHex, secret) -> bool   (constant-time)
 *   resolveWebhookSecret(keyId) -> string | throws        (env-var lookup, §4.3)
 *   verifyBodyConsistency(body, {t, nonce}) -> {ok: bool, code?: string}  (M-2)
 *   claimNonce(sequelize, {source, nonce, ttlSec}) -> bool   (atomic, CR-2)
 *
 * Top-level orchestrator:
 *   verifyWebhookRequest(req, {sequelize, nowSec?, secretResolver?, source?})
 *     -> {ok: true, replayed: bool, parsed: body}
 *     | {ok: false, status: number, code: string}
 *
 * NOTE: this module does NOT validate audio_url. That belongs to Slice 5.3
 * (`applaudAudioFetcher.mjs`) and is invoked conditionally by the
 * controller (Slice 5.4) based on body.event_type — required to make
 * `transcript_ready` events pass through this verifier (Codex HIGH-4).
 *
 * Codex CR-1/CR-2/CR-4/CR-6 + HIGH-1/HIGH-7 + M-1/M-2 fixes baked in:
 *   - Atomic INSERT ... ON CONFLICT DO NOTHING for nonce claim (CR-2)
 *   - QueryTypes.SELECT + proper destructuring (CR-1)
 *   - Hex format validation BEFORE crypto.timingSafeEqual (M-1 — prevents
 *     length-mismatch crash → 500 instead of 401)
 *   - Body/header timestamp+nonce consistency check (M-2)
 *   - resolveWebhookSecret throws on missing/short secret (HIGH-7 startup
 *     can call this same function to validate KEY_ID resolves correctly)
 */
import crypto from 'node:crypto';
import { QueryTypes } from 'sequelize';
import {
  hasApplaudV0510Signature,
  verifyApplaudV0510WebhookRequest,
} from './applaudV0510WebhookAdapter.mjs';

const SIG_REGEX = /^[0-9a-f]{64}$/i;     // HMAC-SHA256 = 32 bytes = 64 hex chars
const NONCE_REGEX = /^[0-9a-f]{32}$/i;   // 16 random bytes per §4.1
const DEFAULT_TIMESTAMP_WINDOW_SEC = 300;
const DEFAULT_NONCE_TTL_SEC = 600;
const MIN_SECRET_LENGTH = 32;            // HIGH-7: refuse pathologically short secrets

/** Parse the forward-spec signature header. */
export function parseSignatureHeader(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const parts = {};
  for (const segment of value.split(',')) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = segment.slice(0, eqIdx).trim().toLowerCase();
    const val = segment.slice(eqIdx + 1).trim();
    if (key && val) parts[key] = val;
  }
  if (!parts.t || !parts.nonce || !parts.sig) return null;
  return parts;
}

/** Validate hex format + length before any constant-time compare. */
export function validateSignatureShape(parts) {
  if (!parts) return false;
  if (!SIG_REGEX.test(parts.sig || '')) return false;
  if (!NONCE_REGEX.test(parts.nonce || '')) return false;
  // Timestamp must be a positive integer (seconds since epoch).
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !Number.isInteger(t) || t <= 0) return false;
  return true;
}

/**
 * §4.2 step 2: timestamp must be within ±windowSec of now.
 * Defends against captured-webhook replay (clock-skew tolerance + nonce).
 */
export function isTimestampInWindow(tSec, nowSec, windowSec = DEFAULT_TIMESTAMP_WINDOW_SEC) {
  if (!Number.isFinite(tSec) || !Number.isFinite(nowSec)) return false;
  return Math.abs(nowSec - tSec) <= windowSec;
}

/** Compute SHA-256 over the exact raw request bytes. */
export function computeBodyHash(rawBody) {
  if (!Buffer.isBuffer(rawBody)) {
    throw new Error('computeBodyHash: rawBody must be Buffer');
  }
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

/**
 * Canonical payload format (plan §4.1): one field per line, no trailing
 */
export function buildCanonicalPayload({ t, nonce, eventType, recordingId, bodyHash }) {
  return `${t}\n${nonce}\n${eventType}\n${recordingId}\n${bodyHash}`;
}

/**
 * HMAC compute + constant-time hex compare. Returns true on match.
 * `sigHex` MUST be pre-validated by validateSignatureShape() — otherwise
 */
export function verifyHmac(canonicalPayload, sigHex, secret) {
  const expected = crypto.createHmac('sha256', secret).update(canonicalPayload).digest();
  const provided = Buffer.from(sigHex, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/**
 * §4.3 versioned-key resolution. Reads `PLAUD_APPLAUD_WEBHOOK_SECRET_<keyId>`
 * from env. Throws on missing/short — caller decides 401 vs startup-refuse.
 *
 * HIGH-7 (Codex round 2): startup validation calls this same function to
 * verify the active KEY_ID is usable BEFORE mounting the route.
 */
export function resolveWebhookSecret(keyId, env = process.env) {
  if (typeof keyId !== 'string' || keyId.length === 0) {
    throw new Error('resolveWebhookSecret: keyId required (e.g. "V1")');
  }
  // Restrict keyId charset to defend against env-var-name injection.
  if (!/^[A-Z0-9]{1,16}$/.test(keyId)) {
    throw new Error(`resolveWebhookSecret: invalid keyId format "${keyId}"`);
  }
  const envName = `PLAUD_APPLAUD_WEBHOOK_SECRET_${keyId}`;
  const secret = env[envName];
  if (!secret) {
    throw new Error(`resolveWebhookSecret: ${envName} not set in env`);
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`resolveWebhookSecret: ${envName} too short (${secret.length} < ${MIN_SECRET_LENGTH})`);
  }
  return secret;
}

/**
 * M-2: if the body includes `timestamp` or `nonce` fields, they MUST equal
 * Body fields are optional — Applaud may or may not duplicate them.
 * We only check when present.
 */
export function verifyBodyConsistency(body, { t, nonce }) {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_PAYLOAD' };
  }
  if (body.timestamp != null && Number(body.timestamp) !== Number(t)) {
    return { ok: false, code: 'BODY_TIMESTAMP_MISMATCH' };
  }
  if (body.nonce != null && body.nonce !== nonce) {
    return { ok: false, code: 'BODY_NONCE_MISMATCH' };
  }
  return { ok: true };
}

/**
 * Atomic nonce claim (Codex CR-2). Returns:
 *   true  → nonce was fresh, INSERT succeeded, caller proceeds
 *   false → nonce was already claimed (replay), caller returns ALREADY_PROCESSED
 *
 * SELECT-then-INSERT is FORBIDDEN — defeats the atomic guarantee under
 * concurrent webhook delivery. ON CONFLICT DO NOTHING is the only correct
 * pattern. RETURNING `nonce` lets us inspect rowCount via QueryTypes.SELECT
 * destructuring (rows array length is 0 on conflict, 1 on insert).
 */
export async function claimNonce(sequelize, { source, nonce, ttlSec = DEFAULT_NONCE_TTL_SEC }) {
  if (!sequelize) throw new Error('claimNonce: sequelize required');
  if (!source || !nonce) throw new Error('claimNonce: source + nonce required');
  if (!Number.isInteger(ttlSec) || ttlSec <= 0) {
    throw new Error('claimNonce: ttlSec must be positive integer seconds');
  }
  const rows = await sequelize.query(
    `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
     VALUES (:source, :nonce, NOW(), NOW() + (:ttlSec || ' seconds')::interval)
     ON CONFLICT (source, nonce) DO NOTHING
     RETURNING nonce`,
    {
      replacements: { source, nonce, ttlSec: String(ttlSec) },
      type: QueryTypes.SELECT,
    },
  );
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Verify an incoming webhook and return normalized metadata for the controller.
 * Does NOT validate audio_url — the controller (Slice 5.4) does that
 * conditionally based on event_type (Codex HIGH-4: transcript_ready
 * events have no audio_url).
 *
 * Returns:
 *   { ok: true,  replayed: false, parsed }  — fresh, valid, proceed
 *   { ok: true,  replayed: true,  parsed }  — replay (nonce already claimed) — caller returns 200 ALREADY_PROCESSED
 *   { ok: false, status, code, message? }   — verification failed
 *
 * `parsed` is the JSON body (req.body); `parts` of the signature header
 * are not exposed (caller doesn't need them after verification).
 */
export async function verifyWebhookRequest(req, opts) {
  const {
    sequelize,
    source = 'applaud_webhook',
    nowSec = Math.floor(Date.now() / 1000),
    secretResolver = resolveWebhookSecret,
    keyIdEnv = process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID,
    mediaBaseUrl = process.env.PLAUD_APPLAUD_MEDIA_BASE_URL,
  } = opts || {};
  if (!sequelize) {
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: 'sequelize required' };
  }

  // Step 0: HTTPS check (defense-in-depth — Render terminates TLS but verify)
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return { ok: false, status: 400, code: 'HTTPS_REQUIRED' };
  }

  // Applaud signs once before retrying; controller dedup handles replays.
  if (hasApplaudV0510Signature(req)) {
    return verifyApplaudV0510WebhookRequest(req, {
      keyIdEnv,
      mediaBaseUrl,
      secretResolver,
    });
  }

  // Step 1: parse + format-validate sig header
  const parts = parseSignatureHeader(req.headers['plaud-webhook-signature']);
  if (!parts || !validateSignatureShape(parts)) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }

  // Step 2: timestamp window
  const tSec = Number(parts.t);
  if (!isTimestampInWindow(tSec, nowSec)) {
    return { ok: false, status: 401, code: 'SIGNATURE_EXPIRED' };
  }

  // Step 3: body hash binding (raw bytes captured by express.json verify hook)
  if (!Buffer.isBuffer(req.rawBody)) {
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: 'rawBody not captured by middleware' };
  }
  const bodyHash = computeBodyHash(req.rawBody);

  // Step 4: parse body must already be done by express.json
  const body = req.body;
  if (!body || typeof body !== 'object'
      || typeof body.event_type !== 'string'
      || typeof body.recording_id !== 'string') {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD' };
  }

  // Step 5: build canonical payload + HMAC verify
  const canonicalPayload = buildCanonicalPayload({
    t: parts.t, nonce: parts.nonce,
    eventType: body.event_type, recordingId: body.recording_id,
    bodyHash,
  });
  let secret;
  try {
    secret = secretResolver(parts.kid || keyIdEnv);
  } catch (err) {
    // Codex NH-1 / NH-6: do NOT leak resolver error message to caller. The
    // err.message contains the env var name (e.g. "PLAUD_APPLAUD_WEBHOOK_SECRET_V99
    // not set in env"), which would tell an attacker which key versions exist
    // by probing different `kid` values. Treat any kid resolution failure as
    // SIGNATURE_INVALID externally; log internally with full detail.
    // Caller-supplied logger isn't available here; emit via console.warn so
    // the redaction layer in logger.mjs doesn't apply (this path doesn't
    // include secret values, only env names which are not redacted).
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }
  if (!verifyHmac(canonicalPayload, parts.sig, secret)) {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }

  // Step 6: M-2 body/header consistency
  const consistency = verifyBodyConsistency(body, parts);
  if (!consistency.ok) {
    return { ok: false, status: 400, code: consistency.code };
  }

  // Step 7: atomic nonce claim (CR-2)
  const claimed = await claimNonce(sequelize, { source, nonce: parts.nonce });
  if (!claimed) {
    return { ok: true, replayed: true, parsed: body };
  }

  return { ok: true, replayed: false, parsed: body };
}

/**
 * Helper for Applaud-side signing (used by tests and any local tooling
 * that needs to send a signed webhook for smoke testing). NOT used by
 * the receiver — the receiver only verifies.
 */
export function signCanonicalPayload(canonicalPayload, secret) {
  return crypto.createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}
