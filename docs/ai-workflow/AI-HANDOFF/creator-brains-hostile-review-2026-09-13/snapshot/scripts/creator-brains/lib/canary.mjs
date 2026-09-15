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

/** The fixed known-good video. Stable, public, captioned. */
export const DEFAULT_CANARY_VIDEO = 'aircAruvnKk';

/**
 * Run the canary. Returns the phase result `{ ok, reason, counts }` and appends
 * to the canary history so a pattern of failures is visible over time.
 *
 * `probeSubs` / `fetchJson3` are injected so the whole path is testable.
 */
export function runCanary({
  r, videoId = DEFAULT_CANARY_VIDEO, probeSubs, fetchJson3, tick = () => Date.now(), notes = [],
} = {}) {
  const p = probeSubs(videoId);
  if (!p || p.ok !== true) {
    const error = (p && p.error) || 'probe failed';
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error });
    return { ok: false, reason: `canary probe failed: ${error}`, counts: { cues: 0 } };
  }
  // A probe that answered without a language list has not answered. Same
  // fail-open guard as fetch.mjs; the canary must not certify a shape the
  // fetcher would reject.
  if (!Array.isArray(p.languages) || !p.languages.length) {
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error: 'probe returned no language list' });
    return { ok: false, reason: 'canary probe returned no language list', counts: { cues: 0 } };
  }
  const lang = p.languages.find((l) => l === 'en' || l === 'en-orig') || p.languages[0];

  let cues = 0;
  try {
    const parsed = parseJson3(fetchJson3(videoId, lang));
    cues = (parsed.cues || []).length;
  } catch (e) {
    appendCanary(r, { ts: nowIso(tick), videoId, ok: false, error: e.message });
    return { ok: false, reason: `canary fetch failed: ${e.message}`, counts: { cues: 0 } };
  }

  const ok = cues > 0;
  appendCanary(r, { ts: nowIso(tick), videoId, ok, cues, lang });
  if (!ok) notes.push(`canary returned zero cues for ${videoId} — yt-dlp may have changed shape`);
  return { ok, reason: ok ? null : 'canary returned zero cues', counts: { cues } };
}
