#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/checkpoints.mjs
 * PURPOSE: Remember a partially-walked channel, so an interrupted enumeration
 *          resumes at the tab it lost instead of starting over.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR22)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR22):
 *   "The stored high-water mark is never used to resume or bound enumeration;
 *    each run walks the entire tab." The high-water mark fixed the bounded part;
 *    nothing fixed the RESUMABLE part. An enumeration that dies after the
 *    `videos` tab leaves no record of what it finished, so the next run starts at
 *    `videos` again — and on a channel whose census does not fit in one run (a
 *    four-thousand-video backfill, or a run whose work bound affords one tab),
 *    the walk can restart at the same tab forever while `shorts` and `streams`
 *    are never reached. That is a GAP in the corpus, not a slow path.
 *
 * WHY THIS IS NOT IN THE REGISTRY:
 *   The registry is AUTHORITATIVE OWNER STATE (HR05) — enable flags, labels,
 *   identity. A half-finished walk is transient operational bookkeeping with no
 *   truth value: losing it costs one re-walk of one tab. It lives in its own file
 *   beside `throttle.json`, and it is deliberately NOT in the backup's DURABLE
 *   set for the same reason.
 *
 * THE READ IS TOLERANT, AND SAYS SO:
 *   A corrupt `state.json` must STOP a run (HR04) because overwriting it destroys
 *   truth. A corrupt checkpoint must not: refusing to enumerate because a
 *   scratch file is unreadable would be a worse failure than re-walking a tab.
 *   So a damaged file reads as "no checkpoints" AND is REPORTED, so the caller can
 *   say in its notes that the resume information was discarded rather than
 *   pretending it was never there.
 *
 * A SWEEP EXPIRES:
 *   Observations from three weeks ago are not a census of today. A sweep older
 *   than `SWEEP_TTL_MS` is discarded and restarted, in the safe direction: an
 *   extra walk, never a stale completeness claim.
 *
 * @module creator-brains/checkpoints
 */

import {
  DAY_MS, paths, readJsonStrict, writeJsonAtomic, nowIso, deleteFileIfPresent,
} from './paths.mjs';

export const CHECKPOINT_SCHEMA_VERSION = 1;

/** A sweep older than this is not evidence about today's corpus. */
export const SWEEP_TTL_MS = 14 * DAY_MS;

/** Tabs that make up a channel's corpus, in walk order. Kept as a parameter so
 *  this module never has to agree with `enumerate.mjs` about the list. */
export function emptySweep({ tabs, now, runId = null }) {
  const at = nowIso(() => now);
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    tabs: [...tabs],
    certified: {},
    ids: [],
    startedAt: at,
    updatedAt: at,
    runs: runId ? [runId] : [],
  };
}

/** Read the whole file. `discarded` names a corrupt file that was ignored. */
export function readCheckpoints(r) {
  const read = readJsonStrict(paths(r).checkpoints);
  if (!read.present) {
    return {
      ok: true, present: false, discarded: false, sweeps: {}, error: null,
    };
  }
  if (!read.ok) {
    return {
      ok: false,
      present: true,
      discarded: true,
      sweeps: {},
      error: read.error || 'unreadable',
    };
  }
  const sweeps = read.value && typeof read.value.sweeps === 'object' && read.value.sweeps
    ? read.value.sweeps
    : {};
  return {
    ok: true, present: true, discarded: false, sweeps, error: null,
  };
}

export function getSweep(r, channelId) {
  const res = readCheckpoints(r);
  const sweep = res.sweeps[channelId];
  return sweep && typeof sweep === 'object' ? sweep : null;
}

/** Persist one sweep, leaving the others alone. */
export function saveSweep(r, channelId, sweep) {
  const res = readCheckpoints(r);
  const sweeps = { ...res.sweeps, [channelId]: sweep };
  writeJsonAtomic(paths(r).checkpoints, { schemaVersion: CHECKPOINT_SCHEMA_VERSION, sweeps });
  return { ok: true, discarded: res.discarded, error: res.error };
}

export function clearSweep(r, channelId) {
  const res = readCheckpoints(r);
  if (!res.sweeps[channelId]) return { ok: true, cleared: false };
  const sweeps = { ...res.sweeps };
  delete sweeps[channelId];
  if (!Object.keys(sweeps).length) {
    try { deleteFileIfPresent(paths(r).checkpoints); } catch { /* best effort */ }
    return { ok: true, cleared: true };
  }
  writeJsonAtomic(paths(r).checkpoints, { schemaVersion: CHECKPOINT_SCHEMA_VERSION, sweeps });
  return { ok: true, cleared: true };
}

/**
 * What still has to be walked?
 *
 * `resume: false` means the caller should start a fresh sweep over every
 * requested tab. `resume: true` means some tabs are already certified and only
 * `pendingTabs` remain — the property that stops a lost tab from becoming a
 * permanent gap.
 *
 * A sweep whose tab list no longer matches the requested one is discarded: a
 * corpus definition that changed under it would make "all tabs certified" mean
 * nothing.
 */
export function sweepPlan(sweep, { tabs, now, ttlMs = SWEEP_TTL_MS } = {}) {
  const wanted = [...tabs];
  if (!sweep) return { resume: false, stale: false, pendingTabs: wanted, certifiedTabs: [], ids: [] };

  const started = Date.parse(sweep.startedAt || '');
  const age = Number.isFinite(started) ? now - started : Number.POSITIVE_INFINITY;
  if (age > ttlMs) {
    return {
      resume: false, stale: true, ageMs: age, pendingTabs: wanted, certifiedTabs: [], ids: [],
    };
  }
  const sameTabs = Array.isArray(sweep.tabs)
    && sweep.tabs.length === wanted.length
    && wanted.every((t) => sweep.tabs.includes(t));
  if (!sameTabs) {
    return {
      resume: false, stale: false, mismatched: true, pendingTabs: wanted, certifiedTabs: [], ids: [],
    };
  }
  const certified = sweep.certified && typeof sweep.certified === 'object' ? sweep.certified : {};
  const certifiedTabs = wanted.filter((t) => certified[t] && certified[t].complete === true);
  const pendingTabs = wanted.filter((t) => !certifiedTabs.includes(t));
  return {
    resume: certifiedTabs.length > 0,
    stale: false,
    pendingTabs,
    certifiedTabs,
    ids: Array.isArray(sweep.ids) ? sweep.ids : [],
  };
}

/**
 * Fold one walk's result into a sweep.
 *
 * `walkedTabs` are the tabs this call asked for; `perTab` says what came back for
 * each (`{rows}` with no `error`), and `complete` says whether the walk as a
 * whole may be treated as a census. Only a tab with a clean per-tab entry is
 * CERTIFIED — a tab that errored, or that returned nothing at all, stays pending,
 * which is what keeps a resume from skipping it.
 *
 * Returns the next sweep plus `{allCertified, pendingTabs, ids}`.
 */
export function foldWalk(sweep, {
  walkedTabs, perTab = {}, rows = [], complete = false, problems = [], trustWholeWalk = false,
  now, runId = null,
} = {}) {
  const next = {
    ...sweep,
    certified: { ...(sweep.certified || {}) },
    ids: [...(sweep.ids || [])],
    runs: [...(sweep.runs || [])],
    updatedAt: nowIso(() => now),
  };
  if (runId && !next.runs.includes(runId)) next.runs.push(runId);

  const failedTabs = new Set(problems.map((p) => String(p).split(':')[0].trim()));
  for (const tab of walkedTabs) {
    const entry = perTab[tab];
    // A WHOLE-WALK CERTIFICATION. When the caller asked for every tab and the
    // enumerator certified the walk as complete, the verdict is about the walk,
    // not about the per-tab table — a walker that reports its rows without a
    // per-tab breakdown (the legacy single-tab alias) is still a census of what
    // it was asked for. Per-tab certification is what a RESUMED sweep needs,
    // where no single call ever sees the whole corpus.
    if (trustWholeWalk) {
      next.certified[tab] = {
        complete: true, rows: (entry && entry.rows) ?? rows.length, at: nowIso(() => now),
      };
      continue;
    }
    if (!entry || entry.error || failedTabs.has(tab)) continue;
    next.certified[tab] = {
      complete: true, rows: entry.rows ?? 0, at: nowIso(() => now),
    };
  }

  const seen = new Set(next.ids);
  for (const row of rows) if (row && row.id) seen.add(row.id);
  next.ids = [...seen];

  const pendingTabs = next.tabs.filter((t) => !next.certified[t]);
  return {
    sweep: next,
    allCertified: pendingTabs.length === 0,
    pendingTabs,
    ids: next.ids,
    certifiedNow: walkedTabs.filter((t) => next.certified[t]),
    // An authoritative census needs EVERY tab certified AND a non-empty corpus:
    // an empty walk is inconclusive, not an empty channel (review HR12).
    authoritative: complete && pendingTabs.length === 0 && next.ids.length > 0,
  };
}

/** One line for `status`, or null when nothing is in flight. */
export function sweepState(r, { now = Date.now() } = {}) {
  const res = readCheckpoints(r);
  const entries = Object.entries(res.sweeps);
  return {
    discarded: res.discarded,
    error: res.error,
    inFlight: entries.map(([channelId, sweep]) => {
      const certified = Object.keys(sweep.certified || {});
      return {
        channelId,
        startedAt: sweep.startedAt,
        ageDays: Number.isFinite(Date.parse(sweep.startedAt))
          ? Math.floor((now - Date.parse(sweep.startedAt)) / DAY_MS) : null,
        certifiedTabs: certified,
        pendingTabs: (sweep.tabs || []).filter((t) => !certified.includes(t)),
        ids: (sweep.ids || []).length,
      };
    }),
  };
}
