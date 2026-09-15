#!/usr/bin/env node
/**
 * yt-scout-cache.mjs — the on-disk transcript cache: paths, generation tokens,
 * fetch-or-reuse, and pruning.
 * ============================================================================
 * Split out of yt-scout-transcript.mjs when the Kimi packet-8 fixes pushed that
 * file past the Rule 4 300-line cap. The seam is the same one the file already
 * documented in prose: yt-scout-transcript owns "turn a transcript into
 * something an agent can afford to read" (parse, format, search); this module
 * owns "keep it on disk without ever serving the wrong bytes".
 *
 * Dependencies run one way: cache → transcript → lib. No cycle.
 *
 * The invariant this module exists to protect: a cache must either return the
 * transcript it claims to return, or miss. It must never return a DIFFERENT
 * language, a PREVIOUS generation, or a malformed cue array, because every one
 * of those is served to an agent as fact and acted on. Each guard below is a
 * reproduced failure, not a precaution.
 *
 * @module yt-scout-cache
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { YtScoutError, clampOpt, isVideoId, videoIdFrom, runYtDlp } from './yt-scout-lib.mjs';
import { parseJson3, estimateTokens } from './yt-scout-transcript.mjs';

export const CACHE_DIRNAME = join('.ai-workflow', 'scout-cache');
/** Transcripts older than this are pruned by `pruneCache` (bytes are cheap, staleness is not). */
export const CACHE_TTL_DAYS = 30;
/** Subtitle language tags we will accept — keeps caller input out of an argv slot unchecked. */
const LANG = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{1,8})?$/;

export function cacheDir(root) {
  const dir = join(root || process.cwd(), CACHE_DIRNAME);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function cachePath(root, videoId, ext = 'txt') {
  if (!isVideoId(videoId)) throw new YtScoutError(`refusing to build a cache path for invalid id '${videoId}'`);
  return join(cacheDir(root), `${videoId}.${ext}`);
}

/**
 * Cache paths are keyed by id AND language. Keying on the id alone meant a later
 * fetch of the same video in a different language hit the cache and returned the
 * FIRST language's text, with a receipt that never named a language — an agent
 * asking for French got English presented as fact. `lang` is already validated
 * against LANG before it reaches here, so it cannot introduce a path segment.
 */
export function langCachePaths(root, id, lang) {
  const dir = cacheDir(root);
  return { dir, txtPath: join(dir, `${id}.${lang}.txt`), cuesPath: join(dir, `${id}.${lang}.cues.json`) };
}

/** FNV-1a over the transcript text — a generation token, not a security hash. */
export function textToken(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16)}-${s.length}`;
}

/**
 * Files this module is allowed to delete: only the ones it creates. `<id>.txt`,
 * `<id>.cues.json`, and the `_raw_<id>.*.json3` intermediates. Anything else in
 * the directory belongs to someone else and is not ours to reap — an unfiltered
 * `readdirSync` + `unlink` loop is a delete primitive pointed at whatever happens
 * to share the folder, and `SWAN_SCOUT_ROOT` can repoint that folder.
 */
const OURS = /^(?:[A-Za-z0-9_-]{11}\.(?:[A-Za-z0-9-]{1,12}\.)?(?:txt|cues\.json)(?:\.tmp)?|_raw_[A-Za-z0-9_-]{11}\..*\.json3)$/;

/** Delete cached transcripts older than `days`. Returns the count removed. */
export function pruneCache(root, { days = CACHE_TTL_DAYS, all = false } = {}) {
  const dir = cacheDir(root);
  // `all: true` is the ONLY way to reap regardless of age — an explicit request,
  // not a number that happened to come out as zero.
  const cutoff = all === true ? Infinity : Date.now() - effectivePruneDays(days) * 86_400_000;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    if (!OURS.test(name)) continue; // not ours — leave it alone
    const p = join(dir, name);
    try {
      if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed += 1; }
    } catch { /* a file vanishing under us is not an error worth failing on */ }
  }
  return removed;
}

/**
 * The single source of truth for how `days` is interpreted, exported so a caller
 * can report the value it will actually get instead of re-deriving it. Callers
 * MUST NOT pre-convert with `Number(x)`: `Number(null) === 0` is finite, so a
 * client sending `days: null` would mean "cutoff = now" and reap the whole cache.
 * Verified 2026-08-12 — that is exactly what happened before this existed.
 */
export function effectivePruneDays(days) {
  // Floor is 1, not 0. A 0 sets the cutoff to "now" and reaps the ENTIRE cache,
  // and negatives clamped up to 0 did the same. Closing the `null` hole left that
  // door open to any caller that COMPUTES the value — an agent reasoning "prune
  // anything older than the last run", where the last run was today, passes 0 and
  // wipes everything under a green "Pruned N file(s)" receipt. A full reap is a
  // legitimate thing to want, but it must be asked for explicitly (`all: true`),
  // never arrived at by arithmetic.
  return clampOpt(days, CACHE_TTL_DAYS, 1, 3650);
}

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

  const { dir, txtPath, cuesPath } = langCachePaths(root, id, lang);

  if (!refresh && existsSync(txtPath) && existsSync(cuesPath)) {
    // The two cache files are written sequentially, so a crash or a kill between
    // them can leave a truncated cues.json. Reading it with a bare JSON.parse
    // threw a raw SyntaxError that surfaced as an opaque "tool error" and made
    // the video permanently unreadable until someone guessed `refresh: true`.
    // A corrupt cache is a cache miss, not a dead end — fall through and refetch.
    try {
      const text = readFileSync(txtPath, 'utf-8');
      const doc = JSON.parse(readFileSync(cuesPath, 'utf-8'));
      // The generation token is what makes a killed REFRESH detectable. The two
      // files are written separately, so an interrupted refresh could leave a NEW
      // txt beside the PREVIOUS cues — and those old cues are valid JSON, an
      // array, correctly shaped, so no structural check can catch them. The tool
      // would then serve excerpts and timestamps from the previous generation of
      // the transcript while the receipt reported the new size. Captions do get
      // edited after upload, so the two generations genuinely differ. Binding the
      // cues to a token derived from the text turns that into a plain cache miss.
      const cues = Array.isArray(doc) ? doc : doc?.cues;
      if (!Array.isArray(cues)) throw new Error('cues cache is not an array');
      if (doc?.token && doc.token !== textToken(text)) throw new Error('cues are from a different generation of this transcript');
      if (!doc?.token) throw new Error('cues cache predates generation tokens');
      return {
        videoId: id, lang, cached: true, path: txtPath,
        cues, chars: text.length, tokens: estimateTokens(text),
      };
    } catch {
      try { unlinkSync(cuesPath); } catch { /* best effort */ }
    }
  }

  // Clear any `_raw_` leftovers BEFORE fetching. Cleanup below only runs on
  // success, so a timeout kill or a parse throw leaves intermediates behind — and
  // the glob that picks a track sorts only by `-orig`, never by language, so a
  // stale file from a previous language could be parsed and cached as this one.
  for (const f of readdirSync(dir)) {
    if (f.startsWith(`_raw_${id}.`) && f.endsWith('.json3')) {
      try { unlinkSync(join(dir, f)); } catch { /* best effort */ }
    }
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

  // Write to temporaries and rename. Rename within a directory is atomic on every
  // filesystem this runs on, so a kill can leave a stray `.tmp` but never a
  // half-written cache file. The cues carry the text's generation token, so even
  // the interleaving that survives a rename pair (new txt, old cues) is detected
  // on read rather than served as truth.
  writeFileSync(`${txtPath}.tmp`, text, 'utf-8');
  writeFileSync(`${cuesPath}.tmp`, JSON.stringify({ token: textToken(text), lang, cues }), 'utf-8');
  renameSync(`${txtPath}.tmp`, txtPath);
  renameSync(`${cuesPath}.tmp`, cuesPath);
  for (const f of produced) { try { unlinkSync(join(dir, f)); } catch { /* best effort */ } }

  return { videoId: id, lang, cached: false, path: txtPath, cues, chars: text.length, tokens: estimateTokens(text) };
}
