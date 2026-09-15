#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/subtitles.mjs
 * PURPOSE: Fetch one video's timed-text track as raw json3, with timing
 *          validation at the engine boundary.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR13)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE: the subtitle fetch pushed ytdlp.mjs past the
 * Rule 4 300-line cap once the operation model landed. It is re-exported from
 * ytdlp.mjs so that module stays the single import surface for "talk to
 * YouTube" — the same pattern `swan-scout/yt-scout-transcript.mjs` uses for its
 * cache split.
 *
 * WHAT THE REVIEW FOUND (HR13):
 *   The shared scout parser coerces a missing or non-numeric `tStartMs` to 0
 *   (`Number(ev.tStartMs) || 0`), so a cue at -9000 ms was stored as `fetched`
 *   and produced a citation reading `&t=-9s` — a link that goes nowhere, labelled
 *   as a verified source. The parser is shared, and changing it would alter
 *   behavior other callers depend on, so the validation happens HERE, at this
 *   engine's boundary, on the document this engine is about to persist.
 *
 * A NEGATIVE OR NON-FINITE TIME IS NOT A WARNING. It means the transcript we
 *   would store cannot be cited correctly, and an uncitable claim is the one
 *   thing this engine exists not to produce.
 *
 * @module creator-brains/subtitles
 */

import { join } from 'node:path';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runOperation, YtDlpError } from './ytdlp.mjs';

/** Sane upper bound for a single cue offset: 24 hours. */
export const MAX_CUE_MS = 24 * 60 * 60 * 1000;

/**
 * Validate a parsed cue list against this engine's citation contract.
 *
 * Returns `{ ok, problems, cues }` where `cues` is the sanitized list — every
 * entry finite, non-negative, in order, with non-empty text. Callers MUST treat
 * `ok: false` as a shape failure, never as a partial success.
 */
export function validateCues(cues) {
  const problems = [];
  if (!Array.isArray(cues) || cues.length === 0) return { ok: false, problems: ['no cues'], cues: [] };

  const clean = [];
  let last = -1;
  for (let i = 0; i < cues.length; i += 1) {
    const cue = cues[i];
    const ms = Number(cue && cue.ms);
    if (!Number.isFinite(ms)) { problems.push(`cue ${i}: time is not a finite number`); continue; }
    if (ms < 0) { problems.push(`cue ${i}: negative time (${ms}ms) cannot be cited`); continue; }
    if (ms > MAX_CUE_MS) { problems.push(`cue ${i}: time ${ms}ms exceeds the sane maximum`); continue; }
    if (ms < last) { problems.push(`cue ${i}: out of order (${ms} < ${last})`); continue; }
    if (typeof cue.text !== 'string' || !cue.text.trim()) { problems.push(`cue ${i}: empty text`); continue; }
    last = ms;
    clean.push({ ms, text: cue.text });
  }
  if (problems.length) return { ok: false, problems, cues: clean };
  return { ok: true, problems: [], cues: clean };
}

/**
 * Fetch a video's subtitle track and return the raw json3 text.
 *
 * A missing output file after a SUCCESSFUL probe is a FAILURE, not a no-track —
 * the caller has already established the track exists. Absence-after-declared-
 * presence is the exhaust port the upstream F2 finding is about.
 */
export function fetchJson3(videoId, lang, { timeout = 180_000 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-sub-'));
  try {
    const stem = join(dir, 'sub');
    runOperation('fetchSubs', { videoId, lang, outStem: stem }, { timeout });
    const produced = readdirSync(dir).filter((f) => f.endsWith('.json3'));
    if (!produced.length) {
      throw new YtDlpError(
        `no json3 track was produced for ${videoId} (${lang}) although --list-subs reported one`,
      );
    }
    const raw = readFileSync(join(dir, produced[0]), 'utf-8');
    if (!raw.trim()) throw new YtDlpError(`empty json3 payload for ${videoId} (${lang})`);
    return raw;
  } finally {
    // Always clean up, including on throw. No media is ever written here — this
    // is subtitle text only — but leaving temp dirs behind on every failed fetch
    // is how a disk quietly fills.
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}
