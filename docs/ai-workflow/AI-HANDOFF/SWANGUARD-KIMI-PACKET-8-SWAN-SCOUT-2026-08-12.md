# swan-scout — Kimi K3 hostile review, packet 8: the MCP server and transcript engine

New surface. Packets 6 and 7 covered **swan-collect** (core, adapters, registry, store, runner);
you found 2 HIGH / 3 MEDIUM / 5 LOW then 1 HIGH / 4 MEDIUM / 7 LOW, all verified and fixed.
**Do not re-review swan-collect** — it is settled and out of scope here.

This packet is `swan-scout`: a **local MCP server that runs inside Sean's own Claude Code
session**. That is the reason it deserves your attention. Its output goes straight into an
agent's context and is acted on as fact. A wrong timestamp here does not throw — it silently
misattributes what a person said, and the agent then codifies that into a repo rule. The
failure mode is *confident wrongness*, not a crash.

No API key is involved anywhere (yt-dlp against a residential IP), so key leakage is not the
threat. The threats I care about are: **wrong-but-plausible output**, **unbounded resource
use**, **caller input reaching a subprocess argv**, and **file deletion**.

## Ground rules (unchanged from packets 6/7)

1. Every finding is a HYPOTHESIS. Give the exact attack or input, the precondition, `file:line`,
   and **what evidence would confirm or kill it**. Rate confidence. I verify all of them
   empirically before fixing. **Calibration beats volume** — a wrong HIGH costs me more than a
   missed LOW.
2. Escalate scrutiny WITH severity.
3. "This is correct, and here is why" is valuable. An empty CRITICAL list is an acceptable answer.
4. If a comment in the code asserts something is safe, **treat that comment as the primary
   suspect.** You are 2-for-2 across packets 6 and 7: both times your top finding sat directly
   under a comment claiming the code was safe. That pattern is why this packet exists.

## Found by MY OWN hostile review, already fixed — do NOT re-report, but tell me if a fix is wrong

Each was reproduced against the previous revision before fixing, and each has a regression test
that fails on that revision.

- **HIGH — `searchTranscript` returned wrong excerpts, timestamps and jump-to URLs.** Cue
  offsets were measured on original-case text while the haystack was lowercased. `'İ'` (U+0130)
  lowercases to **two** code units, so after any such char every offset drifted and the
  offset→cue walk landed on the wrong cue. Proven: 40 of them in cue 0 made a phrase in cue 3
  report as cue 6 — `"epsilon"` at `1:00` instead of `"SIGNAL"` at `0:30`. Fixed by lowercasing
  each cue **before** measuring it. **Question for you: are there other length-changing
  normalizations on this path I have missed** (Unicode normalization forms, `\s+` collapsing in
  `parseJson3`, surrogate pairs vs `String.length`, or a needle whose lowercase length differs
  from the query the user typed)?
- **MEDIUM — `yt_cache_prune {days: null}` deleted the entire cache.** `clampOpt` exists
  precisely to stop `Number(null) === 0` being read as a supplied zero, and says so in a comment.
  The server bypassed it with its own `Number.isFinite(Number(a.days))` and reinstated the exact
  bug: cutoff became "now". Proven: 5 files in, cache empty out. Interpretation now lives in one
  exported function (`effectivePruneDays`) that both sides call.
- **MEDIUM — prune deleted files it did not create.** An unfiltered `readdirSync` + `unlinkSync`
  loop, in a directory `SWAN_SCOUT_ROOT` can repoint. Proven: it removed a foreign
  `IMPORTANT-not-a-transcript.md`. Now restricted by the `OURS` regex to names it writes.
  **Question: is that regex tight enough, and is the `SWAN_SCOUT_ROOT` escape hatch itself the
  real bug?** It is an env var that redirects both writes and deletes.
- **MEDIUM — a corrupt cues cache was a permanent dead end.** The two cache files are written
  sequentially, so an interrupted write leaves truncated JSON; a bare `JSON.parse` threw a raw
  `SyntaxError` that surfaced as an opaque "tool error", and nothing cleared it. Proven against
  the old code. A corrupt cache is now a miss. **The write is still non-atomic** — I did not fix
  that; tell me if you think it needs a temp-file-plus-rename.
- **Hardening, not a proven defect:** the stdio read loop had no frame ceiling, so a peer that
  never sent a newline grew the buffer unboundedly. Capped at 4 MB with a resync.

## What I believe is correct — attack these specifically

- **argv injection is impossible.** `execFileSync` with an array, never a shell. The search term
  is interpolated into `ytsearch${n}:${query}` as ONE argv entry, and the `ytsearch` prefix means
  a query starting with `--` cannot become a flag. Video ids and channel refs are regex-validated
  before use. **I want you to try to break this anyway** — particularly the `--sub-langs` slot,
  `-o` output template (`%(ext)s` — can a crafted id or lang reach a format specifier?), and
  whether any yt-dlp argument can be influenced to write outside the cache dir.
- **`cachePath` refuses any non-11-char id**, so a traversal like `../../etc/passwd` cannot
  become a write path. Attack the `_raw_` glob in `fetchTranscript` too.
- **`capText` (40k) and the `HARD_TEXT_CAP`** bound what one tool call can return.
- The `receipt` default on `yt_transcript` is what stops a 54k-token dump. Is there any path that
  returns the full body without the caller asking for `mode:"full"`?

## Specific questions

1. `parsePrintRows` drops rows with **fewer** fields than expected but does not handle **more**.
   A video title containing a literal TAB would shift every later field. Real, or unreachable
   because yt-dlp escapes it?
2. `resolveYtDlp` caches a `null` result for the process lifetime, so installing yt-dlp after the
   server starts leaves every call failing until restart. Worth fixing, or acceptable?
3. `parseJson3` drops a cue when `prev.includes(text)`. Can that discard *legitimate* repeated
   speech, and does it matter for search fidelity?
4. Every tool `run()` is synchronous (`execFileSync`), so one slow fetch blocks the whole stdio
   loop and every queued request. Is that a real availability problem for a single-user local
   server, or over-engineering to fix?
5. `searchTranscript`'s `lastEnd` de-overlap logic: can it skip a legitimate second occurrence
   that falls inside a previous excerpt's context window, and is that the right tradeoff?
6. Anything in the MCP protocol handling that a non-conforming client could exploit — `id`
   handling, notification vs request, unknown methods, or a `tools/call` with a hostile
   `arguments` object.

---

## Source under review

Four files. Line numbers are as committed.

### `scripts/swan-scout/yt-scout-lib.mjs` (221 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * yt-scout-lib.mjs — YouTube creator intel with NO API key: validation, yt-dlp
     4	 * invocation, search and channel listings.
     5	 * ============================================================================
     6	 * Sean's highest-value manual workflow is: watch a YouTube talk → harvest the
     7	 * doctrine → codify it as a CLAUDE.md rule. Rules 63, 64, 65 and the rule-40
     8	 * taste-ceiling doctrine were ALL born that way, by hand. This library is the
     9	 * machine version of that loop. Transcript parsing/caching lives in the sibling
    10	 * yt-scout-transcript.mjs (split to hold both under the Rule 4 300-line cap).
    11	 *
    12	 * WHY yt-dlp and not a hosted MCP/API service (verified 2026-08-11, this machine):
    13	 *   - zero API key, zero monthly fee, zero third-party seeing Sean's queries
    14	 *   - `ytsearch<N>:` resolves keyword AND creator searches
    15	 *   - `@handle/videos` enumerates a creator's uploads
    16	 *   - `--skip-download --write-auto-subs` pulls transcripts without the video
    17	 *   - runs from Sean's residential IP, which YouTube treats as a normal viewer.
    18	 *     Hosted transcript APIs exist precisely because DATACENTER IPs are blocked;
    19	 *     that constraint does not apply to a local run, so paying for one would buy
    20	 *     nothing here.
    21	 *
    22	 * Dependencies: Node built-ins ONLY (matches scripts/mcp/swan-council-lib.mjs).
    23	 * yt-dlp is invoked as an external binary via execFileSync with an argv ARRAY —
    24	 * NO shell — so caller input can never chain a second command.
    25	 *
    26	 * Privacy (Rule 8/44/59): reads PUBLIC YouTube data only. Never pass a client
    27	 * name or PII in a query. No API key is loaded, so no key can leak.
    28	 *
    29	 * @module yt-scout-lib
    30	 */
    31	
    32	import { execFileSync } from 'node:child_process';
    33	
    34	export class YtScoutError extends Error {}
    35	
    36	/**
    37	 * Clamp a numeric option. Written explicitly because `Number(x) || fallback`
    38	 * silently rewrites a legitimate 0 into the fallback — which is exactly how
    39	 * `context: 0` ("just the matching line") became `context: 2` in the first cut.
    40	 */
    41	export function clampOpt(value, fallback, min, max) {
    42	  // null/undefined/'' mean "not supplied" and must reach the fallback. Checking
    43	  // them explicitly matters because Number(null) === 0 and Number('') === 0 —
    44	  // both finite — so a bare isFinite test would read an absent field as zero and
    45	  // then clamp it to `min` (a client sending limit:null silently got 1 result).
    46	  const supplied = value !== null && value !== undefined && value !== '';
    47	  const n = supplied ? Number(value) : fallback;
    48	  return Math.min(Math.max(Number.isFinite(n) ? n : fallback, min), max);
    49	}
    50	
    51	// ─────────────────────────────────────────────────────────────────────────────
    52	// Input validation — every value below is about to become a subprocess argv
    53	// entry. execFileSync (no shell) already blocks command chaining; these guards
    54	// are the belt to that suspenders, and they turn typos into clear errors instead
    55	// of confusing yt-dlp failures.
    56	// ─────────────────────────────────────────────────────────────────────────────
    57	
    58	/** YouTube video IDs are exactly 11 chars of [A-Za-z0-9_-]. */
    59	const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
    60	/** Channel handles: @name, 1-30 chars. Bare UC… channel ids are also accepted. */
    61	const HANDLE = /^@[A-Za-z0-9._-]{1,30}$/;
    62	const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
    63	
    64	export function isVideoId(s) {
    65	  return typeof s === 'string' && VIDEO_ID.test(s);
    66	}
    67	
    68	/**
    69	 * Accept a bare video ID, a watch URL, a youtu.be link, or a /shorts/ link and
    70	 * return the 11-char ID. Returns null when nothing valid is found — callers MUST
    71	 * treat null as "reject", never as "pass it through anyway".
    72	 */
    73	export function videoIdFrom(input) {
    74	  if (typeof input !== 'string') return null;
    75	  const s = input.trim();
    76	  if (isVideoId(s)) return s;
    77	  const patterns = [
    78	    /[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/,
    79	    /youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    80	    /\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    81	    /\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    82	    /\/live\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    83	  ];
    84	  for (const p of patterns) {
    85	    const m = s.match(p);
    86	    if (m) return m[1];
    87	  }
    88	  return null;
    89	}
    90	
    91	/**
    92	 * Turn a creator reference (@handle, channel URL, or UC… id) into the canonical
    93	 * uploads URL. Returns null when the input is not a recognizable creator ref — a
    94	 * plain search phrase is NOT a creator ref and must go through searchYouTube.
    95	 */
    96	export function channelUrlFrom(input) {
    97	  if (typeof input !== 'string') return null;
    98	  const s = input.trim();
    99	  if (HANDLE.test(s)) return `https://www.youtube.com/${s}/videos`;
   100	  if (CHANNEL_ID.test(s)) return `https://www.youtube.com/channel/${s}/videos`;
   101	  const handleInUrl = s.match(/youtube\.com\/(@[A-Za-z0-9._-]{1,30})/);
   102	  if (handleInUrl) return `https://www.youtube.com/${handleInUrl[1]}/videos`;
   103	  const idInUrl = s.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/);
   104	  if (idInUrl) return `https://www.youtube.com/channel/${idInUrl[1]}/videos`;
   105	  return null;
   106	}
   107	
   108	// ─────────────────────────────────────────────────────────────────────────────
   109	// yt-dlp invocation
   110	// ─────────────────────────────────────────────────────────────────────────────
   111	
   112	/**
   113	 * Resolve how to invoke yt-dlp. Prefers a yt-dlp already on PATH (instant);
   114	 * falls back to `uvx yt-dlp`, which fetches a pinned copy on first use. uv is
   115	 * present on this machine (0.11.25, verified 2026-08-11).
   116	 *
   117	 * Cached per-process: the probe costs a subprocess spawn, and a server handling
   118	 * many calls should pay it once.
   119	 */
   120	let _binCache;
   121	export function resolveYtDlp({ force } = {}) {
   122	  if (_binCache !== undefined && !force) return _binCache;
   123	  const probe = (file, args) => {
   124	    try {
   125	      execFileSync(file, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 20_000, windowsHide: true });
   126	      return true;
   127	    } catch {
   128	      return false;
   129	    }
   130	  };
   131	  if (probe('yt-dlp', ['--version'])) _binCache = { file: 'yt-dlp', prefix: [] };
   132	  else if (probe('uvx', ['yt-dlp', '--version'])) _binCache = { file: 'uvx', prefix: ['yt-dlp'] };
   133	  else _binCache = null;
   134	  return _binCache;
   135	}
   136	
   137	/**
   138	 * Run yt-dlp with an argv ARRAY (never a shell string) and return stdout.
   139	 * `maxBuffer` is generous because `--print` over a long channel can be large;
   140	 * transcripts themselves are written to files, not piped.
   141	 */
   142	export function runYtDlp(args, { timeout = 120_000 } = {}) {
   143	  const bin = resolveYtDlp();
   144	  if (!bin) {
   145	    throw new YtScoutError(
   146	      'yt-dlp is not available. Install it with `uv tool install yt-dlp` (uv is present), ' +
   147	      'or `pip install yt-dlp`, then retry.',
   148	    );
   149	  }
   150	  try {
   151	    return execFileSync(bin.file, [...bin.prefix, ...args], {
   152	      encoding: 'utf-8',
   153	      timeout,
   154	      maxBuffer: 32 * 1024 * 1024,
   155	      stdio: ['ignore', 'pipe', 'pipe'],
   156	      windowsHide: true,
   157	    });
   158	  } catch (e) {
   159	    // yt-dlp writes the useful diagnosis to stderr; surface it, trimmed.
   160	    const detail = (e.stderr || e.message || '').toString().trim().split('\n').slice(-3).join(' ');
   161	    throw new YtScoutError(`yt-dlp failed: ${detail || 'unknown error'}`);
   162	  }
   163	}
   164	
   165	/** Tab-separated `--print` rows → objects. Blank/partial rows are dropped. */
   166	export function parsePrintRows(stdout, fields) {
   167	  return String(stdout || '')
   168	    .split('\n')
   169	    .map((l) => l.trim())
   170	    .filter(Boolean)
   171	    .map((line) => {
   172	      const parts = line.split('\t');
   173	      if (parts.length < fields.length) return null;
   174	      // yt-dlp prints the literal string "NA" for fields a flat listing does not
   175	      // populate (upload_date on search results, for one). Normalize to null so
   176	      // formatters render "?" instead of a bogus-looking "NA".
   177	      return Object.fromEntries(fields.map((f, i) => [f, parts[i] === 'NA' ? null : parts[i]]));
   178	    })
   179	    .filter(Boolean);
   180	}
   181	
   182	export const PRINT_FIELDS = ['id', 'title', 'channel', 'duration', 'upload_date', 'view_count'];
   183	const PRINT_TEMPLATE = PRINT_FIELDS.map((f) => `%(${f})s`).join('\t');
   184	
   185	/**
   186	 * Keyword OR creator search. `ytsearchN:` is yt-dlp's own search endpoint — no
   187	 * API key, no quota. Results are flat (metadata only, nothing downloaded).
   188	 */
   189	export function searchYouTube(query, { limit = 8 } = {}) {
   190	  if (typeof query !== 'string' || !query.trim()) throw new YtScoutError('search query is required');
   191	  const n = clampOpt(limit, 8, 1, 50);
   192	  const out = runYtDlp([
   193	    `ytsearch${n}:${query.trim()}`,
   194	    '--flat-playlist',
   195	    '--no-warnings',
   196	    '--print', PRINT_TEMPLATE,
   197	  ]);
   198	  return parsePrintRows(out, PRINT_FIELDS);
   199	}
   200	
   201	/**
   202	 * Enumerate a creator's uploads, newest first. `--playlist-end` bounds the walk
   203	 * so a 2,000-video channel does not cost two minutes of wall clock.
   204	 */
   205	export function listChannelVideos(creator, { limit = 20 } = {}) {
   206	  const url = channelUrlFrom(creator);
   207	  if (!url) {
   208	    throw new YtScoutError(
   209	      `'${creator}' is not a channel handle or URL. Use @handle, a channel URL, or a UC… id — ` +
   210	      'for a topic phrase use search instead.',
   211	    );
   212	  }
   213	  const n = clampOpt(limit, 20, 1, 200);
   214	  const out = runYtDlp([
   215	    url,
   216	    '--flat-playlist',
   217	    '--no-warnings',
   218	    '--playlist-end', String(n),
   219	    '--print', PRINT_TEMPLATE,
   220	  ], { timeout: 180_000 });
   221	  return parsePrintRows(out, PRINT_FIELDS);
   222	}```

### `scripts/swan-scout/yt-scout-transcript.mjs` (245 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * yt-scout-transcript.mjs — transcript parsing, targeted search, and disk cache.
     4	 * ============================================================================
     5	 * Split out of yt-scout-lib.mjs to hold that file under the Rule 4 300-line cap.
     6	 * The seam is deliberate: yt-scout-lib owns "talk to YouTube" (validation +
     7	 * yt-dlp invocation + listings); this module owns "turn a transcript into
     8	 * something an agent can afford to read". Dependency runs one way only —
     9	 * transcript → lib — so there is no import cycle.
    10	 *
    11	 * THE PROBLEM THIS SOLVES (measured 2026-08-11, Karpathy "Deep Dive into LLMs"):
    12	 *   json3 4.3 MB → 215,347 chars → ~53,837 tokens for ONE 3.5-hour video.
    13	 *   A live run of searchTranscript for "context window" returned ~91 tokens —
    14	 *   the same answer for ~1/590th of the context. That ratio is the whole point
    15	 *   of this module: full text goes to a FILE, questions get answered from cues.
    16	 *
    17	 * @module yt-scout-transcript
    18	 */
    19	
    20	import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
    21	import { join } from 'node:path';
    22	import { YtScoutError, clampOpt, isVideoId, videoIdFrom, runYtDlp } from './yt-scout-lib.mjs';
    23	
    24	export const CACHE_DIRNAME = join('.ai-workflow', 'scout-cache');
    25	/** Transcripts older than this are pruned by `pruneCache` (bytes are cheap, staleness is not). */
    26	export const CACHE_TTL_DAYS = 30;
    27	/** Subtitle language tags we will accept — keeps caller input out of an argv slot unchecked. */
    28	const LANG = /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{1,8})?$/;
    29	
    30	/**
    31	 * json3 → { text, cues }. json3 is YouTube's timed-text format: events carry
    32	 * `tStartMs` plus `segs[]` word chunks. We keep cue timings because timestamped
    33	 * excerpts are what make `searchTranscript` worth ~91 tokens instead of ~54,000.
    34	 *
    35	 * Auto-generated tracks emit rolling duplicate lines (each cue repeats the
    36	 * previous one plus a word); dropping a cue wholly contained in its predecessor
    37	 * removes the dominant noise without touching real repetition in the speech.
    38	 */
    39	export function parseJson3(raw) {
    40	  let doc;
    41	  try {
    42	    doc = typeof raw === 'string' ? JSON.parse(raw) : raw;
    43	  } catch {
    44	    throw new YtScoutError('transcript file was not valid json3');
    45	  }
    46	  const cues = [];
    47	  let prev = '';
    48	  for (const ev of doc?.events || []) {
    49	    if (!ev.segs) continue;
    50	    const text = ev.segs.map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
    51	    if (!text) continue;
    52	    if (prev && prev.includes(text)) continue;
    53	    cues.push({ ms: Number(ev.tStartMs) || 0, text });
    54	    prev = text;
    55	  }
    56	  return { text: cues.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim(), cues };
    57	}
    58	
    59	/** ms → `H:MM:SS` (or `M:SS` under an hour) — the form you paste after `&t=`. */
    60	export function fmtTimestamp(ms) {
    61	  const total = Math.max(0, Math.floor(Number(ms) || 0) / 1000);
    62	  const h = Math.floor(total / 3600);
    63	  const m = Math.floor((total % 3600) / 60);
    64	  const s = Math.floor(total % 60);
    65	  return h > 0
    66	    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    67	    : `${m}:${String(s).padStart(2, '0')}`;
    68	}
    69	
    70	/**
    71	 * THE context-saving path. Find `query` inside a transcript and return only the
    72	 * matching neighbourhoods, each stamped with a jump-to timestamp and deep link.
    73	 *
    74	 * Implementation: search the FULL joined text (case-insensitive substring) and
    75	 * map each match offset back to its cue via a char-offset index. Searching the
    76	 * joined text is what lets a phrase straddle a cue boundary; mapping back is
    77	 * what keeps the timestamp pointing at the cue the phrase actually starts in
    78	 * rather than a couple of cues early.
    79	 */
    80	export function searchTranscript(cues, query, { context = 2, limit = 8, videoId } = {}) {
    81	  if (typeof query !== 'string' || !query.trim()) throw new YtScoutError('search query is required');
    82	  const needle = query.trim().toLowerCase();
    83	  const ctx = clampOpt(context, 2, 0, 10);
    84	  const cap = clampOpt(limit, 8, 1, 40);
    85	
    86	  // Build the joined haystack plus the char offset at which each cue begins.
    87	  //
    88	  // Lowercase EACH CUE BEFORE measuring it. Lowercasing the joined string instead
    89	  // desynchronizes every offset after the first character whose lowercase form is
    90	  // longer than the original — 'İ' (U+0130) lowercases to two code units — and
    91	  // once `starts[]` disagrees with `hay`, the offset→cue mapping walks to the
    92	  // wrong cue and the excerpt, timestamp and jump-to URL are all confidently
    93	  // wrong. Verified 2026-08-12: 40 such chars in cue 0 made a phrase in cue 3
    94	  // report as cue 6 ("epsilon" @ 1:00 instead of "SIGNAL" @ 0:30).
    95	  const starts = new Array(cues.length);
    96	  const parts = [];
    97	  let offset = 0;
    98	  for (let i = 0; i < cues.length; i += 1) {
    99	    const lower = String(cues[i].text ?? '').toLowerCase();
   100	    starts[i] = offset;
   101	    parts.push(lower);
   102	    offset += lower.length + 1; // +1 for the joining space
   103	  }
   104	  const hay = parts.join(' ');
   105	
   106	  const hits = [];
   107	  let cueIdx = 0;   // monotonic pointer — offset→cue mapping stays O(n) overall
   108	  let lastEnd = -1;
   109	  let from = 0;
   110	
   111	  for (;;) {
   112	    const at = hay.indexOf(needle, from);
   113	    if (at === -1) break;
   114	    from = at + needle.length;
   115	    while (cueIdx + 1 < cues.length && starts[cueIdx + 1] <= at) cueIdx += 1;
   116	    if (cueIdx <= lastEnd) continue; // already inside the previous excerpt
   117	
   118	    const start = Math.max(0, cueIdx - ctx);
   119	    const end = Math.min(cues.length - 1, cueIdx + ctx);
   120	    lastEnd = end;
   121	    hits.push({
   122	      ms: cues[start].ms,
   123	      timestamp: fmtTimestamp(cues[start].ms),
   124	      url: videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(cues[start].ms / 1000)}s` : undefined,
   125	      excerpt: cues.slice(start, end + 1).map((c) => c.text).join(' '),
   126	    });
   127	    if (hits.length >= cap) break;
   128	  }
   129	  return hits;
   130	}
   131	
   132	// ─────────────────────────────────────────────────────────────────────────────
   133	// Cache — full transcripts live on disk, never in a chat turn by default.
   134	// .ai-workflow/* is gitignored (verified via `git check-ignore`), so nothing
   135	// cached here can be committed by an `git add` sweep.
   136	// ─────────────────────────────────────────────────────────────────────────────
   137	
   138	export function cacheDir(root) {
   139	  const dir = join(root || process.cwd(), CACHE_DIRNAME);
   140	  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
   141	  return dir;
   142	}
   143	
   144	export function cachePath(root, videoId, ext = 'txt') {
   145	  if (!isVideoId(videoId)) throw new YtScoutError(`refusing to build a cache path for invalid id '${videoId}'`);
   146	  return join(cacheDir(root), `${videoId}.${ext}`);
   147	}
   148	
   149	/**
   150	 * Files this module is allowed to delete: only the ones it creates. `<id>.txt`,
   151	 * `<id>.cues.json`, and the `_raw_<id>.*.json3` intermediates. Anything else in
   152	 * the directory belongs to someone else and is not ours to reap — an unfiltered
   153	 * `readdirSync` + `unlink` loop is a delete primitive pointed at whatever happens
   154	 * to share the folder, and `SWAN_SCOUT_ROOT` can repoint that folder.
   155	 */
   156	const OURS = /^(?:[A-Za-z0-9_-]{11}\.(?:txt|cues\.json)|_raw_[A-Za-z0-9_-]{11}\..*\.json3)$/;
   157	
   158	/** Delete cached transcripts older than `days`. Returns the count removed. */
   159	export function pruneCache(root, { days = CACHE_TTL_DAYS } = {}) {
   160	  const dir = cacheDir(root);
   161	  const cutoff = Date.now() - effectivePruneDays(days) * 86_400_000;
   162	  let removed = 0;
   163	  for (const name of readdirSync(dir)) {
   164	    if (!OURS.test(name)) continue; // not ours — leave it alone
   165	    const p = join(dir, name);
   166	    try {
   167	      if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed += 1; }
   168	    } catch { /* a file vanishing under us is not an error worth failing on */ }
   169	  }
   170	  return removed;
   171	}
   172	
   173	/**
   174	 * The single source of truth for how `days` is interpreted, exported so a caller
   175	 * can report the value it will actually get instead of re-deriving it. Callers
   176	 * MUST NOT pre-convert with `Number(x)`: `Number(null) === 0` is finite, so a
   177	 * client sending `days: null` would mean "cutoff = now" and reap the whole cache.
   178	 * Verified 2026-08-12 — that is exactly what happened before this existed.
   179	 */
   180	export function effectivePruneDays(days) {
   181	  return clampOpt(days, CACHE_TTL_DAYS, 0, 3650);
   182	}
   183	
   184	/** Rough token estimate. 4 chars/token is the usual English approximation. */
   185	export const estimateTokens = (text) => Math.round(String(text || '').length / 4);
   186	
   187	/**
   188	 * Fetch (or reuse) a transcript. Always writes the full text to the cache and
   189	 * returns a COMPACT receipt — never the body — so a caller must consciously ask
   190	 * for text via `searchTranscript` or by reading the file.
   191	 *
   192	 * Prefers a human-written track and falls back to the auto-generated one. The
   193	 * exact suffix yt-dlp emits varies by track (`.en.json3`, `.en-orig.json3`), so
   194	 * we glob the output directory rather than guessing.
   195	 */
   196	export function fetchTranscript(videoId, { root, refresh = false, lang = 'en' } = {}) {
   197	  const id = videoIdFrom(videoId);
   198	  if (!id) throw new YtScoutError(`'${videoId}' is not a YouTube video id or URL`);
   199	  if (!LANG.test(lang)) throw new YtScoutError(`'${lang}' is not a valid language tag`);
   200	
   201	  const dir = cacheDir(root);
   202	  const txtPath = join(dir, `${id}.txt`);
   203	  const cuesPath = join(dir, `${id}.cues.json`);
   204	
   205	  if (!refresh && existsSync(txtPath) && existsSync(cuesPath)) {
   206	    // The two cache files are written sequentially, so a crash or a kill between
   207	    // them can leave a truncated cues.json. Reading it with a bare JSON.parse
   208	    // threw a raw SyntaxError that surfaced as an opaque "tool error" and made
   209	    // the video permanently unreadable until someone guessed `refresh: true`.
   210	    // A corrupt cache is a cache miss, not a dead end — fall through and refetch.
   211	    try {
   212	      const text = readFileSync(txtPath, 'utf-8');
   213	      const cues = JSON.parse(readFileSync(cuesPath, 'utf-8'));
   214	      if (!Array.isArray(cues)) throw new Error('cues cache is not an array');
   215	      return {
   216	        videoId: id, cached: true, path: txtPath,
   217	        cues, chars: text.length, tokens: estimateTokens(text),
   218	      };
   219	    } catch {
   220	      try { unlinkSync(cuesPath); } catch { /* best effort */ }
   221	    }
   222	  }
   223	
   224	  const stem = join(dir, `_raw_${id}`);
   225	  runYtDlp([
   226	    `https://www.youtube.com/watch?v=${id}`,
   227	    '--skip-download', '--write-subs', '--write-auto-subs',
   228	    '--sub-langs', `${lang}.*`, '--sub-format', 'json3',
   229	    '--no-warnings', '-o', `${stem}.%(ext)s`,
   230	  ], { timeout: 180_000 });
   231	
   232	  // Prefer the non-"orig" (human/edited) track when both landed.
   233	  const produced = readdirSync(dir)
   234	    .filter((f) => f.startsWith(`_raw_${id}.`) && f.endsWith('.json3'))
   235	    .sort((a, b) => Number(a.includes('-orig')) - Number(b.includes('-orig')));
   236	  if (!produced.length) {
   237	    throw new YtScoutError(`no ${lang} transcript is published for ${id} (captions may be disabled)`);
   238	  }
   239	
   240	  const { text, cues } = parseJson3(readFileSync(join(dir, produced[0]), 'utf-8'));
   241	  writeFileSync(txtPath, text, 'utf-8');
   242	  writeFileSync(cuesPath, JSON.stringify(cues), 'utf-8');
   243	  for (const f of produced) { try { unlinkSync(join(dir, f)); } catch { /* best effort */ } }
   244	
   245	  return { videoId: id, cached: false, path: txtPath, cues, chars: text.length, tokens: estimateTokens(text) };
   246	}```

### `scripts/mcp/swan-scout-server.mjs` (290 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * swan-scout-server.mjs — MCP stdio server: YouTube creator intel in-conversation,
     4	 * no API key, no paste-relay, no npm dependency.
     5	 * ============================================================================
     6	 * Sean's real workflow (rules 63/64/65 and the rule-40 taste-ceiling doctrine
     7	 * were all harvested this way): watch a talk → extract the doctrine → codify it.
     8	 * Today that means Sean finds the video, plays it, and re-types the lesson. These
     9	 * four tools collapse that to one sentence in chat.
    10	 *
    11	 * Tools:
    12	 *   - yt_search         find videos/creators by topic          (no API key)
    13	 *   - yt_channel_videos list a creator's recent uploads        (no API key)
    14	 *   - yt_transcript     fetch a transcript → COMPACT receipt + cached file
    15	 *   - yt_find_in_video  timestamped excerpts for a phrase      (~500 tok, not 54k)
    16	 *
    17	 * THE DESIGN CONSTRAINT, measured not assumed (2026-08-11, Karpathy 3.5hr talk):
    18	 *   json3 4.3 MB → 215,364 chars plain text → ~53,800 tokens for ONE video.
    19	 *   So `yt_transcript` NEVER returns the body by default. It caches the full text
    20	 *   and hands back a receipt; `yt_find_in_video` then answers "where does he talk
    21	 *   about X" from the cache. Two orders of magnitude cheaper per question.
    22	 *
    23	 * Speaks raw MCP-over-stdio (newline-delimited JSON-RPC 2.0), Node built-ins only
    24	 * — deliberately mirroring scripts/mcp/swan-council-server.mjs so there is ONE
    25	 * MCP pattern in this repo, not two (Rule 18).
    26	 *
    27	 * Cost: $0. yt-dlp against a residential IP. No key is loaded, so no key can leak.
    28	 * Privacy (Rule 8): public YouTube data only — never put a client name in a query.
    29	 *
    30	 * @module swan-scout-server
    31	 */
    32	
    33	import { pathToFileURL, fileURLToPath } from 'node:url';
    34	import { dirname, resolve } from 'node:path';
    35	import { readFileSync } from 'node:fs';
    36	import {
    37	  YtScoutError, searchYouTube, listChannelVideos, videoIdFrom, resolveYtDlp,
    38	} from '../swan-scout/yt-scout-lib.mjs';
    39	import {
    40	  fetchTranscript, searchTranscript, pruneCache, estimateTokens, fmtTimestamp, effectivePruneDays,
    41	} from '../swan-scout/yt-scout-transcript.mjs';
    42	
    43	// Derive the repo root from THIS FILE's location, not process.cwd(). An MCP
    44	// client is free to spawn a server with any working directory; when it does, a
    45	// cwd-based root writes the transcript cache into whatever directory happened to
    46	// be current — outside the repo, outside the `.ai-workflow/*` gitignore rule,
    47	// and potentially inside an unrelated git tree where it would be committable.
    48	// Verified 2026-08-11: launching from c:\tmp reported `root C:\tmp` before this.
    49	const ROOT = process.env.SWAN_SCOUT_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
    50	const logErr = (...a) => process.stderr.write(`[swan-scout] ${a.join(' ')}\n`);
    51	
    52	/** Truncate a returned body so no single tool call can flood the window. */
    53	const HARD_TEXT_CAP = 40_000; // chars ≈ 10k tokens — a deliberate ceiling
    54	/** Ceiling on one newline-delimited JSON-RPC frame, so `buf` cannot grow forever. */
    55	const MAX_LINE_BYTES = 4 * 1024 * 1024;
    56	
    57	function capText(text) {
    58	  const s = String(text || '');
    59	  if (s.length <= HARD_TEXT_CAP) return s;
    60	  return `${s.slice(0, HARD_TEXT_CAP)}\n\n…[TRUNCATED at ${HARD_TEXT_CAP} chars of ${s.length}. Use yt_find_in_video for targeted excerpts, or read the cached file directly.]`;
    61	}
    62	
    63	/** `duration` arrives as seconds-as-string from --print; render it human. */
    64	const dur = (d) => (Number(d) > 0 ? fmtTimestamp(Number(d) * 1000) : '?');
    65	/** upload_date is YYYYMMDD. */
    66	const day = (s) => (/^\d{8}$/.test(String(s)) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : (s || '?'));
    67	const views = (v) => (Number(v) > 0 ? Number(v).toLocaleString('en-US') : '?');
    68	
    69	function rowsToTable(rows, { showChannel = true } = {}) {
    70	  if (!rows.length) return '_no results_';
    71	  return rows
    72	    .map((r, i) => {
    73	      const who = showChannel ? ` · ${r.channel}` : '';
    74	      return `${i + 1}. ${r.title}\n   ${r.id}${who} · ${dur(r.duration)} · ${day(r.upload_date)} · ${views(r.view_count)} views`;
    75	    })
    76	    .join('\n');
    77	}
    78	
    79	// ─────────────────────────────────────────────────────────────────────────────
    80	// Tools
    81	// ─────────────────────────────────────────────────────────────────────────────
    82	
    83	const TOOLS = {
    84	  yt_search: {
    85	    description:
    86	      'Search YouTube for videos or creators by topic. No API key, no quota. Returns compact metadata rows (id, title, channel, duration, date, views) — nothing is downloaded. Use this to find a talk before pulling its transcript.',
    87	    inputSchema: {
    88	      type: 'object',
    89	      properties: {
    90	        query: { type: 'string', description: 'Topic or creator name, e.g. "karpathy agents" or "NASM corrective exercise".' },
    91	        limit: { type: 'number', description: 'Max results, 1-50. Default 8.' },
    92	      },
    93	      required: ['query'],
    94	    },
    95	    run(a) {
    96	      const rows = searchYouTube(a.query, { limit: a.limit });
    97	      return { ok: true, text: `Search: "${a.query}" — ${rows.length} result(s)\n\n${rowsToTable(rows)}` };
    98	    },
    99	  },
   100	
   101	  yt_channel_videos: {
   102	    description:
   103	      "List a creator's recent uploads, newest first. Accepts @handle, a channel URL, or a UC… channel id (NOT a topic phrase — use yt_search for that). No API key.",
   104	    inputSchema: {
   105	      type: 'object',
   106	      properties: {
   107	        creator: { type: 'string', description: 'e.g. "@AndrejKarpathy" or "https://www.youtube.com/@channel".' },
   108	        limit: { type: 'number', description: 'Max videos, 1-200. Default 20.' },
   109	      },
   110	      required: ['creator'],
   111	    },
   112	    run(a) {
   113	      const rows = listChannelVideos(a.creator, { limit: a.limit });
   114	      const who = rows[0]?.channel || a.creator;
   115	      return { ok: true, text: `${who} — ${rows.length} upload(s), newest first\n\n${rowsToTable(rows, { showChannel: false })}` };
   116	    },
   117	  },
   118	
   119	  yt_transcript: {
   120	    description:
   121	      'Fetch a video transcript (no API key, video is not downloaded) and cache it. Returns a COMPACT RECEIPT by default — size, cache path, and the opening lines — because a long transcript can be ~54k tokens. Ask for mode:"full" only when the whole text is genuinely needed; prefer yt_find_in_video.',
   122	    inputSchema: {
   123	      type: 'object',
   124	      properties: {
   125	        video: { type: 'string', description: 'Video id or any YouTube URL.' },
   126	        mode: {
   127	          type: 'string',
   128	          enum: ['receipt', 'head', 'full'],
   129	          description: 'receipt = size + path (default, cheapest). head = first ~4k chars. full = whole text, capped at 40k chars.',
   130	        },
   131	        refresh: { type: 'boolean', description: 'Re-fetch even if cached. Default false.' },
   132	      },
   133	      required: ['video'],
   134	    },
   135	    run(a) {
   136	      const t = fetchTranscript(a.video, { root: ROOT, refresh: a.refresh === true });
   137	      const head = `Transcript ${t.videoId} — ${t.chars.toLocaleString('en-US')} chars ≈ ${t.tokens.toLocaleString('en-US')} tokens · ${t.cues.length} cues · ${t.cached ? 'from cache' : 'freshly fetched'}\nCached: ${t.path}`;
   138	      const mode = a.mode || 'receipt';
   139	
   140	      if (mode === 'full') {
   141	        return { ok: true, text: `${head}\n\n===== FULL TRANSCRIPT =====\n${capText(readFileSync(t.path, 'utf-8'))}` };
   142	      }
   143	      if (mode === 'head') {
   144	        const text = readFileSync(t.path, 'utf-8').slice(0, 4_000);
   145	        return { ok: true, text: `${head}\n\n===== FIRST ~4k CHARS =====\n${text}…` };
   146	      }
   147	      const opening = readFileSync(t.path, 'utf-8').slice(0, 600);
   148	      return {
   149	        ok: true,
   150	        text:
   151	          `${head}\n\nOpens: "${opening.trim()}…"\n\n` +
   152	          `Pulling the full text would cost ~${t.tokens.toLocaleString('en-US')} tokens. ` +
   153	          'Prefer yt_find_in_video to get timestamped excerpts for a specific question.',
   154	      };
   155	    },
   156	  },
   157	
   158	  yt_find_in_video: {
   159	    description:
   160	      'THE cheap path for mining a talk. Search inside a video\'s transcript and return only the matching passages, each with a timestamp and a jump-to URL. Costs hundreds of tokens where a full transcript costs tens of thousands. Fetches and caches the transcript automatically if needed.',
   161	    inputSchema: {
   162	      type: 'object',
   163	      properties: {
   164	        video: { type: 'string', description: 'Video id or any YouTube URL.' },
   165	        query: { type: 'string', description: 'Word or phrase to locate, e.g. "context window" or "pricing".' },
   166	        context: { type: 'number', description: 'Cues of surrounding context per hit, 0-10. Default 2.' },
   167	        limit: { type: 'number', description: 'Max excerpts, 1-40. Default 8.' },
   168	      },
   169	      required: ['video', 'query'],
   170	    },
   171	    run(a) {
   172	      const t = fetchTranscript(a.video, { root: ROOT });
   173	      const hits = searchTranscript(t.cues, a.query, { context: a.context, limit: a.limit, videoId: t.videoId });
   174	      if (!hits.length) {
   175	        return {
   176	          ok: true,
   177	          text: `No match for "${a.query}" in ${t.videoId} (${t.cues.length} cues, ${t.tokens.toLocaleString('en-US')} tokens cached at ${t.path}).\nTry a shorter or more common phrasing — matching is literal substring, not semantic.`,
   178	        };
   179	      }
   180	      const body = hits
   181	        .map((h) => `[${h.timestamp}] ${h.excerpt}${h.url ? `\n   → ${h.url}` : ''}`)
   182	        .join('\n\n');
   183	      return {
   184	        ok: true,
   185	        text:
   186	          `${hits.length} passage(s) matching "${a.query}" in ${t.videoId} ` +
   187	          `(~${estimateTokens(body).toLocaleString('en-US')} tokens returned vs ~${t.tokens.toLocaleString('en-US')} for the full transcript)\n\n${capText(body)}`,
   188	      };
   189	    },
   190	  },
   191	
   192	  yt_cache_prune: {
   193	    description: 'Delete cached transcripts older than N days from .ai-workflow/scout-cache (gitignored). Housekeeping only.',
   194	    inputSchema: {
   195	      type: 'object',
   196	      properties: { days: { type: 'number', description: 'Age threshold in days. Default 30.' } },
   197	    },
   198	    run(a) {
   199	      // Hand `days` straight to the library and let its clamp decide. An
   200	      // `Number.isFinite(Number(a.days))` pre-check here re-introduced the exact
   201	      // trap clampOpt exists to prevent: Number(null) === 0 is finite, so
   202	      // `days: null` became "cutoff = now" and reaped the entire cache.
   203	      const days = effectivePruneDays(a.days);
   204	      const removed = pruneCache(ROOT, { days });
   205	      return { ok: true, text: `Pruned ${removed} cached transcript file(s) older than ${days} day(s).` };
   206	    },
   207	  },
   208	};
   209	
   210	// ─────────────────────────────────────────────────────────────────────────────
   211	// Minimal MCP-over-stdio (JSON-RPC 2.0, newline-delimited) — no SDK.
   212	// Mirrors swan-council-server.mjs so both servers behave identically.
   213	// ─────────────────────────────────────────────────────────────────────────────
   214	
   215	const PROTOCOL_VERSION = '2024-11-05';
   216	
   217	function send(msg) { process.stdout.write(`${JSON.stringify(msg)}\n`); }
   218	function result(id, res) { send({ jsonrpc: '2.0', id, result: res }); }
   219	function error(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }
   220	
   221	function toolList() {
   222	  return Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema }));
   223	}
   224	
   225	async function handle(msg) {
   226	  const { id, method, params } = msg;
   227	  if (id === undefined || id === null) return; // notification — ack silently
   228	
   229	  switch (method) {
   230	    case 'initialize':
   231	      return result(id, {
   232	        protocolVersion: PROTOCOL_VERSION,
   233	        capabilities: { tools: {} },
   234	        serverInfo: { name: 'swan-scout', version: '1.0.0' },
   235	      });
   236	    case 'tools/list':
   237	      return result(id, { tools: toolList() });
   238	    case 'tools/call': {
   239	      const tool = TOOLS[params?.name];
   240	      if (!tool) return error(id, -32601, `unknown tool '${params?.name}'`);
   241	      try {
   242	        const out = await tool.run(params?.arguments || {});
   243	        return result(id, { content: [{ type: 'text', text: out.text }], isError: !out.ok });
   244	      } catch (e) {
   245	        // A YtScoutError is a USER-fixable condition (bad id, no captions, yt-dlp
   246	        // missing) — return its message verbatim so the agent can self-correct.
   247	        const text = e instanceof YtScoutError ? e.message : `tool error: ${e.message}`;
   248	        return result(id, { content: [{ type: 'text', text }], isError: true });
   249	      }
   250	    }
   251	    case 'ping':
   252	      return result(id, {});
   253	    default:
   254	      return error(id, -32601, `method not found: ${method}`);
   255	  }
   256	}
   257	
   258	function main() {
   259	  const bin = resolveYtDlp();
   260	  logErr(`ready — root ${ROOT} · yt-dlp ${bin ? `via ${bin.file}` : 'MISSING (install: uv tool install yt-dlp)'}`);
   261	  let buf = '';
   262	  process.stdin.setEncoding('utf-8');
   263	  process.stdin.on('data', (chunk) => {
   264	    buf += chunk;
   265	    // A peer that never sends a newline would otherwise grow `buf` without bound
   266	    // until the process dies of memory exhaustion. No legitimate JSON-RPC frame
   267	    // approaches this, so a line over the cap is garbage: drop the buffer and
   268	    // resynchronize at the next newline rather than accumulating forever.
   269	    if (buf.length > MAX_LINE_BYTES) {
   270	      logErr(`input line exceeded ${MAX_LINE_BYTES} chars — dropping buffer and resyncing`);
   271	      const nl = buf.lastIndexOf('\n');
   272	      buf = nl === -1 ? '' : buf.slice(nl + 1);
   273	      if (buf.length > MAX_LINE_BYTES) buf = '';
   274	    }
   275	    let nl;
   276	    while ((nl = buf.indexOf('\n')) !== -1) {
   277	      const line = buf.slice(0, nl).trim();
   278	      buf = buf.slice(nl + 1);
   279	      if (!line) continue;
   280	      let msg;
   281	      try { msg = JSON.parse(line); } catch { logErr('bad JSON line, skipping'); continue; }
   282	      handle(msg).catch((e) => logErr(`handler error: ${e.message}`));
   283	    }
   284	  });
   285	  process.stdin.on('end', () => process.exit(0));
   286	}
   287	
   288	if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
   289	
   290	export { TOOLS, handle, videoIdFrom, capText, HARD_TEXT_CAP };
```

### `scripts/swan-collect/run.mjs` — only the guard added today (lines 178-190)

Context: `parseArgs` lets unrecognized `--flags` fall through to `handles` because source keys are dynamic. A typo therefore became a handle for a nonexistent source, was skipped, and the run printed "0 source(s) failed" and exited 0. Is refusing the right call, and is the check in the right place?

```javascript
  }

  // parseArgs lets any unrecognized --flag fall through to handles, because
  // source keys are dynamic and cannot be enumerated in the parser. The cost is
  // that a typo (--blueksy) becomes a handle for a source that does not exist,
  // gets skipped, and the run still prints "0 source(s) failed" and exits 0 —
  // a green result for a source that was never contacted. Refuse instead.
  const unknownSources = Object.keys(args.handles).filter((k) => !registry.has(k));
  if (unknownSources.length) {
    const valid = registry.list().map((a) => a.key).join(', ');
    console.error(`REFUSED (unknown-source): no adapter for ${unknownSources.map((k) => `--${k}`).join(', ')}. Valid sources: ${valid}`);
    process.exitCode = 2;
    return;
  }

  const store = createStore(args.dir || '.ai-workflow/collect-store');
  const receipt = await collectEntity(
```
