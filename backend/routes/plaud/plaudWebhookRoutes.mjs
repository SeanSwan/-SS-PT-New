/**
 * plaudWebhookRoutes.mjs
 * =======================
 * POST /api/plaud/webhook/applaud — Phase 5 Auto-Ingestion route mount.
 *
 * Phase 5 Slice 5.5 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §13.1, §13.2, §18.2.
 *
 * Codex CR-5: this entire route file is NOT mounted when the feature flag
 * is off. shouldMountApplaudWebhookRoute() runs at app boot; if false, the
 * URL returns Express 404 (no JSON body). There is NO 503 path in v1.
 *
 * Codex ICR-2: raw-body capture via express.json verify hook. The HMAC
 * sig verification (Slice 5.2) hashes req.rawBody, NOT the re-serialized
 * parsed body. Two equivalent JSON bodies with different whitespace
 * produce different hashes — the receiver MUST see the exact bytes
 * Applaud signed.
 *
 * Codex HIGH-7: shouldMountApplaudWebhookRoute calls resolveWebhookSecret
 * (the same function used at request time) to verify the active KEY_ID
 * resolves to a usable secret. A typo'd KEY_ID prevents mount.
 *
 * Middleware chain (order critical):
 *   1. requireHttpsProxy (defense-in-depth — Render terminates TLS but verify)
 *   2. applaudJsonParser (captures req.rawBody before JSON.parse)
 *   3. applaudRateLimiter (60 events/min per process)
 *   4. applaudWebhookHandler (concurrency cap is INSIDE the handler)
 */
import express from 'express';
import sequelize from '../../database.mjs';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { applaudWebhookHandler } from '../../controllers/plaud/plaudApplaudWebhookController.mjs';
import { resolveWebhookSecret } from '../../services/plaudWebhookSignature.mjs';

// ── Startup validation (Codex HIGH-7 + §13.2) ──────────────────────

/**
 * Returns true if the route should be mounted, false otherwise.
 * Caller (core/routes.mjs) skips mount when false; the URL then 404s.
 *
 * Fail-closed on every check: missing env, malformed URL, invalid user,
 * unresolvable secret, missing schema columns, missing nonce table.
 *
 * Codex CR-IMPL-1 + NC-CRIT-2 fix: validation is now self-contained.
 * - User existence + role check via lazy-loaded models from models/index.mjs
 *   (no longer optional; previous version skipped this when models arg was
 *   absent, which caused the wired mount path to skip the check entirely)
 * - Schema presence check confirms migrations ran before the route mounts
 *   (prevents the "route mounts, every webhook 500s on missing column" failure
 *   mode if a migration silently failed)
 *
 * The optional `models` arg is preserved for tests that want to inject a fake.
 * In production, models is loaded via lazy import.
 */
export async function shouldMountApplaudWebhookRoute({ models = null, sequelizeOverride = null } = {}) {
  const seq = sequelizeOverride || sequelize;
  if (process.env.PLAUD_APPLAUD_WEBHOOK_ENABLED !== 'true') {
    logger.info('[plaudApplaudWebhook] PLAUD_APPLAUD_WEBHOOK_ENABLED != "true" — route not mounted');
    return false;
  }

  const required = [
    'PLAUD_APPLAUD_WEBHOOK_SECRET_V1',
    'PLAUD_APPLAUD_WEBHOOK_KEY_ID',
    'PLAUD_APPLAUD_USER_ID',
    'PLAUD_APPLAUD_MEDIA_BASE_URL',
  ];
  for (const k of required) {
    if (!process.env[k]) {
      logger.error('[plaudApplaudWebhook] missing env: %s — route NOT mounted', k);
      return false;
    }
  }

  // PLAUD_APPLAUD_MEDIA_BASE_URL must be parseable HTTPS, no credentials (Codex L-2).
  try {
    const u = new URL(process.env.PLAUD_APPLAUD_MEDIA_BASE_URL);
    if (u.protocol !== 'https:') {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL must be HTTPS — route NOT mounted');
      return false;
    }
    if (u.username || u.password) {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL must not contain credentials — route NOT mounted');
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL malformed — route NOT mounted: %s', err.message);
    return false;
  }

  // PLAUD_APPLAUD_USER_ID must parse as positive integer.
  const userId = Number(process.env.PLAUD_APPLAUD_USER_ID);
  if (!Number.isInteger(userId) || userId <= 0) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID invalid (got "%s") — route NOT mounted',
      process.env.PLAUD_APPLAUD_USER_ID);
    return false;
  }

  // Verify the active KEY_ID resolves via the SAME function the receiver
  // uses (Codex HIGH-7). Catches typo'd KEY_ID, missing matching SECRET_*,
  // or pathologically short secrets.
  try {
    const activeSecret = resolveWebhookSecret(process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID);
    if (!activeSecret || activeSecret.length < 32) {
      logger.error('[plaudApplaudWebhook] active webhook secret invalid — route NOT mounted');
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] webhook secret resolution failed for KEY_ID=%s: %s — route NOT mounted',
      process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID, err.message);
    return false;
  }

  // User existence + role check. Codex CR-IMPL-1 fix: now mandatory (was
  // optional and skipped at the wired mount path). If `models` arg not
  // supplied, lazy-import models/index.mjs.
  let resolvedModels = models;
  if (!resolvedModels) {
    try {
      const modelsModule = await import('../../models/index.mjs');
      const getModels = modelsModule.default || modelsModule.getModels;
      if (typeof getModels === 'function') {
        resolvedModels = await getModels();
      } else if (modelsModule.User) {
        resolvedModels = modelsModule;
      }
    } catch (err) {
      logger.error('[plaudApplaudWebhook] models cache load failed: %s — route NOT mounted', err.message);
      return false;
    }
  }
  if (!resolvedModels || !resolvedModels.User || typeof resolvedModels.User.findByPk !== 'function') {
    logger.error('[plaudApplaudWebhook] User model unavailable — route NOT mounted');
    return false;
  }
  try {
    const user = await resolvedModels.User.findByPk(userId, { attributes: ['id', 'role'] });
    if (!user) {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID=%d does not exist — route NOT mounted', userId);
      return false;
    }
    if (!['trainer', 'admin'].includes(user.role)) {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID=%d role=%s — must be trainer/admin — route NOT mounted',
        userId, user.role);
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] user_id verification failed: %s — route NOT mounted', err.message);
    return false;
  }

  // Codex NC-CRIT-2 fix: schema presence check. Refuse to mount if the
  // required Phase 5 columns/tables don't exist (migration didn't run, or
  // ran partially). Without this, the route would mount and every webhook
  // would 500 on the first INSERT.
  try {
    const requiredColumns = await seq.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'
         AND column_name IN ('clip_source', 'clip_external_id', 'applaud_event_id')`,
      { type: QueryTypes.SELECT },
    );
    if (!Array.isArray(requiredColumns) || requiredColumns.length < 3) {
      logger.error('[plaudApplaudWebhook] Phase 5 plaud_clips columns missing (got %d/3) — route NOT mounted',
        requiredColumns?.length ?? 0);
      return false;
    }
    const nonceTable = await seq.query(
      `SELECT to_regclass('public.plaud_webhook_nonces')::text AS exists`,
      { type: QueryTypes.SELECT },
    );
    if (!nonceTable?.[0]?.exists) {
      logger.error('[plaudApplaudWebhook] plaud_webhook_nonces table missing — route NOT mounted');
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] schema check failed: %s — route NOT mounted', err.message);
    return false;
  }

  logger.info('[plaudApplaudWebhook] route mounting for user_id=%d (schema verified)', userId);
  return true;
}

// ── Middleware ──────────────────────────────────────────────────────

/**
 * HTTPS check (defense-in-depth; Render terminates TLS but verify).
 * Returns 400 HTTPS_REQUIRED on plain HTTP. The signature verifier
 * also checks this — having it as a route-level middleware lets us
 * reject before parsing the body.
 */
export function requireHttpsProxy(req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(400).json({
      success: false,
      error: { code: 'HTTPS_REQUIRED', message: 'HTTPS required' },
    });
  }
  return next();
}

/**
 * Express JSON parser with raw-body capture (Codex ICR-2).
 * The verify hook runs AFTER body buffer assembly but BEFORE JSON.parse.
 * We Buffer.from(buf) to detach from express's internal buffer and ensure
 * it's available when sig verification runs.
 *
 * limit: 10kb — webhook payloads are small JSON metadata. Audio is fetched
 * separately by URL, never inlined.
 */
export const applaudJsonParser = express.json({
  limit: '10kb',
  type: 'application/json',
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

/**
 * Tiny per-process rate limiter — 60 events/minute. Webhook traffic
 * normally peaks at ~10/min from a single trainer's Plaud activity;
 * 60 leaves headroom for backfill bursts and protects against runaway
 * Applaud retry loops.
 *
 * In-memory; state resets on process restart. For multi-instance Render
 * deployments (USE_REDIS_SESSIONS=true), a Redis-backed limiter would
 * be a v1.x improvement.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = (() => {
  const v = Number(process.env.PLAUD_APPLAUD_RATE_LIMIT_PER_MIN);
  return Number.isFinite(v) && v > 0 ? v : 60;
})();
let rateBucket = [];

export function applaudRateLimiter(req, res, next) {
  const now = Date.now();
  // Drop old timestamps outside the window
  const cutoff = now - RATE_WINDOW_MS;
  rateBucket = rateBucket.filter((t) => t >= cutoff);
  if (rateBucket.length >= RATE_LIMIT) {
    res.set('Retry-After', '60');
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: `webhook rate limit ${RATE_LIMIT}/min exceeded` },
    });
  }
  rateBucket.push(now);
  return next();
}

// Test-only reset hook so unit tests don't bleed state between cases.
export function _resetRateLimiterForTests() {
  rateBucket = [];
}

// ── Router ──────────────────────────────────────────────────────────

const router = express.Router();

router.post(
  '/applaud',
  requireHttpsProxy,
  applaudJsonParser,
  applaudRateLimiter,
  applaudWebhookHandler,
);

// Per-route error handler — catches malformed JSON (express.json errors)
router.use((err, req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'malformed JSON' },
    });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'webhook body exceeds 10kb cap' },
    });
  }
  logger.error('[plaudApplaudWebhook] unhandled middleware error: %s', err.message);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'webhook middleware error' },
  });
});

export default router;
