#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/fsm.mjs
 * PURPOSE: The per-video fetch state machine — legal transitions, retry
 *          scheduling, and the "is this video workable right now?" question.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S3)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY A STATE MACHINE AND NOT A HASH:
 *   The upstream plan's first cut said "re-run inserts nothing, dedupe by
 *   content hash". That is unimplementable for the case that actually matters:
 *   a RE-RUN OF A FAILED VIDEO MUST RETRY, while a re-run of a SUCCEEDED video
 *   must do nothing. A content hash cannot tell "done" from "broken" — both
 *   have no hash. Only an explicit state can. This was the single finding both
 *   hostile-review seats agreed on (upstream blueprint §1.6.4, CB-FSM).
 *
 * WHY ILLEGAL TRANSITIONS THROW:
 *   Every downstream decision reads `state`. If a bug could write `fetched`
 *   over a `failed_transient`, the recovery path silently disappears and the
 *   store looks healthy while a video is permanently missing. Refusing loudly
 *   costs one stack trace; allowing it costs a silently incomplete brain.
 *
 * THE THREE-WAY SPLIT THAT MATTERS (upstream finding F2):
 *   `failed_transient`  — we could not get an answer (network, 429, bot-check)
 *   `no_track_confirmed`— we got an answer and it was "no captions published"
 *   `failed_permanent`  — we got an answer and it was "this will never work"
 *   Collapsing the first into the second is how a video with perfectly good
 *   captions gets marked uncaptioned forever.
 *
 * @module creator-brains/fsm
 */

import { DAY_MS, HOUR_MS } from './paths.mjs';

/** Every state this engine can record. */
export const STATES = Object.freeze({
  PENDING: 'pending',
  FETCHED: 'fetched',
  NO_TRACK_CONFIRMED: 'no_track_confirmed',
  NO_TRACK_RETRY: 'no_track_retry',
  UNAVAILABLE: 'unavailable',
  FAILED_TRANSIENT: 'failed_transient',
  FAILED_PERMANENT: 'failed_permanent',
  DELETED_UPSTREAM: 'deleted_upstream',
});

const ALL = new Set(Object.values(STATES));

/** States that need no further work, ever. */
const TERMINAL = new Set([
  STATES.UNAVAILABLE, STATES.FAILED_PERMANENT, STATES.DELETED_UPSTREAM,
]);

/** Legal transitions. Anything absent from this map is refused.
 *
 *  RETRY LOOPS RE-ENTER THE SAME STATE. `failed_transient -> failed_transient`
 *  is legal and deliberate: a video that fails on attempt 2 is still a
 *  transient failure, and forbidding the self-edge would push the caller into
 *  routing it through `pending` — a fiction that would erase the attempt count
 *  the backoff depends on. The edges that stay FORBIDDEN are the ones that
 *  could hide a problem: anything out of a terminal state, and `fetched ->
 *  pending` (which would silently re-queue work already done). */
const TRANSITIONS = Object.freeze({
  [STATES.PENDING]: [
    STATES.FETCHED, STATES.FAILED_TRANSIENT, STATES.FAILED_PERMANENT, STATES.NO_TRACK_CONFIRMED,
  ],
  [STATES.FAILED_TRANSIENT]: [
    STATES.PENDING, STATES.FETCHED, STATES.FAILED_TRANSIENT, STATES.FAILED_PERMANENT,
    STATES.NO_TRACK_CONFIRMED, STATES.DELETED_UPSTREAM,
  ],
  [STATES.NO_TRACK_CONFIRMED]: [
    STATES.NO_TRACK_RETRY, STATES.UNAVAILABLE, STATES.FETCHED, STATES.FAILED_TRANSIENT,
    STATES.FAILED_PERMANENT,
  ],
  [STATES.NO_TRACK_RETRY]: [
    STATES.FETCHED, STATES.UNAVAILABLE, STATES.FAILED_TRANSIENT, STATES.NO_TRACK_RETRY,
    STATES.NO_TRACK_CONFIRMED, STATES.FAILED_PERMANENT,
  ],
  [STATES.FETCHED]: [STATES.DELETED_UPSTREAM, STATES.FETCHED],
  // A video that reappears in the uploads enumeration has been re-uploaded or
  // restored, so this is a legitimate new lifecycle rather than a terminal state
  // being escaped. It is an explicit edge so that `transition()` — not a direct
  // field write — is the only way into `pending`, keeping the attempt counter
  // and timestamps coherent.
  [STATES.DELETED_UPSTREAM]: [STATES.PENDING],
  [STATES.FAILED_PERMANENT]: [],
  [STATES.UNAVAILABLE]: [],
});

/** Defaults — owner-settable, and they are the ones the blueprint names. */
export const MAX_ATTEMPTS = 6;
export const NO_TRACK_RETRY_HOURS = 48;
const BACKOFF_BASE_HOURS = 6;
const BACKOFF_CAP_HOURS = 24 * 7;

export class FsmError extends Error {}

export function isKnownState(state) {
  return ALL.has(state);
}

export function isTerminal(state) {
  return TERMINAL.has(state);
}

/** A newly discovered video starts here. */
export function newVideoState(videoId, channelId, meta = {}) {
  return {
    videoId,
    channelId,
    title: meta.title ?? null,
    durationS: meta.durationS ?? null,
    viewCount: meta.viewCount ?? null,
    publishedAt: meta.publishedAt ?? null,
    state: STATES.PENDING,
    attempts: 0,
    nextRetryAt: null,
    lastError: null,
    language: null,
    contentHash: null,
    docPath: null,
    discoveredAt: meta.now ?? null,
    updatedAt: meta.now ?? null,
  };
}

/**
 * Refuse an illegal transition. Returns the NEXT record; never mutates input.
 * `now` is an injected ms clock so tests can move time without waiting.
 */
export function transition(video, nextState, { now = Date.now(), error = null, patch = {} } = {}) {
  if (!video || !isKnownState(video.state)) {
    throw new FsmError(`cannot transition from unknown state '${video && video.state}'`);
  }
  if (!isKnownState(nextState)) {
    throw new FsmError(`'${nextState}' is not a known state`);
  }
  const allowed = TRANSITIONS[video.state] || [];
  if (!allowed.includes(nextState)) {
    throw new FsmError(
      `illegal transition ${video.state} -> ${nextState} for ${video.videoId}`
      + (allowed.length ? ` (allowed: ${allowed.join(', ')})` : ' (terminal state)'),
    );
  }
  const next = {
    ...video,
    ...patch,
    state: nextState,
    updatedAt: new Date(now).toISOString(),
  };
  // Counting attempts at the transition, not at the call site, is what makes
  // the backoff schedule impossible to forget. Only a TRANSIENT FAILURE is an
  // attempt; a state re-entry is not.
  next.attempts = (video.attempts || 0) + (nextState === STATES.FAILED_TRANSIENT ? 1 : 0);
  if (error !== null || nextState === STATES.FAILED_TRANSIENT) next.lastError = error ?? video.lastError ?? null;
  if (nextState === STATES.FETCHED) next.lastError = null;
  next.nextRetryAt = nextRetryFor(next, nextState, now);
  return next;
}

/**
 * When may this video be touched again?
 *  - pending / no_track_retry  -> now (work is due)
 *  - failed_transient          -> exponential backoff from the attempt count
 *  - terminal                  -> null (never)
 */
export function nextRetryFor(video, state = video.state, now = Date.now()) {
  if (isTerminal(state)) return null;
  if (state === STATES.PENDING || state === STATES.NO_TRACK_RETRY) return new Date(now).toISOString();
  if (state === STATES.FAILED_TRANSIENT) {
    const n = Math.max(1, video.attempts || 1);
    const hours = Math.min(BACKOFF_BASE_HOURS * (2 ** (n - 1)), BACKOFF_CAP_HOURS);
    return new Date(now + hours * HOUR_MS).toISOString();
  }
  return null;
}

/**
 * The one question the fetch loop asks: should this video be attempted now?
 * Returns `{ work: boolean, reason }` — a reason on every path, because "0
 * fetched" with no explanation is the failure mode this engine exists to avoid.
 */
export function shouldAttempt(video, { now = Date.now(), retry = false } = {}) {
  if (!video) return { work: false, reason: 'unknown_video' };
  if (video.state === STATES.FETCHED) return { work: false, reason: 'already_fetched' };
  if (isTerminal(video.state)) return { work: false, reason: `terminal:${video.state}` };
  if (video.state === STATES.PENDING) return { work: true, reason: 'pending' };
  if (retry) return { work: true, reason: 'forced_retry' };
  // no_track_confirmed: only after the retry window, because auto-captions
  // appear hours after publish and a fresh upload legitimately has none yet.
  if (video.state === STATES.NO_TRACK_CONFIRMED || video.state === STATES.NO_TRACK_RETRY) {
    const due = video.nextRetryAt ? Date.parse(video.nextRetryAt) : 0;
    return due <= now ? { work: true, reason: 'no_track_retry_due' } : { work: false, reason: 'no_track_waiting' };
  }
  if (video.state === STATES.FAILED_TRANSIENT) {
    const due = video.nextRetryAt ? Date.parse(video.nextRetryAt) : 0;
    return due <= now ? { work: true, reason: 'backoff_elapsed' } : { work: false, reason: 'backoff_waiting' };
  }
  return { work: false, reason: `unhandled:${video.state}` };
}

/** Attempts exhausted? Called before scheduling another transient retry. */
export function exhausted(video) {
  return (video.attempts || 0) >= MAX_ATTEMPTS;
}

/**
 * Apply the outcome of a probed fetch to a video record. This is the ONLY place
 * that decides which state a fetch result maps to, so the F2 three-way split
 * cannot drift between callers.
 *
 * `outcome` is one of:
 *   { kind: 'ok', doc }                       -> fetched
 *   { kind: 'no_track' }                      -> no_track_confirmed -> retry lane
 *   { kind: 'error', error, permanent? }      -> failed_transient / failed_permanent
 */
export function applyOutcome(video, outcome, { now = Date.now(), meta = {} } = {}) {
  if (outcome.kind === 'ok') {
    return transition(video, STATES.FETCHED, { now, patch: { ...meta, attempts: video.attempts } });
  }
  if (outcome.kind === 'no_track') {
    // A SECOND confirmed absence is terminal.
    //
    //   The retry lane exists because auto-captions appear hours after publish,
    //   so a fresh upload legitimately has none. But if we come back after the
    //   window and the answer is STILL "no track", re-parking would reset the
    //   window and the video would retry forever — `unavailable` would be
    //   unreachable code and every caption-less video would sit in the queue
    //   burning requests for the life of the install. The retry lane is a
    //   second chance, not a loop.
    if (video.state === STATES.NO_TRACK_RETRY) {
      return transition(video, STATES.UNAVAILABLE, {
        now,
        error: `no caption track after a ${NO_TRACK_RETRY_HOURS}h retry`,
        patch: meta,
      });
    }
    const confirmed = transition(video, STATES.NO_TRACK_CONFIRMED, { now, patch: meta });
    const due = now + NO_TRACK_RETRY_HOURS * HOUR_MS;
    return {
      ...transition(confirmed, STATES.NO_TRACK_RETRY, { now }),
      nextRetryAt: new Date(due).toISOString(),
    };
  }
  if (outcome.kind === 'error') {
    if (outcome.permanent) {
      return transition(video, STATES.FAILED_PERMANENT, { now, error: outcome.error, patch: meta });
    }
    const failed = transition(video, STATES.FAILED_TRANSIENT, { now, error: outcome.error, patch: meta });
    if (exhausted(failed)) {
      return transition(failed, STATES.FAILED_PERMANENT, {
        now, error: `attempts exhausted: ${outcome.error || 'unknown'}`, patch: meta,
      });
    }
    return failed;
  }
  throw new FsmError(`unknown outcome kind '${outcome.kind}'`);
}

/**
 * The no-track retry lane's terminal move. Called by the runner for videos
 * whose retry window has elapsed with still no track. Separate from
 * `applyOutcome` because it is driven by TIME, not by a fetch result.
 */
export function expireNoTrack(video, { now = Date.now(), windowHours = NO_TRACK_RETRY_HOURS } = {}) {
  if (video.state !== STATES.NO_TRACK_RETRY) {
    throw new FsmError(`expireNoTrack called on '${video.state}'`);
  }
  const due = video.nextRetryAt ? Date.parse(video.nextRetryAt) : 0;
  if (now < due) return video; // not yet — the window is the whole point
  return transition(video, STATES.UNAVAILABLE, {
    now,
    error: `no caption track within ${windowHours}h of discovery`,
  });
}

/** Human summary of a whole state map — used by status and the digest. */
export function summarize(states) {
  const counts = {};
  for (const st of ALL) counts[st] = 0;
  for (const v of Object.values(states || {})) {
    if (counts[v.state] === undefined) counts[v.state] = 0;
    counts[v.state] += 1;
  }
  const total = Object.keys(states || {}).length;
  const done = counts[STATES.FETCHED];
  return { total, counts, fetched: done, coverage: total ? done / total : 0 };
}

export const STATE_LIST = [...ALL];
export const RETRY_WINDOW_HOURS = NO_TRACK_RETRY_HOURS;
export const BACKOFF = { baseHours: BACKOFF_BASE_HOURS, capHours: BACKOFF_CAP_HOURS, maxAttempts: MAX_ATTEMPTS };
export const _internal = { TRANSITIONS, DAY_MS };
