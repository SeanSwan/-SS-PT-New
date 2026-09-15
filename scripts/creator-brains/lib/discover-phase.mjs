#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/discover-phase.mjs
 * PURPOSE: The discover pass — enumerate every enabled creator, choosing between
 *          INCREMENTAL discovery and an AUTHORITATIVE census, subject to the
 *          shared throttle and the per-run work bound.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR12/22/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THE TWO MODES, AND WHY THE CHOICE LIVES HERE (review HR22):
 *   "Implement resumable checkpoints and incremental discovery separately from
 *    periodic authoritative reconciliation."
 *
 *   - INCREMENTAL (the daily default): stop at the last-known-newest video. Cheap,
 *     answers "what is new?", and by construction is not a census — so it can
 *     never confirm that something is gone.
 *   - AUTHORITATIVE (`--full`, or due on the cadence): walk the whole corpus with
 *     no early stop. This is the only walk allowed to advance a deletion.
 *
 *   Before this split the daily job only ever walked incrementally, so
 *   `deleted_upstream` was unreachable in production: the two agreeing
 *   observations the FSM requires could never both arrive. `schedule.mjs` decides
 *   WHEN a census is due; `sweep.mjs` runs it (and resumes it); this pass decides
 *   WHICH creators get one and reports what happened.
 *
 * TWO HR23 RULES STILL LIVE HERE:
 *
 *   1. A GLOBAL REFUSAL STOPS THE PASS. A 429 or a bot check during enumeration is
 *      classified, persisted as a cooldown, and the remaining creators are
 *      reported as SKIPPED rather than attempted one by one against a service that
 *      has already said stop.
 *
 *   2. THE WALK IS SIZED TO THE BOUND, NOT DISCOVERED BY OVERSHOOTING IT. An
 *      enumeration costs one operation per tab (three by default, HR22), so with
 *      one operation left an incremental walk takes the FIRST tab and reports the
 *      walk as incomplete — the safe direction, since an incomplete walk advances
 *      no deletion confirmation (HR12). A SWEEP does better than truncating: it
 *      certifies the tab it walked and leaves the rest in its checkpoint, so the
 *      next run continues instead of starting over.
 *
 * @module creator-brains/discover-phase
 */

import { discoverChannel } from './discover.mjs';
import { TABS } from './enumerate.mjs';
import { selectAuthoritative } from './schedule.mjs';
import { runSweep } from './sweep.mjs';
import { throttleState, throttleReason, noteTransportFailure } from './throttle.mjs';
import { redact } from './digest.mjs';

/** How many enumeration operations this run can still afford. */
function roomFor(bounds) {
  if (!bounds) return Number.POSITIVE_INFINITY;
  if (bounds.maxOps === null) return Number.POSITIVE_INFINITY;
  return bounds.maxOps - bounds.ops();
}

export async function discoverPhase({
  r, deps, enabled, state, tick, notes = [], secrets = [], bounds = null,
  authoritative = 'auto', everyDays = undefined, runId = null,
}) {
  if (!enabled.length) {
    return {
      ok: true,
      reason: 'no enabled creators',
      counts: {
        discovered: 0, deleted: 0, skipped: 0, swept: 0, resumed: 0, sweepPending: 0,
      },
    };
  }
  let discovered = 0; let deleted = 0; let suspected = 0; let incomplete = 0;
  let failed = 0; let tabFailures = 0; let judged = 0;
  let swept = 0; let resumed = 0; let sweepPending = 0; let sweepDeferred = 0;
  let index = 0; let stop = null; let stopKind = null;

  // A cooldown from an earlier run is honoured before the first walk, not after
  // the first refusal (HR23).
  const throttled = throttleState(r, { now: tick() });
  if (throttled.active) {
    return {
      ok: false,
      reason: `no enumeration attempted — ${throttleReason(throttled)}`,
      counts: {
        discovered: 0, deleted: 0, suspected: 0, incomplete: 0, failed: 0, skipped: enabled.length,
      },
    };
  }

  // WHICH CREATORS GET A CENSUS (HR22). `authoritative: true` forces one for all
  // of them (`--full`); `false` disables them (a caller that only wants new
  // videos); otherwise the cadence decides, and a never-swept creator is due.
  const dueSet = new Set();
  if (authoritative === true) {
    for (const c of enabled) dueSet.add(c.channelId);
  } else if (authoritative !== false) {
    const { due } = selectAuthoritative(enabled, {
      now: tick(), everyDays: everyDays || undefined,
    });
    for (const d of due) dueSet.add(d.creator.channelId);
  }

  for (const creator of enabled) {
    const label = creator.title || creator.channelId;
    const room = roomFor(bounds);

    if (room < 1) {
      stop = bounds && bounds.maxOps !== null
        ? `run work bound reached: ${bounds.ops()}/${bounds.maxOps} transport operations`
        : 'the run work bound allows no more enumeration operations';
      stopKind = 'deferred_run_bound';
      break;
    }

    if (dueSet.has(creator.channelId)) {
      // ── AUTHORITATIVE CENSUS ────────────────────────────────────────────────
      let sweep;
      try {
        // eslint-disable-next-line no-await-in-loop
        sweep = await runSweep({
          r, deps, creator, state, tick, runId, room, notes, tabs: TABS, bounds,
        });
      } catch (e) {
        index += 1;
        failed += 1;
        notes.push(`sweep failed for ${label}: ${redact(e.message, secrets)}`);
        continue;
      }
      index += 1;
      discovered += sweep.discovered;
      deleted += sweep.deleted;
      suspected += sweep.suspected;
      if (sweep.resumed) resumed += 1;
      if (sweep.walked.length && !sweep.complete) sweepPending += 1;
      if (sweep.deferred) sweepDeferred += 1;
      if (sweep.complete) {
        swept += 1;
        notes.push(`${label}: corpus census complete (${sweep.rows} rows, ${sweep.ids} ids`
          + `${sweep.firstCensus ? ', first census' : ''})`);
      }
      if (sweep.refused) {
        failed += 1;
        notes.push(`${label}: ${redact(sweep.reason, secrets)}`);
      } else if (sweep.reason) {
        tabFailures += 1;
        notes.push(`${label}: ${redact(sweep.reason, secrets)}`);
      }
      continue;
    }

    // ── INCREMENTAL DISCOVERY ─────────────────────────────────────────────────
    const walkTabs = Number.isFinite(room) ? TABS.slice(0, Math.min(TABS.length, room)) : TABS;
    if (walkTabs.length < TABS.length) {
      notes.push(`${label}: walking ${walkTabs.join('+')} only — the run work bound allows `
        + `${walkTabs.length} of ${TABS.length} enumeration operations`);
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await discoverChannel(creator, {
        r, deps, now: tick, limit: 0, state, tabs: walkTabs, allTabs: TABS,
      });
      index += 1;
      // Charge what the walk ACTUALLY spent: one operation per tab attempted,
      // which `perTab` reports even for a tab that failed.
      if (bounds) bounds.charge(res.perTab ? Math.max(1, Object.keys(res.perTab).length) : 1);

      if (res.ok === false) {
        failed += 1;
        const text = `${res.reason || 'enumeration refused'}`;
        notes.push(`discover refused for ${label}: ${redact(text, secrets)}`);
        const trip = noteTransportFailure(r, {
          error: text, now: tick(), source: `discover:${creator.channelId}`,
        });
        if (trip && trip.ok) {
          stop = throttleReason(throttleState(r, { now: tick() }));
          stopKind = 'deferred_throttle';
          break;
        }
        continue;
      }
      discovered += res.newIds.length;
      deleted += res.deleted.length;
      suspected += res.suspected.length;
      if (res.judged) judged += 1;
      // A TAB THAT ERRORED IS A FAILURE, not the same thing as an intentionally
      // truncated walk: the walker was asked for a tab and could not read it.
      if ((res.problems || []).length) {
        tabFailures += 1;
        notes.push(`${label}: ${res.problems.length} tab walk(s) failed — ${redact(res.problems.join('; '), secrets)}`);
      }
      if (!res.complete && !(res.problems || []).length) {
        incomplete += 1;
        notes.push(`enumeration for ${label} was INCOMPLETE (${res.reason}) — no deletion confirmations advanced`);
      }
    } catch (e) {
      index += 1;
      failed += 1;
      notes.push(`discover failed for ${label}: ${redact(e.message, secrets)}`);
      const trip = noteTransportFailure(r, {
        error: e.message, now: tick(), source: `discover:${creator.channelId}`,
      });
      if (trip && trip.ok) {
        stop = throttleReason(throttleState(r, { now: tick() }));
        stopKind = 'deferred_throttle';
        break;
      }
    }
  }

  const skipped = stop ? enabled.length - index : 0;
  if (stop) notes.push(`discovery stopped early for ${skipped} creator(s): ${stopKind} — ${stop}`);
  return {
    ok: failed === 0 && tabFailures === 0 && !stop,
    reason: stop
      ? `${stopKind}: ${stop}`
      : (tabFailures ? `enumeration failed for ${tabFailures} creator(s)`
        : (failed ? `discovery failed for ${failed} of ${enabled.length} creator(s)` : null)),
    counts: {
      discovered,
      deleted,
      suspected,
      incomplete,
      failed,
      tabFailures,
      skipped,
      judged,
      swept,
      resumed,
      sweepPending,
      sweepDeferred,
    },
  };
}
