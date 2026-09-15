#!/usr/bin/env node
/**
 * yt-scout-lib.mjs — YouTube creator intel with NO API key: validation, yt-dlp
 * invocation, search and channel listings.
 * ============================================================================
 * Sean's highest-value manual workflow is: watch a YouTube talk → harvest the
 * doctrine → codify it as a CLAUDE.md rule. Rules 63, 64, 65 and the rule-40
 * taste-ceiling doctrine were ALL born that way, by hand. This library is the
 * machine version of that loop. Transcript parsing/caching lives in the sibling
 * yt-scout-transcript.mjs (split to hold both under the Rule 4 300-line cap).
 *
 * WHY yt-dlp and not a hosted MCP/API service (verified 2026-08-11, this machine):
 *   - zero API key, zero monthly fee, zero third-party seeing Sean's queries
 *   - `ytsearch<N>:` resolves keyword AND creator searches
 *   - `@handle/videos` enumerates a creator's uploads
 *   - `--skip-download --write-auto-subs` pulls transcripts without the video
 *   - runs from Sean's residential IP, which YouTube treats as a normal viewer.
 *     Hosted transcript APIs exist precisely because DATACENTER IPs are blocked;
 *     that constraint does not apply to a local run, so paying for one would buy
 *     nothing here.
 *
 * Dependencies: Node built-ins ONLY (matches scripts/mcp/swan-council-lib.mjs).
 * yt-dlp is invoked as an external binary via execFileSync with an argv ARRAY —
 * NO shell — so caller input can never chain a second command.
 *
 * Privacy (Rule 8/44/59): reads PUBLIC YouTube data only. Never pass a client
 * name or PII in a query. No API key is loaded, so no key can leak.
 *
 * @module yt-scout-lib
 */

import { execFileSync } from 'node:child_process';

export class YtScoutError extends Error {}

/**
 * Clamp a numeric option. Written explicitly because `Number(x) || fallback`
 * silently rewrites a legitimate 0 into the fallback — which is exactly how
 * `context: 0` ("just the matching line") became `context: 2` in the first cut.
 */
export function clampOpt(value, fallback, min, max) {
  // null/undefined/'' mean "not supplied" and must reach the fallback. Checking
  // them explicitly matters because Number(null) === 0 and Number('') === 0 —
  // both finite — so a bare isFinite test would read an absent field as zero and
  // then clamp it to `min` (a client sending limit:null silently got 1 result).
  const supplied = value !== null && value !== undefined && value !== '';
  const n = supplied ? Number(value) : fallback;
  // Truncate: every consumer feeds this into an argv slot (`ytsearch7.5:`,
  // `--playlist-end 7.5`) or an array index, and a float there produces an opaque
  // yt-dlp failure rather than a clear error. Truncate toward zero AFTER clamping
  // so a fractional value inside the range cannot round out of it.
  return Math.trunc(Math.min(Math.max(Number.isFinite(n) ? n : fallback, min), max));
}

// ─────────────────────────────────────────────────────────────────────────────
// Input validation — every value below is about to become a subprocess argv
// entry. execFileSync (no shell) already blocks command chaining; these guards
// are the belt to that suspenders, and they turn typos into clear errors instead
// of confusing yt-dlp failures.
// ─────────────────────────────────────────────────────────────────────────────

/** YouTube video IDs are exactly 11 chars of [A-Za-z0-9_-]. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** Channel handles: @name, 1-30 chars. Bare UC… channel ids are also accepted. */
const HANDLE = /^@[A-Za-z0-9._-]{1,30}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export function isVideoId(s) {
  return typeof s === 'string' && VIDEO_ID.test(s);
}

/**
 * Accept a bare video ID, a watch URL, a youtu.be link, or a /shorts/ link and
 * return the 11-char ID. Returns null when nothing valid is found — callers MUST
 * treat null as "reject", never as "pass it through anyway".
 */
export function videoIdFrom(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (isVideoId(s)) return s;
  // Anchor the host. Without it, ANY string carrying `?v=<11 safe chars>` yielded
  // an id — including a non-YouTube URL — so a mistaken paste was accepted and
  // then failed later as a confusing yt-dlp error instead of a clear rejection.
  // There is no injection either way (the capture is charset-safe and we rebuild
  // the URL rather than passing input through); this is about not accepting input
  // we have no business accepting. A bare 11-char id is still fine, above.
  if (!/(?:^|\.)(?:youtube\.com|youtube-nocookie\.com|youtu\.be)(?::\d+)?(?:\/|$|\?)/i.test(
    s.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0] + '/',
  )) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/,
    /youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    /\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    /\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    /\/live\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Turn a creator reference (@handle, channel URL, or UC… id) into the canonical
 * uploads URL. Returns null when the input is not a recognizable creator ref — a
 * plain search phrase is NOT a creator ref and must go through searchYouTube.
 */
export function channelUrlFrom(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (HANDLE.test(s)) return `https://www.youtube.com/${s}/videos`;
  if (CHANNEL_ID.test(s)) return `https://www.youtube.com/channel/${s}/videos`;
  const handleInUrl = s.match(/youtube\.com\/(@[A-Za-z0-9._-]{1,30})/);
  if (handleInUrl) return `https://www.youtube.com/${handleInUrl[1]}/videos`;
  const idInUrl = s.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (idInUrl) return `https://www.youtube.com/channel/${idInUrl[1]}/videos`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// yt-dlp invocation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve how to invoke yt-dlp. Prefers a yt-dlp already on PATH (instant);
 * falls back to `uvx yt-dlp`. uv is present on this machine (0.11.25, verified
 * 2026-08-11). NOTE: the argv carries NO version pin — `uvx yt-dlp` resolves
 * whatever PyPI serves that day. An earlier version of this comment claimed it
 * fetched "a pinned copy", which was never true. Add `yt-dlp@<version>` here if
 * supply-chain drift ever matters.
 *
 * Cached per-process: the probe costs a subprocess spawn, and a server handling
 * many calls should pay it once.
 */
let _binCache;
export function resolveYtDlp({ force } = {}) {
  // Only a SUCCESSFUL probe is cached. Caching a null was a trap: the uvx probe
  // has a 20s timeout, so a cold uv cache on a slow network reports "missing" for
  // a yt-dlp that is merely slow to fetch — and that verdict then stuck for the
  // life of the process, failing every later call with "yt-dlp is not available"
  // even after the install finished. Re-probing costs one spawn per call, and
  // only in the state that is already broken.
  if (_binCache && !force) return _binCache;
  const probe = (file, args) => {
    try {
      execFileSync(file, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 20_000, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  };
  if (probe('yt-dlp', ['--version'])) _binCache = { file: 'yt-dlp', prefix: [] };
  else if (probe('uvx', ['yt-dlp', '--version'])) _binCache = { file: 'uvx', prefix: ['yt-dlp'] };
  else _binCache = null;
  return _binCache;
}

/**
 * Run yt-dlp with an argv ARRAY (never a shell string) and return stdout.
 * `maxBuffer` is generous because `--print` over a long channel can be large;
 * transcripts themselves are written to files, not piped.
 */
export function runYtDlp(args, { timeout = 120_000 } = {}) {
  const bin = resolveYtDlp();
  if (!bin) {
    throw new YtScoutError(
      'yt-dlp is not available. Install it with `uv tool install yt-dlp` (uv is present), ' +
      'or `pip install yt-dlp`, then retry.',
    );
  }
  try {
    return execFileSync(bin.file, [...bin.prefix, ...args], {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (e) {
    // yt-dlp writes the useful diagnosis to stderr; surface it, trimmed.
    const detail = (e.stderr || e.message || '').toString().trim().split('\n').slice(-3).join(' ');
    throw new YtScoutError(`yt-dlp failed: ${detail || 'unknown error'}`);
  }
}

/** Tab-separated `--print` rows → objects. Blank/partial rows are dropped. */
export function parsePrintRows(stdout, fields) {
  return String(stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      // A row must have EXACTLY the expected field count. Too few was always
      // dropped; too many used to be accepted and silently misaligned — a title
      // containing a literal TAB shifted `channel` and every later field one
      // right, so the channel rendered as the tail of the title and the agent
      // recorded a wrong attribution as fact. `id` is field 0 so it survives
      // either way, but a row we cannot align is not a row we can trust.
      if (parts.length !== fields.length) return null;
      // yt-dlp prints the literal string "NA" for fields a flat listing does not
      // populate (upload_date on search results, for one). Normalize to null so
      // formatters render "?" instead of a bogus-looking "NA".
      return Object.fromEntries(fields.map((f, i) => [f, parts[i] === 'NA' ? null : parts[i]]));
    })
    .filter(Boolean);
}

export const PRINT_FIELDS = ['id', 'title', 'channel', 'duration', 'upload_date', 'view_count'];
const PRINT_TEMPLATE = PRINT_FIELDS.map((f) => `%(${f})s`).join('\t');

/**
 * Keyword OR creator search. `ytsearchN:` is yt-dlp's own search endpoint — no
 * API key, no quota. Results are flat (metadata only, nothing downloaded).
 */
export function searchYouTube(query, { limit = 8 } = {}) {
  if (typeof query !== 'string' || !query.trim()) throw new YtScoutError('search query is required');
  const n = clampOpt(limit, 8, 1, 50);
  const out = runYtDlp([
    `ytsearch${n}:${query.trim()}`,
    '--flat-playlist',
    '--no-warnings',
    '--print', PRINT_TEMPLATE,
  ]);
  return parsePrintRows(out, PRINT_FIELDS);
}

/**
 * Enumerate a creator's uploads, newest first. `--playlist-end` bounds the walk
 * so a 2,000-video channel does not cost two minutes of wall clock.
 */
export function listChannelVideos(creator, { limit = 20 } = {}) {
  const url = channelUrlFrom(creator);
  if (!url) {
    throw new YtScoutError(
      `'${creator}' is not a channel handle or URL. Use @handle, a channel URL, or a UC… id — ` +
      'for a topic phrase use search instead.',
    );
  }
  const n = clampOpt(limit, 20, 1, 200);
  const out = runYtDlp([
    url,
    '--flat-playlist',
    '--no-warnings',
    '--playlist-end', String(n),
    '--print', PRINT_TEMPLATE,
  ], { timeout: 180_000 });
  return parsePrintRows(out, PRINT_FIELDS);
}