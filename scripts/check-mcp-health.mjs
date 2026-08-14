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
 * Exit: 0 = every probed server healthy · 1 = at least one unhealthy
 *       2 = declared but nothing probeable (stdio/sse only) — "0 unhealthy" means "0 verified"
 *       3 = nothing declared matching the query — with NO filter this is the ONLY state that
 *           justifies saying "not configured"; WITH a filter it means only that nothing matched
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
export const displayPath = (p, home = homedir()) => {
  const s = String(p);
  // Require a separator (or exact match) after the prefix, so a sibling directory that merely shares
  // the prefix — C:\Users\sean2 when home is C:\Users\sean — is not mangled into `~2\...` (Kimi r3, O3).
  // The class MUST contain a literal backslash: Windows paths use it as the separator, and a version
  // of this line that only matched `/` silently disabled the redaction on Windows entirely.
  // Case-INSENSITIVE prefix match: Windows paths are case-insensitive, and homedir() can disagree
  // with an env-supplied path on case (junctions, 8.3 names, USERPROFILE drift). A byte-exact
  // compare would return `C:\Users\Sean\...` UNREDACTED against a home of `C:\Users\sean` — the same
  // silent-disable failure as the eaten backslash, one layer up. Over-redacting on POSIX is the safe
  // direction (Kimi round 4, N2).
  const h = String(home);
  if (!s.toLowerCase().startsWith(h.toLowerCase())) return s;
  const rest = s.slice(h.length);
  return rest === '' || /^[\\/]/.test(rest) ? `~${rest}` : s;
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
  const REJECTED = {
    verdict: 'CONFIGURED BUT TOKEN REJECTED',
    remedy: 'The server IS configured — the credential is expired/revoked, so it registers ZERO tools. '
      + 'Do NOT report this as "not configured". Fix: generate a fresh token, replace the Authorization '
      + 'header value for this server, then RESTART Claude Code fully (MCP servers connect at startup).',
  };
  // STATUS FIRST, body only as a last-resort tiebreaker. The body regex used to be OR'd with the
  // status check, so it ran against EVERY response — a healthy 200 whose payload merely contained
  // the word "unauthorized" was reported as a rejected token, telling Sean to rotate a working
  // credential. That is the fifth-recurrence failure in the opposite direction (Kimi round 2, F2).
  if (status === 401 || status === 403) return REJECTED;
  if (status !== null && status >= 200 && status < 300) {
    return { verdict: 'HEALTHY', remedy: 'Server answers and accepts the credential. If tools still are not listed, RESTART Claude Code.' };
  }
  if (status === null) {
    return { verdict: 'UNREACHABLE', remedy: 'Network/DNS/timeout — not an auth problem. Check connectivity, then retry.' };
  }
  if (status >= 300 && status < 400) {
    // Never print Location — a redirect target can itself carry a tokenized URL.
    return {
      verdict: `REDIRECT (HTTP ${status})`,
      remedy: 'Endpoint redirects. Update the url in config to the final location. NOT followed on purpose: '
        + 'the credential is never forwarded to another origin.',
    };
  }
  if (status >= 500) return { verdict: 'SERVER ERROR', remedy: 'Upstream is failing. Not a local config problem. Retry later.' };
  // Non-2xx, non-auth, non-redirect: the body is the only signal left, so the regex is legitimate here.
  if (/invalid_token|invalid access token|unauthorized/i.test(body)) return REJECTED;
  return { verdict: `UNEXPECTED HTTP ${status}`, remedy: 'Unhandled status — check the server\'s own logs.' };
}

/** Hard ceiling on how much of a response body is read into memory. An initialize reply is ~1 KB. */
const MAX_BODY = 65536;

/**
 * Read at most `cap` bytes from a response, cancelling the stream rather than draining it.
 * Returns the decoded text (for matching), the byte count actually read, and whether more remained.
 * Falls back to `.text()` only when the runtime exposes no readable stream.
 */
async function readCapped(r, cap) {
  // NO `await r.text()` FALLBACK. An earlier version had one, which reintroduced the exact
  // unbounded-buffer defect this function exists to remove — one branch over, where the "TRULY
  // bounded" claim above did not reach. On Node >= 18 (undici) a fetch Response ALWAYS exposes a
  // web ReadableStream, so that branch was unreachable dead code carrying a live defect: pure risk
  // for zero benefit. Throwing makes the bound unconditional; probeHttp's catch reports it as
  // UNREACHABLE rather than crashing (Kimi round 7, N1).
  if (!r.body?.getReader) throw new Error('runtime without web streams is unsupported');
  const reader = r.body.getReader();
  const chunks = [];
  let n = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      n += value.byteLength;
      if (n > cap) { truncated = true; break; }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return { text: Buffer.concat(chunks).subarray(0, cap).toString('utf8'), bytes: n, truncated };
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
      // `manual`: whether undici strips Authorization on a cross-origin or HTTPS->HTTP redirect has
      // varied by Node version. A tool held to a Rule 59 contract does not get to inherit its own
      // core guarantee from the runtime — the credential goes to the configured origin or nowhere.
      redirect: 'manual',
      headers: { ...(def.headers ?? {}), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    });
    // TRULY bounded read. `await r.text()` buffers the ENTIRE body first and only then slices, so
    // the 15s timer bounds time, not memory — an endpoint streaming fast enough could buffer
    // gigabytes before the slice ran. The previous comment here claimed a bound the code did not
    // have, which is the untrue-doc-claim class this whole slice exists to delete (round 6, S3).
    const { text, bytes, truncated } = await readCapped(r, MAX_BODY);
    const { verdict, remedy } = diagnose(r.status, text);
    // `text` dies here. A 401 body from an auth proxy routinely echoes the credential.
    // Buffer.byteLength, not .length: the header promises a BYTE count and stdout prints "B";
    // String.length counts UTF-16 code units and undercounts any multibyte body (Kimi r3, N1).
    return { status: r.status, bytes, truncated, verdict, remedy };
  } catch (e) {
    // e.message can embed the request URL, which the contract forbids printing — so only the class.
    const cause = e.name === 'AbortError' ? 'timeout after 15s' : e.constructor?.name ?? 'error';
    const { verdict, remedy } = diagnose(null);
    return { status: null, bytes: 0, truncated: false, verdict, remedy: `${remedy} (cause class: ${cause})` };
  } finally { clearTimeout(timer); }
}

/**
 * Only run the CLI when executed directly. Without this guard, importing `diagnose` for unit tests
 * executes the whole probe-and-exit body and kills the test runner — so the verdict logic that this
 * tool's entire value rests on would be untestable.
 */
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) await main();

async function main() {
const filter = (process.argv[2] ?? '').toLowerCase();
// A parse failure is a LOCATION-level fact, not a server-name match, so it survives any filter.
// Otherwise a corrupt ~/.claude.json plus `check-mcp-health.mjs linear` prints "no servers declared
// in ANY location" — the one message this tool treats as justification for "not configured" — while
// the corruption is itself a plausible cause of zero tools registering (Kimi round 2, F4).
const servers = collectServers().filter((s) => s.def === null || !filter || s.name.toLowerCase().includes(filter));

console.log('=== MCP server health ===');
console.log('Config locations checked:');
for (const { path, scope } of CONFIG_LOCATIONS) console.log(`  ${existsSync(path) ? 'present' : 'missing'}  ${displayPath(path)}  [${scope}]`);

if (!servers.length) {
  console.log(`\nNo MCP servers${filter ? ` matching "${filter}"` : ''} declared in ANY location above.`);
  console.log('This is the ONLY state that justifies saying "not configured".');
  // Exit 3, distinct from 2: automation must be able to tell "definitively not configured" from
  // "cannot tell". A disambiguation tool shipping an ambiguous contract defeats itself (r4 N1).
  process.exit(3);
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
  // DELIBERATE: loopback (`http://localhost`) is refused too, even though it carries no network
  // egress. Every MCP server in this repo is remote HTTPS, so the carve-out would add a
  // hostname allowlist to buy nothing today — and the conservative direction is the safe one for a
  // credential. If a local HTTP MCP server ever ships, exempt ['localhost','127.0.0.1','::1'] here
  // rather than dropping the check (Kimi round 7, N3 — recorded rather than left implicit).
  if (url.protocol !== 'https:') {
    // Refuse to send the Authorization header over cleartext just to run a diagnostic.
    console.log(`    WARNING     : non-HTTPS (${url.protocol}) — credentials would egress in cleartext; NOT probed`);
    unhealthy += 1;
    continue;
  }

  const { status, bytes, truncated, verdict, remedy } = await probeHttp(def);
  probed += 1;
  console.log(`    HTTP        : ${status ?? 'n/a'}  (body ${bytes}B${truncated ? '+ truncated' : ''}, not printed — Rule 59)`);
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
}
