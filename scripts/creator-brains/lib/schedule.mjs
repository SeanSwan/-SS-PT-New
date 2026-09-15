#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/schedule.mjs
 * PURPOSE: Deciding WHAT work to do — creator selection, document
 *          reconciliation, and candidate priority.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/08/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `pipeline.mjs` to hold both files under the Rule 4 cap, along a
 * seam that was already there: this module answers "which creators, which
 * repairs, in what order"; `pipeline.mjs` answers "run the phase and report it".
 *
 * THE THREE FIXES THAT LIVE HERE:
 *   HR02 — `selectCreators` intersects a caller's selection with the ENABLED set
 *     and REJECTS a disabled or unknown target, so `fetch <id>` cannot widen
 *     into "fetch everybody".
 *   HR08 — `reconcilePhase` compares the state map against documents that
 *     actually validate. A `fetched` row with no document is a lie the rest of
 *     the engine acts on; this turns it back into work.
 *   HR23 — `orderCandidates` puts repair and retries first, then fresh uploads,
 *     then backfill, and round-robins across creators so one large channel
 *     cannot monopolise the cap.
 *
 * @module creator-brains/schedule
 */

import { transition, STATES } from './fsm.mjs';
import { listDocsChecked, saveState } from './store.mjs';
import { DAY_MS } from './paths.mjs';
export const FRESH_DAYS = 14;

/** How often a creator's whole corpus is re-walked as a census (review HR22).
 *  Incremental walks answer "what is new?" every day; only a census can answer
 *  "what is gone?", and a weekly cadence is cheap because it is one walk per
 *  creator per week — the walks are the same ones the daily job already makes,
 *  just without the early stop. */
export const AUTHORITATIVE_EVERY_DAYS = 7;

/**
 * Is a creator due for an authoritative sweep?
 *
 * A creator that has NEVER been swept is due immediately: there is no baseline to
 * be stale against, and the first walk of a channel has no high-water mark to stop
 * at, so it is a census either way — this only makes it a DELIBERATE one.
 *
 * `lastAuthoritativeAt` is written only by a sweep that certified the whole
 * corpus, so a series of failed or partial sweeps keeps the creator due.
 */
export function authoritativeDue(creator, { now = Date.now(), everyDays = AUTHORITATIVE_EVERY_DAYS } = {}) {
  const last = creator && creator.lastAuthoritativeAt ? Date.parse(creator.lastAuthoritativeAt) : NaN;
  if (!Number.isFinite(last)) {
    return {
      due: true, reason: 'never swept', lastAt: null, ageDays: null,
    };
  }
  const ageDays = Math.floor((now - last) / DAY_MS);
  return {
    due: ageDays >= everyDays,
    reason: ageDays >= everyDays
      ? `last census ${ageDays}d ago (interval ${everyDays}d)`
      : `census ${ageDays}d ago, next due in ${everyDays - ageDays}d`,
    lastAt: creator.lastAuthoritativeAt,
    ageDays,
  };
}

/** Split the enabled set into the creators due for a census and the rest. */
export function selectAuthoritative(enabled, { now = Date.now(), everyDays = AUTHORITATIVE_EVERY_DAYS } = {}) {
  const due = [];
  const notDue = [];
  for (const c of enabled) {
    const verdict = authoritativeDue(c, { now, everyDays });
    if (verdict.due) due.push({ creator: c, ...verdict });
    else notDue.push({ creator: c, ...verdict });
  }
  return { due, notDue };
}

/**
 * Restrict a creator list to an explicit selection.
 * A selection naming a DISABLED creator is reported, not silently widened —
 * "fetch A" must never become "fetch everybody" (review HR02).
 */
export function selectCreators(enabled, onlyCreators) {
  if (!onlyCreators || !onlyCreators.length) return { selected: enabled, rejected: [] };
  const byId = new Map(enabled.map((c) => [c.channelId, c]));
  const selected = [];
  const rejected = [];
  for (const id of onlyCreators) {
    const hit = byId.get(id);
    if (hit) selected.push(hit);
    else rejected.push({ channelId: id, reason: 'not an enabled creator in the registry' });
  }
  return { selected, rejected };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconcile (HR08)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare the state map against the documents that actually exist and validate.
 *
 * A `fetched` row with no valid document is a LIE the rest of the engine acts
 * on: the fetch phase skips it, and the brain reports it as covered. This turns
 * that lie into work.
 *
 * Returns `{ ok, reason, counts, repaired, emptied }`.
 */
export function reconcilePhase({ r, enabled, state, tick, notes = [] }) {
  const repaired = [];
  const emptied = [];
  const invalidDocs = new Map();

  for (const creator of enabled) {
    const checked = listDocsChecked(r, creator.channelId);
    invalidDocs.set(creator.channelId, checked.invalid);

    const rows = Object.values(state.videos).filter((v) => v.channelId === creator.channelId);
    const validIds = new Set(checked.valid.map((d) => d.videoId));

    for (const v of rows) {
      if (v.state !== STATES.FETCHED) continue;
      if (validIds.has(v.videoId)) continue;
      // The state says we have it; the disk says otherwise.
      state.videos[v.videoId] = transition(v, STATES.MISSING_DOCUMENT, {
        now: tick(),
        error: 'state says fetched but no valid transcript document is present',
        patch: { contentHash: null, docPath: null },
      });
      repaired.push(v.videoId);
    }

    if (!checked.valid.length) {
      emptied.push({ channelId: creator.channelId, title: creator.title, invalid: checked.invalid.length });
    }
  }

  if (repaired.length) notes.push(`${repaired.length} video(s) had no valid document and were re-queued for repair`);
  saveState(state, r);

  return {
    ok: true,
    reason: repaired.length ? `${repaired.length} document(s) missing or invalid` : null,
    counts: { repaired: repaired.length, emptied: emptied.length },
    repaired,
    emptied,
    invalidDocs,
  };
}

export function priorityTier(video, now) {  if (video.state === STATES.MISSING_DOCUMENT) return 0;
  if (video.state === STATES.FAILED_TRANSIENT || video.state === STATES.NO_TRACK_RETRY) return 1;
  const published = publishedMs(video.publishedAt);
  if (published !== null && now - published < FRESH_DAYS * DAY_MS) return 2;
  return 3;
}

/**
 * When was this published, in epoch milliseconds?
 *
 * THREE FORMATS ARRIVE HERE AND ONLY ONE OF THEM IS EPOCH TIME:
 *   `20260913`                    yt-dlp's `upload_date` (discovery)
 *   `2026-09-13T04:30:00.000Z`    the Data API lane (subscriptions)
 *   `1757740200000`               a caller that already did this arithmetic
 *
 * THE DEFECT THIS FIXES (review HR23):
 *   `priorityTier` did `Number(video.publishedAt)` and compared it against
 *   `Date.now()`. `Number('20260913')` is twenty million, and
 *   `Number('2026-09-13T…')` is NaN, so in BOTH real formats the difference was
 *   always larger than fourteen days: the "fresh" tier was unreachable, and a
 *   fresh upload was ordered only by the string sort of its date. A tier no
 *   record can enter is not a feature.
 *
 * Returns `null` for absent or unparseable input, so "we do not know when this
 * was published" can never be read as "published at the epoch".
 */
export function publishedMs(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  const ymd = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (ymd) {
    const ms = Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isFinite(ms) ? ms : null;
  }
  // A 12+ digit run of digits cannot be a date: `20260913` is eight, and epoch
  // milliseconds are thirteen. Ordering the two tests this way is what keeps a
  // numeric string from being read as a year 20260913.
  if (/^\d{12,}$/.test(s)) {
    const ms = Number(s);
    return Number.isFinite(ms) ? ms : null;
  }
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Newest first, with an unknown date sorted last rather than first. */
function byNewest(a, b) {
  const am = publishedMs(a.publishedAt);
  const bm = publishedMs(b.publishedAt);
  if (am === null && bm === null) return 0;
  if (am === null) return 1;
  if (bm === null) return -1;
  return bm - am;
}

/**
 * Order candidates so fresh uploads are not starved by an old backlog (HR23).
 * Round-robins across creators WITHIN a tier, so one large channel cannot
 * monopolise the cap.
 */
export function orderCandidates(candidates, { now = Date.now() } = {}) {
  const byTier = new Map();
  for (const v of candidates) {
    const t = priorityTier(v, now);
    if (!byTier.has(t)) byTier.set(t, new Map());
    const perCreator = byTier.get(t);
    if (!perCreator.has(v.channelId)) perCreator.set(v.channelId, []);
    perCreator.get(v.channelId).push(v);
  }
  const out = [];
  for (const tier of [...byTier.keys()].sort((a, b) => a - b)) {
    const perCreator = byTier.get(tier);
    for (const list of perCreator.values()) {
      list.sort(byNewest);
    }
    let added = true;
    while (added) {
      added = false;
      for (const list of perCreator.values()) {
        const next = list.shift();
        if (next) { out.push(next); added = true; }
      }
    }
  }
  return out;
}
