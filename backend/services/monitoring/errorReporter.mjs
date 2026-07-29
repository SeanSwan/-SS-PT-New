/**
 * ============================================================================
 * FILE: errorReporter.mjs
 * PURPOSE: Capture, scrub, group and (optionally) forward server errors so a
 *          5xx at 6am is something the operator learns from a signal rather
 *          than from a client cancelling.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-29 (SWA-75, observability slice)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Two gaps, one of them a lie the app was telling users:
 *
 *  1. `core/middleware/errorHandler.mjs` returned
 *     "An unexpected error occurred. Our team has been notified."
 *     Nothing notified anyone. That is a rule-75 violation in USER-FACING copy.
 *     This module makes the sentence true rather than softening it.
 *
 *  2. AI features were monitored (services/monitoring/alertEngine.mjs evaluates
 *     AI_MONITOR_* thresholds and persists alerts) but general HTTP 5xx had no
 *     tracking, aggregation or alert anywhere. Verified: zero 5xx-rate matches
 *     outside the AI path.
 *
 * DESIGN — deliberately small
 * Kimi K3's ruling (2026-07-29) was: install an SDK, do NOT build bespoke
 * aggregation or dashboards. That is right, and an SDK needs an account and a
 * DSN only Sean can create. So this is the thin, dependency-free seam an SDK
 * plugs into:
 *   - it structures and SCRUBS the event (the part that must exist either way)
 *   - it groups by fingerprint so a flood reads as one problem, not 400
 *   - it forwards to whatever sink is configured, or logs and nothing else
 * When Sean adds a DSN, `registerErrorSink` takes the SDK call and nothing else
 * changes. No dashboards, no second pager.
 *
 * PII (rule 8) — the non-negotiable part
 * Every field is passed through the repo's existing `redactLogValue`
 * (utils/redactionRules.mjs, shipped by SWA-71: emails, SSN, phone, DB
 * credentials, key shapes, with documented ordering). Request BODIES are never
 * captured at all — not scrubbed, not truncated, absent. Headers are whitelisted
 * to a fixed, non-identifying set. This platform holds minors' data; the safe
 * default is to capture almost nothing about the user and everything about the
 * code.
 *
 * FAIL-OPEN: reporting must never break a request. Every path is wrapped; a
 * throwing sink is caught and disabled for the remainder of the process.
 * ============================================================================
 */

import logger from '../../utils/logger.mjs';
import { redactLogValue } from '../../utils/redactionRules.mjs';

/** Only these request headers are ever captured. Everything else is dropped. */
const HEADER_ALLOWLIST = ['user-agent', 'referer', 'content-type', 'accept'];

/** Rolling window for the 5xx rate signal. */
const RATE_WINDOW_MS = Number.parseInt(process.env.ERROR_RATE_WINDOW_MS, 10) || 5 * 60 * 1000;
const MAX_TRACKED_EVENTS = 500;
const MAX_GROUPS = 200;

/** timestamps of recent server errors (ms), ascending */
let recentErrors = [];
/** fingerprint -> { count, firstSeen, lastSeen, sample } */
const groups = new Map();

let sink = null;
let sinkDisabled = false;

/**
 * Register the forwarding sink — e.g. an SDK capture call. Inert until called,
 * which is why this module is safe to ship before Sean has a DSN.
 * @param {(event: object) => void | Promise<void>} fn
 */
export function registerErrorSink(fn) {
  sink = typeof fn === 'function' ? fn : null;
  sinkDisabled = false;
}

/** Stable-ish grouping key: error class + route shape + status. */
export function fingerprint({ name, routePath, statusCode }) {
  const route = String(routePath || 'unknown')
    // collapse ids so /clients/61/x and /clients/62/x are ONE problem
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:uuid');
  return `${name || 'Error'}|${route}|${statusCode || 500}`;
}

function safeHeaders(req) {
  const out = {};
  const h = req?.headers || {};
  for (const key of HEADER_ALLOWLIST) {
    if (h[key] !== undefined) out[key] = h[key];
  }
  return out;
}

function prune(now) {
  const cutoff = now - RATE_WINDOW_MS;
  let i = 0;
  while (i < recentErrors.length && recentErrors[i] <= cutoff) i += 1;
  if (i > 0) recentErrors = recentErrors.slice(i);
  if (recentErrors.length > MAX_TRACKED_EVENTS) {
    recentErrors = recentErrors.slice(-MAX_TRACKED_EVENTS);
  }
}

/**
 * Build the scrubbed event. Exported so a test can assert directly that no PII
 * survives, without needing an Express app.
 */
export function buildErrorEvent({ err, req, statusCode, now = Date.now() }) {
  const status = Number(statusCode) || Number(err?.status) || 500;
  const routePath = req?.route?.path || req?.originalUrl || req?.url || 'unknown';

  const raw = {
    at: new Date(now).toISOString(),
    statusCode: status,
    name: err?.name || 'Error',
    message: err?.message || 'Unknown error',
    stack: err?.stack || null,
    method: req?.method || null,
    route: routePath,
    // Identity is a ROLE and an id — never a name, email or phone (rule 8).
    userId: req?.user?.id ?? null,
    userRole: req?.user?.role ?? null,
    headers: safeHeaders(req),
    // NOTE: req.body is deliberately absent. Not truncated — absent.
  };

  const scrubbed = redactLogValue(raw);
  scrubbed.fingerprint = fingerprint({ name: raw.name, routePath, statusCode: status });
  return scrubbed;
}

/**
 * Record a server error. Safe to call from an Express error handler.
 * @returns {object|null} the scrubbed event, or null if nothing was recorded
 */
export function reportServerError({ err, req, statusCode, now = Date.now() } = {}) {
  try {
    const status = Number(statusCode) || Number(err?.status) || 500;
    // 4xx is a client mistake, not an outage. Only server faults page anyone.
    if (status < 500) return null;

    const event = buildErrorEvent({ err, req, statusCode: status, now });

    prune(now);
    recentErrors.push(now);

    const existing = groups.get(event.fingerprint);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
    } else {
      if (groups.size >= MAX_GROUPS) {
        const oldest = groups.keys().next().value;
        if (oldest !== undefined) groups.delete(oldest);
      }
      groups.set(event.fingerprint, { count: 1, firstSeen: now, lastSeen: now, sample: event });
    }

    logger.error('[errorReporter] server error', {
      fingerprint: event.fingerprint,
      statusCode: event.statusCode,
      route: event.route,
      method: event.method,
      name: event.name,
      occurrences: groups.get(event.fingerprint)?.count ?? 1,
      inWindow: recentErrors.length,
    });

    if (sink && !sinkDisabled) {
      try {
        const maybe = sink(event);
        if (maybe && typeof maybe.catch === 'function') {
          maybe.catch((sinkErr) => {
            logger.warn('[errorReporter] sink rejected; continuing', { error: sinkErr?.message });
          });
        }
      } catch (sinkErr) {
        sinkDisabled = true;
        logger.warn('[errorReporter] sink threw; disabled for this process', { error: sinkErr?.message });
      }
    }

    return event;
  } catch (selfErr) {
    // Reporting must NEVER break a request.
    try {
      logger.warn('[errorReporter] failed to record error', { error: selfErr?.message });
    } catch { /* give up quietly */ }
    return null;
  }
}

/**
 * Express middleware: report ANY response that finishes with a 5xx.
 *
 * WHY THIS EXISTS ON TOP OF THE ERROR HANDLER
 * The global error handler only sees faults passed to `next(err)` or thrown out
 * of an async wrapper. This codebase returns 5xx DIRECTLY — measured 2026-07-29:
 * **1,094 `res.status(5xx)` returns across 203 files**, mostly via per-file
 * `sendInternalError` helpers. Reporting only from the error handler would have
 * missed the overwhelming majority of server faults while appearing to work.
 *
 * So capture happens at the RESPONSE boundary, which every path crosses.
 * `res.on('finish')` is used rather than monkey-patching res.json/res.send: it
 * cannot alter the response, cannot throw into the request, and fires exactly
 * once per response.
 *
 * DEDUPE: the error handler reports first and richer (it has the Error and its
 * stack). It marks the request, and this listener then skips it, so a fault that
 * travels through both paths is counted once.
 */
export function serverErrorResponseReporter(req, res, next) {
  res.on('finish', () => {
    try {
      if (res.statusCode < 500) return;
      if (req.__errorReported) return; // already captured with full detail
      reportServerError({
        err: Object.assign(new Error(`HTTP ${res.statusCode}`), { name: 'HttpServerError' }),
        req,
        statusCode: res.statusCode,
      });
    } catch { /* reporting must never affect the response */ }
  });
  next();
}

/** Snapshot for an ops/health surface. Contains no PII by construction. */
export function getErrorSnapshot(now = Date.now()) {
  prune(now);
  const top = [...groups.entries()]
    .map(([fp, g]) => ({ fingerprint: fp, count: g.count, firstSeen: g.firstSeen, lastSeen: g.lastSeen }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return {
    windowMs: RATE_WINDOW_MS,
    serverErrorsInWindow: recentErrors.length,
    distinctProblems: groups.size,
    topProblems: top,
    sinkConfigured: !!sink && !sinkDisabled,
  };
}

/** Test seam — never called by runtime code. */
export function __resetErrorReporter() {
  recentErrors = [];
  groups.clear();
  sink = null;
  sinkDisabled = false;
}

export default reportServerError;
