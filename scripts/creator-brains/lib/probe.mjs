#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/probe.mjs
 * PURPOSE: Ask YouTube which subtitle tracks a video has — and refuse to treat
 *          an unparseable answer as "no captions".
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR19)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced finding HR19):
 *   A test guarded against a probe returning a MISSING `languages` field. The
 *   reviewer pointed the REAL adapter at a synthetic exit-0 empty subprocess and
 *   got `{ok: true, languages: []}` — the field was always present, just empty,
 *   so the guard never fired. Two attempts later the video reached terminal
 *   `unavailable`: the engine permanently recorded "this creator published no
 *   captions" on the strength of a command that printed nothing.
 *
 * THE REAL QUESTION IS "DID WE UNDERSTAND THE ANSWER?", NOT "IS THE FIELD SET?":
 *   yt-dlp announces its table with `[info] Available automatic captions for X:`
 *   or `[info] Available subtitles for X:`. If we see neither banner, we did not
 *   get an answer — that is `shape_error`, which is TRANSIENT. If we see a banner
 *   and no rows under it, that IS an answer: this video has no tracks. Collapsing
 *   those two cases is the entire defect.
 *
 * ORIGINAL-LANGUAGE PROVENANCE:
 *   `--list-subs` on one English video returns ~4,890 rows, because YouTube lists
 *   an auto-TRANSLATED track for every language it supports. yt-dlp marks the one
 *   actually spoken with `-orig`. Without that distinction, asking for `en` on a
 *   German video returns YouTube's machine translation and the brain attributes
 *   those words to the creator.
 *
 * @module creator-brains/probe
 */

import { runOperation, isLanguageTag } from './ytdlp.mjs';

/** Outcome kinds. `shape_error` is the one that used to be swallowed. */
export const PROBE = Object.freeze({
  OK: 'ok',
  SHAPE_ERROR: 'shape_error',
  FAILED: 'failed',
});

const BANNER = /^\[info\]\s+Available (?:automatic captions|subtitles) for\s+\S+:/i;

/**
 * Parse the `--list-subs` table.
 *
 * Returns `{ parsed, languages, originals }`. `parsed: false` means the output
 * contained no recognizable banner — the caller MUST treat that as a shape
 * error rather than as an empty track list (review HR19).
 */
export function parseListSubs(stdout) {
  const lines = String(stdout || '').split('\n').map((l) => l.trimEnd());
  let sawBanner = false;
  const languages = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (BANNER.test(line)) { sawBanner = true; continue; }
    if (/^Language\s+/i.test(line)) continue;
    if (line.startsWith('[')) continue; // other yt-dlp diagnostics
    const code = line.split(/\s+/)[0];
    if (isLanguageTag(code)) languages.add(code);
  }

  const all = [...languages].sort();
  return {
    parsed: sawBanner,
    languages: all,
    originals: all.filter((l) => /-orig$/i.test(l)),
  };
}

/**
 * Ask YouTube which subtitle tracks exist for a video.
 *
 * Returns `{ ok, kind, languages, originals, error }`:
 *   ok: true                       — we have an ANSWER (possibly "no tracks")
 *   ok: false, kind: shape_error   — empty, truncated or unrecognized output
 *   ok: false, kind: failed        — the process failed
 * Only `ok: true` with an empty `languages` justifies a no-track verdict.
 */
export function probeSubs(videoId, { timeout = 120_000 } = {}) {
  let out;
  try {
    out = runOperation('probe', { videoId }, { timeout });
  } catch (e) {
    return {
      ok: false, kind: PROBE.FAILED, languages: [], originals: [], error: e.message,
    };
  }
  const parsed = parseListSubs(out);
  if (!parsed.parsed) {
    return {
      ok: false,
      kind: PROBE.SHAPE_ERROR,
      languages: [],
      originals: [],
      error: 'output contained no recognizable subtitle banner — empty, truncated, or a changed format',
    };
  }
  return {
    ok: true, kind: PROBE.OK, languages: parsed.languages, originals: parsed.originals, error: null,
  };
}

/**
 * Choose a track to fetch, refusing a machine translation.
 *
 * Returns `{ lang, original, reason }`, or `{ lang: null, reason }` when there is
 * no original-language track in the language we want.
 *
 * THE RULE: if YouTube published ANY track marked original, then a wanted
 * language with no original marking is a TRANSLATION — YouTube only omits the
 * marker for the language actually spoken. We refuse it and say why, rather than
 * filling the brain with a translation vendor's words under the creator's name.
 * When no original marking exists at all (manual-only, legacy), a plain match is
 * accepted and flagged `original: false` so the provenance is still recorded.
 */
export function pickLanguage(languages, wanted = 'en', originals = []) {
  if (!Array.isArray(languages) || !languages.length) return { lang: null, reason: 'no_tracks' };
  const w = String(wanted).toLowerCase();
  const primary = w.split('-')[0];
  const lower = languages.map((l) => l.toLowerCase());
  const origLower = (Array.isArray(originals) ? originals : []).map((l) => l.toLowerCase());

  const origExact = lower.find((l) => l === `${w}-orig` || l === `${primary}-orig`);
  if (origExact) return { lang: origExact, original: true, reason: null };

  const exact = lower.find((l) => l === w);
  if (exact && origLower.includes(exact)) return { lang: exact, original: true, reason: null };

  if (origLower.length) {
    return {
      lang: null,
      original: false,
      reason: `only a machine translation is available for '${wanted}' (the original track is ${origLower.join(', ')})`,
    };
  }

  const primaryMatch = lower.find((l) => l.split('-')[0] === primary);
  if (primaryMatch) return { lang: primaryMatch, original: false, reason: null };
  return { lang: null, original: false, reason: `no '${wanted}' track` };
}
