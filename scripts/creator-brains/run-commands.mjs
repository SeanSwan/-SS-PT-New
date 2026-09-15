#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/run-commands.mjs
 * PURPOSE: The commands that invoke the runner — daily, fetch, discover, build,
 *          repair — and the exit-code sentences they print.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/03/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `commands.mjs` for the Rule 4 cap when the execution bounds
 * landed (HR23). The seam is "commands that run the pipeline" versus "commands
 * that read or change the catalog"; the first group shares the run-limit flags,
 * the second shares none of them.
 *
 * EVERY ONE OF THESE DERIVES ITS EXIT CODE FROM THE RUN RECORD, never from the
 * fact that it printed a line (review HR03: `fetch` printed "failed 2" and
 * returned 0).
 *
 * @module creator-brains/run-commands
 */

import { runDaily, DEFAULT_CANARY_VIDEO, BoundsError } from './lib/run.mjs';
import { BudgetError } from './lib/ledger.mjs';
import { publishInstructions } from './lib/export.mjs';
import { listPublished } from './lib/render.mjs';
import { readState, stateOrDefault } from './lib/store.mjs';
import { positionals, flagValue, runLimits, formatLimits, resolveSelection } from './lib/cli-args.mjs';
import { EXIT, verdictExit } from './lib/exit.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

/** A rejected limit is a REFUSAL with a sentence, not a stack trace. */
function refusal(e) {
  return e instanceof BudgetError || e instanceof BoundsError;
}

export const RUN_COMMANDS = {
  async daily({ args, r, deps, clock }) {
    const sel = resolveSelection(r, positionals(args));
    if (!sel.ok) { out(`refused: ${sel.reason}`); return EXIT.REFUSED; }
    const limits = runLimits(args);
    let record;
    try {
      record = await runDaily({
        r,
        deps,
        clock,
        onlyCreators: sel.onlyCreators,
        budget: limits.budget,
        bounds: limits.bounds,
        noTrackHours: limits.noTrackHours,
        authoritative: args.includes('--full') ? true : 'auto',
        canary: { videoId: flagValue(args, '--canary', DEFAULT_CANARY_VIDEO) },
        retry: args.includes('--retry'),
        onPhase: (p) => out(`  ${p.ok ? 'ok  ' : 'FAIL'} ${p.name}${p.reason ? ` — ${p.reason}` : ''}`),
      });
    } catch (e) {
      if (refusal(e)) { out(`refused: ${e.message}`); return EXIT.REFUSED; }
      throw e;
    }
    out('');
    out(`run ${record.runId}: ${record.ok ? 'COMPLETED' : 'FINISHED WITH FAILURES'}`);
    out(`  discovered ${record.counts.discovered} · fetched ${record.counts.fetched} · `
      + `deferred ${record.counts.deferred} · no-track ${record.counts.noTrack} · failed ${record.counts.failed}`);
    if (record.counts.swept || record.counts.sweepPending) {
      out(`  census: ${record.counts.swept || 0} complete, ${record.counts.sweepPending || 0} in progress`
        + `, ${record.counts.resumedSweeps || 0} resumed`);
    }
    if (record.counts.deferredReason) out(`  deferred because: ${record.counts.deferredReason}`);
    out(formatLimits(record));
    if (record.digestPath) out(`  digest: ${record.digestPath}`);
    return verdictExit(record);
  },

  async fetch({ args, r, deps, clock }) {
    const sel = resolveSelection(r, positionals(args));
    if (!sel.ok) { out(`refused: ${sel.reason}`); return EXIT.REFUSED; }
    const limits = runLimits(args);
    let record;
    try {
      record = await runDaily({
        r,
        deps,
        clock,
        onlyCreators: sel.onlyCreators,
        only: ['fetch'],
        budget: limits.budget,
        bounds: limits.bounds,
        noTrackHours: limits.noTrackHours,
        retry: args.includes('--retry'),
      });
    } catch (e) {
      if (refusal(e)) { out(`refused: ${e.message}`); return EXIT.REFUSED; }
      throw e;
    }
    const f = record.phases.find((p) => p.name === 'fetch');
    if (!f) { out('the fetch phase did not run — this is a bug, not an empty result'); return EXIT.FAILED; }
    out(`fetched ${record.counts.fetched}, deferred ${record.counts.deferred}`
      + `${record.counts.deferredReason ? ` (${record.counts.deferredReason})` : ''}`
      + `, no-track ${record.counts.noTrack}, failed ${record.counts.failed}`);
    out(formatLimits(record));
    if (f.reason) out(`note: ${f.reason}`);
    return verdictExit(record);
  },

  async discover({ args, r, deps, clock }) {
    const sel = resolveSelection(r, positionals(args));
    if (!sel.ok) { out(`refused: ${sel.reason}`); return EXIT.REFUSED; }
    // `--full` forces an authoritative census: walk the whole corpus, no early
    // stop at the high-water mark, and (only then) confirm absences (review HR22).
    const authoritative = args.includes('--full') ? true : 'auto';
    let record;
    try {
      record = await runDaily({
        r,
        deps,
        clock,
        onlyCreators: sel.onlyCreators,
        only: ['discover'],
        bounds: runLimits(args).bounds,
        authoritative,
      });
    } catch (e) {
      if (refusal(e)) { out(`refused: ${e.message}`); return EXIT.REFUSED; }
      throw e;
    }
    const state = stateOrDefault(readState(r));
    for (const c of sel.enabled) {
      const rows = Object.values(state.videos).filter((v) => v.channelId === c.channelId);
      out(`${c.title}: ${rows.length} known`);
    }
    out(`census: ${record.counts.swept || 0} complete, ${record.counts.sweepPending || 0} in progress`
      + `, ${record.counts.resumedSweeps || 0} resumed`
      + `${authoritative === true ? ' (--full forced)' : ''}`);
    if (record.counts.deleted || record.counts.suspected) {
      out(`  confirmed gone: ${record.counts.deleted || 0} · awaiting a second observation: ${record.counts.suspected || 0}`);
    }
    return verdictExit(record);
  },

  async build({ args, r, deps, clock }) {
    const sel = resolveSelection(r, positionals(args));
    if (!sel.ok) { out(`refused: ${sel.reason}`); return EXIT.REFUSED; }
    const record = await runDaily({
      r, deps, clock, onlyCreators: sel.onlyCreators, only: ['build', 'export'],
    });
    for (const pub of listPublished(r)) {
      out(`${pub.pointer.title} · ${pub.pointer.creator_id}: gen ${pub.pointer.generation}, `
        + `${pub.pointer.stats.videos} videos, ${pub.pointer.stats.claims} claims, ${pub.pointer.stats.gaps} gaps`);
    }
    out(publishInstructions());
    return verdictExit(record);
  },

  async repair({ r, deps, clock }) {
    // Reconcile state against documents, then rebuild. This is the recovery path
    // the review found missing: a `fetched` row whose document is gone.
    const record = await runDaily({ r, deps, clock, only: ['reconcile', 'build', 'export'] });
    out(`repaired ${record.counts.repaired || 0} state row(s); `
      + `${record.counts.built || 0} brain(s) rebuilt, ${record.counts.emptied || 0} emptied, `
      + `${record.counts.quarantined || 0} quarantined`);
    return verdictExit(record);
  },
};
