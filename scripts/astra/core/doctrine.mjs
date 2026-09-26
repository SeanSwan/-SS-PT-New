/**
 * doctrine.mjs — the bounded doctrine search behind `brain.doctrine`.
 *
 * PATTERN REUSED, DATA NOT SHARED. `02-BLUEPRINT.md` §7 says to reuse
 * `scripts/swan-brain-console/mcp/searchDoctrine.mjs` as the model and NOT to share
 * that console's data. So this is Astra's own copy against Astra's own `REPO_ROOT`.
 * Importing the other console's module would couple two consoles that are meant to
 * stay independent — the blueprint names that coupling as the standing risk of a
 * third console appearing.
 *
 * The lessons this carries, each of which cost the other console a review round:
 *
 *   - "READ-ONLY" IS NOT "CHEAP". This walks a tree and reads every `.md` it finds,
 *     so it is the one handler on this surface with a real blast radius. Four
 *     bounds: one allowlisted root, a query cap, a result cap, a file cap.
 *
 *   - `truncated` MUST BE A FACT, NOT AN ASSUMPTION. Searching for `want + 1` and
 *     returning `want` makes truncation exactly "a (want+1)th match exists", which
 *     is decidable. The naive `results.length >= want` reports a COMPLETE search as
 *     partial whenever it finds exactly `want` — measured upstream at `limit: 38`
 *     against a needle with exactly 38 matches.
 *
 *   - A READ FAILURE IS NOT AN EMPTY DIRECTORY. Swallowing a `readdirSync` error
 *     turns an unexamined subtree into a confident "no matches" — the worst shape
 *     this handler can return, because the caller cannot tell it apart from an
 *     exhaustive search. Failures are RETURNED and folded into `complete`.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO_ROOT } from './paths.mjs';

/** The search is allowlisted to one tree, relative to the repo root. */
export const SEARCH_ROOT = 'docs/ai-workflow/design-brain';
export const SEARCH_LIMIT_DEFAULT = 10;
export const SEARCH_LIMIT_MAX = 50;
export const SEARCH_QUERY_MAX = 200;
export const SEARCH_FILES_MAX = 400;
export const SEARCH_LINE_MAX = 240;

/** Clamp a caller-supplied limit into the allowed band. Never throws on a number. */
export function clampLimit(limit) {
  if (!Number.isFinite(limit)) return SEARCH_LIMIT_DEFAULT;
  const n = Math.trunc(limit);
  if (n < 1) return SEARCH_LIMIT_DEFAULT;
  return Math.min(n, SEARCH_LIMIT_MAX);
}

/**
 * Every `.md` file under `root`, depth-first, sorted for a stable result order.
 *
 * The directories that could not be read are RETURNED alongside the files, not
 * logged and forgotten. `readdir` is injectable because an unreadable directory
 * cannot be created portably in a test, and a guard that cannot be exercised is a
 * guard nobody has read.
 */
export function markdownFiles(root, readdir = readdirSync) {
  const files = [];
  const unreadable = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdir(dir, { withFileTypes: true });
    } catch (err) {
      unreadable.push({
        dir: relative(REPO_ROOT, dir).split(sep).join('/'),
        reason: String(err?.code ?? err?.message ?? err),
      });
      return; // skipped for THIS traversal, and now recorded rather than forgotten
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) files.push(full);
    }
  };
  walk(root);
  return { files, unreadable };
}

/**
 * Search the doctrine tree for a literal, case-insensitive substring.
 *
 * @param {object} [opts]
 * @param {string} [opts.query]   literal substring, 2..200 chars
 * @param {number} [opts.limit]   results wanted, clamped to 1..50
 * @param {Function} [opts.readdir] test seam
 */
/** A named error, with the name MACHINE-READABLE. The message alone is not enough:
 * `callTool` reports `err.code`, so a thrown `E_DOCTRINE_QUERY` that never sets
 * `.code` arrives at the MCP surface as `E_TOOL_FAILED` — the name is in the prose
 * and lost to every caller that branches on it. Same defect as a check that cannot
 * run reading as a check that found nothing. */
function doctrineError(code, message) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  return err;
}

export function searchDoctrine({ query, limit = SEARCH_LIMIT_DEFAULT, readdir = readdirSync } = {}) {
  if (typeof query !== 'string' || query.trim().length < 2) {
    throw doctrineError('E_DOCTRINE_QUERY', 'query must be a string of at least 2 characters');
  }
  if (query.length > SEARCH_QUERY_MAX) {
    throw doctrineError('E_DOCTRINE_QUERY', `query exceeds ${SEARCH_QUERY_MAX} characters`);
  }
  const root = join(REPO_ROOT, SEARCH_ROOT);
  if (!existsSync(root)) {
    throw doctrineError('E_DOCTRINE_ROOT', `no doctrine tree at ${SEARCH_ROOT} — nothing to search`);
  }

  const want = clampLimit(limit);
  /* One past the answer, so "is there more?" is answered by having FOUND it. */
  const probe = want + 1;
  const needle = query.toLowerCase();
  const hits = [];
  let scanned = 0;
  let hitFileCap = false;

  const { files, unreadable } = markdownFiles(root, readdir);
  for (const file of files) {
    if (scanned >= SEARCH_FILES_MAX) { hitFileCap = true; break; }
    scanned += 1;
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].toLowerCase().includes(needle)) continue;
      hits.push({
        file: relative(REPO_ROOT, file).split(sep).join('/'),
        line: i + 1,
        text: lines[i].trim().slice(0, SEARCH_LINE_MAX),
      });
      if (hits.length >= probe) break;
    }
    if (hits.length >= probe) break;
  }

  /*
   * THREE independent reasons a search can be incomplete, and all three are stated
   * rather than collapsed into one flag: the file budget ran out, a (want+1)th match
   * was actually found, or part of the tree could not be read at all.
   */
  const resultsTruncated = hits.length > want;
  const results = hits.slice(0, want);
  const readIncomplete = unreadable.length > 0;

  return {
    query,
    limit: want,
    root: SEARCH_ROOT,
    scanned,
    truncated: hitFileCap || resultsTruncated || readIncomplete,
    resultsTruncated,
    scanTruncated: hitFileCap,
    // The directories that were never examined, each with why. Empty means full coverage.
    unreadable,
    // The single field a caller should read if it wants one answer to "can I trust this?".
    complete: !hitFileCap && !resultsTruncated && !readIncomplete,
    count: results.length,
    results,
  };
}
