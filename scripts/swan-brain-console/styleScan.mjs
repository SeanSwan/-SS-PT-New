/**
 * styleScan — read the class tokens an app module assigns, and the classes its stylesheets define.
 * @module scripts/swan-brain-console/styleScan
 *
 * WHY THIS IS NOT IN `app/`
 * `app/` holds what the BROWSER loads, and every module in it must have an entry in
 * `assetRoutes.mjs`. This is a Node-only parser, so it lives in the console root beside
 * `gateClassify.mjs` — the same boundary, for the same reason.
 *
 * WHY IT IS ITS OWN MODULE (round 10, 2026-09-20)
 * The assertions that use it are one subject; parsing JavaScript to find a class argument is
 * another. Separating them keeps `app/style-hooks.test.mjs` inside Rule 4's budget, and the
 * seam is real: nothing here knows what a defect is.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not evaluate. A class built from a template literal is reported as `dynamic` with
 * the static part it CAN see, and a class argument that is not a literal at all is reported
 * as `resolved: false`. Callers must treat both as gaps to be declared, never as empty —
 * a scanner that silently returns nothing for the hard cases is how the round-7 defect
 * survived a green suite.
 */
import { dirname, join, sep } from 'node:path';

/** Strip comments, so a class name quoted in prose is never mistaken for an assignment. */
export const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Split a call's argument list on top-level commas, respecting quotes and nesting. */
export function splitArgs(s) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (const ch of s) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    if (')]}'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((a) => a.trim());
}

/** Read the argument list of the call whose `(` is at index `open`. */
export function callArgs(src, open) {
  let i = open + 1, depth = 1, quote = null, args = '';
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (quote) { if (ch === quote) quote = null; }
    else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') { depth -= 1; if (depth === 0) break; }
    if (depth > 0) args += ch;
    i += 1;
  }
  return args;
}

/**
 * Remove every `${…}` from a template body, honouring nested braces.
 *
 * A regex cannot do this correctly: `${fn({ a: 1 })}` contains a `}`, so `/\$\{[^}]*\}/` stops
 * in the middle of the expression and leaves the remainder in the "static" text — which is the
 * exact failure this whole path exists to prevent. Counting braces is the honest version.
 */
function stripInterpolations(body) {
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '$' && body[i + 1] === '{') {
      let depth = 0;
      let j = i + 1;
      for (; j < body.length; j += 1) {
        if (body[j] === '{') depth += 1;
        else if (body[j] === '}') { depth -= 1; if (depth === 0) break; }
      }
      out += ' ';
      i = j;
    } else out += body[i];
  }
  return out;
}

/**
 * The class tokens in one class-argument expression.
 *
 * Returns `{ tokens, dynamic, resolved }`. `null` and `''` mean "no class", which is a
 * decision rather than a gap — they come back `resolved: true` with no tokens.
 */
export function tokensOf(expr) {
  if (expr === undefined || expr === 'null' || expr === "''" || expr === '""') {
    return { tokens: [], dynamic: null, resolved: true };
  }
  const bare = expr.match(/^['"]([^'"$]*)['"]$/);
  if (bare) return { tokens: bare[1].split(/\s+/).filter(Boolean), dynamic: null, resolved: true };

  /*
   * ROUND 11 (2026-09-20) — EVERY STATIC SEGMENT, NOT JUST THE FIRST. The pattern here used to
   * be `/^`([^`$]*)\$\{/`, which captures only the text BEFORE the first interpolation. Astra
   * changed a card's class to `` `card tone-${statusTone(key)} missing-style-probe` `` and this
   * suite returned **6/6 PASS**: `missing-style-probe` sits AFTER the `${…}` and was never
   * looked at. A template literal is a concatenation, so every static segment is a source of
   * class tokens, and the guard has to read all of them.
   */
  if (expr.startsWith('`') && expr.endsWith('`') && expr.length >= 2) {
    const body = expr.slice(1, -1);
    // A trailing `-` is the static half of a computed token (`tone-${x}`), not a class.
    const tokens = stripInterpolations(body)
      .split(/\s+/).filter(Boolean).filter((t) => !t.endsWith('-'));
    return { tokens, dynamic: body.includes('${') ? expr : null, resolved: true };
  }

  // A conditional whose branches are literals: every branch is still a token to check.
  const found = [...expr.matchAll(/'([^']*)'/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter((t) => t && /^[a-z][a-z0-9-]*$/.test(t));
  if (found.length) return { tokens: found, dynamic: null, resolved: true };

  return { tokens: [], dynamic: null, resolved: false };
}

/**
 * The index of `className` in a module's own `node(...)` signature, or null.
 *
 * Read from the source rather than assumed, because the two shapes in this console are
 * `node(tag, className, text)` and `node(doc, tag, className, text)`.
 */
export function classArgIndex(src) {
  const m = src.match(/function\s+node\(([^)]*)\)/);
  if (!m) return null;
  const params = m[1].split(',').map((p) => p.trim());
  const i = params.findIndex((p) => p === 'className');
  return i < 0 ? null : i;
}

/**
 * The class-argument index for a module that may have IMPORTED the helper.
 *
 * ROUND 11 (2026-09-20). `classArgIndex` reads the signature out of the module's own source,
 * which is right until a module uses a shared helper instead of defining one. Round 11 moved
 * `node` into `app-judge-render.mjs` so the `acquireStorage` boundary could sit in the DOM layer,
 * and both consumers kept calling `node(...)` — at which point this scanner reported
 * "app-judge.js calls node(...) but no node(tag, className, ...) signature was found". That is a
 * TRUE statement about the file and a FALSE one about the code, and it is the failure mode this
 * whole subsystem is about: a check whose scope is narrower than its name.
 *
 * So the import is FOLLOWED. One definition, read wherever it lives, instead of a rule that
 * silently requires every helper to be local.
 */
export function classArgIndexFor(readSource, src, file) {
  const local = classArgIndex(src);
  if (local !== null) return local;
  const dir = dirname(file);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const named = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
    if (!named.includes('node')) continue;
    let targetSrc;
    try {
      // `readSource` is relative to the scanned directory, so the importer's own directory is
      // the base. `sep` normalisation keeps this identical on Windows and POSIX.
      targetSrc = strip(readSource(join(dir, m[2]).split(sep).join('/')));
    } catch {
      continue; // an unreadable import is reported by the module-graph guard, not here
    }
    const idx = classArgIndex(targetSrc);
    if (idx !== null) return idx;
  }
  return null;
}

/** Scan one module. Never throws: an undeterminable class position is reported as a note. */
export function scanModule(readSource, file) {
  const src = strip(readSource(file));
  const tokens = new Set();
  const dynamic = [];
  const unresolved = [];
  const notes = [];
  let sites = 0;

  const argIdx = classArgIndexFor(readSource, src, file);
  /*
   * `(?<!function )` is load-bearing: `function node(tag, className, text) {` CONTAINS the
   * substring `node(`, so without it the helper's own definition is scanned as a call and
   * its `className` PARAMETER is reported as an unresolvable class expression. The round-10
   * sweep caught exactly that, in itself, on its first run.
   */
  const nodeCalls = [...src.matchAll(/(?<!function )\bnode\(/g)];
  if (nodeCalls.length && argIdx === null) {
    notes.push(`${file} calls node(...) but no node(tag, className, ...) signature was found, locally or via an import`);
  }
  if (argIdx !== null) {
    for (const m of nodeCalls) {
      sites += 1;
      const expr = splitArgs(callArgs(src, m.index + m[0].length - 1))[argIdx];
      const r = tokensOf(expr);
      for (const t of r.tokens) tokens.add(t);
      if (r.dynamic) dynamic.push(r.dynamic);
      else if (!r.resolved) unresolved.push(expr);
    }
  }
  for (const m of src.matchAll(/\.className\s*=\s*([^;\n]+)/g)) {
    const expr = m[1].trim();
    if (expr === 'className') continue; // the helper's own pass-through
    const r = tokensOf(expr);
    for (const t of r.tokens) tokens.add(t);
    if (r.dynamic) dynamic.push(r.dynamic);
    else if (!r.resolved) unresolved.push(expr);
  }
  /*
   * ROUND 11 — the two methods take DIFFERENT shapes, and treating them alike is a false
   * positive in both directions.
   *
   *   classList.add('a', 'b')        — N class tokens: every argument is a class.
   *   classList.toggle('a', force)   — ONE class token plus a boolean force flag.
   *
   * The previous pattern read only the first argument and only single quotes, so `add('a', 'b')`
   * reported `a` and never `b`, and `add("a")` reported nothing. The first attempt at a fix read
   * every quoted string in the call, which immediately produced two false orphans from
   * `toggle('blocked', x !== 'DECLARED_BLOCKED' && x !== 'VERIFIED_BLOCKED')` — those literals
   * are COMPARISON VALUES, not classes. The guard caught its own over-reach, which is the point
   * of running it on every edit.
   */
  for (const m of src.matchAll(/classList\.add\(([^)]*)\)/g)) {
    for (const q of m[1].matchAll(/['"]([^'"]+)['"]/g)) {
      for (const t of q[1].split(/\s+/).filter(Boolean)) tokens.add(t);
    }
  }
  for (const m of src.matchAll(/classList\.toggle\(\s*['"]([^'"]+)['"]/g)) {
    for (const t of m[1].split(/\s+/).filter(Boolean)) tokens.add(t);
  }
  /*
   * ROUND 11 — `setAttribute('class', …)` was not read at all. It assigns the same attribute
   * as `.className =`, so it is the same class source, and it was the third assignment form
   * Astra listed as missing.
   */
  for (const m of src.matchAll(/setAttribute\(\s*['"]class['"]\s*,\s*([^)]+)\)/g)) {
    const expr = m[1].trim();
    const r = tokensOf(expr);
    for (const t of r.tokens) tokens.add(t);
    if (r.dynamic) dynamic.push(r.dynamic);
    else if (!r.resolved) unresolved.push(expr);
  }
  return { file, tokens, dynamic, unresolved, notes, sites };
}

/** Class names defined by every stylesheet in `appDir`. */
export function styledClasses(readSource, stylesheetNames) {
  const styled = new Set();
  for (const f of stylesheetNames) {
    const css = strip(readSource(f));
    for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) styled.add(m[1]);
  }
  return styled;
}

/**
 * Classes a test or the harness SELECTS on — legitimately rule-free, and DERIVED from the
 * selectors that use them so a hook that stops being used stops being excused.
 */
export function derivedHooks(sources) {
  const SELECTOR_CALL = /(?:locator|querySelector|querySelectorAll|\$|waitForSelector)\(\s*['"`]([^'"`]+)['"`]/g;
  const hooks = new Set();
  for (const src of sources) {
    for (const m of src.matchAll(SELECTOR_CALL)) {
      for (const c of m[1].matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) hooks.add(c[1]);
    }
  }
  return hooks;
}
