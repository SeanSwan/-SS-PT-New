#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/discover.mjs
 * PURPOSE: Find every video a creator has published, diff it against stored
 *          state, and detect videos that vanished upstream — but only on the
 *          strength of a walk that was actually complete.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR12/22/23)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced finding HR12):
 *   A title containing a tab made the row parser drop the video. Two such runs
 *   in a row advanced `missingStreak` to the confirmation threshold and marked a
 *   live video `deleted_upstream` — terminal. The two-observation rule was
 *   counting two BROKEN enumerations as two good ones, because nothing asked
 *   whether the walk had succeeded.
 *
 *   Deletion confirmation now requires `complete === true` from the enumerator,
 *   which is itself false for an empty walk, an unparseable row, a per-tab
 *   failure, or a limit-truncated walk. An incomplete walk updates NOTHING.
 *
 * HR22 — "EVERY VIDEO" NOW MEANS SOMETHING, AND A PARTIAL WALK KNOWS IT:
 *   The old code walked one `…/videos` tab, which excludes Shorts and past live
 *   streams, and called the result the channel's full history. The walk now covers
 *   the configured tabs and merges by video id. Two consequences the review named:
 *   a walk that covered PART of the corpus can never certify the whole of it
 *   (`partial`, below), and the judgement of "this is gone" is one exported
 *   function so a resumed sweep reaches it by the same rule as a single-run walk.
 *
 * HR23 — THE HIGH-WATER MARK IS ACTUALLY USED:
 *   It was written on every run and read by nothing, so every run re-walked the
 *   entire channel — on a 979-video channel that is the whole tab, every day,
 *   forever. `stopAfterId` now ends the walk at the last-known-newest video.
 *
 * @module creator-brains/discover
 */

import { enumerateChannel, TABS } from './enumerate.mjs';
import { newVideoState, transition, STATES } from './fsm.mjs';
import {
  saveState, readState, stateOrDefault, isDamaged, describeRead,
} from './store.mjs';
import { touchCreator } from './registry.mjs';
import { nowIso } from './paths.mjs';

/**
 * How many consecutive COMPLETE enumerations must omit a video before it is
 * called deleted upstream.
 *
 *   One is not enough: a video also leaves an uploads playlist by being made
 *   private, made members-only, or region-blocked. `deleted_upstream` is
 *   terminal, so two agreeing observations are required — and both must come
 *   from walks the enumerator certified as complete.
 */
export const MISSING_CONFIRMATIONS = 2;

/** The injected-enumerator adapter moved to its own module for the Rule 4 cap
 *  when the resumable-sweep work landed (HR22). BOTH the import and the
 *  re-export are needed: `export … from` re-exports a name WITHOUT creating a
 *  local binding, so a file that also CALLS the name must import it too. (This
 *  engine has been bitten by exactly that once already — see the CLI entry-point
 *  defect in the repair record — and the suite caught it again here.) */
import { wrapInjected, refused } from './injected-enumerator.mjs';
export { wrapInjected, refused };

/**
 * Observe absences: a stored video that a census did not see.
 *
 * EXTRACTED SO THERE IS ONE DEFINITION OF "GONE" (review HR22). A single-run walk
 * with a complete verdict and a census assembled from several resumed walks must
 * reach the same conclusion by the same rule; two copies of this loop would drift
 * the moment one of them learned something new. It mutates `store` and saves it,
 * and it deliberately does NOT decide whether it may run — the caller owns the
 * completeness argument, because that is the claim being made.
 *
 * Returns `{ deleted, suspected }`.
 */
export function applyDeletionObservations({
  r, store, creator, seenIds, clock, reason = null,
}) {
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds || []);
  const deleted = [];
  const suspected = [];

  for (const v of Object.values(store.videos)) {
    if (v.channelId !== creator.channelId) continue;
    if (v.state !== STATES.FETCHED && v.state !== STATES.MISSING_DOCUMENT) continue;
    if (seen.has(v.videoId)) continue;

    const streak = (v.missingStreak || 0) + 1;
    if (streak < MISSING_CONFIRMATIONS) {
      v.missingStreak = streak;
      v.lastMissingAt = nowIso(clock);
      suspected.push(v.videoId);
      continue;
    }
    store.videos[v.videoId] = transition(v, STATES.DELETED_UPSTREAM, {
      now: clock(),
      // THE STATE NAME IS A CLAIM, SO THE ERROR TEXT SAYS WHAT WAS ACTUALLY
      // OBSERVED. A census walks the PUBLIC tabs; a video also leaves them by being
      // made private, members-only or region-blocked, and those look identical from
      // here. Probe F3 of the local hostile pass confirmed the engine retires such a
      // video after two clean censuses — recoverable, since deletion -> pending is
      // legal when it reappears, but the text must not pretend to know it was deleted.
      error: reason || `absent from ${streak} consecutive complete census walks of the public tabs `
        + '(uploads/shorts/streams) — private, members-only and region-blocked videos look the same',
      patch: { missingStreak: streak, nextRetryAt: null },
    });
    deleted.push(v.videoId);
  }

  saveState(store, r);
  return { deleted, suspected };
}

/**
 * Discover a channel's uploads and diff them against stored state.
 *
 * `deps.enumerate(channelId, opts)` is injected so the whole path is testable
 * without the network. Returns `{ rows, newIds, known, complete, reason, deleted,
 * suspected, perTab }` and mutates the video map for newly seen ids.
 *
 * `allowDeletion: false` INGESTS WITHOUT JUDGING (review HR22): a resumed sweep
 * must not confirm an absence from a walk that covered part of the corpus. The
 * sweep applies the diff itself, once, against the union of every walk it made.
 */
export async function discoverChannel(creator, {
  r, deps = {}, now, limit = 0, state = null, tabs = TABS, incremental = true,
  allowDeletion = true, allTabs = TABS,
} = {}) {
  // `deps.enumerate` is the current injection point. `deps.listUploads` is
  // accepted as an ALIAS for a single-tab enumerator, because instruments and
  // earlier callers use that name — but an injected array is NOT assumed
  // complete. Completeness is derived from what came back: no rows means
  // inconclusive, and unparseable rows mean not authoritative. Defaulting an
  // injected array to `complete: true` would reopen exactly the hole HR12
  // closed.
  const enumerate = deps.enumerate || (deps.listUploads
    ? (channelId, opts) => wrapInjected(deps.listUploads, channelId, opts, tabs)
    : (channelId, opts) => enumerateChannel(channelId, opts));
  const clock = now || (() => Date.now());

  // THE STATE MAP IS LOADED HERE IF THE CALLER DID NOT SUPPLY ONE — through the
  // STRICT reader, so a damaged store is refused rather than silently replaced.
  // The previous version used the lenient loader here, which is exactly how the
  // reviewer replaced an unparseable `{bad` file with an empty map by calling
  // this function directly and bypassing the daily-job preflight (HR04).
  //
  // The refusal is RETURNED, not thrown. Every other boundary in this engine
  // reports an outcome object (`probeSubs` returns `{ok:false}`, `listUploads`
  // returns `{rows, error}`), and a caller that has to wrap a call in try/catch
  // to distinguish "no work" from "could not read the store" is a caller that
  // will eventually forget to.
  let store = state;
  if (!store) {
    const read = readState(r);
    if (isDamaged(read)) {
      return refused(
        `state.json is ${describeRead(read)} — refusing to run discovery over a damaged store`,
        { tabs },
      );
    }
    store = stateOrDefault(read);
  }

  // Incremental walks stop at the newest video we already know about (HR23).
  const stopAfterId = incremental ? (creator.highWaterMark && creator.highWaterMark.videoId) || null : null;

  const res = enumerate(creator.channelId, {
    tabs, limit, stopAfterId, timeout: 300_000,
  }) || {};

  const rows = Array.isArray(res.rows) ? res.rows : [];
  const problems = Array.isArray(res.problems) ? res.problems : [];
  // A WALK THAT COVERED PART OF THE CORPUS CANNOT CERTIFY THE WHOLE OF IT
  // (review HR22). `enumerateChannel` certifies the tabs it was asked for; asking
  // for two of three and receiving a clean answer is not a census, and treating it
  // as one is how a resumed walk would fabricate a deletion.
  const partial = Array.isArray(tabs) && tabs.length < (allTabs || []).length;
  const complete = res.complete === true && !partial;

  const newIds = [];
  const known = [];
  let newest = null;

  for (const row of rows) {
    if (!row || !/^[\w-]{11}$/.test(String(row.id || ''))) continue;
    // A row whose recorded channel disagrees with the one we asked for is not
    // evidence about this creator (review HR18's principle, applied at ingest).
    if (row.channel_id && row.channel_id !== creator.channelId) continue;

    const existing = store.videos[row.id];
    if (existing) {
      if (existing.channelId !== creator.channelId) continue;
      if (existing.state === STATES.DELETED_UPSTREAM) {
        store.videos[row.id] = transition(existing, STATES.PENDING, {
          now: clock(),
          patch: { lastError: null, missingStreak: 0, restoredAt: nowIso(clock) },
        });
      } else if (existing.missingStreak) {
        existing.missingStreak = 0;
      }
      known.push(row.id);
      continue;
    }

    const rec = newVideoState(row.id, creator.channelId, {
      title: row.title ?? null,
      durationS: row.duration ? Number(row.duration) : null,
      viewCount: row.view_count ? Number(row.view_count) : null,
      publishedAt: row.upload_date ?? null,
      now: nowIso(clock),
    });
    rec.tab = row.tab || null;
    store.videos[row.id] = rec;
    newIds.push(row.id);
  }

  // Newest-first ordering is yt-dlp's default; the first row is the high-water mark.
  const newestRow = rows.find((x) => x && x.id && /^[\w-]{11}$/.test(x.id));
  if (newestRow) newest = newestRow;

  // ── Deletion detection: COMPLETE walks only (HR12), and only when the caller
  //    has not reserved the judgement for itself (HR22) ───────────────────────
  const mayJudge = complete && allowDeletion !== false;
  const observed = mayJudge
    ? applyDeletionObservations({
      r,
      store,
      creator,
      seenIds: new Set(rows.map((x) => x && x.id)),
      clock,
      reason: `absent from consecutive complete enumerations (${(res.tabs || tabs).join('+')})`,
    })
    : { deleted: [], suspected: [] };
  const { deleted, suspected } = observed;

  saveState(store, r);
  touchCreator(r, creator.channelId, {
    lastDiscoverAt: nowIso(clock),
    highWaterMark: newest
      ? { videoId: newest.id, title: newest.title ?? null, uploadDate: newest.upload_date ?? null }
      : (creator.highWaterMark || null),
    lastEnumeration: {
      rows: rows.length,
      complete,
      partial,
      reason: res.reason || null,
      perTab: res.perTab || null,
      invalid: (res.invalid || []).length,
      problems: problems.length,
      judged: mayJudge,
      suspected: suspected.length,
      at: nowIso(clock),
    },
  });

  return {
    ok: true,
    rows,
    newIds,
    known,
    complete,
    partial,
    reason: res.reason || null,
    perTab: res.perTab || null,
    problems,
    invalid: (res.invalid || []).length,
    deleted,
    suspected,
    judged: mayJudge,
    incremental: !!stopAfterId,
    limit,
  };
}
