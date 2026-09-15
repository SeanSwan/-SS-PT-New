#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/passes.mjs
 * PURPOSE: The ordered catalog passes — reconcile, canary, discover, fetch,
 *          build, export — and the admission wrapper they all share.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/08/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `run.mjs` when the execution bounds landed (HR23) and pushed it
 * past the Rule 4 cap. The seam is the one already written in that file's header:
 *   `run.mjs` owns the FRAME — config validation, journal, lock, preflight,
 *   record, digest — and this owns the SEQUENCE.
 *
 * THE ADMISSION WRAPPER IS THE POINT:
 *   `makeReserve` is the single function every transport operation in the run
 *   passes through, and it is where the per-run work bound is enforced. Putting
 *   it here rather than inline in the runner is what makes "no caller can bypass
 *   the bound" checkable: there is exactly one place to read.
 *
 * ORDERING IS LOAD-BEARING (unchanged from `run.mjs`):
 *   reconcile -> canary -> discover -> fetch -> build -> export
 *   The canary answers "is yt-dlp working at all today?" before any catalog work,
 *   so a broken day is reported as one sentence instead of a cascade.
 *
 * @module creator-brains/passes
 */

import { reconcilePhase, discoverPhase, fetchPhase, buildPhase } from './pipeline.mjs';
import { exportBrains } from './export.mjs';
import { reserveCost, COST, addPhase } from './ledger.mjs';
import { saveState } from './store.mjs';
import { canaryPhase } from './canary.mjs';
import { throttleState, throttleReason, formatThrottle } from './throttle.mjs';
import { backlogReport } from './backlog.mjs';
import { probeSubs as realProbeSubs, fetchJson3 as realFetchJson3 } from './ytdlp.mjs';

/**
 * The admission check for one transport operation.
 *
 * Order matters: the run bound is consulted first (it is about THIS run), then
 * the persistent rolling-hour budget and the shared throttle cooldown inside
 * `reserveCost`. Every refusal is a DEFERRAL with a named reason — never a
 * silent zero and never a failure, because the video was not the problem.
 */
export function makeReserve({ budgetObj, boundObj }) {
  return (op, rid, videoId) => {
    const bound = boundObj.stop();
    if (bound) {
      budgetObj.refusals += 1;
      return {
        ok: false,
        reason: bound,
        remaining: Math.max(0, budgetObj.perHour - (budgetObj.used || 0)),
        retryAfterMs: 0,
        deferredReason: 'deferred_run_bound',
      };
    }
    return reserveCost(budgetObj, {
      op,
      cost: op === 'probe' ? COST.PROBE : COST.FETCH,
      runId: rid,
      detail: videoId,
    });
  };
}

/**
 * Run every wanted pass in order.
 *
 * Returns `{ built, exportResult, skipNetwork }` and fills in the run record's
 * counts, bounds, backlog and throttle state, so a caller reading only the
 * record learns what the run was allowed to do and what it actually spent.
 */
export async function runPasses({
  r, deps = {}, tick, phase, record, notes, secretValues = [], config, budgetObj, boundObj,
  canary = {}, retry = false, wants, selected, reg, state, authoritative = 'auto',
}) {
  const probeSubs = deps.probeSubs || realProbeSubs;
  const fetchJson3 = deps.fetchJson3 || realFetchJson3;
  const budgetReserve = makeReserve({ budgetObj, boundObj });

  // ── RECONCILE (HR08) ──────────────────────────────────────────────────────
  if (wants('reconcile')) {
    await phase('reconcile', () => {
      const reconciliation = reconcilePhase({
        r, enabled: selected, state, tick, notes,
      });
      // Surface the counts on the run record too, so a caller reading only the
      // summary still learns that documents were missing.
      record.counts.repaired = reconciliation.counts.repaired;
      record.counts.emptied = reconciliation.counts.emptied;
      return reconciliation;
    });
  }

  // ── CANARY ────────────────────────────────────────────────────────────────
  // A cooldown from an earlier run is honoured BEFORE the canary, so a run that
  // already knows the service is refusing us sends nothing at all — not even the
  // health check (HR23).
  const priorThrottle = throttleState(r, { now: tick() });
  let canaryOk = true;
  let canaryBoundSkipped = false;
  if (priorThrottle.active) {
    addPhase(record, 'throttle', {
      ok: false, reason: throttleReason(priorThrottle), counts: { attempted: 0 },
    });
    notes.push(`traffic deferred for this whole run — ${throttleReason(priorThrottle)}`);
  } else if (wants('canary')) {
    let res = null;
    canaryOk = await phase('canary', () => {
      res = canaryPhase({
        r, canary, probeSubs, fetchJson3, tick, notes, bounds: boundObj,
      });
      return res;
    });
    if (res && res.throttled) {
      addPhase(record, 'throttle', {
        ok: false, reason: throttleReason(res.throttle), counts: { attempted: COST.CANARY },
      });
    }
    // A canary that was never attempted because the run bound was too small is a
    // BOUND stop, not a broken health check — and the two must not be filed as
    // the same outcome (HR23).
    if (res && res.boundSkipped) canaryBoundSkipped = true;
  }

  const skipNetwork = !canaryOk && wants('canary') && !canaryBoundSkipped;
  if (skipNetwork) {
    notes.push('canary failed — network phases suppressed to avoid a misleading cascade');
    addPhase(record, 'circuit_breaker', {
      ok: false, reason: 'canary failed; acquisition suppressed', counts: {},
    });
  }
  if (canaryBoundSkipped) {
    // Recorded as its own phase so the verdict is DEFERRED rather than FAILED:
    // nothing is wrong with the engine, the run was simply allowed too little.
    addPhase(record, 'bound', {
      ok: false,
      reason: `run work bound reached before the canary: ${boundObj.maxOps} operation(s) allowed`,
      counts: { maxOps: boundObj.maxOps },
    });
  }

  // ── DISCOVER ──────────────────────────────────────────────────────────────
  if (wants('discover') && !skipNetwork) {
    await phase('discover', async () => {
      const res = await discoverPhase({
        r,
        deps,
        enabled: selected,
        state,
        tick,
        notes,
        secrets: secretValues,
        bounds: boundObj,
        authoritative: authoritative === true ? true : (authoritative === false ? false : 'auto'),
        runId: record.runId,
      });
      record.counts.discovered = res.counts.discovered;
      record.counts.deleted = res.counts.deleted;
      record.counts.suspected = res.counts.suspected;
      record.counts.swept = res.counts.swept;
      record.counts.sweepPending = res.counts.sweepPending;
      record.counts.resumedSweeps = res.counts.resumed;
      return res;
    });
  } else if (wants('discover')) {
    record.counts.discovered = 0;
    notes.push(`${selected.length} creator(s) NOT enumerated — suppressed for this run`);
  }

  // ── FETCH ─────────────────────────────────────────────────────────────────
  // Entered even when suppressed or throttled: it is the phase that knows how
  // many videos are due, so it is the only place that can report the deferral
  // count. It makes no request in either case.
  if (wants('fetch')) {
    await phase('fetch', () => fetchPhase({
      r,
      reg,
      enabled: selected,
      state,
      deps: { probeSubs, fetchJson3, budgetReserve },
      budget: budgetObj,
      tick,
      runId: record.runId,
      record,
      secrets: secretValues,
      retry,
      bounds: boundObj,
      noTrackHours: config.noTrackHours,
      suppressed: skipNetwork ? 'canary failed; acquisition suppressed for this run' : null,
    }));
    saveState(state, r);
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────
  const built = [];
  if (wants('build')) {
    await phase('build', () => {
      const res = buildPhase({
        r, enabled: selected, tick, notes, secrets: secretValues, reconcile: { state },
      });
      built.push(...res.built);
      record.counts.built = res.counts.built;
      record.counts.quarantined = res.counts.quarantined;
      record.counts.emptied = res.counts.emptied;
      return res;
    });
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────
  let exportResult = null;
  if (wants('export')) {
    await phase('export', () => {
      exportResult = exportBrains({ r, now: tick() });
      return {
        ok: true,
        reason: null,
        counts: { staged: exportResult.written.length, reaped: exportResult.reaped.length },
      };
    });
  }

  // What the run was allowed to do, what it spent, what is still owed and
  // whether traffic is deferred (HR23). This is the artifact a scheduler and an
  // operator both read, so the reasons belong in it rather than in a note.
  record.bounds = boundObj.state();
  record.counts.transportOps = boundObj.ops();
  record.backlog = backlogReport({ state, perHour: budgetObj.perHour, now: tick() });
  record.throttle = throttleState(r, { now: tick() });
  if (record.throttle.active) notes.push(`traffic deferred — ${formatThrottle(record.throttle)}`);

  return { built, exportResult, skipNetwork };
}
