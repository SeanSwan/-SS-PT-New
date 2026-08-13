#!/usr/bin/env node
/**
 * check-mcp-health.mjs — "is this MCP server actually working, and if not, WHY?" in one command.
 * ================================================================================================
 * NAMING: `check-*` deliberately, matching scripts/check-main-parity.mjs. The obvious name
 * (`diagnose-mcp.mjs`) is swallowed by `.gitignore:256 diagnose-*.mjs`, which blanket-ignores
 * throwaway diagnostics — a durable checker committed under that name would never ship.
 * WHY THIS EXISTS (Sean, 2026-08-13, fifth recurrence — Rule 73 "twice = codify"):
 * An agent needs a Linear tool, finds no `mcp__linear*` tool registered, and concludes
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
 * SECURITY: never prints a token, header value, or URL. Auth material is read into a request and
 * never into stdout (Rule 59). Output is status codes, server names, and booleans only.
 *
 * Usage:
 *   node scripts/diagnose-mcp.mjs                # all servers, all config locations
 *   node scripts/diagnose-mcp.mjs linear         # only servers whose name contains "linear"
 *
 * Exit: 0 = every probed server healthy · 1 = at least one unhealthy (see REMEDY lines).
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

/** Collect `{name, def, source, scope}` for every declared server across every location. */
function collectServers() {
  const found = [];
  for (const { path, scope } of CONFIG_LOCATIONS) {
    if (!existsSync(path)) continue;
    const d = readJson(path);
    if (!d) { found.push({ name: '(unparseable)', source: path, scope, def: null }); continue; }
    for (const [name, def] of Object.entries(d.mcpServers ?? {})) found.push({ name, def, source: path, scope });
    // Project-scoped blocks inside ~/.claude.json.
    for (const [proj, v] of Object.entries(d.projects ?? {})) {
      for (const [name, def] of Object.entries(v.mcpServers ?? {})) {
        found.push({ name, def, source: `${path} :: projects[${proj}]`, scope: 'project-in-user-file' });
      }
    }
  }
  return found;
}

/**
 * Probe an HTTP MCP server with a real `initialize` call. This is the ONLY way to tell
 * "expired token" apart from "not configured" — the distinction that keeps costing Sean rounds.
 */
async function probeHttp(def) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'swan-diagnose', version: '1' } },
  });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(def.url, {
      method: 'POST', signal: ac.signal, body,
      headers: { ...(def.headers ?? {}), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    });
    const text = await r.text();
    return { status: r.status, ok: r.ok, snippet: text.slice(0, 200).replace(/\s+/g, ' ') };
  } catch (e) {
    return { status: null, ok: false, snippet: `FETCH ERROR: ${e.name === 'AbortError' ? 'timeout after 15s' : e.message}` };
  } finally { clearTimeout(timer); }
}

/** Map an observed result to a plain-language cause + the exact action that fixes it. */
function diagnose(status, snippet) {
  if (status === 401 || status === 403 || /invalid_token|invalid access token|unauthorized/i.test(snippet)) {
    return {
      verdict: 'CONFIGURED BUT TOKEN REJECTED',
      remedy: 'The server IS configured — the credential is expired/revoked, so it registers ZERO tools. '
        + 'Do NOT report this as "not configured". Fix: generate a fresh token and replace the Authorization '
        + 'header value for this server, then RESTART Claude Code fully (MCP servers connect at startup).',
    };
  }
  if (status === null) {
    return { verdict: 'UNREACHABLE', remedy: 'Network/DNS/timeout — not an auth problem. Check connectivity, then retry.' };
  }
  if (status >= 500) {
    return { verdict: 'SERVER ERROR', remedy: 'Upstream is failing. Not a local config problem. Retry later.' };
  }
  if (status >= 200 && status < 300) {
    return { verdict: 'HEALTHY', remedy: 'Server answers and accepts the credential. If tools still are not listed, RESTART Claude Code.' };
  }
  return { verdict: `UNEXPECTED HTTP ${status}`, remedy: 'Inspect the snippet above.' };
}

const filter = (process.argv[2] ?? '').toLowerCase();
const servers = collectServers().filter((s) => !filter || s.name.toLowerCase().includes(filter));

console.log('=== MCP server diagnosis ===');
console.log('Config locations checked:');
for (const { path, scope } of CONFIG_LOCATIONS) console.log(`  ${existsSync(path) ? 'present' : 'missing'}  ${path}  [${scope}]`);

if (!servers.length) {
  console.log(`\nNo MCP servers${filter ? ` matching "${filter}"` : ''} declared in ANY location above.`);
  console.log('This is the ONLY state that justifies saying "not configured".');
  process.exit(1);
}

let unhealthy = 0;
for (const { name, def, source, scope } of servers) {
  console.log(`\n--- ${name}`);
  console.log(`    declared in : ${source}  [${scope}]`);
  if (!def) { console.log('    STATUS      : config file could not be parsed'); unhealthy += 1; continue; }
  const type = def.type ?? (def.command ? 'stdio' : 'http');
  console.log(`    transport   : ${type}`);
  console.log(`    auth        : ${Object.keys(def.headers ?? {}).join(', ') || '(no headers)'} `
    + `${def.env ? `env[${Object.keys(def.env).join(',')}]` : ''}`.trim());

  if (type !== 'http' && type !== 'sse') {
    console.log('    STATUS      : stdio server — not probed here (it is spawned by Claude Code at startup)');
    continue;
  }
  const { status, snippet } = await probeHttp(def);
  const { verdict, remedy } = diagnose(status, snippet);
  console.log(`    HTTP        : ${status ?? 'n/a'}`);
  console.log(`    response    : ${snippet}`);
  console.log(`    VERDICT     : ${verdict}`);
  console.log(`    REMEDY      : ${remedy}`);
  if (verdict !== 'HEALTHY') unhealthy += 1;
}

console.log(`\n=== ${servers.length} server(s) checked, ${unhealthy} unhealthy ===`);
process.exit(unhealthy ? 1 : 0);
