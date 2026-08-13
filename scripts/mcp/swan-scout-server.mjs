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
import { YtScoutError, videoIdFrom, resolveYtDlp } from '../swan-scout/yt-scout-lib.mjs';
import { TOOLS, capText, HARD_TEXT_CAP, setRoot } from './yt-scout-tools.mjs';

// Derive the repo root from THIS FILE's location, not process.cwd(). An MCP
// client is free to spawn a server with any working directory; when it does, a
// cwd-based root writes the transcript cache into whatever directory happened to
// be current — outside the repo, outside the `.ai-workflow/*` gitignore rule,
// and potentially inside an unrelated git tree where it would be committable.
// Verified 2026-08-11: launching from c:\tmp reported `root C:\tmp` before this.
const ROOT = process.env.SWAN_SCOUT_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const logErr = (...a) => process.stderr.write(`[swan-scout] ${a.join(' ')}\n`);

/** Ceiling on one newline-delimited JSON-RPC frame, so `buf` cannot grow forever. */
const MAX_LINE_BYTES = 4 * 1024 * 1024;

// The tools module needs the repo-derived root; hand it over before any tool runs.
setRoot(ROOT);

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
      // Own-property lookup only. A bare `TOOLS[name]` resolved inherited keys, so
      // `name: "constructor"` or `"hasOwnProperty"` returned a truthy built-in,
      // slipped past this unknown-tool check, and then died on `tool.run is not a
      // function` — a caught error, but reported down the wrong path.
      const tool = Object.hasOwn(TOOLS, String(params?.name ?? '')) ? TOOLS[params.name] : null;
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
