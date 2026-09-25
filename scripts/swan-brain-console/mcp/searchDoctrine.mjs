/**
 * searchDoctrine — the bounded doctrine search behind `swan_search_doctrine`.
 * @module scripts/swan-brain-console/mcp/searchDoctrine
 *
 * EXTRACTED FROM `tools.mjs` IN S4, and not only for Rule 4. This handler is the one
 * tool on the surface with a real blast radius: it walks a directory tree and reads
 * every `.md` file it finds. "Read-only" does not mean "cheap", so the bounds below are
 * the most load-bearing code in the MCP server — and they now sit in a file where that
 * is the first thing a reader sees, instead of being buried between a registry literal
 * and a dispatcher.
 *
 * BOUNDS (ruled D17d — the original had none at all): one allowlisted root, a
 * query-length cap, a result cap, and a scanned-file cap. Every result carries
 * `file:line` so a claim can be followed to its source rather than trusted.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO } from '../fleetData.mjs';

/** The search is allowlisted to one tree. */
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
 * ROUND 11 (2026-09-20), finding F16 — A READ FAILURE IS NOT AN EMPTY DIRECTORY.
 * This used to `catch { return; }` on `readdirSync`, so a subtree the process could not READ
 * simply vanished from the walk. The search then reported `count: 0`, `truncated: false`,
 * `scanTruncated: false` — a confident, exhaustive "no matches" for content it had never
 * examined. Astra reproduced it with one readable file and one directory whose reader threw
 * `EACCES`, and the result was indistinguishable from a clean miss.
 *
 * The failures are now RETURNED. A caller that wants to claim completeness has to say what it
 * could not read, and `swanSearchDoctrine` folds them into `truncated` for exactly that reason.
 *
 * `readdir` is injectable — the same boundary pattern as `loadRegistries(fetchImpl)` and
 * `readGateHealth(root, { now })` — because an unreadable directory cannot be created portably
 * in a test, and a guard that cannot be exercised is a guard nobody has read.
 */
export function markdownFiles(root, readdir = readdirSync) {
  const out = [];
  const unreadable = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdir(dir, { withFileTypes: true });
    } catch (err) {
      unreadable.push({
        dir: relative(REPO, dir).split(sep).join('/'),
        reason: String(err?.code ?? err?.message ?? err),
      });
      return; // skipped for THIS traversal, and now recorded rather than forgotten
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  };
  walk(root);
  return { files: out, unreadable };
}

/**
 * Search the doctrine tree for a literal substring.
 *
 * Bounded four ways — one allowlisted root, a query-length cap, a result cap and a
 * scanned-file cap. The returned object reports `scanned` and `truncated` so a caller
 * can tell "there were no more matches" from "I stopped looking".
 *
 * ROUND 8 (2026-09-20) — `truncated` USED TO LIE, and this is the mechanism.
 * The old loop pushed a match and then did `if (results.length >= want) { truncated = true;
 * break; }`. So a search that found EXACTLY `want` matches — an exhaustive, complete search
 * with nothing left behind — reported `truncated: true`. Measured: the needle `Crystalline`
 * has exactly 38 matches tree-wide, and `limit: 38` returned all 38 while reporting
 * `truncated: true`. An agent reading that concludes there are more matches and either
 * re-runs at a higher limit (getting the identical 38) or reports a complete answer as
 * partial. The field existed to prevent a caller assuming completeness; it was denying
 * completeness that was real.
 *
 * The fix is to make truncation a FACT rather than an assumption: search for `want + 1`
 * matches and return `want`. Truncation is then exactly "a (want+1)th match exists", which
 * is decidable. The cost is that a search finding exactly `want` matches must finish
 * scanning the tree to prove there is no next one — bounded by SEARCH_FILES_MAX, and the
 * price of a flag that can be trusted.
 */
export function swanSearchDoctrine({ query, limit = SEARCH_LIMIT_DEFAULT, readdir = readdirSync } = {}) {
  if (typeof query !== 'string' || query.trim().length < 2) {
    throw new Error('query must be a string of at least 2 characters');
  }
  if (query.length > SEARCH_QUERY_MAX) {
    throw new Error(`query exceeds ${SEARCH_QUERY_MAX} characters`);
  }
  const root = join(REPO, SEARCH_ROOT);
  if (!existsSync(root)) {
    throw new Error(`doctrine root not found at ${SEARCH_ROOT} — nothing to search`);
  }
  const want = clampLimit(limit);
  /* One past the answer, so "is there more?" is answered by having FOUND it, not by guessing. */
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
        file: relative(REPO, file).split(sep).join('/'),
        line: i + 1,
        text: lines[i].trim().slice(0, SEARCH_LINE_MAX),
      });
      if (hits.length >= probe) break;
    }
    if (hits.length >= probe) break;
  }

  /*
   * THREE independent reasons a search can be incomplete, and all three are now stated rather
   * than collapsed into one flag: the file budget ran out, a (want+1)th match was actually found,
   * or part of the tree could not be read at all. `resultsTruncated` and `scanTruncated`
   * distinguish the first two for a caller that cares which; `unreadable` carries the third.
   *
   * ROUND 11 (finding F16): the third one used to be invisible. An unreadable subtree produced a
   * confident "no matches" with `truncated: false` — the single worst shape this handler can
   * return, because an agent has no way to tell it apart from an exhaustive search.
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
