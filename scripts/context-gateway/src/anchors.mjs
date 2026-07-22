/**
 * anchors.mjs — deterministic anchor extraction from a natural-language question.
 * ================================================================================
 * First stage of the compiler (Phase 0 §corrected-architecture): pull every concrete,
 * greppable handle out of the question BEFORE any retrieval, so retrieval is anchored
 * on evidence the asker actually named rather than fuzzy relevance. Pure function,
 * no I/O, no LLM — the same question always yields the same anchors.
 *
 * Anchor classes:
 *   paths   — explicit file paths (contain '/' and an extension, e.g. backend/routes/x.mjs)
 *   symbols — code identifiers (camelCase, PascalCase, snake_case, dotted, ≥4 chars)
 *   routes  — URL paths like /api/workout/sessions
 *   issues  — Linear ids (SWA-123)
 *   quoted  — "double-quoted" or `backticked` literals, verbatim
 *   terms   — remaining lowercase content words (stopworded) for catalog/doc search
 *
 * @module context-gateway/anchors
 */

const STOP = new Set(('a an and are as at be but by can did do does for from has have how i in is it its of on or ' +
  'our so that the their this to was we what when where which who why will with you your not no yes if then than ' +
  'audit check fix look find show tell explain review path save get make').split(' '));

// BOTH the segment length {1,256} AND the segment COUNT {1,40} are bounded: {1,256} alone fixed the
// slash-LESS vector but a slash-DENSE path with no trailing `.ext` still backtracked O(n²) —
// (start positions)×(tail backtrack), both O(n), independent of the length cap (hostile pass 6).
// Real repo paths are neither 256-char segments nor 40 segments deep.
const PATH_RE = /[\w.-]{1,256}(?:\/[\w.-]{1,256}){1,40}\.\w{1,10}/g;
const ROUTE_RE = /(?<![\w.])\/(?:api|ws)(?:\/[\w:-]+)+/g;
const ISSUE_RE = /\bSWA-\d+\b/g;
const QUOTED_RE = /"([^"]{2,80})"|`([^`]{2,80})`/g;
const SYMBOL_RE = /\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*|[a-z0-9]+(?:_[a-z0-9]+)+|[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/g;

/** @param {string} question @returns {{paths:string[],symbols:string[],routes:string[],issues:string[],quoted:string[],terms:string[]}} */
export function extractAnchors(question) {
  // Defense-in-depth length cap: a question is human/agent-supplied and never legitimately huge.
  // Capping bounds the work-unit for EVERY anchor regex against any future superlinear pattern,
  // independent of the per-regex quantifier bounds (hostile pass 6).
  const q = String(question).slice(0, 16384);
  const uniq = (arr) => [...new Set(arr)];

  const paths = uniq((q.match(PATH_RE) ?? []).map((p) => p.replaceAll('\\', '/')));
  const routes = uniq(q.match(ROUTE_RE) ?? []);
  const issues = uniq(q.match(ISSUE_RE) ?? []);
  const quoted = uniq([...q.matchAll(QUOTED_RE)].map((m) => m[1] ?? m[2]));

  // Symbols: identifier-shaped tokens, excluding anything already captured as a path/route/issue.
  const claimed = new Set([...paths, ...routes, ...issues].flatMap((s) => s.split(/[\/.]/)));
  const symbols = uniq((q.match(SYMBOL_RE) ?? []).filter((s) => s.length >= 4 && !claimed.has(s)));

  // Terms: plain content words for doc/catalog search.
  const stripped = q.replace(PATH_RE, ' ').replace(ROUTE_RE, ' ').replace(ISSUE_RE, ' ').replace(QUOTED_RE, ' ');
  const terms = uniq((stripped.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [])
    .filter((w) => !STOP.has(w) && !symbols.some((s) => s.toLowerCase() === w)));

  return { paths, symbols, routes, issues, quoted, terms };
}

/** Flat, deduped, priority-ordered grep needles (most specific first). */
export function anchorNeedles(anchors) {
  return [...new Set([...anchors.paths, ...anchors.routes, ...anchors.quoted, ...anchors.symbols, ...anchors.terms])];
}
