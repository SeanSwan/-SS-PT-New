/**
 * tools.mjs — bounded, audited, read-only investigation tools (Phase 4, Fable-gated on Phase 1 gates).
 * ====================================================================================================
 * These are the tools a tool-calling provider may invoke DURING reasoning to request more evidence.
 * The interactive loop is the gateway's most dangerous surface: an autonomous model choosing what to
 * read. Every tool is therefore wrapped in one executor that enforces, per Phase 0 threat model:
 *
 *   T1/T2/T5  every file read goes through the proven safeRead jail (traversal/symlink/binary/DENY).
 *   T8        per-session CALL BUDGET — the model cannot fan out unboundedly (default 24 calls).
 *   T10       CEILING SCREEN — a design-ceiling session (Kimi) never receives sensitive paths:
 *             search/trace results filter them out (reporting the withheld COUNT, never silently),
 *             and repo_open of a sensitive path is hard-refused. The loop cannot become a bypass.
 *   audit     every call (tool, args, ok, result summary — never file content) is logged for the
 *             sanitized receipt. No secret/PII/evidence body ever enters the audit.
 *
 * All tools are read-only and $0. No tool writes, spawns a shell, or reaches the network.
 *
 * @module context-gateway/tools
 */
import { execFileSync } from 'node:child_process';
import { createSafeReader, SafeReadError } from './safeRead.mjs';
import { searchFiles, grepDetailed, searchCatalog } from './retrieve.mjs';
import { parseCatalog } from './authority.mjs';
import { SENSITIVE_PATH_RE } from './providers.mjs';

const DEF_RE = /(?:\b(?:function|class|const|let|var|def|type|interface|enum)\s+|export\s+(?:default\s+)?(?:async\s+)?(?:function\s+)?)$/;

export class ToolError extends Error {
  constructor(code, message, detail = null) {
    super(`[${code}] ${message}`);
    this.code = code; // BUDGET | CEILING | BAD_ARGS | (SafeReadError codes propagate)
    this.detail = detail;
  }
}

/**
 * Create a bounded tool session.
 * @param {object} opts
 * @param {string} opts.root
 * @param {Set<string>} opts.tracked
 * @param {'standard'|'design'} [opts.ceiling]
 * @param {number} [opts.callBudget=24]     max total tool calls this session
 * @param {number} [opts.maxHits=60]        cap on list-shaped results
 */
export function createToolSession({ root, tracked, ceiling = 'standard', callBudget = 24, maxHits = 60 }) {
  const reader = createSafeReader({ root, tracked });
  const catalog = tracked.has('docs/ai-workflow/CATALOG.md')
    ? parseCatalog(reader.readWindow('docs/ai-workflow/CATALOG.md').content) : new Map();
  const audit = [];
  let calls = 0;

  const sensitive = (p) => ceiling === 'design' && SENSITIVE_PATH_RE.test(p);
  /** Filter a path list by the ceiling; return {kept, withheld}. */
  const screen = (paths) => {
    const kept = paths.filter((p) => !sensitive(p));
    return { kept, withheld: paths.length - kept.length };
  };
  const log = (tool, args, ok, summary) => { audit.push({ call: calls, tool, args, ok, summary }); };
  const guard = (tool) => {
    if (calls >= callBudget) throw new ToolError('BUDGET', `tool call budget exhausted (${callBudget})`);
    calls += 1;
  };

  return {
    /** repo_search(query, {scope}) — tracked files containing the fixed-string query. */
    repo_search(query, { scope = null } = {}) {
      guard('repo_search');
      if (!query || typeof query !== 'string') throw new ToolError('BAD_ARGS', 'query string required');
      let files = searchFiles(root, query);
      if (scope) files = files.filter((p) => p.startsWith(String(scope).replaceAll('\\', '/')));
      const truncated = files.length > maxHits;
      const { kept, withheld } = screen(files.slice(0, maxHits));
      log('repo_search', { query, scope }, true, { hits: kept.length, withheld, truncated });
      return { query, files: kept, truncated, withheldByCeiling: withheld };
    },

    /** repo_open(path, start, end) — a safe-read window. Ceiling refuses sensitive paths outright. */
    repo_open(path, startLine, endLine) {
      guard('repo_open');
      if (sensitive(path)) { log('repo_open', { path }, false, { reason: 'CEILING' }); throw new ToolError('CEILING', `design-ceiling session may not open sensitive path: ${path}`); }
      try {
        const w = reader.readWindow(path, startLine ?? undefined, endLine ?? undefined);
        log('repo_open', { path, startLine: w.startLine, endLine: w.endLine }, true, { chars: w.content.length });
        return w;
      } catch (e) {
        log('repo_open', { path }, false, { reason: e.code ?? 'READ_ERROR' });
        throw e instanceof SafeReadError ? e : new ToolError('BAD_ARGS', String(e.message));
      }
    },

    /** trace_symbol(symbol) — heuristic definition-vs-reference split for an identifier. */
    trace_symbol(symbol) {
      guard('trace_symbol');
      if (!symbol || !/^[A-Za-z_$][\w$]{2,}$/.test(symbol)) throw new ToolError('BAD_ARGS', 'identifier (≥3 chars) required');
      const { hits, truncated } = grepDetailed(root, symbol, { maxHits });
      const defs = [], refs = [];
      for (const h of hits) {
        if (sensitive(h.path)) continue;
        const before = h.text.slice(0, h.text.indexOf(symbol));
        (DEF_RE.test(before) ? defs : refs).push(h);
      }
      const withheld = hits.filter((h) => sensitive(h.path)).length;
      log('trace_symbol', { symbol }, true, { defs: defs.length, refs: refs.length, withheld, truncated });
      return { symbol, definitions: defs, references: refs, truncated, withheldByCeiling: withheld };
    },

    /**
     * trace_api_path(apiPath) — hits that look like a route mount/handler for a URL path.
     * Split-mount reality (verified on the real repo 2026-07-22): a route registered as
     * router.post('/sessions') under an app.use('/api/workout', …) mount means the FULL literal
     * '/api/workout/sessions' never appears in code. So we grep the full path, and if that is
     * empty, fall back to progressively shorter trailing segments ('/workout/sessions', then
     * '/sessions') — reporting which pattern actually matched so the caller isn't misled.
     */
    trace_api_path(apiPath) {
      guard('trace_api_path');
      if (!apiPath || !apiPath.startsWith('/')) throw new ToolError('BAD_ARGS', 'api path starting with / required');
      const segs = apiPath.split('/').filter(Boolean);
      const patterns = [apiPath, ...segs.map((_, i) => `/${segs.slice(i + 1).join('/')}`).filter((p) => p.length > 1)];
      let matched = apiPath, res = { hits: [], truncated: false };
      for (const p of [...new Set(patterns)]) { res = grepDetailed(root, p, { maxHits }); if (res.hits.length) { matched = p; break; } }
      const routeRe = /\b(?:router|app)\s*\.\s*(?:get|post|put|delete|patch|use|all)\b|\.(get|post|put|delete|patch)\(/;
      const routes = [], mentions = [];
      for (const h of res.hits) { if (sensitive(h.path)) continue; (routeRe.test(h.text) ? routes : mentions).push(h); }
      const withheld = res.hits.filter((h) => sensitive(h.path)).length;
      log('trace_api_path', { apiPath, matchedPattern: matched }, true, { routes: routes.length, mentions: mentions.length, withheld, truncated: res.truncated });
      return { apiPath, matchedPattern: matched, routes, mentions, truncated: res.truncated, withheldByCeiling: withheld };
    },

    /** catalog_search(topic) — A4 pointer rows (never canon; caller must open the source). */
    catalog_search(topic) {
      guard('catalog_search');
      const terms = String(topic || '').toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [];
      if (!terms.length) throw new ToolError('BAD_ARGS', 'topic with a ≥3-char term required');
      const { rows, truncated } = searchCatalog(catalog, terms, { maxRows: Math.min(maxHits, 12) });
      log('catalog_search', { topic }, true, { rows: rows.length, truncated });
      return { topic, rows: rows.map((r) => ({ file: r.file, decision: r.row.decision, status: r.row.status, sha: r.row.sha })), truncated };
    },

    /** git_context(paths) — recent commit subjects touching the given tracked paths (no diffs). */
    git_context(paths, { limit = 10 } = {}) {
      guard('git_context');
      const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean).map((p) => String(p).replaceAll('\\', '/'));
      if (!list.length) throw new ToolError('BAD_ARGS', 'at least one path required');
      if (list.some((p) => p.split('/').includes('..'))) throw new ToolError('BAD_ARGS', 'traversal refused');
      let out = '';
      try {
        out = execFileSync('git', ['-C', root, 'log', `-n${Math.min(limit, 25)}`, '--oneline', '--', ...list], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
      } catch { out = ''; }
      const commits = out.split('\n').filter(Boolean).map((l) => l.slice(0, 120));
      log('git_context', { paths: list }, true, { commits: commits.length });
      return { paths: list, commits };
    },

    getAudit: () => audit.map((a) => ({ ...a })),
    callsUsed: () => calls,
    callsRemaining: () => callBudget - calls,
  };
}
