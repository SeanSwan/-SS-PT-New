/**
 * retrieve.mjs — deterministic evidence retrieval for the compiler (Phase 0 §corrected-architecture).
 * ===================================================================================================
 * Three retrieval lanes, all local, all $0, all bounded:
 *   searchCode    — `git grep -n -I --fixed-strings` per needle over the TRACKED universe only
 *                   (no shell, no regex injection, binaries skipped by -I). Returns match lines.
 *   findTests     — sibling tests for a hit path: same-basename *.test.* / *.spec.* anywhere
 *                   tracked, plus any tracked file under a tests/ or __tests__/ dir that
 *                   mentions the basename stem in its own name.
 *   searchCatalog — anchor terms vs the parsed catalog's decision text (A4 pointer lane;
 *                   rows are pointers — the compiler must OPEN winners, never quote rows).
 *
 * Every lane takes explicit caps so a broad needle cannot explode the packet (silent-cap
 * rule: callers receive `truncated` flags, never silently shortened results).
 *
 * @module context-gateway/retrieve
 */
import { execFileSync } from 'node:child_process';

/** git grep -l one fixed-string needle → COMPLETE file list (no line cap can hide a file). */
export function searchFiles(root, needle) {
  try {
    const out = execFileSync('git', ['-C', root, 'grep', '-I', '-l', '--fixed-strings', '--', needle],
      { maxBuffer: 16 * 1024 * 1024 }).toString('utf8');
    return out.split('\n').filter(Boolean).map((p) => p.replaceAll('\\', '/'));
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

/** git grep -n one fixed-string needle → [{path, line, text}] (text capped). For the tool layer. */
export function grepDetailed(root, needle, { maxHits = 60 } = {}) {
  let out = '';
  try {
    out = execFileSync('git', ['-C', root, 'grep', '-n', '-I', '--fixed-strings', '-e', needle],
      { maxBuffer: 16 * 1024 * 1024 }).toString('utf8');
  } catch (e) {
    if (e.status === 1) return { hits: [], truncated: false };
    throw e;
  }
  // Split on /\r?\n/ (NOT '\n'): git grep -n emits each matched line with the FILE's own line
  // ending, so CRLF-content repos leave a trailing '\r' that a '$'-anchored parse would reject
  // on every line (0 hits, truncated=true). Same CRLF class as the Phase 0 .env bug — caught by
  // live-probing the real repo, invisible to LF-only fixtures.
  const all = out.split(/\r?\n/).filter(Boolean);
  const hits = [];
  for (const l of all.slice(0, maxHits)) {
    const m = l.match(/^(.+?):(\d+):(.*)$/);
    if (m) hits.push({ path: m[1].replaceAll('\\', '/'), line: Number(m[2]), text: m[3].trim().slice(0, 200) });
  }
  return { hits, truncated: all.length > maxHits };
}

/** Match lines for a set of needles INSIDE one file. Returns line numbers (capped, per-file). */
export function matchLines(root, path, needles, { maxLines = 12 } = {}) {
  const lines = [];
  for (const n of needles) {
    let out = '';
    try {
      out = execFileSync('git', ['-C', root, 'grep', '-n', '--fixed-strings', '-e', n, '--', path],
        { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
    } catch (e) { if (e.status !== 1) throw e; }
    for (const l of out.split('\n').filter(Boolean)) {
      const m = l.match(/^.+?:(\d+):/);
      if (m) lines.push(Number(m[1]));
      if (lines.length >= maxLines) return [...new Set(lines)].sort((a, b) => a - b);
    }
  }
  return [...new Set(lines)].sort((a, b) => a - b);
}

/** True when the needle names the file itself (basename affinity — strongest retrieval signal). */
export function basenameAffinity(path, needle) {
  const base = path.split('/').pop().toLowerCase();
  const n = needle.toLowerCase().replaceAll('\\', '/');
  return base.includes(n.split('/').pop()) || n.includes(base.replace(/\.[^.]+$/, ''));
}

/** Sibling tests for a source path, from the tracked universe. */
export function findTests(relPath, tracked) {
  const stem = relPath.replaceAll('\\', '/').split('/').pop().replace(/\.[^.]+$/, '').toLowerCase();
  if (!stem) return [];
  const out = [];
  for (const t of tracked) {
    const tl = t.toLowerCase();
    const isTestFile = /\.(test|spec)\.[^/]+$/.test(tl) || /(^|\/)(tests?|__tests__)\//.test(tl);
    if (isTestFile && tl.includes(stem)) out.push(t);
  }
  return out.sort();
}

/** Score catalog rows by term overlap with (path + decision). Returns top rows, best first. */
export function searchCatalog(catalog, terms, { maxRows = 8 } = {}) {
  const scored = [];
  for (const [file, row] of catalog) {
    const hay = `${file} ${row.decision}`.toLowerCase();
    const score = terms.reduce((n, t) => n + (hay.includes(t.toLowerCase()) ? 1 : 0), 0);
    if (score > 0) scored.push({ file, row, score });
  }
  scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  return { rows: scored.slice(0, maxRows), truncated: scored.length > maxRows };
}

/** Merge overlapping/adjacent line windows: [{start,end}] -> minimal sorted cover. */
export function mergeWindows(windows, { joinGap = 5 } = {}) {
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const out = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.start <= last.end + joinGap) last.end = Math.max(last.end, w.end);
    else out.push({ ...w });
  }
  return out;
}
