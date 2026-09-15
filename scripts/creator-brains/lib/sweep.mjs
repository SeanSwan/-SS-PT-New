#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/sweep.mjs
 * PURPOSE: The authoritative reconciliation sweep — a census of a channel's
 *          whole corpus, resumable across runs, kept SEPARATE from incremental
 *          discovery.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY TWO MODES EXIST AT ALL (review HR22):
 *   Incremental discovery is cheap and answers "what is new?" — it stops at the
 *   high-water mark, so by construction it is NOT a census and cannot confirm that
 *   anything is gone. Authoritative reconciliation answers "what exists?" and is
 *   the only walk allowed to advance a deletion. Before this module the daily job
 *   only ever walked incrementally, so `deleted_upstream` was unreachable in
 *   production: the two observations the FSM requires could never both arrive.
 *
 * WHY IT RESUMES:
 *   A census of a large channel may not fit in one run — the per-run work bound
 *   (HR23) may afford one tab, and the tab walks are separate subprocesses. A
 *   census that restarts from `videos` every time never reaches `streams`: the
 *   corpus is then permanently short, and the missing videos are indistinguishable
 *   from deleted ones. The checkpoint (`checkpoints.mjs`) makes the next run
 *   continue with the tabs that are still uncertified.
 *
 * WHAT MAKES IT AUTHORITATIVE — all three, or it confirms nothing:
 *   1. EVERY tab in the sweep is certified (a walk that returned a clean per-tab
 *      entry, with no error for that tab);
 *   2. the union of ids seen across the whole sweep is NON-EMPTY (an empty walk is
 *      inconclusive, never an empty channel — review HR12c);
 *   3. the deletion diff runs against the UNION, not against the last walk's rows,
 *      so a census assembled from two runs is compared with the whole corpus.
 *
 * @module creator-brains/sweep
 */

import { discoverChannel, applyDeletionObservations } from './discover.mjs';
import { TABS } from './enumerate.mjs';
import { touchCreator } from './registry.mjs';
import { nowIso } from './paths.mjs';
import {
  emptySweep, getSweep, saveSweep, clearSweep, sweepPlan, foldWalk,
} from './checkpoints.mjs';

/**
 * Walk as much of a channel's corpus as this run can afford, and confirm
 * absences only when the whole corpus has now been certified.
 *
 * `room` is how many enumeration operations the run bound still allows (Infinity
 * when unbounded). Tabs are planned in corpus order, so a bounded install
 * progresses through them run by run instead of retrying the first one.
 *
 * `bounds` IS CHARGED FOR THE WALK. The first version of this function took `room`
 * and never added what it spent, so a three-tab census reported `transportOps: 0`
 * and spent operations the run bound never saw — `--max-ops=1` could spend three.
 * The incremental path charged correctly, which is exactly why no existing test
 * noticed: every one of them exercised the other path. A local hostile probe found
 * it; `HR23l` now asserts it on both sides (the reported count and the tab the next
 * run takes).
 */
export async function runSweep({
  r, deps, creator, state, tick, runId = null, room = Infinity, notes = [], tabs = TABS, bounds = null,
}) {
  const now = tick();
  const prior = getSweep(r, creator.channelId);
  const plan = sweepPlan(prior, { tabs, now });
  const label = creator.title || creator.channelId;
  const firstCensus = !creator.lastAuthoritativeAt;

  if (plan.stale) {
    notes.push(`${label}: a partial sweep older than the resume window was discarded and restarted`);
    clearSweep(r, creator.channelId);
  }
  if (plan.mismatched) {
    notes.push(`${label}: the stored sweep covers a different tab list — restarted from scratch`);
  }
  const resumable = plan.resume ? (prior || emptySweep({ tabs, now, runId })) : emptySweep({ tabs, now, runId });

  const affordable = Number.isFinite(room) ? Math.max(0, Math.floor(room)) : plan.pendingTabs.length;
  const walkedTabs = plan.pendingTabs.slice(0, Math.max(0, affordable));
  if (!walkedTabs.length) {
    return {
      ok: true,
      walked: [],
      deferred: true,
      reason: `authoritative sweep deferred: ${plan.pendingTabs.length} tab(s) still to walk, `
        + 'but the run bound allows no more enumeration operations (raise --max-ops)',
      pendingTabs: plan.pendingTabs,
      ids: resumable.ids.length,
      discovered: 0,
      deleted: 0,
      suspected: 0,
      resumed: plan.resume,
      complete: false,
    };
  }

  const walk = await discoverChannel(creator, {
    r,
    deps,
    now: tick,
    limit: 0,
    state,
    tabs: walkedTabs,
    incremental: false,
    allowDeletion: false,
    allTabs: tabs,
  });

  // CHARGE THE WALK (HR23l). One operation per tab attempted, whether it answered
  // or failed — this is the spend the run bound was asked to hold back, and the
  // incremental path has always charged it.
  if (bounds) bounds.charge(walk.perTab ? Math.max(1, Object.keys(walk.perTab).length) : 1);

  if (walk.ok === false) {
    return {
      ok: false,
      refused: true,
      walked: walkedTabs,
      deferred: false,
      reason: `authoritative sweep refused: ${walk.reason}`,
      pendingTabs: plan.pendingTabs,
      ids: resumable.ids.length,
      discovered: 0,
      deleted: 0,
      suspected: 0,
      resumed: plan.resume,
      complete: false,
      firstCensus,
    };
  }

  const folded = foldWalk(resumable, {
    walkedTabs,
    perTab: walk.perTab || {},
    rows: walk.rows || [],
    complete: walk.complete === true,
    problems: walk.problems || [],
    // A walk that covered every tab and certified itself whole needs no per-tab
    // breakdown to be a census (see `foldWalk`).
    trustWholeWalk: walk.complete === true && walkedTabs.length === (resumable.tabs || []).length,
    now,
    runId,
  });

  // NOT CERTIFIED: keep the checkpoint so the next run continues where this one
  // stopped. This is the whole point of the finding — the tab is not lost.
  if (!folded.allCertified) {
    saveSweep(r, creator.channelId, folded.sweep);
    notes.push(`${label}: corpus census incomplete — certified ${Object.keys(folded.sweep.certified).join('+') || 'nothing'}, `
      + `still to walk: ${folded.pendingTabs.join('+')}`);
    return {
      ok: (walk.problems || []).length === 0,
      walked: walkedTabs,
      deferred: false,
      reason: (walk.problems || []).length
        ? `tab walk failed for ${label}: ${walk.problems.join('; ')}`
        : null,
      pendingTabs: folded.pendingTabs,
      certified: Object.keys(folded.sweep.certified),
      ids: folded.ids.length,
      discovered: walk.newIds.length,
      deleted: 0,
      suspected: 0,
      resumed: plan.resume,
      complete: false,
      firstCensus,
    };
  }

  // CERTIFIED: the union is a census, so absences may be observed against it.
  //
  // "ABSENT FROM THE PUBLIC TABS" IS THE OBSERVATION, NOT "DELETED" (probe F3). The
  // error text says so, because a members-only, private or region-blocked video is
  // indistinguishable from a deleted one through this lens, and the state it lands
  // in is terminal until the video reappears in an enumeration.
  const seenIds = new Set(folded.ids);
  const observed = walk.rows.length
    ? applyDeletionObservations({
      r,
      store: state,
      creator,
      seenIds,
      clock: tick,
      reason: 'absent from a complete census of the public tabs (uploads/shorts/streams) — '
        + 'private, members-only and region-blocked videos are indistinguishable from deleted ones here',
    })
    : { deleted: [], suspected: [] };

  // THE CADENCE CLOCK ADVANCES ONLY HERE (review HR22): a sweep that certified the
  // whole corpus. A partial or failed sweep leaves the creator due, so a run of bad
  // days cannot silently become "recently reconciled".
  touchCreator(r, creator.channelId, {
    lastAuthoritativeAt: nowIso(tick),
    lastAuthoritative: {
      complete: true,
      tabs: folded.sweep.tabs,
      rows: walk.rows.length,
      ids: seenIds.size,
      deleted: observed.deleted.length,
      suspected: observed.suspected.length,
      at: nowIso(tick),
    },
  });

  clearSweep(r, creator.channelId);
  if (!walk.rows.length) {
    notes.push(`${label}: the census returned NO rows — inconclusive, so no absence was recorded`);
  }
  return {
    ok: (walk.problems || []).length === 0,
    walked: walkedTabs,
    deferred: false,
    reason: (walk.problems || []).length ? `tab walk failed for ${label}: ${walk.problems.join('; ')}` : null,
    pendingTabs: [],
    certified: Object.keys(folded.sweep.certified),
    resumed: plan.resume,
    complete: true,
    firstCensus,
    rows: walk.rows.length,
    ids: seenIds.size,
    discovered: walk.newIds.length,
    deleted: observed.deleted.length,
    suspected: observed.suspected.length,
  };
}
