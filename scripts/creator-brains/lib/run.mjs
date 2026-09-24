#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run.mjs
 * PURPOSE: The daily job — take the store lock, journal the attempt, sequence
 *          the phases, and produce a truthful verdict and digest.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/14/16)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * ORDERING IS LOAD-BEARING:
 *   lock -> journal -> preflight -> reconcile -> canary -> discover -> fetch
 *        -> build -> export -> digest
 *
 *   The canary runs before the catalog phases because it is the only thing that
 *   answers "is yt-dlp working at all today?" — if it is not, every later failure
 *   is a symptom, and reporting "17 fetches failed" when the real message is
 *   "yt-dlp is broken" sends the reader to the wrong place.
 *
 * WHAT THE REVIEW FOUND:
 *
 *   HR16 — a run that could not START left no trace. Missing yt-dlp exited 2
 *     with no run record and no digest; "no enabled creators" returned before
 *     recording; a throw from the state or digest write was outside the phase
 *     wrapper's guarantee. A journal is now opened BEFORE preflight and the
 *     runner owns finalization, so every outcome — startup failure, no-op,
 *     lock-blocked, interrupted — is observable. The last SUCCESSFUL
 *     acquisition time is tracked separately from the last attempt.
 *
 *   HR14 — nothing stopped two runs writing one store. The whole run now holds
 *     the cross-process lock, and a second writer is REFUSED with a recorded
 *     outcome rather than queueing behind the first and saving a stale map.
 *
 *   HR02 — `fetch <id>` fetched everybody, because the runner reloaded all
 *     enabled creators and discarded the caller's selection.
 *
 *   HR23 — NOTHING BOUNDED A BAD DAY. Two things were missing and both are here:
 *     a per-run execution bound (`bounds.mjs`, enforced through the same reserve
 *     wrapper every transport operation passes), and a shared response to a
 *     global refusal — a 429 or bot check now opens a persisted cooldown that
 *     this run, the next run, and the operator's own `--retry` all honour
 *     (`throttle.mjs`). Both defaults apply when the caller says nothing, so no
 *     invocation is unbounded.
 *
 * @module creator-brains/run
 */

import { newVideoState } from './fsm.mjs';
import { writeDigest, scrub } from './digest.mjs';
import {
  openBudget, newRunRecord, addPhase, runIdFor,
} from './ledger.mjs';
import {
  readRegistry, readState, registryOrDefault, stateOrDefault, isDamaged, describeRead,
  saveRun, enabledCreators, writeRunJournal, finalizeRunJournal, markSuccess,
} from './store.mjs';
import { takeStoreLock } from './run-lock.mjs';
import { withOwnership } from './run-ownership.mjs';
import { DEFAULT_CANARY_VIDEO } from './canary.mjs';
import { selectCreators } from './pipeline.mjs';
import { runPasses } from './passes.mjs';
import { validateRunConfig, openBounds, BoundsError } from './bounds.mjs';
import { backlogReport } from './backlog.mjs';
import { summarize } from './summary.mjs';
import { safeVersion } from './ytdlp.mjs';
import { nowIso } from './paths.mjs';

/**
 * Run one pass.
 *
 * @param {string[]} o.onlyCreators  explicit channel ids to operate on (HR02)
 * @param {string[]} o.only          subset of phase names
 * @param {object}   o.bounds        { maxMinutes, maxOps } — per-run execution
 *                                   bound (HR23). Validated before any work, and
 *                                   applied by default even when a caller passes
 *                                   nothing, so no invocation is unbounded.
 * @param {number}   o.noTrackHours  the no-caption retry window (HR23; 48h default)
 * @param {object}   o.acquiredLock  an ALREADY-ACQUIRED lock handle to REUSE
 *                                   instead of acquiring a second one (D2/P1b).
 *                                   The caller keeps ownership and releases it.
 *                                   Validated; a refusal shape is not accepted
 *                                   as ownership. See `run-lock.mjs`, which now
 *                                   owns this reasoning and the release rule.
 */
export async function runDaily({
  r, deps = {}, clock = null, now = null, canary = {}, budget = {},
  secrets = {}, onPhase = null, only = null, onlyCreators = null, lock = true, retry = false,
  bounds = {}, noTrackHours = null, authoritative = 'auto', acquiredLock = null,
} = {}) {
  const tick = clock || (() => Date.now());
  const runId = runIdFor(tick);
  const record = newRunRecord({ runId, clock: tick });
  const secretValues = Object.values(secrets || {}).filter((v) => typeof v === 'string');
  const notes = [];
  const wants = (name) => !only || only.includes(name);

  // VALIDATED BEFORE ANYTHING IS WRITTEN (HR23). A limit of 0, NaN or Infinity is
  // a refusal, not a fallback to unlimited, and it must not leave a half-started
  // run behind — so this happens before the journal is opened.
  const config = validateRunConfig({
    maxMinutes: bounds.maxMinutes,
    maxOps: bounds.maxOps,
    noTrackHours,
    perHour: budget.perHour,
  });

  record.ytDlp = deps.version || safeVersion();
  record.selection = onlyCreators || null;
  record.config = {
    maxMinutes: config.maxMinutes, maxOps: config.maxOps, noTrackHours: config.noTrackHours,
  };

  // ── 0. JOURNAL, BEFORE ANYTHING CAN FAIL (HR16) ───────────────────────────
  //   Keep what this open displaces. A run that is refused by the lock has
  //   already erased a finished foreign entry — deliberately replaceable, see
  //   O2 — and the refusal path is the only place that knows to put it back
  //   (round 3, D8). Null when there was nothing prior to displace.
  const opened = writeRunJournal(r, {
    runId,
    startedAt: record.startedAt,
    pid: process.pid,
    selection: onlyCreators || null,
    phases: only || 'all',
  });
  const displaced = opened ? opened.displaced : null;

  const phase = async (name, fn) => {
    const t0 = tick();
    let ok = true; let reason = null; let counts = {};
    try {
      const out = await fn();
      ok = out ? out.ok !== false : true;
      reason = out ? (out.reason ?? null) : null;
      counts = (out && out.counts) || {};
    } catch (e) {
      ok = false;
      reason = `threw: ${scrub({ m: String(e.message || e) }, secretValues).m.slice(0, 300)}`;
    }
    addPhase(record, name, { ok, reason, counts, ms: tick() - t0 });
    if (onPhase) onPhase(record.phases[record.phases.length - 1]);
    return ok;
  };

  /** Finalize: always write the run record and the digest, whatever happened. */
  const conclude = (extraNotes = [], okOverride = null) => {
    record.notes = [...notes, ...extraNotes];
    record.endedAt = nowIso(tick);
    record.ok = okOverride === null ? (record.phases || []).every((p) => p.ok) : okOverride;
    const scrubbed = scrub(record, secretValues);
    let digestPath = null;
    try {
      digestPath = writeDigest(scrubbed, { r, secrets: secretValues }).path;
      addPhase(scrubbed, 'digest', { ok: true, reason: null, counts: {} });
    } catch (e) {
      addPhase(scrubbed, 'digest', { ok: false, reason: `digest write failed: ${e.message}`, counts: {} });
      scrubbed.ok = false;
    }
    try { saveRun(r, scrubbed); } catch { /* the journal still records the attempt */ }
    finalizeRunJournal(r, scrubbed);
    return { ...scrubbed, digestPath };
  };

  // ── LOCK (HR14) + THE CLAIM THAT FOLLOWS IT (A1-06, D2/P1b) ───────────────
  //   Acquire, or reuse a handle the caller already holds. Then — and only
  //   under ownership — claim the journal slot. The claim and the release now live
  //   in `withOwnership`, which is the region that opens BEFORE the claim write;
  //   `run-ownership.mjs` owns that reasoning. `run-lock.mjs` owns acquire-or-reuse.
  const taken = takeStoreLock({ r, runId, now: tick, lock, acquiredLock });
  const held = taken.ok ? taken.handle : null;

  if (!taken.ok) {
    addPhase(record, 'lock', { ok: false, reason: `store is locked (${taken.reason})`, counts: {} });
    notes.push('another run owns this store; refusing rather than saving a stale state map');
    // D8: this run never owned the store, so its step-0 open has no right to be
    // the journal's last word. Hand the displaced entry back so finalize can
    // restore it. Without this the holder's verdict is silently gone and the
    // journal names a run that was refused.
    record.restore = displaced || undefined;
    return conclude([], false);
  }

  return await withOwnership({
    r, runId, record, taken, held, onlyCreators, only,
    body: async () => {
    // ── 0b. PREFLIGHT: STRICT, FAIL-CLOSED (HR04/HR05) ──────────────────────
    const stateRead = readState(r);
    if (isDamaged(stateRead)) {
      const reason = `state.json is ${describeRead(stateRead)} — refusing to run rather than overwrite the video state map`;
      addPhase(record, 'preflight', { ok: false, reason, counts: {} });
      notes.push(reason);
      return conclude([], false);
    }
    const registryRead = readRegistry(r);
    if (isDamaged(registryRead)) {
      const reason = `registry.json is ${describeRead(registryRead)} — the creator catalog is authoritative owner state and will not be replaced`;
      addPhase(record, 'preflight', { ok: false, reason, counts: {} });
      notes.push(reason);
      return conclude([], false);
    }

    const reg = registryOrDefault(registryRead);
    const state = stateOrDefault(stateRead);
    const { selected, rejected } = selectCreators(enabledCreators(reg), onlyCreators);
    for (const rej of rejected) notes.push(`selection rejected: ${rej.channelId} — ${rej.reason}`);

    // The budget is PERSISTENT and its unit is a transport operation (HR01), so
    // it is opened from the journal rather than created empty per run.
    const budgetObj = openBudget({ r, cap: budget.perHour, now: tick });
    // The per-run ceiling (HR23). `opsUsed` reads the budget's own tally, so the
    // bound counts the reserved probe/fetch operations; the canary and the
    // enumeration walks are charged explicitly where they happen. The admission
    // wrapper that enforces it lives in `passes.mjs`, next to the passes it gates.
    const boundObj = openBounds({
      now: tick,
      maxMinutes: config.maxMinutes,
      maxOps: config.maxOps,
      opsUsed: () => budgetObj.spent,
    });

    // ── THE PASSES ──────────────────────────────────────────────────────────
    // Frames vs sequence: everything below this line lives in `passes.mjs`, which
    // owns the admission wrapper the run bound is enforced in.
    const { exportResult } = await runPasses({
      r,
      deps,
      tick,
      phase,
      record,
      notes,
      secretValues,
      config,
      budgetObj,
      boundObj,
      canary,
      retry,
      wants,
      selected,
      reg,
      state,
      authoritative,
    });

    record.creators = selected.map((c) => {
      const vs = Object.values(state.videos).filter((v) => v.channelId === c.channelId);
      return {
        channelId: c.channelId,
        title: c.title,
        total: vs.length,
        fetched: vs.filter((v) => v.state === 'fetched').length,
      };
    });

    const out = conclude();
    // The last SUCCESSFUL ACQUISITION is tracked separately from the last
    // attempt, so staleness is answerable even when every recent run failed.
    //
    // A run with NO enabled creators is not an acquisition: the pipeline never
    // touched YouTube, and stamping it would make a store that has been
    // unconfigured for a month look freshly healthy.
    const didAcquire = selected.length > 0 && (out.ok || record.counts.fetched > 0);
    if (didAcquire) markSuccess(r, tick);
    return { ...out, exportResult };
    },
  });
}

// Re-exported so the CLI and the scheduled entry keep importing the canary video
// id from the module that owns the run, not from the split-out one.
export {
  newVideoState, DEFAULT_CANARY_VIDEO, BoundsError, summarize, backlogReport,
};
