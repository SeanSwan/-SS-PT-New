/**
 * ============================================================================
 * FILE: authorizePairingScan.mjs
 * PURPOSE: Detector behind tests/api/authorizeVerifyClientAccessPairingGuard.test.mjs
 *          — finds route guards that PAIR `authorize([...'client'...])` with
 *          `verifyClientAccessByUserId`, the signature of the `'user'`-role
 *          defect class (register 77 §A2).
 * RULES OBSERVED: rule 4 (the guard test and this helper each stay well under
 *                 the 300-line cap), rule 18 (test-infrastructure pattern).
 * ============================================================================
 *
 * Lives in tests/helpers rather than inside the guard test so the detector can
 * be driven by synthetic fixtures and by throwaway probes without importing a
 * vitest module graph.
 *
 * WHAT IT CANNOT SEE (do not overclaim its coverage):
 * - A `role === 'client'` check that is not an `authorize([...])` call.
 * - A target-side check (is the SUBJECT a client?), which is a different question.
 * - Indirection deeper than one named-array hop, or an `authorize(` call whose
 *   role list is not a literal array — the latter is reported by
 *   `findUnreadableAuthorizeArgs` so the caller can FAIL instead of silently
 *   skipping it.
 */
const GROUPS = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = new Set([')', ']', '}']);

/**
 * Blank string bodies and comments, preserving length, newlines and every
 * bracket index — so structural matching cannot be fooled by a role name that
 * merely appears in a literal, or by a commented-out route.
 */
export function mask(source) {
  const out = source.split('');
  const blank = (from, to) => { for (let k = from; k < to; k += 1) if (out[k] !== '\n') out[k] = ' '; };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      const e = source.indexOf('\n', i);
      const end = e < 0 ? source.length : e;
      blank(i, end); i = end; continue;
    }
    if (ch === '/' && next === '*') {
      const e = source.indexOf('*/', i + 2);
      const end = e < 0 ? source.length : e + 2;
      blank(i, end); i = end; continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === ch) { j += 1; break; }
        j += 1;
      }
      blank(i + 1, j - 1);
      i = j;
      continue;
    }
    i += 1;
  }
  return out.join('');
}

export const lineAt = (source, index) => source.slice(0, index).split('\n').length;

/** Index of the closer matching the group opened at `openIndex`, or -1. */
export function groupEnd(masked, openIndex) {
  const opener = masked[openIndex];
  const closer = GROUPS[opener];
  if (!closer) return -1;
  let depth = 0;
  for (let i = openIndex; i < masked.length; i += 1) {
    if (masked[i] === opener) depth += 1;
    else if (masked[i] === closer) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

/** Innermost balanced group enclosing `from`, as [start, end], or null at top level. */
export function enclosingGroup(masked, from) {
  let depth = 0;
  for (let i = from - 1; i >= 0; i -= 1) {
    const ch = masked[i];
    if (CLOSERS.has(ch)) depth += 1;
    else if (GROUPS[ch]) {
      if (depth === 0) { const end = groupEnd(masked, i); return end < 0 ? null : [i, end]; }
      depth -= 1;
    }
  }
  return null;
}

const hasVerifyCall = (text) => /verifyClientAccessByUserId\s*\(/.test(text);

/** `const NAME = [ ... ];` spans, for one level of named-guard-array indirection. */
export function collectNamedArrays(masked) {
  const named = new Map();
  const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
  let m;
  while ((m = re.exec(masked))) {
    const start = masked.indexOf('[', m.index);
    const end = groupEnd(masked, start);
    if (end > start) named.set(m[1], [start, end]);
  }
  return named;
}

/** True when a guard ARRAY is spread into some OTHER group carrying a verify call. */
export function spreadIntoPairedGroup(masked, name, ownSpan) {
  const re = new RegExp(`\\b${name}\\b`, 'g');
  let m;
  while ((m = re.exec(masked))) {
    if (m.index >= ownSpan[0] && m.index <= ownSpan[1]) continue;
    const g = enclosingGroup(masked, m.index);
    if (g && hasVerifyCall(masked.slice(g[0], g[1] + 1))) return true;
  }
  return false;
}

export const parseRoles = (text) => text
  .split(',')
  .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
  .filter(Boolean);

/**
 * Every `authorize([...])` guard whose list contains 'client' AND which is paired
 * with `verifyClientAccessByUserId` inside the same guard group.
 */
export function findPairedClientAuthorizeGuards(source, file = '<inline>') {
  const masked = mask(source);
  const named = collectNamedArrays(masked);
  const found = [];
  const re = /\bauthorize\s*\(/g;
  let m;
  while ((m = re.exec(masked))) {
    if (!/^\s*\[/.test(masked.slice(m.index + m[0].length))) continue;
    const openBracket = masked.indexOf('[', m.index + m[0].length);
    if (openBracket < 0) continue;
    const closeBracket = groupEnd(masked, openBracket);
    if (closeBracket < 0) continue;
    const roles = parseRoles(source.slice(openBracket + 1, closeBracket));
    if (!roles.includes('client')) continue;

    const group = enclosingGroup(masked, m.index);
    if (!group) continue;
    const groupText = masked.slice(group[0], group[1] + 1);
    let paired = hasVerifyCall(groupText);
    if (!paired) {
      for (const [name, span] of named) {
        if (group[0] !== span[0] || group[1] !== span[1]) continue;
        paired = spreadIntoPairedGroup(masked, name, span);
      }
    }
    if (!paired) continue;

    found.push({
      file,
      line: lineAt(source, m.index),
      roles,
      guard: source.slice(group[0], group[1] + 1).split('\n').map((l) => l.trim()).filter(Boolean).join(' ').slice(0, 180),
    });
  }
  return found;
}

/**
 * The defect itself: a paired guard whose list omits the default role. A pairing
 * that already carries `'user'` is NOT a violation — the two guards agree there.
 */
export const isPairingViolation = (finding) => !finding.roles.includes('user');

/** Regex identifying a file that imports the shared authorize middleware. */
export const AUTHORIZE_IMPORT = /import\s*\{[^}]*\bauthorize\b[^}]*\}\s*from\s*'\.\.\/middleware\/authMiddleware\.mjs'/;

/**
 * `authorize(...)` calls in files that import that middleware but pass something
 * other than a literal array — the sweep cannot read those role lists, so the
 * caller must FAIL loudly rather than silently skip them.
 */
export function findUnreadableAuthorizeArgs(source, file = '<inline>') {
  if (!AUTHORIZE_IMPORT.test(source)) return [];
  const masked = mask(source);
  const out = [];
  const re = /\bauthorize\s*\(/g;
  let m;
  while ((m = re.exec(masked))) {
    if (!/^\s*\[/.test(masked.slice(m.index + m[0].length))) out.push({ file, line: lineAt(source, m.index) });
  }
  return out;
}
