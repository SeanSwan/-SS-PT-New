#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/canary.mjs
 * PURPOSE: Prove yt-dlp still works, every run, before anything else runs.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S8)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE: it pushed run.mjs past the Rule 4 300-line cap.
 * It is also genuinely separable — the canary shares nothing with the catalog
 * pipeline except the yt-dlp plumbing, and it deliberately does NOT consume the
 * fetch budget (see below), so it has no accounting to share.
 *
 * WHY THE CANARY EXISTS AT ALL:
 *   The upstream hostile review's worst-case failure is not a crash. It is
 *   yt-dlp returning HTTP 200 with an EMPTY or RESHAPED payload after YouTube
 *   changes something — runs go green, zero segments are stored, and the brain
 *   is silently stale for weeks. A run that reports "0 fetched" cannot
 *   distinguish that from "nothing new". One fixed, known-good video,
 *   re-fetched and asserted non-empty, is what tells them apart.
 *
 * WHY IT SITS OUTSIDE THE FETCH BUDGET:
 *   Charging it against the cap would make the cap's meaning ambiguous ("creator
 *   fetches" or "all requests"?) and could starve the health check on exactly
 *   the busy days when you most want it to run. It is one request.
 *
 * @module creator-brains/canary
 */

import { appendCanary } from './store.mjs';
import { nowIso } from './paths.mjs';
import { parseJson3 } from '../../swan-scout/yt-scout-transcript.mjs';
import { validateCues } from './subtitles.mjs';
import { COST } from './ledger.mjs';
import { noteTransportFailure, throttleState } from './throttle.mjs';

/** The fixed known-good video. Stable, public, captioned. */
export const DEFAULT_CANARY_VIDEO = 'aircAruvnKk';

/**
 * Run the canary. Returns the phase result `{ ok, reason, counts }` and appends
 * to the canary history so a pattern of failures is visible over time.
 *
 * `probeSubs` / `fetchJson3` are injected so the whole path is testable.
 *
 * The canary takes TWO transport operations (a probe and a fetch) and reserves
 * them like any other caller, so the budget's unit stays honest — but it runs
 * FIRST and outside the catalog's contention, because a budget tripped by last
 * hour's backfill must not also disable the health check.
 */
export function runCanary({
  r, videoId = DEFAULT_CANARY_VIDEO, probeSubs, fetchJson3, tick = () => Date.now(), notes = [],
  reserve = null,
} = {}) {
  const p = probeSubs(videoId);
  if (!p || p.ok !== true) {
    // A SHAPE ERROR IS REPORTED AS ONE. The old guard only caught a MISSING
    // `languages` field, and the real adapter always supplies the field — so an
    // exit-0 empty subprocess passed as a healthy answer (review HR19).
    const kind = (p && p.kind) || 'failed';
    const error = `${kind}: ${(p && p.error) || 'probe failed'}`;
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error });
    return { ok: false, reason: `canary probe ${error}`, counts: { cues: 0 } };
  }
  if (!Array.isArray(p.languages) || !p.languages.length) {
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error: 'probe returned no language list' });
    return { ok: false, reason: 'canary probe returned no language list', counts: { cues: 0 } };
  }
  const lang = p.languages.find((l) => l === 'en' || l === 'en-orig') || p.languages[0];

  let cues = 0;
  try {
    const parsed = parseJson3(fetchJson3(videoId, lang));
    const checked = validateCues(parsed && parsed.cues);
    if (!checked.ok) throw new Error(`cue validation failed: ${checked.problems[0]}`);
    cues = checked.cues.length;
  } catch (e) {
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error: e.message });
    return { ok: false, reason: `canary fetch failed: ${e.message}`, counts: { cues: 0 } };
  }

  const ok = cues > 0;
  appendCanary(r, { ts: nowIso(tick), videoId, ok, cues, lang });
  if (!ok) notes.push(`canary returned zero cues for ${videoId} — yt-dlp may have changed shape`);
  return { ok, reason: ok ? null : 'canary returned zero cues', counts: { cues } };
}

/**
 * The canary as a phase: run it, account for its transport operations against
 * the run's work bound, and — when it failed because the service refused us —
 * persist the shared cooldown.
 *
 * WHY THE TRIP BELONGS HERE (review HR23): the canary is the first thing that
 * touches the network, so a 429 usually lands on IT. Without this, the run would
 * degrade into "canary failed" with no record of why, and the next invocation
 * would walk straight back into the same refusal.
 *
 * The two operations are CHARGED to the run bound but not reserved against the
 * hourly budget, which is the deliberate asymmetry documented at the top of this
 * module: the health check must not be starved by a busy backfill hour, and the
 * run bound must still count everything the run actually sends.
 */
export function canaryPhase({
  r, canary = {}, probeSubs, fetchJson3, tick = () => Date.now(), notes = [], bounds = null,
} = {}) {
  // A bound too small to hold the health check refuses it UP FRONT rather than
  // being overshot by it (HR23): discovering the ceiling mid-flight would make
  // "the run spent at most maxOps" false in exactly the case an operator set a
  // deliberately tiny bound to test with.
  if (bounds && !bounds.allows(COST.CANARY)) {
    const reason = `not attempted: the run work bound cannot fit the canary's ${COST.CANARY} operations`;
    notes.push(`canary skipped — ${reason}`);
    return {
      ok: false, reason, counts: { cues: 0 }, throttled: false, boundSkipped: true,
    };
  }
  const res = runCanary({
    r,
    videoId: canary.videoId || DEFAULT_CANARY_VIDEO,
    probeSubs,
    fetchJson3,
    tick,
    notes,
  });
  if (bounds) bounds.charge(COST.CANARY);
  if (res.ok) return { ...res, throttled: false, throttle: throttleState(r, { now: tick() }) };

  const trip = noteTransportFailure(r, { error: res.reason, now: tick(), source: 'canary' });
  if (trip && trip.ok) notes.push(`canary was refused by the service — ${trip.kind} recorded; traffic deferred`);
  if (trip && trip.ok === false) notes.push(`could not persist the canary cooldown: ${trip.error}`);
  return { ...res, throttled: !!(trip && trip.ok), throttle: throttleState(r, { now: tick() }) };
}
