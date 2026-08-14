#!/usr/bin/env node
/**
 * check-mcp-health.mjs — "is this MCP server actually working, and if not, WHY?" in one command.
 * ================================================================================================
 * NAMING: `check-*` deliberately, matching scripts/check-main-parity.mjs. The obvious name
 * (`diagnose-mcp.mjs`) is swallowed by `.gitignore:256 diagnose-*.mjs`, which blanket-ignores
 * throwaway diagnostics — a durable checker committed under that name would never ship.
 *
 * WHY THIS EXISTS (Sean, 2026-08-13, fifth recurrence — Rule 73 "twice = codify"):
 * An agent needs a Linear tool, finds no `mcp__linear-server__*` tool registered, and concludes
 * "Linear is not configured." That conclusion has been WRONG every time. The real states are:
 *
 *   configured + token valid    -> tools register, everything works
 *   configured + token EXPIRED  -> server fails to initialize, ZERO tools register
 *   not configured at all       -> zero tools register
 *
 * The last two are indistinguishable from the agent's side, so the agent guesses — and guessing
 * "not configured" when the truth is "expired token" sends Sean in circles. This is the Rule 80
 * failure exactly: absence of tools is one vantage; it is not a fact about the world.
 *
 * The other half of the trap: config lives in FIVE places, and the one that actually holds the
 * user-scoped HTTP servers (`~/.claude.json`) is the one nobody checks. Agents look at `.mcp.json`
 * and `.env`, find nothing, and stop.
 *
 * SECURITY CONTRACT (Rule 59) — and this file is held to it, having violated it in review:
 *   NEVER printed: tokens, header VALUES, URLs, remote response BODIES, or absolute paths.
 *   Remote bodies are matched in-process and discarded; only a byte count and a derived verdict
 *   escape. Project keys in `~/.claude.json` are absolute directories carrying the OS username, so
 *   they are redacted to a length. (Kimi hostile review 2026-08-13 caught both leaks: the tool
 *   printed 200 raw chars of remote response — where a 401 proxy body echoes the credential — and
 *   sprayed absolute project paths to stdout while its sibling module existed to prevent exactly
 *   that in files. A diagnostic that breaks its own stated contract teaches that contracts are
 *   decorative.)
 *
 * Usage:
 *   node scripts/check-mcp-health.mjs                # all servers, all config locations
 *   node scripts/check-mcp-health.mjs linear         # only servers whose name contains "linear"
 *
 * Exit: 0 = every PROBED server healthy · 1 = at least one unhealthy · 2 = nothing probeable.
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Every place Claude Code reads MCP servers from. `~/.claude.json` is the one agents forget. */
const CONFIG_LOCATIONS = [
  { path: '.mcp.json', scope: 'project' },
  { path: '.claude/settings.json', scope: 'project' },
  { path: '.claude/settings.local.json', scope: 'project-local' },
  { path: join(homedir(), '.claude.json'), scope: 'USER (agents miss this one)' },
  { path: join(homedir(), '.claude', 'settings.json'), scope: 'user' },
];

const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
};

/** A project key is an absolute path carrying the OS username — never print it (Rule 8/59). */
const redactProjectKey = (k) => (/[\\/]/.test(String(k)) ? `<path, ${String(k).length} chars, redacted>` : String(k));

/**
 * Display form for a config location. The home directory carries the OS username, so it collapses
 * to `~` — the reader still learns exactly WHICH file to open, which is the tool's whole job, without
 * the username reaching a transcript. (Self-caught: the first pass at fixing the review findings
 * redacted `projects[...]` keys but kept printing `C:\Users\<name>\.claude.json` verbatim, which the
 * header in this same file forbids.)
 */
const displayPath = (p) => {
  const home = homedir();
  const s = String(p);
  return s.startsWith(home) ? `~${s.slice(home.length)}` : s;
};

/** Collect `{name, def, source, scope}` for every declared server across every location. */
export function collectServers() {
  const found = [];
  for (const { path, scope } of CONFIG_LOCATIONS) {
    if (!existsSync(path)) continue;
    const d = readJson(path);
    if (!d) { found.push({ name: '(unparseable)', source: displayPath(path), scope, def: null }); continue; }
    for (const [name, def] of Object.entries(d.mcpServers ?? {})) found.push({ name, def, source: displayPath(path), scope });
    for (const [proj, v] of Object.entries(d.projects ?? {})) {
      for (const [name, def] of Object.entries(v.mcpServers ?? {})) {
        found.push({ name, def, source: `${displayPath(path)} :: projects[${redactProjectKey(proj)}]`, scope: 'project-in-user-file' });
      }
    }
  }
  return found;
}

/**
 * Map an observed result to a plain-language cause + the exact action that fixes it.
 * `body` is matched here and NEVER returned — the caller only receives the verdict.
 */
export function diagnose(status, body = '') {
  if (status === 401 || status === 403 || /invalid_token|invalid access token|unauthorized/i.test(body)) {
    return {
      verdict: 'CONFIGURED BUT TOKEN REJECTED',
      remedy: 'The server IS configured — the credential is expired/revoked, so it registers ZERO tools. '
        + 'Do NOT report this as "not configured". Fix: generate a fresh token, replace the Authorization '
        + 'header value for this server, then RESTART Claude Code fully (MCP servers connect at startup).',
    };
  }
  if (status === null) {
    return { verdict: 'UNREACHABLE', remedy: 'Network/DNS/timeout — not an auth problem. Check connectivity, then retry.' };
  }
  if (status >= 500) return { verdict: 'SERVER ERROR', remedy: 'Upstream is failing. Not a local config problem. Retry later.' };
  if (status >= 200 && status < 300) {
    return { verdict: 'HEALTHY', remedy: 'Server answers and accepts the credential. If tools still are not listed, RESTART Claude Code.' };
  }
  return { verdict: `UNEXPECTED HTTP ${status}`, remedy: 'Unhandled status — check the server\'s own logs.' };
}

/**
 * Probe an HTTP MCP server with a real `initialize` call. This is the ONLY way to tell
 * "expired token" apart from "not configured" — the distinction that keeps costing Sean rounds.
 * The response body is consumed for matching and discarded; only its LENGTH escapes.
 */
async function probeHttp(def) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'swan-check', version: '1' } },
  });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(def.url, {
      method: 'POST', signal: ac.signal, body,
      headers: { ...(def.headers ?? {}), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    });
    const text = await r.text();
    const { verdict, remedy } = diagnose(r.status, text);
    // `text` dies here. A 401 body from an auth proxy routinely echoes the credential.
    return { status: r.status, bytes: text.length, verdict, remedy };
  } catch (e) {
    // e.message can embed the request URL, which the contract forbids printing — so only the class.
    const cause = e.name === 'AbortError' ? 'timeout after 15s' : e.constructor?.name ?? 'error';
    const { verdict, remedy } = diagnose(null);
    return { status: null, bytes: 0, verdict, remedy: `${remedy} (cause class: ${cause})` };
  } finally { clearTimeout(timer); }
}

const filter = (process.argv[2] ?? '').toLowerCase();
const servers = collectServers().filter((s) => !filter || s.name.toLowerCase().includes(filter));

console.log('=== MCP server health ===');
console.log('Config locations checked:');
for (const { path, scope } of CONFIG_LOCATIONS) console.log(`  ${existsSync(path) ? 'present' : 'missing'}  ${displayPath(path)}  [${scope}]`);

if (!servers.length) {
  console.log(`\nNo MCP servers${filter ? ` matching "${filter}"` : ''} declared in ANY location above.`);
  console.log('This is the ONLY state that justifies saying "not configured".');
  process.exit(2);
}

let unhealthy = 0;
let probed = 0;
for (const { name, def, source, scope } of servers) {
  console.log(`\n--- ${name}`);
  console.log(`    declared in : ${source}  [${scope}]`);
  if (!def) { console.log('    STATUS      : config file could not be parsed'); unhealthy += 1; continue; }
  const type = def.type ?? (def.command ? 'stdio' : 'http');
  console.log(`    transport   : ${type}`);
  console.log(`    auth        : ${Object.keys(def.headers ?? {}).join(', ') || '(no headers)'}`
    + `${def.env ? ` env[${Object.keys(def.env).join(',')}]` : ''}`);

  if (type === 'stdio') {
    console.log('    STATUS      : stdio server — spawned by Claude Code at startup, not probeable here');
    continue;
  }
  if (type === 'sse') {
    // An SSE server expects a GET to open the stream; POSTing `initialize` draws a 405 and the tool
    // would misdiagnose the very ambiguity it exists to resolve. Say so rather than guess.
    console.log('    STATUS      : sse transport — probe not implemented; check the server\'s own logs');
    continue;
  }
  let url;
  try { url = new URL(def.url); } catch { console.log('    STATUS      : malformed url in config'); unhealthy += 1; continue; }
  if (url.protocol !== 'https:') {
    // Refuse to send the Authorization header over cleartext just to run a diagnostic.
    console.log(`    WARNING     : non-HTTPS (${url.protocol}) — credentials would egress in cleartext; NOT probed`);
    unhealthy += 1;
    continue;
  }

  const { status, bytes, verdict, remedy } = await probeHttp(def);
  probed += 1;
  console.log(`    HTTP        : ${status ?? 'n/a'}  (body ${bytes}B, not printed — Rule 59)`);
  console.log(`    VERDICT     : ${verdict}`);
  console.log(`    REMEDY      : ${remedy}`);
  if (verdict !== 'HEALTHY') unhealthy += 1;
}

console.log(`\n=== ${servers.length} declared, ${probed} probed, ${unhealthy} unhealthy ===`);
if (!probed && !unhealthy) {
  console.log('NOTE: nothing was probeable (stdio/sse only) — "0 unhealthy" here means "0 verified", not "all good".');
  process.exit(2);
}
process.exit(unhealthy ? 1 : 0);
