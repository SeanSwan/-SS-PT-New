#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/pipeline.mjs
 * PURPOSE: The phases that talk to YouTube — discover and fetch — each
 *          returning `{ ok, reason, counts }` so the runner records it verbatim.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/08/18/23)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND, AND WHAT CHANGED HERE:
 *
 *   HR08 — RECONCILE DID NOT EXIST.
 *     Removing a creator's only transcript document left the state row saying
 *     `fetched`, so the fetch phase skipped it forever, the build phase returned
 *     early on an empty brain, and the PREVIOUS generation stayed queryable.
 *     The reviewer measured exactly that: `ok=true, built=0, zero probes, one old
 *     searchable claim, five old staged files`. Reconciliation now lives in
 *     `schedule.mjs` and runs before scheduling.
 *
 *   HR02 — SELECTION WAS DISCARDED.
 *     The CLI computed `targets` and then called a runner that reloaded every
 *     enabled creator, so `fetch <id>` fetched everybody. The runner now takes
 *     an explicit `onlyCreators` selection and this module intersects it with the
 *     enabled set rather than replacing one with the other.
 *
 *   HR18 — THE AUTHORITY CHECK WAS NOT PASSED.
 *     `fetchVideo` grew an authority requirement; this phase supplies the registry
 *     and the state map so the check can actually run.
 *
 *   HR23 — NOTHING BOUNDED A BAD DAY.
 *     Two behaviours were wrong and both are fixed here:
 *       1. a run had no execution bound, so it could spend the whole night
 *          enumerating, probing and fetching (see `bounds.mjs`);
 *       2. a 429 or a bot check was treated as one video's problem, so the loop
 *          moved on to the next of four thousand videos — each one another
 *          request to a service that had just said stop. A global refusal now
 *          stops THIS phase, records the cooldown, and every later invocation in
 *          every later process refuses too (`throttle.mjs`).
 *
 *   Both refusals are DEFERRALS, never failures: the video was not broken, we
 *   were told to wait, and a reader must be able to tell those apart.
 *
 * @module creator-brains/pipeline
 */

import { shouldAttempt, STATES } from './fsm.mjs';
import { selectCreators, reconcilePhase, priorityTier, orderCandidates } from './schedule.mjs';
import { fetchVideo, stripMeta } from './fetch.mjs';
import { budgetState } from './ledger.mjs';
import { appendLedger, saveState } from './store.mjs';
import { redact } from './digest.mjs';
import { throttleState, throttleReason, noteTransportFailure } from './throttle.mjs';

// Re-exported: these were part of this module's surface before the splits, and
// the instruments and older callers import them from here.
export { selectCreators, reconcilePhase, priorityTier, orderCandidates };
export { buildPhase } from './build-phase.mjs';
export { RENDERERS } from './render.mjs';
export { saveState };

/** An upload published within this window is "fresh" and outranks backfill.
 *  Re-exported from the scheduler, which owns the arithmetic. */
export { FRESH_DAYS } from './schedule.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Discover
// ─────────────────────────────────────────────────────────────────────────────

// The pass now lives beside its own rules in `discover-phase.mjs` (the throttle
// response and the bound-sized walk). Re-exported because this module's name is
// the import surface older callers and instruments use.
export { discoverPhase } from './discover-phase.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────────

/** Keep only the persisted shape — `lastError` is scrubbed on the way in because
 *  it is echoed into the brain's coverage-gap table, which is Lane C, which is
 *  exported. It now lives in `fetch.mjs`, beside the outcome shape it narrows. */
export { stripMeta } from './fetch.mjs';

/**
 * Fetch due transcripts.
 *
 * `bounds` is the per-run work/time ceiling and `suppressed` is the reason a
 * caller has already decided not to touch the network (a failed canary). Both
 * are enforced HERE, before and during the loop, so no caller can opt out by
 * forgetting to check them.
 */
export async function fetchPhase({
  r, reg, enabled, state, deps, budget, tick, runId, record, secrets = [], retry = false,
  bounds = null, noTrackHours = null, suppressed = null,
}) {
  if (!enabled.length) {
    record.budget = budgetState(budget);
    return { ok: true, reason: 'no enabled creators', counts: { fetched: 0, deferred: 0 } };
  }
  const enabledIds = new Set(enabled.map((c) => c.channelId));
  const now = tick();

  const candidates = orderCandidates(
    Object.values(state.videos)
      .filter((v) => enabledIds.has(v.channelId))
      .filter((v) => shouldAttempt(v, { now, retry }).work),
    { now },
  );

  let fetched = 0; let deferred = 0; let noTrack = 0; let failed = 0;
  let unavailable = 0; let deferredReason = null;
  const attempted = new Set();

  // Deliberately CHEAP: this runs once per candidate, so it must not re-read the
  // reservation journal (`budget.spent` is the in-process tally). The
  // authoritative view is written once, at the end, or on an early return.
  const publish = () => {
    Object.assign(record.counts, {
      fetched, deferred, deferredReason, noTrack, failed, unavailable,
      transportOps: bounds ? bounds.ops() : budget.spent,
    });
  };

  // ── WHY WE ARE NOT TOUCHING THE NETWORK, decided before any traffic ────────
  const throttled = throttleState(r, { now: tick() });
  let stop = null; let stopKind = null;
  if (throttled.active) { stop = throttleReason(throttled); stopKind = 'deferred_throttle'; } else if (suppressed) { stop = suppressed; stopKind = 'deferred_suppressed'; } else if (bounds) {
    const bound = bounds.stop();
    if (bound) { stop = bound; stopKind = 'deferred_run_bound'; }
  }

  if (stop && !candidates.length) {
    // Nothing to defer, but the reason is still worth recording.
    publish();
    record.budget = budgetState(budget);
    return { ok: true, reason: null, counts: { fetched: 0, deferred: 0, throttled: !!throttled.active } };
  }

  if (stop) {
    deferred = candidates.length;
    deferredReason = `${stopKind}: ${stop}`;
    publish();
    record.budget = budgetState(budget);
    appendLedger(r, {
      runId, kind: 'fetch', fetched, deferred, failed, cap: budget.perHour, deferredReason,
    });
    return {
      ok: false,
      reason: `no traffic attempted — ${deferredReason}`,
      counts: { fetched, deferred, noTrack, failed, unavailable },
    };
  }

  for (const video of candidates) {
    if (attempted.has(video.videoId)) continue; // a duplicate candidate cannot double-spend

    if (bounds) {
      const bound = bounds.stop();
      if (bound) { stop = bound; stopKind = 'deferred_run_bound'; break; }
    }
    attempted.add(video.videoId);

    const creator = reg.creators[video.channelId];
    if (!creator) { failed += 1; publish(); continue; }

    const outcome = await fetchVideo(video, {
      r,
      creator,
      state,
      now: tick,
      noTrackHours,
      deps: {
        ...deps,
        // Admission is per operation, so the budget counts what actually runs.
        reserve: (op) => deps.budgetReserve(op, runId, video.videoId),
      },
      authority: {
        registry: reg, requireRegistryEntry: true, requireEnabled: true, requireDiscovered: true,
      },
    });

    // A GLOBAL REFUSAL IS NOT THIS VIDEO'S PROBLEM (HR23). Classified before the
    // outcome is filed, because the text that identifies it lives on the outcome.
    const trip = noteTransportFailure(r, {
      error: `${outcome.reason || ''} ${outcome.lastError || ''}`,
      now: tick(),
      source: `fetch:${video.videoId}`,
    });

    if (outcome.deferred) {
      deferred += 1;
      deferredReason = deferredReason || outcome.lastError;
      publish();
      if (trip && trip.ok) { stop = throttleReason(throttleState(r, { now: tick() })); stopKind = 'deferred_throttle'; break; }
      continue;
    }

    state.videos[video.videoId] = stripMeta(outcome, secrets);
    if (outcome.state === STATES.FETCHED) fetched += 1;
    else if (outcome.state === STATES.NO_TRACK_RETRY || outcome.state === STATES.NO_TRACK_CONFIRMED) noTrack += 1;
    else if (outcome.state === STATES.UNAVAILABLE) unavailable += 1;
    else failed += 1;
    publish();

    if (trip && trip.ok) { stop = throttleReason(throttleState(r, { now: tick() })); stopKind = 'deferred_throttle'; break; }
  }

  if (stop) {
    const left = candidates.filter((c) => !attempted.has(c.videoId)).length;
    deferred += left;
    deferredReason = `${stopKind}: ${stop}`;
  }

  record.budget = budgetState(budget);
  publish();
  appendLedger(r, {
    runId, kind: 'fetch', fetched, deferred, failed, cap: budget.perHour, deferredReason,
  });

  const anyProgress = fetched > 0 || deferred > 0 || noTrack > 0 || candidates.length === 0;
  return {
    ok: failed === 0 && !stop && (anyProgress || unavailable > 0),
    reason: stop
      ? `${stopKind}: ${stop}`
      : (failed ? `${failed} fetch(es) failed` : (deferred ? `${deferred} deferred: ${deferredReason}` : null)),
    counts: {
      fetched, deferred, noTrack, failed, unavailable,
    },
  };
}
