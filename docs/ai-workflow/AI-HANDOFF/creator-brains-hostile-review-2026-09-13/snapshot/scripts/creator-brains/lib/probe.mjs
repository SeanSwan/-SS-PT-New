#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/probe.mjs
 * PURPOSE: Ask YouTube which subtitle tracks a video has — and refuse to treat
 *          a machine translation as the creator's own words.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S5)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE: it is the single most consequential decision in
 * the engine — what text is allowed to represent a creator — and it pushed
 * ytdlp.mjs past the Rule 4 300-line cap. Re-exported from ytdlp.mjs so that
 * module stays the single import surface (the same pattern
 * swan-scout/yt-scout-transcript.mjs uses for its cache split).
 *
 * @module creator-brains/probe
 */

import { runYtDlp } from './ytdlp.mjs';
// ─────────────────────────────────────────────────────────────────────────────
// Subtitle probing — the F2 fix
// ─────────────────────────────────────────────────────────────────────────────

/** `en`, `en-US`, `zh-Hans`… BCP-47-ish, 2-3 letter primary subtag. */
const LANG = /^[a-zA-Z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;

export function isLanguageTag(s) {
  return typeof s === 'string' && LANG.test(s);
}

/**
 * Parse the human table `--list-subs` prints. Rows look like:
 *   `en   English, English, ...   vtt, srt, ttml, srv3, srv2, srv1, json3, vtt`
 * The header row and section headers are skipped. Returns the set of language
 * codes, WITHOUT asserting anything about format availability — a language with
 * no json3 is treated as having a track and will fail at fetch time with a
 * shape error, which is the honest outcome.
 */
export function parseListSubs(stdout) {
  const langs = new Set();
  for (const raw of String(stdout || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(Language|Available (automatic )?captions|Available subtitles)/i.test(line)) continue;
    const code = line.split(/\s+/)[0];
    if (isLanguageTag(code)) langs.add(code);
  }
  return [...langs].sort();
}

/**
 * Ask YouTube which subtitle tracks exist for a video, WITHOUT downloading.
 * Returns `{ ok: true, languages, originals }` or `{ ok: false, error }`.
 *
 * WHAT `originals` IS AND WHY IT MATTERS (verified live 2026-09-12):
 *   `--list-subs` on a single English video returns ~4,890 rows, because
 *   YouTube lists an auto-TRANSLATED track for every language it supports. Only
 *   one of those is the creator actually speaking. yt-dlp marks that one with
 *   an `-orig` suffix — the real output contains `en-orig  English (Original)`
 *   alongside thousands of translations.
 *
 *   Without this distinction, asking for `en` on a German video happily returns
 *   YouTube's machine translation of the German, and the brain would then claim
 *   the creator "said" words they never said. The upstream hostile review named
 *   exactly this (finding W7: "fetch only original-language ASR").
 *
 * `ok: false` means we could not answer the question (network, bot-check,
 * removed video). It must NEVER be collapsed into "no captions" — that collapse
 * is finding F2, and it is the difference between a deferred retry and a video
 * permanently mislabelled.
 */
export function probeSubs(videoId, { timeout = 120_000 } = {}) {
  try {
    const out = runYtDlp([
      `https://www.youtube.com/watch?v=${videoId}`,
      '--list-subs', '--skip-download', '--no-warnings',
    ], { timeout });
    const languages = parseListSubs(out);
    return {
      ok: true,
      languages,
      originals: languages.filter((l) => /-orig$/i.test(l)),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Choose a track to fetch, refusing a machine translation.
 *
 * Returns `{ lang, original, reason }`, or `{ lang: null, reason }` when the
 * answer is "there is no original-language track in the language we want".
 *
 * THE RULE: if YouTube published ANY track marked original, then a wanted
 * language that has no original marking is a TRANSLATION — YouTube only omits
 * the marker for the language actually spoken. So we refuse it and say why,
 * rather than silently filling the brain with words from a translation vendor.
 * When no original marking exists at all (manual-only or older tracks), a plain
 * language match is accepted and flagged `original: false` so the provenance is
 * still recorded.
 */
export function pickLanguage(languages, wanted = 'en', originals = []) {
  if (!Array.isArray(languages) || !languages.length) return { lang: null, reason: 'no_tracks' };
  const w = String(wanted).toLowerCase();
  const primary = w.split('-')[0];
  const lower = languages.map((l) => l.toLowerCase());
  const origLower = (Array.isArray(originals) ? originals : []).map((l) => l.toLowerCase());

  // 1. The explicit original marker for the wanted language.
  const origExact = lower.find((l) => l === `${w}-orig` || l === `${primary}-orig`);
  if (origExact) return { lang: origExact, original: true, reason: null };

  // 2. A plain match that IS also the declared original.
  const exact = lower.find((l) => l === w);
  if (exact && origLower.includes(exact)) return { lang: exact, original: true, reason: null };

  // 3. YouTube published originals, but not for what we want => a translation.
  if (origLower.length) {
    return {
      lang: null,
      original: false,
      reason: `only a machine translation is available for '${wanted}' (the original track is ${origLower.join(', ')})`,
    };
  }

  // 4. No original marking anywhere — accept a match, but record that we could
  //    not verify it. `-orig` is absent for manual and some legacy tracks.
  const primaryMatch = lower.find((l) => l.split('-')[0] === primary);
  if (primaryMatch) return { lang: primaryMatch, original: false, reason: null };
  return { lang: null, original: false, reason: `no '${wanted}' track` };
}


