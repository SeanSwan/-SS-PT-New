#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/throttle.mjs
 * PURPOSE: The SHARED response to a global rate limit or bot check — a persisted
 *          cooldown that every later invocation in every later process honours.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR23):
 *   `runDaily` continued through the network phases after a failure, and there
 *   was no shared response to throttling. A 429 on video 1 of 4,000 produced
 *   4,000 more refusals — each one a fresh request to a service that had just
 *   said stop. The per-hour budget bounded the RATE; nothing bounded the
 *   RESPONSE. A rate limit is a message about the whole session, not about the
 *   one video that happened to receive it.
 *
 * WHY IT IS PERSISTED RATHER THAN IN MEMORY:
 *   The next invocation is usually a DIFFERENT process (the scheduler an hour
 *   later, or the operator at the CLI). An in-memory flag would protect the
 *   remainder of one run and nothing else — and the remaining traffic is mostly
 *   in the runs that have not started yet.
 *
 * WHY A COOLDOWN AND NOT A KILL SWITCH:
 *   This defers traffic; it does not disable the engine. It expires on its own,
 *   it never shortens an active cooldown, and `cli.mjs throttle --clear` is the
 *   deliberate operator override. A trip is recorded with the text that caused
 *   it, so an operator can tell a genuine rate limit from a misclassified error
 *   instead of guessing.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *   It does not retry, sleep, rotate identity, or reach for a proxy. Every one of
 *   those escalates a refusal into a fight. The engine's answer to "stop" is to
 *   stop.
 *
 * @module creator-brains/throttle
 */

import {
  HOUR_MS, paths, readJson, writeJsonAtomic, nowIso,
} from './paths.mjs';

export const THROTTLE_SCHEMA_VERSION = 1;

/** Six hours by default: long enough to cover a burst, short enough that a
 *  once-daily job still runs tomorrow without operator action. */
export const DEFAULT_COOLDOWN_HOURS = 6;
export const MAX_COOLDOWN_HOURS = 24 * 7;

/** "HTTP Error 429: Too Many Requests" and friends. */
const RATE_LIMIT = /http error 429|too many requests|\brate[ _-]?limit(?:ed|ing)?\b|\b429\b/i;
/** yt-dlp's bot-check text: "Sign in to confirm you're not a bot". */
const BOT_CHECK = /confirm you(?:'|’| a)?re not a bot|not a bot\b|unusual traffic|bot[ _-]?check/i;

/**
 * Does this transport failure describe a GLOBAL refusal?
 *
 * Returns `{ limited: true, kind }`, or `null` for an ordinary per-video error.
 * The distinction is the whole point: "this video is private" is about a video,
 * "too many requests" is about us.
 */
export function classifyTransportFailure(text) {
  const s = String(text ?? '');
  if (!s) return null;
  if (RATE_LIMIT.test(s)) return { limited: true, kind: 'rate_limit' };
  if (BOT_CHECK.test(s)) return { limited: true, kind: 'bot_check' };
  return null;
}

/** The stored cooldown, or null. A corrupt file reads as "no cooldown" — the
 *  safe direction: it can only cause us to try, never to stay silent forever. */
export function readThrottle(r) {
  const doc = readJson(paths(r).throttle, null);
  return doc && typeof doc === 'object' ? doc : null;
}

/**
 * Is traffic currently blocked?
 *
 * Always returns the same shape, so a caller never has to distinguish "no file"
 * from "expired file" to render a line. `remainingMs` is 0 when inactive.
 */
export function throttleState(r, { now = Date.now() } = {}) {
  const doc = readThrottle(r);
  const idle = {
    active: false, kind: null, reason: null, until: null, at: null, remainingMs: 0, trips: 0,
  };
  if (!doc || !doc.until) return idle;
  const until = Date.parse(doc.until);
  if (!Number.isFinite(until)) {
    return { ...idle, kind: doc.kind || null, reason: doc.reason || null, unreadable: true };
  }
  const remainingMs = until - now;
  if (remainingMs <= 0) return { ...idle, until: doc.until, at: doc.at || null, trips: doc.trips || 0 };
  return {
    active: true,
    kind: doc.kind || 'rate_limit',
    reason: doc.reason || null,
    until: doc.until,
    at: doc.at || null,
    remainingMs,
    remainingMin: Math.ceil(remainingMs / 60_000),
    source: doc.source || null,
    trips: doc.trips || 0,
  };
}

/** True when traffic must not be attempted right now. */
export function isThrottled(r, { now = Date.now() } = {}) {
  return throttleState(r, { now }).active;
}

/**
 * Record a cooldown. NEVER SHORTENS an active one — a second 429 five seconds
 * after the first must not reset the clock to a shorter window, or a persistent
 * block would keep pushing the resume time out of reach (and, worse, would let a
 * caller that keeps tripping keep traffic alive by accident).
 *
 * Never throws: the caller is already handling a transport failure, and a failed
 * cooldown write must not become a crash. A write failure is REPORTED so the
 * caller can put it in the run notes rather than swallow it.
 */
export function tripThrottle(r, {
  kind = 'rate_limit', reason = null, now = Date.now(), cooldownHours = DEFAULT_COOLDOWN_HOURS,
  source = null,
} = {}) {
  const existing = throttleState(r, { now });
  const requested = now + cooldownHours * HOUR_MS;
  const existingUntil = existing.until ? Date.parse(existing.until) : 0;
  const until = new Date(Math.max(requested, Number.isFinite(existingUntil) ? existingUntil : 0));
  const doc = {
    schemaVersion: THROTTLE_SCHEMA_VERSION,
    kind,
    reason: reason ? String(reason).slice(0, 400) : null,
    source,
    at: nowIso(() => now),
    until: until.toISOString(),
    cooldownHours,
    trips: (existing.trips || 0) + 1,
  };
  try {
    writeJsonAtomic(paths(r).throttle, doc);
    return { ok: true, state: { ...doc, active: true, remainingMs: until.getTime() - now } };
  } catch (e) {
    return { ok: false, error: e.message, state: doc };
  }
}

/** Forget the cooldown. The deliberate operator override, and the only way to
 *  resume before it expires. */
export function clearThrottle(r, { now = Date.now() } = {}) {
  const before = throttleState(r, { now });
  try {
    writeJsonAtomic(paths(r).throttle, {
      schemaVersion: THROTTLE_SCHEMA_VERSION,
      kind: null,
      reason: null,
      at: nowIso(() => now),
      until: null,
      clearedAt: nowIso(() => now),
      trips: before.trips || 0,
    });
    return { ok: true, was: before };
  } catch (e) {
    return { ok: false, error: e.message, was: before };
  }
}

/**
 * Classify a transport failure and, when it is global, persist the cooldown.
 * Returns the trip result, or `null` when the failure was not a global refusal.
 */
export function noteTransportFailure(r, {
  error, now = Date.now(), source = null, cooldownHours = DEFAULT_COOLDOWN_HOURS,
} = {}) {
  const hit = classifyTransportFailure(error);
  if (!hit) return null;
  return {
    ...hit,
    ...tripThrottle(r, {
      kind: hit.kind, reason: error, now, cooldownHours, source,
    }),
  };
}

/** One operator-facing line, used by `status` and by run notes. */
export function formatThrottle(state) {
  if (!state || !state.active) return 'none — traffic is allowed';
  const kinds = { rate_limit: 'rate limit (429)', bot_check: 'bot check' };
  return `${kinds[state.kind] || state.kind} — traffic deferred until ${state.until} `
    + `(${state.remainingMin} min); override: cli.mjs throttle --clear`;
}

/** A sentence explaining a refusal, suitable for a phase reason or a run note. */
export function throttleReason(state) {
  if (!state || !state.active) return 'not throttled';
  return `throttled until ${state.until} (${state.kind}, ${state.remainingMin} min left): `
    + `${state.reason || 'a previous run was refused'}`;
}
