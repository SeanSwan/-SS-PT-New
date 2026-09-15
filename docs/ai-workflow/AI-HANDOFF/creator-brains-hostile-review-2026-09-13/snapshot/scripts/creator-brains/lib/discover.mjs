#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/discover.mjs
 * PURPOSE: Find every video a creator has published, diff it against what we
 *          already know, and detect videos that vanished upstream.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S4)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * THE 200-VIDEO PROBLEM THIS EXISTS TO FIX:
 *   swan-scout's `listChannelVideos` clamps its walk to 200 entries. That is
 *   right for "show me a creator's recent work" and wrong for a brain: a
 *   channel with 900 videos would produce a brain built from 22% of its
 *   output, with nothing anywhere saying so. This module has NO built-in
 *   ceiling — the caller sets `limit`, and when a limit is hit it is reported
 *   as `truncated: true` so a partial walk can never be mistaken for a
 *   complete one.
 *
 * WHY TRUNCATION MUST BE EXPLICIT:
 *   Delete detection (below) is only sound over a COMPLETE enumeration. If a
 *   limited walk were treated as complete, every older video would look like it
 *   had been deleted upstream — and the engine would mark a creator's whole
 *   back catalogue `deleted_upstream` on the first bounded run. `truncated` is
 *   the flag that stops that.
 *
 * THE VACATION GAP (upstream finding W3):
 *   A channel's RSS feed holds only ~15 recent entries, so a machine that is
 *   off for a fortnight loses videos FOREVER with no error. Enumerating the
 *   uploads playlist has no such window, which is why discovery is built on it
 *   rather than on RSS.
 *
 * @module creator-brains/discover
 */

import { listUploads as realListUploads } from './ytdlp.mjs';
import { newVideoState, transition, STATES } from './fsm.mjs';
import { loadState, saveState } from './store.mjs';
import { touchCreator } from './registry.mjs';
import { nowIso } from './paths.mjs';

/**
 * How many consecutive COMPLETE enumerations must omit a video before we call it
 * deleted upstream.
 *
 *   One is not enough, and this module's header used to claim the class was
 *   solved when only the caller-imposed limit was handled. A video leaves an
 *   uploads playlist for many reasons that are not deletion — made private,
 *   made members-only, region-blocked, or simply a truncated playlist
 *   continuation that still exits 0 (and `--no-warnings` hides the message).
 *   `deleted_upstream` is terminal, so a single bad enumeration would retire a
 *   live video permanently. Two agreeing observations cost one extra day and
 *   turn a guess into a supported claim.
 */
export const MISSING_CONFIRMATIONS = 2;

/**
 * Discover a channel's uploads and diff them against stored state.
 *
 * `deps.listUploads(url, {limit})` is injected so this whole path is testable
 * without the network. Returns:
 *   { rows, newIds, known, truncated, deleted, limit }
 * and mutates the video map for newly seen ids.
 */
export async function discoverChannel(creator, {
  r, deps = {}, now, limit = 0, state = null, registry = null,
} = {}) {
  const list = deps.listUploads || realListUploads;
  const store = state || loadState(r);
  const clock = now || (() => Date.now());

  const rows = list(creator.url, { limit }) || [];
  const truncated = Number.isFinite(limit) && limit > 0 && rows.length >= limit;

  const newIds = [];
  const known = [];
  let newest = null;

  for (const row of rows) {
    if (!row || !/^[\w-]{11}$/.test(String(row.id || ''))) continue;
    const existing = store.videos[row.id];
    if (existing) {
      // A known video that reappears upstream after being marked deleted has
      // been re-uploaded or restored. Route it through the FSM rather than
      // assigning `.state` directly — a direct write skips the legality check,
      // leaves `updatedAt` stale, and would be the one writer in the codebase
      // that can leave a record in a state the rest of the system cannot
      // reason about.
      if (existing.state === STATES.DELETED_UPSTREAM) {
        store.videos[row.id] = transition(existing, STATES.PENDING, {
          now: clock(),
          patch: { lastError: null, missingStreak: 0, restoredAt: nowIso(clock) },
        });
      } else if (existing.missingStreak) {
        existing.missingStreak = 0; // seen again — the miss was transient
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
    store.videos[row.id] = rec;
    newIds.push(row.id);
  }

  if (rows.length && rows[0].id) newest = rows[0];

  // Delete detection — ONLY over a complete enumeration, and only after the
  // omission has been observed MISSING_CONFIRMATIONS times in a row.
  const deleted = [];
  const suspected = [];
  if (!truncated) {
    const seen = new Set(rows.map((x) => x && x.id));
    for (const v of Object.values(store.videos)) {
      if (v.channelId !== creator.channelId) continue;
      if (v.state !== STATES.FETCHED) continue;
      if (seen.has(v.videoId)) continue;

      const streak = (v.missingStreak || 0) + 1;
      if (streak < MISSING_CONFIRMATIONS) {
        // Observed once. Record the suspicion, change nothing terminal.
        v.missingStreak = streak;
        v.lastMissingAt = nowIso(clock);
        suspected.push(v.videoId);
        continue;
      }
      store.videos[v.videoId] = transition(v, STATES.DELETED_UPSTREAM, {
        now: clock(),
        error: `absent from ${streak} consecutive complete uploads enumerations`,
        patch: { missingStreak: streak, nextRetryAt: null },
      });
      deleted.push(v.videoId);
    }
  }

  saveState(store, r);
  if (registry !== null || r) {
    touchCreator(r, creator.channelId, {
      lastDiscoverAt: nowIso(clock),
      highWaterMark: newest ? { videoId: newest.id, title: newest.title ?? null, uploadDate: newest.upload_date ?? null } : (creator.highWaterMark || null),
      lastEnumeration: {
        count: rows.length, truncated, suspected: suspected.length, at: nowIso(clock),
      },
    });
  }

  return {
    rows, newIds, known, truncated, deleted, suspected, limit,
  };
}
