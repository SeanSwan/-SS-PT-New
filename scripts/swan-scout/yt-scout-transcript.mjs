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

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { YtScoutError, clampOpt, isVideoId, videoIdFrom, runYtDlp } from './yt-scout-lib.mjs';

export const CACHE_DIRNAME = join('.ai-workflow', 'scout-cache');
/** Transcripts older than this are pruned by `pruneCache` (bytes are cheap, staleness is not). */
export const CACHE_TTL_DAYS = 30;
/** Subtitle language tags we will accept — keeps caller input out of an argv slot unchecked. */
const LANG = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{1,8})?$/;

/**
 * json3 → { text, cues }. json3 is YouTube's timed-text format: events carry
 * `tStartMs` plus `segs[]` word chunks. We keep cue timings because timestamped
 * excerpts are what make `searchTranscript` worth ~91 tokens instead of ~54,000.
 *
 * Auto-generated tracks emit rolling duplicate lines (each cue repeats the
 * previous one plus a word); dropping a cue wholly contained in its predecessor
 * removes the dominant noise without touching real repetition in the speech.
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
export function searchTranscript(cues, query, { context = 2, limit = 8, videoId } = {}) {
  if (typeof query !== 'string' || !query.trim()) throw new YtScoutError('search query is required');
  const needle = query.trim().toLowerCase();
  const ctx = clampOpt(context, 2, 0, 10);
  const cap = clampOpt(limit, 8, 1, 40);

  // Build the joined haystack plus the char offset at which each cue begins.
  const starts = new Array(cues.length);
  const parts = [];
  let offset = 0;
  for (let i = 0; i < cues.length; i += 1) {
    starts[i] = offset;
    parts.push(cues[i].text);
    offset += cues[i].text.length + 1; // +1 for the joining space
  }
  const hay = parts.join(' ').toLowerCase();

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
    hits.push({
      ms: cues[start].ms,
      timestamp: fmtTimestamp(cues[start].ms),
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(cues[start].ms / 1000)}s` : undefined,
      excerpt: cues.slice(start, end + 1).map((c) => c.text).join(' '),
    });
    if (hits.length >= cap) break;
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache — full transcripts live on disk, never in a chat turn by default.
// .ai-workflow/* is gitignored (verified via `git check-ignore`), so nothing
// cached here can be committed by an `git add` sweep.
// ─────────────────────────────────────────────────────────────────────────────

export function cacheDir(root) {
  const dir = join(root || process.cwd(), CACHE_DIRNAME);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function cachePath(root, videoId, ext = 'txt') {
  if (!isVideoId(videoId)) throw new YtScoutError(`refusing to build a cache path for invalid id '${videoId}'`);
  return join(cacheDir(root), `${videoId}.${ext}`);
}

/** Delete cached transcripts older than `days`. Returns the count removed. */
export function pruneCache(root, { days = CACHE_TTL_DAYS } = {}) {
  const dir = cacheDir(root);
  const cutoff = Date.now() - clampOpt(days, CACHE_TTL_DAYS, 0, 3650) * 86_400_000;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed += 1; }
    } catch { /* a file vanishing under us is not an error worth failing on */ }
  }
  return removed;
}

/** Rough token estimate. 4 chars/token is the usual English approximation. */
export const estimateTokens = (text) => Math.round(String(text || '').length / 4);

/**
 * Fetch (or reuse) a transcript. Always writes the full text to the cache and
 * returns a COMPACT receipt — never the body — so a caller must consciously ask
 * for text via `searchTranscript` or by reading the file.
 *
 * Prefers a human-written track and falls back to the auto-generated one. The
 * exact suffix yt-dlp emits varies by track (`.en.json3`, `.en-orig.json3`), so
 * we glob the output directory rather than guessing.
 */
export function fetchTranscript(videoId, { root, refresh = false, lang = 'en' } = {}) {
  const id = videoIdFrom(videoId);
  if (!id) throw new YtScoutError(`'${videoId}' is not a YouTube video id or URL`);
  if (!LANG.test(lang)) throw new YtScoutError(`'${lang}' is not a valid language tag`);

  const dir = cacheDir(root);
  const txtPath = join(dir, `${id}.txt`);
  const cuesPath = join(dir, `${id}.cues.json`);

  if (!refresh && existsSync(txtPath) && existsSync(cuesPath)) {
    const text = readFileSync(txtPath, 'utf-8');
    return {
      videoId: id, cached: true, path: txtPath,
      cues: JSON.parse(readFileSync(cuesPath, 'utf-8')),
      chars: text.length, tokens: estimateTokens(text),
    };
  }

  const stem = join(dir, `_raw_${id}`);
  runYtDlp([
    `https://www.youtube.com/watch?v=${id}`,
    '--skip-download', '--write-subs', '--write-auto-subs',
    '--sub-langs', `${lang}.*`, '--sub-format', 'json3',
    '--no-warnings', '-o', `${stem}.%(ext)s`,
  ], { timeout: 180_000 });

  // Prefer the non-"orig" (human/edited) track when both landed.
  const produced = readdirSync(dir)
    .filter((f) => f.startsWith(`_raw_${id}.`) && f.endsWith('.json3'))
    .sort((a, b) => Number(a.includes('-orig')) - Number(b.includes('-orig')));
  if (!produced.length) {
    throw new YtScoutError(`no ${lang} transcript is published for ${id} (captions may be disabled)`);
  }

  const { text, cues } = parseJson3(readFileSync(join(dir, produced[0]), 'utf-8'));
  writeFileSync(txtPath, text, 'utf-8');
  writeFileSync(cuesPath, JSON.stringify(cues), 'utf-8');
  for (const f of produced) { try { unlinkSync(join(dir, f)); } catch { /* best effort */ } }

  return { videoId: id, cached: false, path: txtPath, cues, chars: text.length, tokens: estimateTokens(text) };
}