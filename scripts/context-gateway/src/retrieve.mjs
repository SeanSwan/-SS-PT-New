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
