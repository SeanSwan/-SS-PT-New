#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/run-daily.mjs
 * PURPOSE: The scheduled entry point. Records an outcome for EVERY path,
 *          including the ones that fail before the engine starts.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR16)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR16):
 *   Missing yt-dlp exited 2 with **no run record and no digest**. "No enabled
 *   creators" returned before recording anything. A throw from the state or
 *   digest write sat outside the phase wrapper's guarantee. So the three
 *   outcomes a reader most needs to tell apart —
 *
 *     "the job ran and had nothing to do"
 *     "the job ran and failed"
 *     "the job has not run at all"
 *
 *   — were indistinguishable from the artifacts on disk, because only the
 *   middle one left any.
 *
 *   Every path now writes a journal entry and a digest, and the exit code says
 *   which of the three happened. The journal is opened BEFORE preflight, so an
 *   interrupted run is visible as an open journal rather than as silence.
 *
 * EXIT CODES (shared with cli.mjs — a scheduler reads these):
 *   0 success · 1 work failed · 2 refused/blocked (nothing attempted)
 *   3 deferred (nothing wrong, nothing done)
 *
 * WINDOWS TASK SCHEDULER — the two settings that matter, and `schtasks` can only
 * set one:
 *   1. "Run task as soon as possible after a scheduled start is missed"
 *      (StartWhenAvailable). A forced-update reboot at 06:00 otherwise means the
 *      06:30 run is silently skipped.
 *   2. "Run whether user is logged on or not".
 *
 *   schtasks /create /tn "Creator Brains Daily" /sc daily /st 06:30 ^
 *     /tr "node \"C:\\path\\to\\SS-PT\\scripts\\creator-brains\\run-daily.mjs\"" ^
 *     /rl LIMITED /f
 *   then set StartWhenAvailable in the Task Scheduler UI.
 *
 * @module creator-brains/run-daily
 */

import { readFileSync } from 'node:fs';
import { runDaily, DEFAULT_CANARY_VIDEO } from './lib/run.mjs';
import { root } from './lib/paths.mjs';
import {
  enabledCreators, ensureStore, listRuns, readRegistry, registryOrDefault, isDamaged,
  describeRead, saveRun, writeRunJournal,
} from './lib/store.mjs';
import { writeJsonAtomic } from './lib/paths.mjs';
import { listCreatorsSafe } from './lib/registry.mjs';
import { selfCheck } from './lib/ytdlp.mjs';
import { runIdFor, addPhase, newRunRecord } from './lib/ledger.mjs';
import { BoundsError } from './lib/bounds.mjs';
import { writeDigest } from './lib/digest.mjs';
import { paths } from './lib/paths.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

/**
 * Record an outcome for a run that never reached the engine.
 *
 * Without this, "yt-dlp is missing" left the store untouched and a reader could
 * not tell it apart from "the scheduler stopped three weeks ago" (HR16).
 */
function recordStartupOutcome(r, { kind, reason, detail = null }) {
  const runId = runIdFor();
  const record = newRunRecord({ runId });
  addPhase(record, 'preflight', { ok: false, reason: `${kind}: ${reason}`, counts: {} });
  record.notes = [reason, ...(detail ? [detail] : [])];
  record.endedAt = new Date().toISOString();
  record.ok = false;
  let digestPath = null;
  try {
    digestPath = writeDigest(record, { r }).path;
    addPhase(record, 'digest', { ok: true, reason: null, counts: {} });
  } catch { /* the journal below is the fallback record */ }
  // The run RECORD matters as much as the digest: `listRuns` is what a status
  // surface reads, and a refusal that appears only in a digest file is invisible
  // to it (review HR16).
  try { saveRun(r, record); } catch { /* best effort */ }
  // ── THE JOURNAL GOES THROUGH THE OWNERSHIP RULE, NOT AROUND IT (D8) ───────
  //
  //   This used to call `writeJsonAtomic(paths(r).journal, …)` directly. That
  //   bypassed `writeRunJournal` — and with it the A1-06 ownership guard — so a
  //   startup outcome wrote the journal WITHOUT EVER CONSULTING THE LOCK and
  //   without comparing `runId`. Measured against a temp store: a well-formed
  //   held lock (`lockStatus` → `held:true`), a completed `HOLDER-REAL` entry,
  //   one `no-op` startup outcome — the holder's entry was gone and the journal
  //   named the no-op run. The lock was not stale-checked, not refused, not
  //   mentioned; the write simply landed on top.
  //
  //   `recordStartupOutcome` runs on every startup refusal and every no-op, so
  //   this was the MOST COMMON writer in the system, and the one path that
  //   could silently erase a live run's verdict. The guard now declines when
  //   the slot names a different, still-open run. That is the correct outcome:
  //   a startup that could not take the store does not get to be its last word.
  //
  //   `displaced` is deliberately NOT restored here, unlike the lock-refusal
  //   path in `run.mjs`. This function never opened the slot, so there is
  //   nothing of its own to undo, and it must not clobber a holder that is
  //   mid-run. The refusal is still recorded in the run record and the digest.
  try {
    writeRunJournal(r, {
      runId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      ok: false,
      reason,
      status: kind,
    });
  } catch { /* nothing more we can do; stdout carries it */ }
  return { runId, digestPath };
}

async function main() {
  const args = process.argv.slice(2);
  const r = root();
  const perHour = args.find((a) => a.startsWith('--per-hour='));
  const canaryArg = args.find((a) => a.startsWith('--canary='));
  // THE SAME LIMITS THE CLI ACCEPTS (review HR23). A scheduled task is not a
  // licence to run unbounded, and a bound the operator set for interactive runs
  // must not silently disappear when the same work runs from the scheduler.
  const flag = (name) => {
    const withEq = args.find((a) => a.startsWith(`${name}=`));
    if (withEq) return withEq.slice(name.length + 1);
    const i = args.indexOf(name);
    return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
  };

  out(`creator-brains daily · ${new Date().toISOString()}`);
  out(`store:  ${r}`);
  try { ensureStore(r); } catch { /* reported by the phases below */ }

  // ── Startup refusals still leave a record (HR16) ──────────────────────────
  const check = selfCheck();
  out(`yt-dlp: ${check.ok ? `ok (${check.version}) via ${check.reason}` : `UNAVAILABLE — ${check.reason}`}`);
  if (!check.ok) {
    const rec = recordStartupOutcome(r, {
      kind: 'refused',
      reason: 'yt-dlp is not resolvable, so nothing can be fetched',
      detail: 'Install it with `uv tool install yt-dlp`, or set CREATOR_BRAINS_YTDLP to a binary path.',
    });
    out('');
    out('Refusing to run: yt-dlp is not resolvable, so nothing can be fetched.');
    out('Install it with `uv tool install yt-dlp`, or set CREATOR_BRAINS_YTDLP to a binary path.');
    out(`recorded run ${rec.runId}${rec.digestPath ? ` · digest: ${rec.digestPath}` : ''}`);
    return 2;
  }

  const regRead = readRegistry(r);
  if (isDamaged(regRead)) {
    const rec = recordStartupOutcome(r, {
      kind: 'refused',
      reason: `registry.json is ${describeRead(regRead)} — refusing to treat a damaged catalog as empty`,
      detail: 'Restore it from a backup, or move it aside deliberately to start a new catalog.',
    });
    out('');
    out(`Refusing to run: registry.json is ${describeRead(regRead)}.`);
    out(`recorded run ${rec.runId}${rec.digestPath ? ` · digest: ${rec.digestPath}` : ''}`);
    return 2;
  }

  const creators = listCreatorsSafe(r).creators;
  const enabled = enabledCreators(registryOrDefault(regRead));
  out(`creators: ${creators.length} known, ${enabled.length} enabled`);

  if (!enabled.length) {
    // A no-op is an OUTCOME, not an absence (HR16).
    const rec = recordStartupOutcome(r, {
      kind: 'no-op',
      reason: 'no enabled creators — nothing to do',
      detail: 'Enable one with: node scripts/creator-brains/cli.mjs enable <channel_id>',
    });
    out('');
    out('No enabled creators — nothing to do.');
    out(`recorded run ${rec.runId}${rec.digestPath ? ` · digest: ${rec.digestPath}` : ''}`);
    return 0;
  }

  let record;
  try {
    record = await runDaily({
      r,
      budget: perHour ? { perHour: Number(perHour.split('=')[1]) } : {},
      bounds: { maxMinutes: flag('--max-minutes'), maxOps: flag('--max-ops') },
      noTrackHours: flag('--no-track-hours'),
      // A census is due on its own cadence; `--full` forces one now (review HR22).
      authoritative: args.includes('--full') ? true : 'auto',
      canary: { videoId: canaryArg ? canaryArg.split('=')[1] : DEFAULT_CANARY_VIDEO },
      retry: args.includes('--retry'),
      onPhase: (p) => out(`  ${p.ok ? 'ok  ' : 'FAIL'} ${p.name}${p.reason ? ` — ${p.reason}` : ''}`),
    });
  } catch (e) {
    // A rejected limit is a REFUSAL that still leaves a record (HR16 + HR23).
    if (e instanceof BoundsError) {
      const rec = recordStartupOutcome(r, {
        kind: 'refused',
        reason: e.message,
        detail: 'Limits must be positive whole numbers; omit the flag to use the default.',
      });
      out('');
      out(`Refusing to run: ${e.message}`);
      out(`recorded run ${rec.runId}${rec.digestPath ? ` · digest: ${rec.digestPath}` : ''}`);
      return 2;
    }
    throw e;
  }

  out('');
  out(`run ${record.runId}: ${record.ok ? 'COMPLETED' : 'FINISHED WITH FAILURES'}`);
  out(`  discovered ${record.counts.discovered} · fetched ${record.counts.fetched} · `
    + `deferred ${record.counts.deferred} · no-track ${record.counts.noTrack} · failed ${record.counts.failed}`);
  const boundState = record.bounds || {};
  out(`  transport ops ${record.counts.transportOps ?? 0}${boundState.maxOps ? `/${boundState.maxOps}` : ''}`
    + ` · ${Math.round((boundState.elapsedMs || 0) / 1000)}s of ${boundState.maxMinutes || '?'} min`
    + `${record.throttle && record.throttle.active ? ' · THROTTLED' : ''}`);
  if (record.counts.deferredReason) out(`  deferred because: ${record.counts.deferredReason}`);
  out('');
  try {
    out(readFileSync(record.digestPath, 'utf-8'));
  } catch {
    out(`(digest at ${record.digestPath} could not be re-read)`);
  }

  if (record.ok) return 0;
  if ((record.phases || []).some((p) => p.name === 'lock' && !p.ok)) return 2;
  if ((record.counts.failed || 0) > 0) return 1;
  if ((record.counts.deferred || 0) > 0) return 3;
  return 1;
}

// ONLY RUN WHEN INVOKED, NOT WHEN IMPORTED.
//
//   This file exports `recordStartupOutcome` for the tests, and until this guard
//   existed, IMPORTING it ran the whole daily job against the real store — an
//   import in a test file quietly wrote a no-op run record and a digest into
//   `.ai-workflow/creator-brains/`. Nothing was lost (a no-op day is a legitimate
//   record) but a module with an effect on import cannot be inspected, imported
//   by a diagnostic, or reused without doing work nobody asked for. `cli.mjs` has
//   had the same guard since the entry-point defect; this is the same rule.
const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('creator-brains/run-daily.mjs');
if (invokedDirectly) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((e) => {
      out(`fatal: ${e && e.stack ? e.stack : e}`);
      process.exitCode = 1;
    });
}

export { recordStartupOutcome, listRuns };
