#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/ledger.mjs
 * PURPOSE: The fetch budget — a sliding-hour rate cap that REFUSES with a
 *          reason, plus the append-only ledger and run-record shape.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S3)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY A BUDGET AT ALL WHEN THERE IS NO API KEY:
 *   The upstream plan's quota anxiety was about the YouTube Data API, and for
 *   this engine that is the wrong resource — discovery is yt-dlp, which costs
 *   no quota. The resource that actually runs out is **YouTube's tolerance for
 *   automated requests from one residential IP**. That is a soft block, and it
 *   is invisible until it arrives. So the cap here bounds REQUESTS PER HOUR,
 *   not API units.
 *
 * THE RULE THE UPSTREAM PANEL INSISTED ON (§1.5.1, CB5):
 *   "a tripped cap REFUSES with a reason, never returns a clean zero."
 *   A run that silently does nothing looks identical to a run with nothing to
 *   do. Those must be distinguishable in the digest, or a capped pipeline rots
 *   unnoticed for weeks — which is the single failure mode both review seats
 *   named independently.
 *
 * @module creator-brains/ledger
 */

import { HOUR_MS } from './paths.mjs';
import { appendLedger } from './store.mjs';

/** Default fetch requests per rolling hour. Owner-settable, not a constant in
 *  the call site — a backfill wants this raised deliberately. */
export const DEFAULT_PER_HOUR = 20;

/**
 * A budget is a mutable sliding window. `deps.now` is injected so tests can
 * advance the clock instead of sleeping an hour.
 */
export function makeBudget({ perHour = DEFAULT_PER_HOUR, deps } = {}) {
  const now = (deps && deps.now) || Date.now;
  return {
    perHour: Math.max(1, Math.trunc(perHour) || DEFAULT_PER_HOUR),
    stamps: [],
    now,
    spent: 0,
    refusals: 0,
  };
}

/** Drop stamps older than the window. Called before every decision. */
function slide(budget) {
  const cutoff = budget.now() - HOUR_MS;
  while (budget.stamps.length && budget.stamps[0] <= cutoff) budget.stamps.shift();
}

/**
 * Try to spend one fetch. Returns `{ok, reason, remaining, retryAfterMs}`.
 * `ok: false` ALWAYS carries a reason — that is the contract.
 */
export function reserve(budget) {
  slide(budget);
  if (budget.stamps.length >= budget.perHour) {
    budget.refusals += 1;
    return {
      ok: false,
      reason: `fetch budget exhausted: ${budget.stamps.length}/${budget.perHour} requests in the last hour`,
      remaining: 0,
      retryAfterMs: Math.max(0, budget.stamps[0] + HOUR_MS - budget.now()),
      deferredReason: 'deferred_budget',
    };
  }
  budget.stamps.push(budget.now());
  budget.spent += 1;
  return { ok: true, reason: null, remaining: budget.perHour - budget.stamps.length, retryAfterMs: 0 };
}

export function budgetState(budget) {
  slide(budget);
  return {
    perHour: budget.perHour,
    used: budget.stamps.length,
    remaining: Math.max(0, budget.perHour - budget.stamps.length),
    spent: budget.spent,
    refusals: budget.refusals,
  };
}

/** Append one ledger line. Ledger lines are Lane C — no transcript text, ever. */
export function recordLedger(r, kind, payload = {}) {
  return appendLedger(r, { kind, ...payload });
}

/** Build a run record skeleton. `endedAt` and phase results are filled by the runner. */
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

/** A stable, sortable run id. Lexicographic order == chronological order.
 *
 *  A per-process counter suffix is appended because millisecond resolution is
 *  not unique in practice: a narrowed `cli fetch` racing the scheduled daily run
 *  produced two records with the same id, and `runs/<id>.json` silently kept
 *  only the last — losing a run that had actually fetched documents. */
let RUN_SEQ = 0;

export function runIdFor(clock) {
  const d = new Date(clock ? clock() : Date.now());
  RUN_SEQ = (RUN_SEQ + 1) % 1000;
  return `${d.toISOString().replace(/[:.]/g, '-')}-${String(RUN_SEQ).padStart(3, '0')}`;
}
