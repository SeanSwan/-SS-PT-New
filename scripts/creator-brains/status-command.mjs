#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/status-command.mjs
 * PURPOSE: `status` — one screen answering "is this working, and when did it
 *          last actually succeed?"
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR16)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `commands.mjs` for the Rule 4 cap. It reports exactly the things
 * the review found were NOT observable:
 *
 *   - the PERSISTENT budget and its per-operation breakdown (HR01);
 *   - the lock holder, so a stuck run is visible rather than mysterious (HR14);
 *   - the journal status, so a run that never finished is distinguishable from
 *     one that never started (HR16);
 *   - the last SUCCESSFUL acquisition as distinct from the last attempt, with a
 *     staleness warning — "the scheduler stopped three weeks ago" must be
 *     answerable without reading logs (HR16);
 *   - coverage gaps and invalid documents, so a brain with holes says so (HR17).
 *
 * @module creator-brains/status-command
 */

import {
  readState, readRegistry, isDamaged, describeRead, stateOrDefault,
  ensureStore, listRuns, readRunJournal, readLastSuccess, listDocs,
} from './lib/store.mjs';
import { lockStatus } from './lib/lock.mjs';
import { summarize } from './lib/summary.mjs';
import { openBudget, budgetState } from './lib/ledger.mjs';
import { backlogReport, formatBacklog } from './lib/backlog.mjs';
import { throttleState, formatThrottle } from './lib/throttle.mjs';
import { sweepState } from './lib/checkpoints.mjs';
import { selfCheck } from './lib/ytdlp.mjs';
import { listPublished } from './lib/render.mjs';
import { listCreatorsSafe } from './lib/registry.mjs';
import { EXIT } from './commands.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

/** Staleness threshold: more than this many days without a success is a warning. */
export const STALE_DAYS = 3;

export async function statusCommand({ r }) {
  const store = ensureStore(r);
  const check = selfCheck();
  out(`store:      ${store.base}`);
  out(`yt-dlp:     ${check.ok ? `ok (${check.version}) via ${check.reason}` : `MISSING — ${check.reason}`}`);

  const regRead = readRegistry(r);
  const stateRead = readState(r);
  const damaged = isDamaged(regRead);
  const creators = damaged ? [] : listCreatorsSafe(r).creators;
  out(`creators:   ${damaged
    ? `REGISTRY DAMAGED (${describeRead(regRead)})`
    : `${creators.length} (${creators.filter((c) => c.enabled).length} enabled)`}`);
  out(`state:      ${describeRead(stateRead)}`);

  // `stateOrDefault` is the honest reader here: the summary block below prints
  // "absent (first run)" and the backlog must agree with it rather than throw.
  const videos = stateOrDefault(stateRead).videos || {};
  if (!isDamaged(stateRead)) {
    const summary = summarize(videos);
    out(`videos:     ${summary.total} tracked · ${summary.fetched} fetched (${Math.round(summary.coverage * 100)}%)`);
    for (const [k, v] of Object.entries(summary.counts)) if (v) out(`              ${k}: ${v}`);
  }

  const bs = budgetState(openBudget({ r }));
  out(`budget:     ${bs.used}/${bs.perHour} ${bs.unit}`);
  for (const [k, v] of Object.entries(bs.byKind)) out(`              ${k}: ${v}`);

  // WHAT IS STILL OWED (HR23). Age, projection and the repair action, printed on
  // the same screen as coverage — "how much do we have" without "how much is
  // missing, and for how long" is the number that hid a 200-day backlog.
  for (const line of formatBacklog(backlogReport({
    state: { videos }, perHour: bs.perHour, now: Date.now(),
  }))) out(line);

  // A cooldown outlives the run that tripped it, so it must be visible BEFORE the
  // next invocation rather than discovered from its refusals (HR23).
  out(`throttle:   ${formatThrottle(throttleState(r))}`);

  // A CENSUS IS THE ONLY THING THAT CAN CONFIRM A DELETION, so what it is doing
  // and when it last finished is operator information, not internal detail
  // (review HR22). A sweep in progress is progress, not a stuck run.
  const sweeps = sweepState(r);
  const everSwept = creators.filter((c) => c.lastAuthoritativeAt).length;
  out(`census:     ${sweeps.inFlight.length ? `${sweeps.inFlight.length} in progress` : 'none in progress'}`
    + ` · ${everSwept}/${creators.length} creator(s) swept at least once`);
  for (const s of sweeps.inFlight) {
    out(`              ${s.channelId}: certified ${s.certifiedTabs.join('+') || 'nothing'}`
      + ` · still to walk ${s.pendingTabs.join('+')} · started ${s.ageDays}d ago · ${s.ids} id(s) seen`);
  }
  if (sweeps.discarded) {
    out(`              WARNING: checkpoints.json was unreadable (${sweeps.error}) — resume state was discarded`);
  }

  const lock = lockStatus(r);
  out(`lock:       ${lock.held
    ? `HELD by pid ${lock.pid} on ${lock.host}${lock.alive === false ? ' (NOT ALIVE — reclaimable)' : ''}`
    : 'free'}`);

  const journal = readRunJournal(r);
  out(`last run:   ${journal ? `${journal.status} (${journal.runId || 'n/a'})` : 'never'}`);
  const ok = readLastSuccess(r);
  const staleDays = ok ? Math.floor((Date.now() - Date.parse(ok.at)) / 86_400_000) : null;
  out(`last good:  ${ok ? `${ok.at} (${staleDays}d ago)` : 'NEVER — no acquisition has completed'}`);
  if (staleDays !== null && staleDays > STALE_DAYS) {
    out(`            WARNING: no successful acquisition in over ${STALE_DAYS} days`);
  }

  out(`documents:  ${listDocs(r).length} transcript document(s)`);
  out(`brains:     ${listPublished(r).length} published generation(s)`);

  const runs = listRuns(r, { limit: 5 });
  if (runs.length) {
    out('recent runs:');
    for (const run of runs) out(`              ${run.runId} ${run.ok ? 'ok' : 'FAIL'} fetched=${run.counts.fetched}`);
  } else {
    out('recent runs: none — the daily job has not run yet');
  }
  return EXIT.OK;
}
