/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/status.mjs
 * PURPOSE: The status instrument — the console's answer to "is this working,
 *          and when did it last actually succeed?"
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0
 * ============================================================================
 *
 * THE ONE RULE IN THIS FILE. Every value below is produced by calling the SAME
 * lib function the CLI's `status` command calls, with the same arguments.
 * `status-command.mjs` is the reference composition; the call list here mirrors
 * it one-for-one so the console cannot silently disagree with the CLI about the
 * same store.
 *
 * WHY THAT IS LOAD-BEARING (blueprint H10). The alternative — recomputing
 * coverage, budget or backlog here — creates a second source of truth that goes
 * stale after the first engine change. Sean would then be looking at two
 * different numbers for one store with no way to tell which was right.
 *
 * WHAT IS DELIBERATELY PASSED THROUGH RATHER THAN RE-DERIVED (blueprint H6):
 * `backlog.lines` and `throttle.text` are the engine's OWN formatted sentences.
 * They are display strings, and re-deriving them in the client is exactly how
 * the console starts drifting. Their SHAPE is pinned by tests; their wording is
 * the engine's business.
 *
 * THREE VALUES *ARE* RE-DERIVED, and they are the honest seam in this file.
 * `census.inFlight[].detail`, `lastGood.staleDays` and `staleWarning` restate
 * arithmetic and phrasing that also exists in status-command.mjs. They are
 * provenance-free join points over engine data, not engine *logic*: the inputs
 * (sweep state, last-success timestamp, the staleness threshold) all come from
 * the engine, and only the sentence around them is local. The engine exposes no
 * function that returns these sentences, so the choice was to duplicate three
 * lines of formatting or to add an engine function — which S0's no-go boundary
 * forbids. Flagged rather than hidden.
 *
 * @module creator-brains-console/lib/status
 */

import {
  readState, readRegistry, isDamaged, describeRead, stateOrDefault,
  ensureStore, listRuns, readRunJournal, readLastSuccess, listDocs,
} from '../../../scripts/creator-brains/lib/store.mjs';
import { lockStatus } from '../../../scripts/creator-brains/lib/lock.mjs';
import { summarize } from '../../../scripts/creator-brains/lib/summary.mjs';
import { openBudget, budgetState } from '../../../scripts/creator-brains/lib/ledger.mjs';
import { backlogReport, formatBacklog } from '../../../scripts/creator-brains/lib/backlog.mjs';
import { throttleState, formatThrottle } from '../../../scripts/creator-brains/lib/throttle.mjs';
import { sweepState } from '../../../scripts/creator-brains/lib/checkpoints.mjs';
import { listCreatorsSafe } from '../../../scripts/creator-brains/lib/registry.mjs';
import { healthReading } from './health.mjs';
import { countPublished } from './read-surface.mjs';
import { ApiError, CODE } from './errors.mjs';

/** Staleness threshold — kept identical to status-command.mjs STALE_DAYS. */
export const STALE_DAYS = 3;

/** GET /api/status — mirrors `statusCommand`'s composition exactly. */
export function statusInstrument(r, { probe, now } = {}) {
  ensureStore(r);
  // NOT `selfCheck()` DIRECTLY. That call shells out to `yt-dlp --version` and
  // costs 1.7-3.4 s on this machine; the CLI pays it once, the console pays it
  // per request. `healthReading` composes the same engine function behind a TTL
  // cache — see lib/health.mjs for the measurement and the honesty contract.
  const check = healthReading({ r, probe, now });

  const regRead = readRegistry(r);
  const stateRead = readState(r);
  const registryDamaged = isDamaged(regRead);
  const catalog = registryDamaged ? { ok: false, creators: [] } : listCreatorsSafe(r);
  const creators = catalog.creators || [];

  const stateDamaged = isDamaged(stateRead);
  // `stateOrDefault` THROWS on a corrupt file by design — `defaultValue` refuses
  // to substitute a default for damage (lib/store.mjs). Calling it unconditionally
  // here made a damaged state.json 500 the WHOLE instrument, so the `state.damaged`
  // field below was unreachable and the operator lost every other reading too.
  // Measured 2026-09-18 (S1-H1): GET /api/status -> 500 with a stack trace.
  const videos = stateDamaged ? {} : (stateOrDefault(stateRead).videos || {});
  const summary = stateDamaged ? null : summarize(videos);

  const bs = budgetState(openBudget({ r }));
  const sweeps = sweepState(r);
  const everSwept = creators.filter((c) => c.lastAuthoritativeAt).length;

  const lock = lockStatus(r);
  const journal = readRunJournal(r);
  const ok = readLastSuccess(r);
  const staleDays = ok ? Math.floor((Date.now() - Date.parse(ok.at)) / 86_400_000) : null;
  const throttle = throttleState(r);

  // R3-02. The count comes from the CONTAINED enumerator, never from the engine's
  // unchecked `listPublished` — which read every `current.json` at `render.mjs:67`
  // with no containment, so an escaping namespace or pointer stayed reachable
  // through this route. Damage is a FIELD here rather than a refusal (unlike
  // /api/query) because status is a composite instrument: one damaged brain must
  // not cost the operator every unrelated reading. A count that cannot be taken is
  // `null`, never `0` — `0` would read as "nothing is published".
  const published = countPublished(r);

  return {
    // Composed, TTL-cached health reading with its own provenance (lib/health.mjs).
    // The first four fields keep the CLI's meaning exactly; `checkedAt`/`ageMs`/
    // `source`/`stale`/`note` are additive so the console can render an AGE
    // instead of implying every reading is instant.
    ytdlp: {
      ok: check.ok,
      version: check.version,
      reason: check.reason,
      checkedAt: check.checkedAt,
      ageMs: check.ageMs,
      source: check.source,
      stale: check.stale,
      note: check.note,
    },
    creators: {
      total: creators.length,
      enabled: creators.filter((c) => c.enabled).length,
      damaged: registryDamaged ? { file: 'registry.json', detail: describeRead(regRead) } : null,
    },
    state: {
      damaged: stateDamaged ? { file: 'state.json', detail: describeRead(stateRead) } : null,
      videos: summary ? {
        total: summary.total,
        fetched: summary.fetched,
        coverage: summary.coverage,
        counts: summary.counts,
      } : null,
    },
    budget: { used: bs.used, perHour: bs.perHour, unit: bs.unit, byKind: bs.byKind },
    // Engine-formatted truth, passed through verbatim (H6).
    backlog: {
      lines: stateDamaged ? [] : formatBacklog(backlogReport({
        state: { videos }, perHour: bs.perHour, now: Date.now(),
      })),
    },
    throttle: { ...throttle, text: formatThrottle(throttle) },
    census: {
      inFlight: sweeps.inFlight.map((s) => ({
        channelId: s.channelId,
        // Re-derived phrasing over engine fields (see the header note).
        detail: `certified ${s.certifiedTabs.join('+') || 'nothing'}`
          + ` · still to walk ${s.pendingTabs.join('+') || 'nothing'}`
          + ` · started ${s.ageDays}d ago · ${s.ids} id(s) seen`,
      })),
      everSwept,
      discarded: Boolean(sweeps.discarded),
      ...(sweeps.error ? { error: String(sweeps.error) } : {}),
    },
    lock: { held: lock.held, pid: lock.pid, host: lock.host, alive: lock.alive },
    lastRun: journal ? { status: journal.status, runId: journal.runId || null } : null,
    lastGood: ok ? { at: ok.at, staleDays } : null,
    staleWarning: staleDays !== null && staleDays > STALE_DAYS,
    staleDays: STALE_DAYS,
    // COUNT ONLY — `listDocs` reads document metadata to find a `videoId`; the
    // count is the permitted use of the private directory (R-invariant 1).
    documents: stateDamaged ? 0 : listDocs(r).length,
    publishedBrains: published.count,
    publishedBrainsDamaged: published.damage,
    recentRuns: listRuns(r, { limit: 5 }).map((run) => ({
      runId: run.runId, ok: run.ok, fetched: run.counts?.fetched ?? 0,
    })),
  };
}

/** GET /api/run — the run's truth is the engine's own files, never stdout. */
export function runState(r) {
  const journal = readRunJournal(r);
  const lock = lockStatus(r);
  const bs = budgetState(openBudget({ r }));
  const throttle = throttleState(r);
  return {
    journal: journal ? { status: journal.status, runId: journal.runId || null } : null,
    lock: { held: lock.held, pid: lock.pid, host: lock.host, alive: lock.alive },
    throttle: { ...throttle, text: formatThrottle(throttle) },
    budget: { used: bs.used, perHour: bs.perHour, unit: bs.unit, byKind: bs.byKind },
    recentRuns: listRuns(r, { limit: 10 }).map((run) => ({
      runId: run.runId, ok: run.ok, fetched: run.counts?.fetched ?? 0,
    })),
  };
}

/** GET /api/canary — the engine's own self-check, behind the same TTL cache. */
export function canaryState(r, { probe, now } = {}) {
  const check = healthReading({ r, probe, now });
  return {
    ok: check.ok, version: check.version, reason: check.reason,
    checkedAt: check.checkedAt, ageMs: check.ageMs,
    source: check.source, stale: check.stale, note: check.note,
  };
}

/** GET /api/backlog — the engine's own projection, as data. */
export function backlogData(r) {
  const bs = budgetState(openBudget({ r }));
  const stateRead = readState(r);
  // Same landmine as `statusInstrument` above, and the same reason to guard it.
  // Here the honest answer differs: the ENTIRE backlog payload derives from
  // state.json, so there is no composite reading to salvage. This route therefore
  // refuses like /api/creators does, rather than returning `lines: []` — which
  // would be indistinguishable from "the backlog is genuinely empty" (R3).
  if (isDamaged(stateRead)) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(stateRead), { file: 'state.json' });
  }
  const videos = stateOrDefault(stateRead).videos || {};
  const report = backlogReport({ state: { videos }, perHour: bs.perHour, now: Date.now() });
  return { report, lines: formatBacklog(report), perHour: bs.perHour };
}
