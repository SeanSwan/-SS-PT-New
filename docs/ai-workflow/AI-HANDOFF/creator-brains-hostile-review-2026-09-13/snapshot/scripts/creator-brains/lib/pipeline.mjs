#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/pipeline.mjs
 * PURPOSE: The three catalog phases — discover, fetch, build — each returning
 *          `{ ok, reason, counts }` so the runner can record it verbatim.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S8)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS SEPARATE FROM run.mjs:
 *   `run.mjs` sequences phases and owns the run record; this file does the work
 *   each phase performs. Splitting them keeps both under the Rule 4 300-line cap
 *   and, more usefully, means a phase can be called on its own (the CLI's
 *   `fetch --per-hour=N` does exactly that) without dragging the whole pipeline
 *   along.
 *
 * THE `ok` CONTRACT — the reason this file exists at all:
 *   A phase returns `ok: false` when ITS OWN work failed. An earlier version
 *   swallowed per-creator exceptions into a notes array and still returned
 *   `ok: true`, so a run where every creator's discovery threw reported
 *   COMPLETED and exited 0. The digest carries the notes; the exit code is what
 *   a scheduler and any wrapper script actually read, and it was lying.
 *
 * @module creator-brains/pipeline
 */

import { shouldAttempt } from './fsm.mjs';
import { fetchVideo } from './fetch.mjs';
import { discoverChannel } from './discover.mjs';
import { buildBrain } from './extract.mjs';
import { renderBrain } from './render.mjs';
import { reserve, budgetState } from './ledger.mjs';
import { appendLedger } from './store.mjs';
import { redact } from './digest.mjs';
import { nowIso } from './paths.mjs';

/**
 * Discover new videos for every enabled creator.
 * A per-creator exception counts as a FAILURE — see the header.
 */
export async function discoverPhase({
  r, deps, enabled, state, tick, notes = [], secrets = [],
}) {
  if (!enabled.length) return { ok: true, reason: 'no enabled creators', counts: { discovered: 0, deleted: 0 } };
  let discovered = 0; let deleted = 0; let suspected = 0; let truncated = 0; let failed = 0;

  for (const creator of enabled) {
    try {
      const res = await discoverChannel(creator, { r, deps, now: tick, limit: 0, state });
      discovered += res.newIds.length;
      deleted += res.deleted.length;
      suspected += res.suspected.length;
      if (res.truncated) truncated += 1;
    } catch (e) {
      failed += 1;
      notes.push(`discover failed for ${creator.title || creator.channelId}: ${redact(e.message, secrets)}`);
    }
  }
  if (truncated) notes.push(`${truncated} creator(s) hit the enumeration limit — delete detection was skipped for them`);
  if (suspected) notes.push(`${suspected} video(s) were absent from the enumeration once — watching, not yet marked deleted`);

  return {
    ok: failed === 0,
    reason: failed ? `discovery failed for ${failed} of ${enabled.length} creator(s)` : null,
    counts: { discovered, deleted, suspected, failed },
  };
}

/**
 * Fetch every video whose schedule says it is due.
 *
 * `shouldAttempt` IS THE SCHEDULER, not a helper. An earlier version filtered on
 * state alone (`pending | failed_transient | no_track_retry`), which meant the
 * exponential backoff and the 48h no-track window were computed, tested in
 * isolation, and then IGNORED by the only code that actually fetches. Every
 * backoff test passed while the runner retried immediately.
 *
 * Counters publish on EVERY iteration, because an earlier version assigned them
 * only after the loop — so a throw at video N of M discarded the accounting for
 * everything already done, and the digest read "fetched 0" for a run that had
 * stored fifteen documents.
 */
export async function fetchPhase({
  r, reg, enabled, state, deps, budget, tick, runId, record, secrets = [],
}) {
  if (!enabled.length) return { ok: true, reason: 'no enabled creators', counts: { fetched: 0, deferred: 0 } };
  const enabledIds = new Set(enabled.map((c) => c.channelId));

  const candidates = Object.values(state.videos)
    .filter((v) => enabledIds.has(v.channelId))
    .filter((v) => shouldAttempt(v, { now: tick() }).work)
    .sort((a, x) => String(a.discoveredAt || '').localeCompare(String(x.discoveredAt || '')));

  let fetched = 0; let deferred = 0; let noTrack = 0; let failed = 0;
  let unavailable = 0; let deferredReason = null;

  const publish = () => {
    Object.assign(record.counts, { fetched, deferred, deferredReason, noTrack, failed, unavailable });
  };

  for (const video of candidates) {
    const slot = reserve(budget);
    if (!slot.ok) { deferred += 1; deferredReason = deferredReason || slot.reason; publish(); continue; }

    const creator = reg.creators[video.channelId] || { channelId: video.channelId };
    let outcome;
    try {
      outcome = await fetchVideo(video, {
        r, creator, deps, now: tick, requireDiscovered: true, state,
      });
    } catch (e) {
      // A throw here is a bug, not a fetch result. Record it, persist what we
      // have, and let the phase wrapper report it — do not lose the run.
      failed += 1;
      publish();
      const { saveState } = await import('./store.mjs');
      saveState(state, r);
      throw e;
    }
    state.videos[video.videoId] = stripMeta(outcome, secrets);
    if (outcome.state === 'fetched') fetched += 1;
    else if (outcome.state === 'no_track_retry' || outcome.state === 'no_track_confirmed') noTrack += 1;
    else if (outcome.state === 'unavailable') unavailable += 1;
    else failed += 1;
    publish();
  }

  record.budget = {
    perHour: budget.perHour, spent: budget.spent, refusals: budget.refusals, used: budgetState(budget).used,
  };
  publish();
  appendLedger(r, { runId, kind: 'fetch', fetched, deferred, failed, cap: budget.perHour });

  // A capped run must SAY it was capped, and must not claim success when the
  // only thing that happened was failure.
  const anyProgress = fetched > 0 || deferred > 0 || noTrack > 0 || candidates.length === 0;
  return {
    ok: failed === 0 && (anyProgress || unavailable > 0),
    reason: failed ? `${failed} fetch(es) failed` : (deferred ? `${deferred} deferred: ${deferredReason}` : null),
    counts: { fetched, deferred, noTrack, failed, unavailable },
  };
}

/** Render every enabled creator's brain. Returns `{ ok, reason, counts, built }`. */
export function buildPhase({
  r, enabled, tick, notes = [], secrets = [],
}) {
  if (!enabled.length) return { ok: true, reason: 'no enabled creators', counts: { built: 0 }, built: [] };
  const built = [];
  let failed = 0;
  for (const creator of enabled) {
    try {
      const brain = buildBrain(r, creator);
      if (!brain.docCount) continue;
      const out = renderBrain(brain, { r, now: tick() });
      built.push({ slug: brain.slug, ...out.counts, dropped: brain.dropped });
    } catch (e) {
      failed += 1;
      notes.push(`build failed for ${creator.title || creator.channelId}: ${redact(e.message, secrets)}`);
    }
  }
  return {
    ok: failed === 0,
    reason: failed ? `build failed for ${failed} creator(s)` : null,
    counts: { built: built.length, failed },
    built,
  };
}

/** Keep only the persisted shape — fetch metadata must not bloat the state map.
 *
 *  `lastError` IS SCRUBBED ON THE WAY IN. The run record and the digest were
 *  already redacted, but `state.json` was written raw, and every creator's
 *  `lastError` is echoed into the brain's coverage-gap table — which is Lane C,
 *  which is exported. A failed fetch whose error text quoted a token would
 *  therefore land in the one artifact designed to leave the machine. No current
 *  path puts a credential there (OAuth never reaches yt-dlp), so this closes a
 *  coverage gap rather than fixing a live leak — but the tier that leaves the
 *  machine is the wrong place to rely on that staying true. */
export function stripMeta(outcome, secrets = []) {
  const {
    wrote, reason, languages, cueCount, docPath, ...rest
  } = outcome;
  if (rest.lastError) rest.lastError = redact(rest.lastError, secrets).slice(0, 400);
  return rest;
}

export { nowIso };
