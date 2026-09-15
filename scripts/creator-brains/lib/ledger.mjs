#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/ledger.mjs
 * PURPOSE: Persistent, cross-process admission control + run records.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR01)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced defect HR01):
 *   The budget was an in-memory array of timestamps. Every invocation started
 *   with an empty array, so "20 per hour" really meant "20 per run". The
 *   reviewer ran two invocations at the same clock with a cap of 1 and observed
 *   **2 fetches inside a 1/hour limit**. `ledger.jsonl` held summaries, but
 *   admission never read them.
 *
 * THE UNIT IS NOW EXPLICIT: ONE TRANSPORT OPERATION.
 *   Not a video, and not a "fetch". A video costs two yt-dlp invocations (a
 *   subtitle probe and the subtitle fetch), a discovery costs one, and a canary
 *   costs two. Counting videos made the real request rate an unstated 2x; the cap
 *   now counts the thing that actually reaches YouTube, and `budgetState()`
 *   reports the breakdown by kind so the split is visible rather than inferred.
 *
 * RESERVATION IS WRITE-AHEAD:
 *   The journal entry is appended BEFORE the network work, so a crash after
 *   admission cannot erase the reservation. The opposite risk — a reservation
 *   leaking after a crash — is the safe direction to leak: it is visible in the
 *   journal and it expires with the window.
 *
 * THE WINDOW ROLLS; IT IS NOT A CALENDAR DAY.
 *   YouTube's Data API quota resets on a Pacific-time boundary. This budget
 *   bounds a rolling hour of LOCAL requests, because that is the resource that
 *   actually runs out for yt-dlp: there is no API quota involved, only a
 *   residential IP's tolerance. The day boundary matters only for the Data API
 *   lane, which is not implemented.
 *
 * A CAP IS NOT A THROTTLE (added for review HR23):
 *   The cap bounds the RATE. A 429 or a bot check is the service refusing the
 *   SESSION, and it is checked first and refuses across processes for a cooldown
 *   (`throttle.mjs`). Without that gate, a run that had just been told to stop
 *   would keep spending its remaining budget on requests that cannot succeed.
 *   In the same wrapper, `bounds.mjs` applies the per-run work/time ceiling, so
 *   this one function answers every "may I make this request?" question.
 *
 * @module creator-brains/ledger
 */

import { randomUUID } from 'node:crypto';
import { HOUR_MS, ensureDir, paths, appendJsonl, readJsonl } from './paths.mjs';
import { appendLedger } from './store.mjs';
import { throttleState, throttleReason } from './throttle.mjs';

/** Default transport operations per rolling hour. Owner-settable. */
export const DEFAULT_PER_HOUR = 60;

/** What a unit of budget buys. Explicit so callers cannot drift. */
export const COST = Object.freeze({
  DISCOVERY: 1, // one channel enumeration
  PROBE: 1, // `--list-subs` for one video
  FETCH: 1, // one json3 subtitle fetch
  CANARY: 2, // probe + fetch for the fixed canary video
});

export class BudgetError extends Error {}

/**
 * Validate a cap.
 *
 * The old code did `budget.perHour || DEFAULT`, which turned `0`, `NaN` and `''`
 * into the default and let `Infinity` through to mean "unlimited" — three quiet
 * ways to disable the limit by accident.
 */
export function validateCap(value, fallback = DEFAULT_PER_HOUR) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new BudgetError(
      `perHour must be a positive integer (got ${JSON.stringify(value)}) — refusing to run unbounded`,
    );
  }
  return n;
}

/**
 * Open the persistent budget for a store.
 *
 * Reads the reservation journal and keeps the entries still inside the window,
 * so a second process — or this process after a restart — sees the reservations
 * the first one made.
 */
export function openBudget({
  r, cap = DEFAULT_PER_HOUR, now = () => Date.now(), windowMs = HOUR_MS,
} = {}) {
  ensureDir(paths(r).base);
  return {
    r,
    perHour: validateCap(cap),
    windowMs,
    now,
    journal: paths(r).reservations,
    used: 0,
    entries: [],
    spent: 0,
    refusals: 0,
    byKind: {},
  };
}

/** Entries still inside the window. Re-read every time so a concurrent
 *  process's reservations are visible, not just this process's. */
function live(budget) {
  const cutoff = budget.now() - budget.windowMs;
  const entries = readJsonl(budget.journal)
    .filter((e) => e && Number.isFinite(Date.parse(e.ts)) && Date.parse(e.ts) > cutoff);
  budget.entries = entries;
  budget.used = entries.length;
  budget.byKind = entries.reduce((acc, e) => { acc[e.op] = (acc[e.op] || 0) + 1; return acc; }, {});
  return entries;
}

/**
 * Try to reserve `cost` transport operations.
 * Returns `{ok, reason, remaining, retryAfterMs}`; a refusal ALWAYS carries a
 * reason (the upstream CB5 contract: a tripped cap refuses, it never returns a
 * clean zero).
 *
 * The reservation is journaled before this function returns, so the caller may
 * proceed knowing a crash cannot un-spend it.
 */
export function reserveCost(budget, { op = 'fetch', cost = 1, runId = null, detail = null } = {}) {
  // THE SHARED THROTTLE GATE (review HR23). Checked BEFORE the hourly window,
  // because a rate limit is not about how many requests this hour has room for:
  // it is the service telling every caller to stop. Every transport operation in
  // the engine reserves through here, so there is no path around it — including
  // the operator's own `fetch --retry`.
  const throttled = throttleState(budget.r, { now: budget.now() });
  if (throttled.active) {
    budget.refusals += 1;
    return {
      ok: false,
      reason: `deferred, not attempted — ${throttleReason(throttled)}`,
      remaining: Math.max(0, budget.perHour - (budget.used || 0)),
      retryAfterMs: throttled.remainingMs,
      deferredReason: 'deferred_throttle',
    };
  }
  const entries = live(budget);
  const remaining = budget.perHour - entries.length;
  if (cost > remaining) {
    budget.refusals += 1;
    const oldest = entries.length ? Date.parse(entries[0].ts) : budget.now();
    return {
      ok: false,
      reason: `transport budget exhausted: ${entries.length}/${budget.perHour} operations in the last hour `
        + `(need ${cost} for ${op}, ${Math.max(0, remaining)} left)`,
      remaining: Math.max(0, remaining),
      retryAfterMs: Math.max(0, oldest + budget.windowMs - budget.now()),
      deferredReason: 'deferred_budget',
    };
  }
  const entry = {
    ts: new Date(budget.now()).toISOString(),
    token: randomUUID().slice(0, 8),
    op,
    cost,
    runId,
    detail,
  };
  appendJsonl(budget.journal, entry); // WRITE-AHEAD
  budget.spent += cost;
  live(budget);
  return { ok: true, reason: null, remaining: budget.perHour - budget.used, retryAfterMs: 0, entry };
}

/** Reserve one operation of a named kind. */
export function reserve(budget, opts = {}) {
  return reserveCost(budget, { op: opts.op || 'fetch', cost: opts.cost || 1, ...opts });
}

export function budgetState(budget) {
  live(budget);
  const throttled = throttleState(budget.r, { now: budget.now() });
  return {
    perHour: budget.perHour,
    used: budget.used,
    remaining: Math.max(0, budget.perHour - budget.used),
    spent: budget.spent,
    refusals: budget.refusals,
    byKind: budget.byKind,
    throttled: throttled.active,
    throttleReason: throttled.active ? throttleReason(throttled) : null,
    unit: 'yt-dlp transport operations per rolling hour',
  };
}

/** Ledger summaries stay summaries; admission reads the reservation journal. */
export function recordLedger(r, kind, payload = {}) {
  return appendLedger(r, { kind, ...payload });
}

/** Build a run record skeleton. */
export function newRunRecord({ runId, clock }) {
  const at = new Date(clock ? clock() : Date.now()).toISOString();
  return {
    runId,
    startedAt: at,
    endedAt: null,
    ok: null,
    engine: 'creator-brains',
    phases: [],
    counts: {
      discovered: 0, fetched: 0, deferred: 0, deferredReason: null,
      noTrack: 0, failed: 0, unavailable: 0, deleted: 0, built: 0,
    },
    budget: null,
    ytDlp: null,
  };
}

/** Add a phase result. Every phase carries a reason on failure — no bare falses. */
export function addPhase(record, name, { ok, counts = {}, reason = null, ms = null }) {
  record.phases.push({ name, ok, reason, ms, counts });
  return record;
}

/**
 * A sortable, GLOBALLY unique run id (review HR21).
 *
 *   The previous version used a per-process counter, which the reviewer broke
 *   with two separate Node processes at the same frozen clock: both emitted
 *   `1970-01-01T00-00-00-000Z-001` and one run record overwrote the other. A
 *   counter cannot be unique across a restart, and a lock does not help a process
 *   that starts after the lock is released.
 *
 *   The timestamp keeps lexicographic order == chronological order for
 *   `listRuns`; the UUID makes a collision a non-event rather than a lost record.
 */
export function runIdFor(clock) {
  const d = new Date(clock ? clock() : Date.now());
  return `${d.toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
}
