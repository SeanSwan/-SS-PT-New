#!/usr/bin/env node
/**
 * yt-scout-transcript.mjs — transcript parsing, targeted search, and disk cache.
 * ============================================================================
 * Split out of yt-scout-lib.mjs to hold that file under the Rule 4 300-line cap.
 * The seam is deliberate: yt-scout-lib owns "talk to YouTube" (validation +
 * yt-dlp invocation + listings); this module owns "turn a transcript into
 * something an agent can afford to read". Dependency runs one way only —
 * transcript → lib — so there is no import cycle.
 *
 * THE PROBLEM THIS SOLVES (measured 2026-08-11, Karpathy "Deep Dive into LLMs"):
 *   json3 4.3 MB → 215,347 chars → ~53,837 tokens for ONE 3.5-hour video.
 *   A live run of searchTranscript for "context window" returned ~91 tokens —
 *   the same answer for ~1/590th of the context. That ratio is the whole point
 *   of this module: full text goes to a FILE, questions get answered from cues.
 *
 * @module yt-scout-transcript
 */

import { YtScoutError, clampOpt } from './yt-scout-lib.mjs';


/**
 * json3 → { text, cues }. json3 is YouTube's timed-text format: events carry
 * `tStartMs` plus `segs[]` word chunks. We keep cue timings because timestamped
 * excerpts are what make `searchTranscript` worth ~91 tokens instead of ~54,000.
 *
 * Auto-generated tracks emit rolling duplicate lines; dropping a cue wholly
 * contained in its predecessor removes the dominant noise. This DOES also drop a
 * genuine consecutive repeat — see the tradeoff note at the check itself. An
 * earlier version of this comment claimed real repetition was untouched, which
 * was false.
 */
export function parseJson3(raw) {
  let doc;
  try {
    doc = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new YtScoutError('transcript file was not valid json3');
  }
  const cues = [];
  let prev = '';
  for (const ev of doc?.events || []) {
    if (!ev.segs) continue;
    const text = ev.segs.map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // KNOWN TRADEOFF, deliberately kept: this also drops a genuine consecutive
    // repeat ("No." / "No."), losing that occurrence and its timestamp. Requiring
    // a strict length decrease would preserve real repetition — but the dominant
    // auto-caption noise pattern IS an exact duplicate line, so that change
    // readmits the noise this exists to remove (verified: it turned a 2-cue parse
    // into 3 on the canonical fixture). Noise suppression wins; exact-repeat loss
    // is the accepted cost. The earlier claim that this left "real repetition"
    // untouched was simply false.
    if (prev && prev.includes(text)) continue;
    cues.push({ ms: Number(ev.tStartMs) || 0, text });
    prev = text;
  }
  return { text: cues.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim(), cues };
}

/** ms → `H:MM:SS` (or `M:SS` under an hour) — the form you paste after `&t=`. */
export function fmtTimestamp(ms) {
  const total = Math.max(0, Math.floor(Number(ms) || 0) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * THE context-saving path. Find `query` inside a transcript and return only the
 * matching neighbourhoods, each stamped with a jump-to timestamp and deep link.
 *
 * Implementation: search the FULL joined text (case-insensitive substring) and
 * map each match offset back to its cue via a char-offset index. Searching the
 * joined text is what lets a phrase straddle a cue boundary; mapping back is
 * what keeps the timestamp pointing at the cue the phrase actually starts in
 * rather than a couple of cues early.
 */
/** A cue is only usable if it carries both a numeric offset and real text. */
const isCue = (c) => !!c && typeof c === 'object' && typeof c.ms === 'number' && typeof c.text === 'string';

export function searchTranscript(cues, query, { context = 2, limit = 8, videoId } = {}) {
  // Reject a wrong-shaped cue array loudly. `[1,2,3]` is valid JSON and passes an
  // Array.isArray check, but every `.text` is undefined, the haystack becomes
  // empty, and EVERY search then reports "No match" forever — while the cache
  // entry is never re-fetched because validation "passed". Silent permanent
  // blindness is the worst outcome available here.
  if (!Array.isArray(cues) || !cues.every(isCue)) {
    throw new YtScoutError('transcript cues are malformed — re-fetch with refresh:true');
  }
  if (typeof query !== 'string' || !query.trim()) throw new YtScoutError('search query is required');
  // Collapse internal whitespace to match the haystack. parseJson3 already
  // collapses `\s+` in every cue and the cues are joined with single spaces, so
  // a query carrying a double space or a newline — routine when a phrase is
  // pasted from wrapped text — could never match, and the tool answered with a
  // confident "No match … try a shorter phrasing". A false negative reported as
  // fact is worse than no answer, because the agent acts on it.
  const needle = query.trim().replace(/\s+/g, ' ').toLowerCase();
  const ctx = clampOpt(context, 2, 0, 10);
  const cap = clampOpt(limit, 8, 1, 40);

  // Build the joined haystack plus the char offset at which each cue begins.
  //
  // Lowercase EACH CUE BEFORE measuring it. Lowercasing the joined string instead
  // desynchronizes every offset after the first character whose lowercase form is
  // longer than the original — 'İ' (U+0130) lowercases to two code units — and
  // once `starts[]` disagrees with `hay`, the offset→cue mapping walks to the
  // wrong cue and the excerpt, timestamp and jump-to URL are all confidently
  // wrong. Verified 2026-08-12: 40 such chars in cue 0 made a phrase in cue 3
  // report as cue 6 ("epsilon" @ 1:00 instead of "SIGNAL" @ 0:30).
  const starts = new Array(cues.length);
  const parts = [];
  let offset = 0;
  for (let i = 0; i < cues.length; i += 1) {
    const lower = String(cues[i].text ?? '').toLowerCase();
    starts[i] = offset;
    parts.push(lower);
    offset += lower.length + 1; // +1 for the joining space
  }
  const hay = parts.join(' ');

  const hits = [];
  let cueIdx = 0;   // monotonic pointer — offset→cue mapping stays O(n) overall
  let lastEnd = -1;
  let from = 0;

  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) break;
    from = at + needle.length;
    while (cueIdx + 1 < cues.length && starts[cueIdx + 1] <= at) cueIdx += 1;
    if (cueIdx <= lastEnd) continue; // already inside the previous excerpt

    const start = Math.max(0, cueIdx - ctx);
    const end = Math.min(cues.length - 1, cueIdx + ctx);
    lastEnd = end;
    // `ms`/`timestamp`/`url` MUST stamp the cue the phrase is actually in, not
    // the first cue of the surrounding context. Stamping cues[start] put the
    // deep link `ctx` cues early — 20s early at the default context:2, and up to
    // a minute at the permitted context:10. That is the whole threat model of
    // this tool: an agent reads "he says X at 1:23:45", writes it into a repo
    // rule, and the citation points somewhere he wasn't talking about it.
    // excerptStart is kept separately for callers that want the window's head.
    const match = cues[cueIdx];
    hits.push({
      ms: match.ms,
      timestamp: fmtTimestamp(match.ms),
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(match.ms / 1000)}s` : undefined,
      excerptStartMs: cues[start].ms,
      excerpt: cues.slice(start, end + 1).map((c) => c.text).join(' '),
    });
    if (hits.length >= cap) break;
  }
  return hits;
}

/** Rough token estimate. 4 chars/token is the usual English approximation. */
export const estimateTokens = (text) => Math.round(String(text || '').length / 4);

// ─────────────────────────────────────────────────────────────────────────────
// Cache — re-exported from yt-scout-cache.mjs.
//
// The implementations moved when the packet-8 fixes pushed this file past the
// Rule 4 300-line cap. They are re-exported here, rather than leaving callers to
// chase a new path, so this module stays the single import surface for
// "transcript things" and the split is an internal detail.
// ─────────────────────────────────────────────────────────────────────────────

export {
  CACHE_DIRNAME, CACHE_TTL_DAYS, cacheDir, cachePath, langCachePaths, textToken,
  pruneCache, effectivePruneDays, fetchTranscript,
} from './yt-scout-cache.mjs';
