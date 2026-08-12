#!/usr/bin/env node
/**
 * swan-scout-server.mjs — MCP stdio server: YouTube creator intel in-conversation,
 * no API key, no paste-relay, no npm dependency.
 * ============================================================================
 * Sean's real workflow (rules 63/64/65 and the rule-40 taste-ceiling doctrine
 * were all harvested this way): watch a talk → extract the doctrine → codify it.
 * Today that means Sean finds the video, plays it, and re-types the lesson. These
 * four tools collapse that to one sentence in chat.
 *
 * Tools:
 *   - yt_search         find videos/creators by topic          (no API key)
 *   - yt_channel_videos list a creator's recent uploads        (no API key)
 *   - yt_transcript     fetch a transcript → COMPACT receipt + cached file
 *   - yt_find_in_video  timestamped excerpts for a phrase      (~500 tok, not 54k)
 *
 * THE DESIGN CONSTRAINT, measured not assumed (2026-08-11, Karpathy 3.5hr talk):
 *   json3 4.3 MB → 215,364 chars plain text → ~53,800 tokens for ONE video.
 *   So `yt_transcript` NEVER returns the body by default. It caches the full text
 *   and hands back a receipt; `yt_find_in_video` then answers "where does he talk
 *   about X" from the cache. Two orders of magnitude cheaper per question.
 *
 * Speaks raw MCP-over-stdio (newline-delimited JSON-RPC 2.0), Node built-ins only
 * — deliberately mirroring scripts/mcp/swan-council-server.mjs so there is ONE
 * MCP pattern in this repo, not two (Rule 18).
 *
 * Cost: $0. yt-dlp against a residential IP. No key is loaded, so no key can leak.
 * Privacy (Rule 8): public YouTube data only — never put a client name in a query.
 *
 * @module swan-scout-server
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  YtScoutError, searchYouTube, listChannelVideos, videoIdFrom, resolveYtDlp,
} from '../swan-scout/yt-scout-lib.mjs';
import {
  fetchTranscript, searchTranscript, pruneCache, estimateTokens, fmtTimestamp, effectivePruneDays,
} from '../swan-scout/yt-scout-transcript.mjs';

// Derive the repo root from THIS FILE's location, not process.cwd(). An MCP
// client is free to spawn a server with any working directory; when it does, a
// cwd-based root writes the transcript cache into whatever directory happened to
// be current — outside the repo, outside the `.ai-workflow/*` gitignore rule,
// and potentially inside an unrelated git tree where it would be committable.
// Verified 2026-08-11: launching from c:\tmp reported `root C:\tmp` before this.
const ROOT = process.env.SWAN_SCOUT_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const logErr = (...a) => process.stderr.write(`[swan-scout] ${a.join(' ')}\n`);

/** Truncate a returned body so no single tool call can flood the window. */
const HARD_TEXT_CAP = 40_000; // chars ≈ 10k tokens — a deliberate ceiling
/** Ceiling on one newline-delimited JSON-RPC frame, so `buf` cannot grow forever. */
const MAX_LINE_BYTES = 4 * 1024 * 1024;

function capText(text) {
  const s = String(text || '');
  if (s.length <= HARD_TEXT_CAP) return s;
  return `${s.slice(0, HARD_TEXT_CAP)}\n\n…[TRUNCATED at ${HARD_TEXT_CAP} chars of ${s.length}. Use yt_find_in_video for targeted excerpts, or read the cached file directly.]`;
}

/** `duration` arrives as seconds-as-string from --print; render it human. */
const dur = (d) => (Number(d) > 0 ? fmtTimestamp(Number(d) * 1000) : '?');
/** upload_date is YYYYMMDD. */
const day = (s) => (/^\d{8}$/.test(String(s)) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : (s || '?'));
const views = (v) => (Number(v) > 0 ? Number(v).toLocaleString('en-US') : '?');

function rowsToTable(rows, { showChannel = true } = {}) {
  if (!rows.length) return '_no results_';
  return rows
    .map((r, i) => {
      const who = showChannel ? ` · ${r.channel}` : '';
      return `${i + 1}. ${r.title}\n   ${r.id}${who} · ${dur(r.duration)} · ${day(r.upload_date)} · ${views(r.view_count)} views`;
    })
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = {
  yt_search: {
    description:
      'Search YouTube for videos or creators by topic. No API key, no quota. Returns compact metadata rows (id, title, channel, duration, date, views) — nothing is downloaded. Use this to find a talk before pulling its transcript.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic or creator name, e.g. "karpathy agents" or "NASM corrective exercise".' },
        limit: { type: 'number', description: 'Max results, 1-50. Default 8.' },
      },
      required: ['query'],
    },
    run(a) {
      const rows = searchYouTube(a.query, { limit: a.limit });
      return { ok: true, text: `Search: "${a.query}" — ${rows.length} result(s)\n\n${rowsToTable(rows)}` };
    },
  },

  yt_channel_videos: {
    description:
      "List a creator's recent uploads, newest first. Accepts @handle, a channel URL, or a UC… channel id (NOT a topic phrase — use yt_search for that). No API key.",
    inputSchema: {
      type: 'object',
      properties: {
        creator: { type: 'string', description: 'e.g. "@AndrejKarpathy" or "https://www.youtube.com/@channel".' },
        limit: { type: 'number', description: 'Max videos, 1-200. Default 20.' },
      },
      required: ['creator'],
    },
    run(a) {
      const rows = listChannelVideos(a.creator, { limit: a.limit });
      const who = rows[0]?.channel || a.creator;
      return { ok: true, text: `${who} — ${rows.length} upload(s), newest first\n\n${rowsToTable(rows, { showChannel: false })}` };
    },
  },

  yt_transcript: {
    description:
      'Fetch a video transcript (no API key, video is not downloaded) and cache it. Returns a COMPACT RECEIPT by default — size, cache path, and the opening lines — because a long transcript can be ~54k tokens. Ask for mode:"full" only when the whole text is genuinely needed; prefer yt_find_in_video.',
    inputSchema: {
      type: 'object',
      properties: {
        video: { type: 'string', description: 'Video id or any YouTube URL.' },
        mode: {
          type: 'string',
          enum: ['receipt', 'head', 'full'],
          description: 'receipt = size + path (default, cheapest). head = first ~4k chars. full = whole text, capped at 40k chars.',
        },
        refresh: { type: 'boolean', description: 'Re-fetch even if cached. Default false.' },
      },
      required: ['video'],
    },
    run(a) {
      const t = fetchTranscript(a.video, { root: ROOT, refresh: a.refresh === true });
      const head = `Transcript ${t.videoId} — ${t.chars.toLocaleString('en-US')} chars ≈ ${t.tokens.toLocaleString('en-US')} tokens · ${t.cues.length} cues · ${t.cached ? 'from cache' : 'freshly fetched'}\nCached: ${t.path}`;
      const mode = a.mode || 'receipt';

      if (mode === 'full') {
        return { ok: true, text: `${head}\n\n===== FULL TRANSCRIPT =====\n${capText(readFileSync(t.path, 'utf-8'))}` };
      }
      if (mode === 'head') {
        const text = readFileSync(t.path, 'utf-8').slice(0, 4_000);
        return { ok: true, text: `${head}\n\n===== FIRST ~4k CHARS =====\n${text}…` };
      }
      const opening = readFileSync(t.path, 'utf-8').slice(0, 600);
      return {
        ok: true,
        text:
          `${head}\n\nOpens: "${opening.trim()}…"\n\n` +
          `Pulling the full text would cost ~${t.tokens.toLocaleString('en-US')} tokens. ` +
          'Prefer yt_find_in_video to get timestamped excerpts for a specific question.',
      };
    },
  },

  yt_find_in_video: {
    description:
      'THE cheap path for mining a talk. Search inside a video\'s transcript and return only the matching passages, each with a timestamp and a jump-to URL. Costs hundreds of tokens where a full transcript costs tens of thousands. Fetches and caches the transcript automatically if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        video: { type: 'string', description: 'Video id or any YouTube URL.' },
        query: { type: 'string', description: 'Word or phrase to locate, e.g. "context window" or "pricing".' },
        context: { type: 'number', description: 'Cues of surrounding context per hit, 0-10. Default 2.' },
        limit: { type: 'number', description: 'Max excerpts, 1-40. Default 8.' },
      },
      required: ['video', 'query'],
    },
    run(a) {
      const t = fetchTranscript(a.video, { root: ROOT });
      const hits = searchTranscript(t.cues, a.query, { context: a.context, limit: a.limit, videoId: t.videoId });
      if (!hits.length) {
        return {
          ok: true,
          text: `No match for "${a.query}" in ${t.videoId} (${t.cues.length} cues, ${t.tokens.toLocaleString('en-US')} tokens cached at ${t.path}).\nTry a shorter or more common phrasing — matching is literal substring, not semantic.`,
        };
      }
      const body = hits
        .map((h) => `[${h.timestamp}] ${h.excerpt}${h.url ? `\n   → ${h.url}` : ''}`)
        .join('\n\n');
      return {
        ok: true,
        text:
          `${hits.length} passage(s) matching "${a.query}" in ${t.videoId} ` +
          `(~${estimateTokens(body).toLocaleString('en-US')} tokens returned vs ~${t.tokens.toLocaleString('en-US')} for the full transcript)\n\n${capText(body)}`,
      };
    },
  },

  yt_cache_prune: {
    description: 'Delete cached transcripts older than N days from .ai-workflow/scout-cache (gitignored). Housekeeping only.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Age threshold in days. Default 30.' } },
    },
    run(a) {
      // Hand `days` straight to the library and let its clamp decide. An
      // `Number.isFinite(Number(a.days))` pre-check here re-introduced the exact
      // trap clampOpt exists to prevent: Number(null) === 0 is finite, so
      // `days: null` became "cutoff = now" and reaped the entire cache.
      const days = effectivePruneDays(a.days);
      const removed = pruneCache(ROOT, { days });
      return { ok: true, text: `Pruned ${removed} cached transcript file(s) older than ${days} day(s).` };
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Minimal MCP-over-stdio (JSON-RPC 2.0, newline-delimited) — no SDK.
// Mirrors swan-council-server.mjs so both servers behave identically.
// ─────────────────────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05';

function send(msg) { process.stdout.write(`${JSON.stringify(msg)}\n`); }
function result(id, res) { send({ jsonrpc: '2.0', id, result: res }); }
function error(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema }));
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification — ack silently

  switch (method) {
    case 'initialize':
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'swan-scout', version: '1.0.0' },
      });
    case 'tools/list':
      return result(id, { tools: toolList() });
    case 'tools/call': {
      const tool = TOOLS[params?.name];
      if (!tool) return error(id, -32601, `unknown tool '${params?.name}'`);
      try {
        const out = await tool.run(params?.arguments || {});
        return result(id, { content: [{ type: 'text', text: out.text }], isError: !out.ok });
      } catch (e) {
        // A YtScoutError is a USER-fixable condition (bad id, no captions, yt-dlp
        // missing) — return its message verbatim so the agent can self-correct.
        const text = e instanceof YtScoutError ? e.message : `tool error: ${e.message}`;
        return result(id, { content: [{ type: 'text', text }], isError: true });
      }
    }
    case 'ping':
      return result(id, {});
    default:
      return error(id, -32601, `method not found: ${method}`);
  }
}

function main() {
  const bin = resolveYtDlp();
  logErr(`ready — root ${ROOT} · yt-dlp ${bin ? `via ${bin.file}` : 'MISSING (install: uv tool install yt-dlp)'}`);
  let buf = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    // A peer that never sends a newline would otherwise grow `buf` without bound
    // until the process dies of memory exhaustion. No legitimate JSON-RPC frame
    // approaches this, so a line over the cap is garbage: drop the buffer and
    // resynchronize at the next newline rather than accumulating forever.
    if (buf.length > MAX_LINE_BYTES) {
      logErr(`input line exceeded ${MAX_LINE_BYTES} chars — dropping buffer and resyncing`);
      const nl = buf.lastIndexOf('\n');
      buf = nl === -1 ? '' : buf.slice(nl + 1);
      if (buf.length > MAX_LINE_BYTES) buf = '';
    }
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { logErr('bad JSON line, skipping'); continue; }
      handle(msg).catch((e) => logErr(`handler error: ${e.message}`));
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { TOOLS, handle, videoIdFrom, capText, HARD_TEXT_CAP };
