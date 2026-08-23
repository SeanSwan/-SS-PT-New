/**
 * sourceScan.mjs — JavaScript source scanning primitives for route extraction
 * ===========================================================================
 * Blueprint
 * ---------
 * PURPOSE   The lexical layer under routeTable.mjs: strip comments, walk balanced
 *           brackets, split call arguments, and read import/const alias bindings.
 *           Split out of routeTable.mjs to keep every file under the 300-line cap
 *           (CLAUDE.md Rule 4).
 *
 * WHY IT IS FUSSIER THAN IT LOOKS
 *           These helpers must survive real source, not idealised source. Regex
 *           literals containing quotes, template literals containing `//`, and
 *           escaped characters inside strings have all appeared in this codebase's
 *           route files, and each one can silently truncate the scan. A truncated
 *           scan loses routes, and a route table that loses routes turns every
 *           "this endpoint does not exist" claim into a possible false positive.
 */
import fs from 'fs';

/**
 * Can a `/` at this point start a regex literal rather than be a division operator?
 * Standard heuristic: a regex may follow an operator, an opening bracket, a comma,
 * or a keyword — but not an identifier, a number, or a closing bracket.
 */
function regexCanFollow(out) {
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue;
    if ('(,=:[!&|?{};+-*%~^<>'.includes(c)) return true;
    if (/[A-Za-z_$]/.test(c)) {
      const word = (out.slice(Math.max(0, i - 10), i + 1).match(/[A-Za-z_$][\w$]*$/) || [''])[0];
      return ['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else', 'yield', 'await'].includes(word);
    }
    return false;
  }
  return true;
}

/**
 * Strip line and block comments so commented-out routes are never extracted.
 *
 * Regex literals MUST be recognised, not just strings. workoutSummaryRoutes.mjs:34
 * contains `/[&<>"']/g` — a regex holding one double and one single quote. Treating
 * it as code put the scanner into a string state it never left, silently dropping
 * that file's only route from the table. A route table that loses routes turns every
 * "this endpoint does not exist" claim into a possible false positive, so this is a
 * correctness requirement of the instrument, not a nicety.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === '/' && regexCanFollow(out)) {
        // Copy the regex literal verbatim (including its character class) so its
        // quotes can never be mistaken for string delimiters.
        let j = i + 1;
        let inClass = false;
        let closed = false;
        while (j < src.length) {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '\n') break; // unterminated — not a regex after all
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) { closed = true; break; }
          j++;
        }
        if (closed) {
          out += src.slice(i, j + 1).replace(/[^\n]/g, ' ');
          i = j + 1;
          continue;
        }
      }
      if (c === "'") state = 'squote';
      else if (c === '"') state = 'dquote';
      else if (c === '`') state = 'tquote';
      out += c; i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; } else out += ' ';
      i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (c === '\\') { out += c + (n ?? ''); i += 2; continue; }
    if ((state === 'squote' && c === "'") || (state === 'dquote' && c === '"') || (state === 'tquote' && c === '`')) {
      state = 'code';
    }
    out += c; i++;
  }
  return out;
}

/** Read a source file with comments stripped, plus a line-number lookup. */
function loadSource(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const code = stripComments(raw);
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const lineAt = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
  return { code, lineAt };
}

/** Collect `import <id> from '<rel>'` default bindings out of already-stripped source. */
function importBindings(code) {
  const map = new Map();
  for (const m of code.matchAll(/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

/**
 * Build a local-name -> canonical-gate-name alias map for one file.
 *
 * WHY THIS EXISTS: two aliasing forms are in live use, and missing either makes the
 * table under-report a role ceiling — i.e. report a route as ungated when it is not,
 * which is a MISSED drift finding, the exact failure this harness is built to prevent.
 *   1. Named-import aliases   `import { protect as authMiddleware, adminOnly as isAdmin }`
 *      (aiMonitoringRoutes.mjs:24, admin.mjs:3)
 *   2. File-local const aliases  `const requireTrainer = trainerOrAdminOnly;`
 *      (gamificationV1Routes.mjs:45-54)
 * A locally-declared arrow gate that checks a role inline is also recognised
 * (adminPackageRoutes.mjs:73) — see localArrowRole().
 */
function aliasBindings(code) {
  const alias = new Map();

  for (const m of code.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const part of m[1].split(',')) {
      const as = part.trim().match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (as) alias.set(as[2], as[1]);
    }
  }

  for (const m of code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+);/g)) {
    const [, name, rhs] = m;
    const expr = rhs.trim();
    if (name === expr) continue;
    if (/^[A-Za-z_$][\w$]*$/.test(expr) || /^(authorize|requireAnyRole)\s*\(/.test(expr)) {
      alias.set(name, expr);
    }
  }

  for (const [name, roles] of localArrowRoles(code)) alias.set(name, `__roles:${roles.join('|')}`);

  return alias;
}

/**
 * Recognise a locally-declared arrow middleware whose entire job is a single role check:
 *   const requireAdmin = (req, res, next) => { if (req.user?.role !== 'admin') return res.status(403)...; next(); };
 * Only the unambiguous single-role !== / === shape is read. Anything more complex is
 * deliberately left unrecognised so it surfaces in unknownGates instead of being guessed.
 */
function localArrowRoles(code) {
  const found = [];
  const re = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(\s*req\s*,\s*res\s*,\s*next\s*\)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const braceOpen = code.indexOf('{', m.index + m[0].length - 1);
    const end = matchParen(code, braceOpen);
    if (end < 0) continue;
    const body = code.slice(braceOpen, end);
    if (!/\bres\s*\.\s*status\s*\(\s*403\s*\)/.test(body)) continue;
    const neq = [...body.matchAll(/req\s*\.\s*user\s*\??\.\s*role\s*!==\s*['"]([a-zA-Z_]+)['"]/g)].map((x) => x[1]);
    const eq = [...body.matchAll(/req\s*\.\s*user\s*\??\.\s*role\s*===\s*['"]([a-zA-Z_]+)['"]/g)].map((x) => x[1]);
    if (neq.length === 1 && eq.length === 0) found.push([m[1], neq]);
    else if (eq.length >= 1 && neq.length === 0) found.push([m[1], [...new Set(eq)]]);
  }
  return found;
}

/**
 * From an open paren at `open`, return the index just past the matching close
 * paren, respecting nested brackets and string literals.
 */
function matchParen(code, open) {
  let depth = 0;
  let i = open;
  let q = null;
  while (i < code.length) {
    const c = code[i];
    if (q) {
      if (c === '\\') { i += 2; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; i++; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return -1;
}

/** Split the inside of a call's parens into top-level (depth-0) argument strings. */
function splitArgs(inner) {
  const args = [];
  let depth = 0;
  let q = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { args.push(inner.slice(start, i).trim()); start = i + 1; }
  }
  const last = inner.slice(start).trim();
  if (last) args.push(last);
  return args;
}

/** True if an argument is an inline handler function rather than a named middleware. */
function isInlineHandler(arg) {
  return /^(async\s*)?(\(|function\b)/.test(arg) || /=>/.test(arg);
}


export { regexCanFollow, stripComments, loadSource, importBindings, aliasBindings, localArrowRoles, matchParen, splitArgs, isInlineHandler };
