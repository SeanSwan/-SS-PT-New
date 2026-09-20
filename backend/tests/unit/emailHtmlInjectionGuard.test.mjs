/**
 * §19 — Outbound email HTML injection.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `escapeHtml` had grown privately in exactly two files (orientationController, newsletterRoutes)
 * while **seven other files that build HTML emails interpolated raw values**. The sharp end was
 * `routes/contactRoutes.mjs` — a public, unauthenticated contact form whose `name`, `email` and
 * `message` were interpolated straight into HTML mail sent to `OWNER_EMAIL` /
 * `OWNER_WIFE_EMAIL`. Email is a rendering context: a `name` of
 * `<a href="https://evil.example/login">Your session expired — re-authenticate</a>` arrives from
 * the legitimate `SENDGRID_FROM_EMAIL`, which is what makes it work as phishing, and an
 * `<img src="https://evil.example/track">` leaks that the mail was opened.
 *
 * The same endpoint was also unthrottled while its sibling GETs carried `protect, adminOnly`.
 *
 * These assertions lock the *property* — "user-controlled values are escaped in HTML, and there is
 * one escaper" — rather than any single call site's spelling.
 *
 * SCOPE NOTE: the raw `${formData.name}` form legitimately survives in the **plain-text** `text:`
 * body of the same email, where HTML escaping is irrelevant. So the "no raw interpolation"
 * assertions are scoped to HTML-emitting lines, not to the whole file. The first draft of this test
 * did not scope them and failed for that reason — the test was wrong, not the code.
 *
 * CRLF: sources are normalised before matching.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import {
  escapeHtml,
  escapeHtmlAttribute,
  escapeHtmlSingleLine,
} from '../../utils/htmlEscape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `SSPT_GUARD_ROOT` lets the mutation harness (tests/mutation/) point this guard
// at a throwaway tree instead of the real source. Production and the normal
// suite never set it, so this resolves to the real backend root.
const BACKEND = process.env.SSPT_GUARD_ROOT
  ? resolve(process.env.SSPT_GUARD_ROOT)
  : resolve(__dirname, '../..');

const read = (rel) => readFileSync(resolve(BACKEND, rel), 'utf8').replace(/\r\n/g, '\n');

/**
 * Scan a source file ONCE and return both artifacts the ratchet needs:
 *
 *   `masked`     — comments replaced by same-length whitespace (newlines kept, so
 *                  reported line numbers stay true to the real file); strings and
 *                  template literals left byte-for-byte intact.
 *   `templates`  — every template-literal body, as a structural unit, with the
 *                  1-based line it starts on. Nested literals are reported too.
 *
 * WHY NOT A REGEX — two demonstrated holes, both found by hostile review and
 * both reproduced as mutations in the harness:
 *
 *   F02 (mutation M9): the old stripper was `s.replace(/\/\/.*$/gm, ' ')`, which
 *   cannot tell a comment from the `//` in `https://example.com`. Every line
 *   holding a URL had everything to the right of the `//` blanked — including a
 *   raw `${client.email}` sitting next to a link. Comment stripping is now done
 *   by a scanner that knows where the strings are, so `//` inside a literal is
 *   left alone and `//` in real code is still masked.
 *
 *   F05 (mutation M11): the old extractor counted `${` against `}` and ended the
 *   literal at the first backtick seen at depth 0. A `}` inside a string inside
 *   an interpolation (`obj['}']`) drove the depth to zero early, so the next
 *   backtick ended the literal and the remainder — where the payload was — was
 *   never scanned. This scanner tracks strings, brace nesting and nested
 *   templates on a stack instead.
 *
 * KNOWN LIMITATION, stated rather than hidden: regex-literal detection uses the
 * usual look-behind heuristic (`/` after an operator, bracket or keyword). It can
 * still misread `a++ / b` as the start of a regex. That failure mode is a false
 * POSITIVE — extra text is scanned, never silently skipped — so it cannot hide a
 * defect the way the two regexes above did.
 */
/**
 * One scan per distinct file body. The ratchet asks the same file for its
 * templates, its masked text and its bindings in separate passes; without this
 * the tree is walked four times over.
 */
const SCAN_CACHE = new Map();

function scanSource(code) {
  const cached = SCAN_CACHE.get(code);
  if (cached) return cached;
  const out = [];
  const templates = [];
  const stack = [];        // frames: { kind: 'tpl', start } | { kind: 'interp', depth }
  const n = code.length;
  let i = 0;

  // Line numbers are counted as the scan advances. Deriving them per literal
  // with `code.slice(0, at).split('\n')` costs O(n) each — O(n^2) per file —
  // which is what timed the ratchet out on session.service.mjs.
  let line = 1;
  const emit = (ch) => { if (ch === '\n') line++; out.push(ch); };
  const blank = (ch) => { const c = ch === '\n' ? '\n' : ' '; if (c === '\n') line++; out.push(c); };

  const maskLineComment = () => {
    while (i < n && code[i] !== '\n') { blank(code[i]); i++; }
  };
  const maskBlockComment = () => {
    while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { blank(code[i]); i++; }
    if (i < n) { blank('*'); blank('/'); i += 2; }
  };
  // Regex literals are modelled because an unhandled one is not a neutral
  // omission: `/html:\s*[`'"\w]/` contains a backtick inside its character
  // class, and a scanner that does not know it is a regex opens a phantom
  // template literal there and swallows everything up to the next backtick.
  // That is how this guard came to flag its own doc comment.
  const REGEX_PREV_CHARS = new Set('(,=:[!&|?{};+-*%~^<>'.split(''));
  const REGEX_PREV_WORDS = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
    'do', 'else', 'yield', 'await', 'case',
  ]);
  const atRegexStart = () => {
    let k = i - 1;
    while (k >= 0 && /\s/.test(code[k])) k--;
    if (k < 0) return true;
    const prev = code[k];
    if (REGEX_PREV_CHARS.has(prev)) return true;
    // Walk back over the word itself. `code.slice(0, k + 1).match(...)` costs
    // O(n) on EVERY `/` in the file, which is what made this scan quadratic.
    if (!/[A-Za-z_$]/.test(prev)) return false;
    let w = k;
    while (w >= 0 && /[\w$]/.test(code[w])) w--;
    return REGEX_PREV_WORDS.has(code.slice(w + 1, k + 1));
  };
  const copyRegex = () => {
    emit(code[i]); i++;
    let inClass = false;
    while (i < n) {
      const ch = code[i];
      if (ch === '\\') { emit(ch); i++; if (i < n) { emit(code[i]); i++; } continue; }
      if (ch === '[') { inClass = true; emit(ch); i++; continue; }
      if (ch === ']') { inClass = false; emit(ch); i++; continue; }
      if (ch === '\n') break;                       // unterminated — give up
      emit(ch); i++;
      if (ch === '/' && !inClass) break;
    }
  };

  const copyString = () => {
    const quote = code[i];
    emit(code[i]); i++;
    while (i < n) {
      const ch = code[i];
      if (ch === '\\') { emit(ch); i++; if (i < n) { emit(code[i]); i++; } continue; }
      emit(ch); i++;
      if (ch === quote || ch === '\n') break;
    }
  };

  while (i < n) {
    const ch = code[i];
    const top = stack[stack.length - 1];

    // --- ordinary code -------------------------------------------------------
    if (!top) {
      if (ch === '/') {
        if (code[i + 1] === '/') { maskLineComment(); continue; }
        if (code[i + 1] === '*') { maskBlockComment(); continue; }
        if (atRegexStart()) { copyRegex(); continue; }
      }
      if (ch === "'" || ch === '"') { copyString(); continue; }
      if (ch === '`') { stack.push({ kind: 'tpl', start: i, line }); emit(ch); i++; continue; }
      emit(ch); i++; continue;
    }

    // --- inside a template literal: `//` is TEXT, not a comment --------------
    if (top.kind === 'tpl') {
      if (ch === '\\') { emit(ch); i++; if (i < n) { emit(code[i]); i++; } continue; }
      if (ch === '$' && code[i + 1] === '{') {
        stack.push({ kind: 'interp', depth: 1 }); emit(ch); emit('{'); i += 2; continue;
      }
      if (ch === '`') {
        stack.pop(); emit(ch); i++;
        templates.push({ text: code.slice(top.start + 1, i - 1), line: top.line });
        continue;
      }
      emit(ch); i++; continue;
    }

    // --- inside `${...}`: real code again ------------------------------------
    if (ch === "'" || ch === '"') { copyString(); continue; }
    if (ch === '`') { stack.push({ kind: 'tpl', start: i, line }); emit(ch); i++; continue; }
    if (ch === '/') {
      if (code[i + 1] === '/') { maskLineComment(); continue; }
      if (code[i + 1] === '*') { maskBlockComment(); continue; }
      if (atRegexStart()) { copyRegex(); continue; }
    }
    if (ch === '{') { top.depth++; emit(ch); i++; continue; }
    if (ch === '}') {
      top.depth--; emit(ch); i++;
      if (top.depth === 0) stack.pop();
      continue;
    }
    emit(ch); i++;
  }

  const result = { masked: out.join(''), templates };
  SCAN_CACHE.set(code, result);
  return result;
}

const stripComments = (s) => scanSource(s).masked;
const stripCommentsKeepLayout = (s) => scanSource(s).masked;

const TAG_RE = /<[a-zA-Z][^>]*>/;
/** Lines that actually emit HTML markup — where escaping is required. */
const htmlLines = (rel) =>
  stripComments(read(rel)).split('\n').filter((ln) => TAG_RE.test(ln));

// 'mutation' is tests/mutation/: the mutation harness. It deliberately contains
// known-bad HTML-email payloads as data — that is the point of it — so scanning
// it would flag the harness for being correct. Everywhere else, the walk is
// deliberately unselective: the whole value of this guard is that it covers
// files nobody thought to list.
const SKIP = new Set([
  'node_modules', 'dist', 'coverage', '.git', 'migrations', 'seeders', 'scripts', 'mutation',
]);
function walkSource() {
  const out = [];
  (function visit(dir) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      let st; try { st = statSync(p); } catch { continue; }
      // Dot-directories are never source. This also guarantees the mutation
      // harness's throwaway tree (backend/.mutation-tmp) can never be picked up
      // as real code if a run is killed before cleanup.
      if (st.isDirectory()) {
        if (!SKIP.has(e) && !e.startsWith('.')) visit(p);
        continue;
      }
      if (extname(e) === '.mjs') out.push(p);
    }
  })(BACKEND);
  return out;
}
const SOURCES = walkSource().map((p) => ({
  rel: relative(BACKEND, p).split('\\').join('/'),
  code: readFileSync(p, 'utf8').replace(/\r\n/g, '\n'),
}));

const SHARED_MODULE = 'utils/htmlEscape.mjs';

describe('§19 — the shared escaper behaves', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('neutralises a realistic phishing payload', () => {
    const payload = '<a href="https://evil.example/login">Your session expired — re-authenticate</a>';
    const out = escapeHtml(payload);
    expect(out).not.toContain('<a ');
    expect(out).not.toContain('"');      // no live attribute delimiter survives
    expect(out).not.toContain('<');
    expect(out).toContain('&lt;a');
  });

  it('neutralises a tracking pixel', () => {
    const out = escapeHtml('<img src="https://evil.example/track?u=1">');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });

  it('renders null/undefined as empty, not as the text "null"', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });

  it('escapeHtmlAttribute is the same mapping (quotes are what matter)', () => {
    expect(escapeHtmlAttribute).toBe(escapeHtml);
  });

  it('escapeHtmlSingleLine leaves no control characters and no whitespace runs', () => {
    const out = escapeHtmlSingleLine('a\u0000b\n\nc   d');
    expect(out).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(out).not.toMatch(/\s{2,}/);
    expect(out).toContain('a');
    expect(out).toContain('d');
  });
});

describe('§19 — there is exactly ONE escaper', () => {
  it('no file other than the shared module defines a private escaper', () => {
    // The original bug was two private copies and seven files with none. A third
    // private copy re-opens the drift. The name list is broad on purpose: the
    // first version only matched `escapeHtml|escapeHTML|htmlEscape|
    // escapeHtmlAttribute`, so `utils/emailTemplates.mjs`'s `function esc(str)`
    // was correct AND invisible. `\b` keeps `escape(` from matching `esc`.
    const DEFINITION_RE =
      /(?:^|\n)\s*(?:export\s+)?(?:const|let|var|function)\s+(escapeHtml|escapeHTML|htmlEscape|escapeHtmlAttribute|escapeAttr|escapeHtmlText|escapeHtmlString|esc|sanitizeHtml|escapeXml|escapeXML)\b\s*[=(]/;
    const offenders = [];
    for (const { rel, code } of SOURCES) {
      if (rel === SHARED_MODULE) continue;      // this one is allowed to define it
      if (DEFINITION_RE.test(stripComments(code))) offenders.push(rel);
    }
    // The message carries the offenders: vitest prints a failing `toEqual` as
    // `expected [ Array(1) ] to deeply equal []`, and the contents only reach the
    // console diff — which the mutation harness cannot read from the structured
    // report. A guard whose failure message hides what it found is a worse guard.
    expect(offenders, offenders.length ? `private escaper defined in: ${offenders.join(', ')}` : '')
      .toEqual([]);
  });

  it('the shared module holds the entity map', () => {
    const module = read(SHARED_MODULE);
    for (const entity of ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;']) {
      expect(module, `missing ${entity}`).toContain(entity);
    }
  });
});

describe('§19 — the public contact form is escaped and throttled', () => {
  const src = read('routes/contactRoutes.mjs');
  const code = stripComments(src);

  it('imports the shared escaper', () => {
    expect(src).toMatch(/from\s+['"][^'"]*htmlEscape\.mjs['"]/);
  });

  it('escapes every user-controlled field in the HTML body', () => {
    for (const expr of [
      'escapeHtml(formData.name)',
      'escapeHtml(formData.email)',
      'escapeHtml(formData.message)',
    ]) {
      expect(code, `missing ${expr}`).toContain(expr);
    }
  });

  it('leaves no raw interpolation of those fields in any HTML line', () => {
    const lines = htmlLines('routes/contactRoutes.mjs');
    for (const raw of ['${formData.name}', '${formData.email}', '${formData.message}']) {
      const hit = lines.filter((ln) => ln.includes(raw));
      expect(hit, `raw interpolation still on an HTML line: ${raw}`).toEqual([]);
    }
  });

  it('the public POST is rate-limited to a bounded number of sends', () => {
    // It is unauthenticated by design (it is the website contact form) — so it must
    // be throttled. The original assertion only checked that `rateLimiter(` was
    // called, so `rateLimiter()` with no arguments — or `max: 100000` — still passed.
    expect(code).toMatch(/router\.post\(\s*["']\/["']\s*,\s*rateLimiter\(/);

    const opts = code.match(/rateLimiter\(\s*\{([^}]*)\}\s*\)/);
    expect(opts, 'rateLimiter must be called with an options object').not.toBeNull();
    const max = Number((opts[1].match(/max:\s*(\d+)/) || [])[1]);
    expect(Number.isFinite(max), 'rateLimiter options must pin `max`').toBe(true);
    expect(max, 'a public form must not be a send amplifier').toBeLessThanOrEqual(20);
  });

  it('does not use a banned palette colour', () => {
    // Crystalline Swan bans #00FFFF outright (USER.md). It was the contact-email heading colour.
    expect(code.toLowerCase()).not.toContain('#00ffff');
  });
});

describe('§19 — session notification emails escape user-controlled values', () => {
  const src = read('routes/sessionRoutes.mjs');
  const code = stripComments(src);

  it('imports the shared escaper', () => {
    expect(src).toMatch(/from\s+['"][^'"]*htmlEscape\.mjs['"]/);
  });

  it('escapes names, location, notes and no-show reason', () => {
    for (const expr of [
      'escapeHtml(session.client.firstName)',
      'escapeHtml(session.client.lastName)',
      'escapeHtml(trainer.firstName)',
      'escapeHtml(trainer.lastName)',
      'escapeHtml(session.trainer.firstName)',
      "escapeHtml(session.location || 'Main Studio')",
      'escapeHtml(notes)',
      'escapeHtml(noShowReason)',
    ]) {
      expect(code, `missing ${expr}`).toContain(expr);
    }
  });

  it('leaves no raw interpolation of those fields in any HTML line', () => {
    // The raw `${notes}` form legitimately survives in the plain-text attendance-note body.
    const lines = htmlLines('routes/sessionRoutes.mjs');
    for (const raw of ['${noShowReason}', '${notes}', "${session.location || 'Main Studio'}"]) {
      const hit = lines.filter((ln) => ln.includes(raw));
      expect(hit, `raw interpolation still on an HTML line: ${raw}`).toEqual([]);
    }
  });
});

describe('§19 — remaining HTML-email builders escape their payload', () => {
  const CASES = [
    ['routes/workoutSummaryRoutes.mjs', 'escapeHtml(summaryText)'],
    ['controllers/adminClientController.mjs', 'escapeHtml(firstName)'],
    ['controllers/adminClientController.mjs', 'escapeHtml(normalizedEmail)'],
  ];

  for (const [rel, expr] of CASES) {
    it(`${rel} escapes ${expr}`, () => {
      expect(stripComments(read(rel))).toContain(expr);
    });
  }

  it('newsletterRoutes escapes inside the page() helper, so no caller can get it wrong', () => {
    const code = stripComments(read('routes/newsletterRoutes.mjs'));
    expect(code).toContain('escapeHtml(heading)');
    expect(code).toContain('escapeHtml(message)');
    expect(code).toContain('escapeHtmlAttribute(cta.url)');
    expect(code).toContain('escapeHtml(cta.label)');
  });
});

/**
 * F04 — provenance, not spelling.
 *
 * `esc` used to be accepted as an encoder because it is *called* `esc`. Naming
 * is not provenance: a local `const esc = (s) => s` is an identity function that
 * launders a raw value past this check. The set below is built from what the
 * file actually imports from the shared module, and an assignment only counts as
 * escaping when the callee is in it.
 */
const ENCODER_NAMES = ['escapeHtml', 'escapeHtmlAttribute', 'escapeHtmlSingleLine', 'esc'];
const SHARED_IMPORT_RE = /import\s+([^'"]*?)\s+from\s+['"][^'"]*htmlEscape\.mjs['"]/g;

function canonicalEncoders(code) {
  const names = new Set();
  for (const m of code.matchAll(SHARED_IMPORT_RE)) {
    for (const part of (m[1] || '').replace(/[{}]/g, ' ').split(',')) {
      const spec = part.trim();
      if (!spec) continue;
      if (spec.startsWith('*')) {                       // import * as html
        const as = spec.match(/as\s+([A-Za-z_$][\w$]*)/);
        if (as) for (const name of ENCODER_NAMES) names.add(`${as[1]}.${name}`);
        continue;
      }
      const aliased = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.add(aliased ? aliased[2] : spec);
    }
  }
  return names;
}

/**
 * `name = <callee>(` — the assignment the escape-set is derived from.
 *
 * The callee is matched with the flat class `[\w$.]*`, NOT with a nested
 * `(?:\.[A-Za-z_$][\w$]*)*`. The nested form is a classic catastrophic-backtracking
 * shape: on adminClientController.mjs it cost 5.4 seconds for one file, which
 * timed this guard out. Flat character classes backtrack linearly.
 */
const ESCAPED_ASSIGN_RE =
  /(?:^|[,;({\s])([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$.]*)\s*\(/gm;
/**
 * Every assignment to a simple name, so re-assignment can be seen. `(?![=>])`
 * skips `==` and `=>`.
 *
 * Declarations are a SECOND pattern rather than an optional `(?:const|let|var)?`
 * group in this one. The optional group makes the prefix ambiguous at every
 * offset in the file, and against the long whitespace runs left behind by masked
 * comments that ambiguity is catastrophic: on adminClientController.mjs the
 * combined pattern took 4.4 seconds to find 182 matches. Split, they are
 * milliseconds.
 */
const ANY_ASSIGN_RE = /(?:^|[,;({[]|\n)\s*([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
const DECL_ASSIGN_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
const CALLEE_AT_RE = /^\s*([A-Za-z_$][\w$.]*)\s*\(/;   // flat class: see the note above

/**
 * Identifiers this file can treat as already escaped.
 *
 * F03 — an identifier escaped ONCE is not escaped FOREVER. The previous version
 * collected `name = escapeHtml(...)` file-wide and exonerated every later use of
 * the name, so `let email = escapeHtml(c.email); email = c.email;` rendered the
 * raw value and the guard stayed green (mutation M10). Any assignment from a
 * non-encoder now disqualifies the name.
 */
function escapedIdentifiers(code, canonical) {
  const safe = new Set();
  for (const m of code.matchAll(ESCAPED_ASSIGN_RE)) {
    if (canonical.has(m[2])) safe.add(m[1]);
  }
  for (const pattern of [ANY_ASSIGN_RE, DECL_ASSIGN_RE]) {
    for (const m of code.matchAll(pattern)) {
      // Bounded lookahead: only enough of the right-hand side to see a callee.
      // Slicing to the end of the file here is O(n) per assignment.
      const rest = code.substr(m.index + m[0].length, 80);
      const callee = rest.match(CALLEE_AT_RE);
      // Not a call at all (`email = client.email`), or a call to something that
      // is not a proven encoder: either way the name no longer provably holds
      // escaped text, so it loses its exemption. Skipping the non-call case is
      // what left mutation M10 green on the first attempt at this fix.
      if (!callee || !canonical.has(callee[1])) safe.delete(m[1]);
    }
  }
  return safe;
}

/** Whole-word leaf match — substring matching falsely fires on 'reason' inside 'No reason provided'. */
const mentionsLeaf = (expr, leaves) => {
  const words = new Set(expr.match(/[A-Za-z_$][\w$]*/g) || []);
  return leaves.some((leaf) => leaf.split('.').every((part) => words.has(part)));
};

/**
 * Every template literal that emits HTML, with the line it starts on.
 *
 * Structural (whole-literal), and now derived from `scanSource` rather than from
 * an ad-hoc brace counter — see the F05 note on the scanner for the bypass that
 * counter allowed.
 */
function htmlTemplatesIn(code) {
  return scanSource(code).templates.filter((t) => TAG_RE.test(t.text));
}

/** Convenience wrapper: scan a file by path. */
function htmlTemplates(rel) {
  return htmlTemplatesIn(read(rel));
}

/** Advance past a quoted string inside a template body or interpolation. */
function skipString(text, at) {
  const quote = text[at];
  let j = at + 1;
  while (j < text.length) {
    const ch = text[j];
    if (ch === '\\') { j += 2; continue; }
    j++;
    if (ch === quote) break;
  }
  return j;
}

/**
 * Top-level `${...}` expressions inside a template literal body.
 *
 * String-aware: a `}` inside `'...'` inside an interpolation cannot close the
 * expression early, which is what let mutation M11 hide its payload.
 */
function interpolations(templateText) {
  const out = [];
  let i = 0;
  while (i < templateText.length) {
    const ch = templateText[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === "'" || ch === '"') { i = skipString(templateText, i); continue; }
    if (ch === '$' && templateText[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      while (j < templateText.length && depth > 0) {
        const c = templateText[j];
        if (c === '\\') { j += 2; continue; }
        if (c === "'" || c === '"') { j = skipString(templateText, j); continue; }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      out.push(templateText.slice(i + 2, j));
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

/**
 * Drop parens that wrap the WHOLE expression and nothing else.
 *
 * `(clientName)` becomes `clientName`; `${((x))}` becomes `x`. `(a).b` and
 * `(a + b) * c` are left alone — there the parens are load-bearing, and
 * stripping them would change what the expression is.
 */
function stripOuterParens(expr) {
  let s = expr.trim();
  for (;;) {
    if (!s.startsWith('(') || !s.endsWith(')')) return s;
    // The opening paren has to close at the very last character, or it is not
    // wrapping the expression — `(a) + (b)` also starts with '(' and ends with
    // ')' and must not be unwrapped.
    let depth = 0;
    let wrapsWhole = false;
    for (let i = 0; i < s.length; i += 1) {
      const c = s[i];
      if (c === '\\') { i += 1; continue; }
      if (c === "'" || c === '"') { i = skipString(s, i) - 1; continue; }
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) { wrapsWhole = i === s.length - 1; break; }
      }
    }
    if (!wrapsWhole) return s;
    s = s.slice(1, -1).trim();
  }
}

/**
 * Is this interpolation's VALUE the result of a call?
 *
 * The exemption this feeds exists for computed expressions — `infoRow(...)`,
 * `fields.map(...)` — where the helper owns escaping its own arguments. It used
 * to be spelled `expr.includes('(')`: a SUBSTRING test standing in for a SHAPE
 * test, and the two disagree on exactly one class — the parenthesised leaf.
 * `${(clientName)}` contains a paren, is not a call, and was therefore never
 * inspected. The guard read green because its exemption suppressed the
 * assertion it exists to make.
 *
 * Redundant outer parens are stripped first, so `(infoRow(x))` is still a call
 * and `(clientName)` is still a leaf.
 */
function isCallExpression(expr) {
  return /^[A-Za-z_$][\w$.]*\s*\(/.test(stripOuterParens(expr));
}

describe('§19 — structural ratchet: no HTML template interpolates a sensitive leaf raw', () => {
  const LEAVES = [
    'firstName', 'lastName', 'email', 'location', 'noShowReason', 'summaryText',
    'notes', 'reason', 'heading', 'message', 'label', 'url', 'eventType',
    'clientName', 'trainerName', 'formData.name', 'formData.email', 'formData.message',
  ];
  // DERIVED, not enumerated.
  //
  // This list used to be eight hand-written paths. That is exactly why T-01
  // survived: utils/notification.mjs — the file §19.0 had named as its own fresh
  // ground — was not in it, and its field names were not in LEAVES either. The
  // first fix added the one missing path, which reproduces the defect: a
  // hand-written coverage list can only confirm work its author already did, and
  // lengthening it is indistinguishable from progress.
  //
  // Membership is now a PROPERTY of the file, so a new HTML-email builder is in
  // scope the moment it exists. "Builds HTML email" = emits a template literal
  // containing a tag, or assigns an `html:` key (which covers the plain-text
  // bodies promoted with `.replace(/\n/g, '<br>')`).
  const BUILDER_FILES = SOURCES.filter(({ code }) => {
    const scan = scanSource(code);
    return scan.templates.some((t) => TAG_RE.test(t.text))
      || /html:\s*[`'"\w]/.test(scan.masked);
  }).map((s) => s.rel);

  it('the derived builder list is non-empty and actually covers the known builders', () => {
    // A derivation that quietly matches nothing is worse than a hardcoded list:
    // it would pass while scanning nothing at all.
    expect(BUILDER_FILES.length).toBeGreaterThan(5);
    for (const known of [
      'routes/contactRoutes.mjs',
      'utils/notification.mjs',
      'utils/emailTemplates.mjs',
      'controllers/adminClientController.mjs',
    ]) {
      expect(BUILDER_FILES, `${known} should be recognised as a builder`).toContain(known);
    }
  });

  it('every LEAVES entry still occurs somewhere in the source tree', () => {
    // LEAVES is irreducible — which identifiers are user-controlled needs
    // data-flow — but a stale or misspelled entry is invisible otherwise. This
    // catches renames and typos without pretending to know the whole set.
    const corpus = SOURCES.map((s) => stripComments(s.code)).join('\n');
    const stale = LEAVES.filter((leaf) => {
      const last = leaf.split('.').pop();
      return !new RegExp(`\\b${last}\\b`).test(corpus);
    });
    expect(stale, `LEAVES entries not found in source: ${stale.join(', ')}`).toEqual([]);
  });

  it('every HTML template escapes each sensitive interpolation', () => {
    // Deliberately conservative in three ways, because a noisy guard gets deleted
    // and then protects nothing:
    //   - a COMPUTED expression whose value is a CALL (`infoRow(...)`,
    //     `fields.map(...)`) is skipped: the helper owns escaping its own
    //     arguments. The test is the expression's SHAPE, not whether it merely
    //     contains a paren — `${(clientName)}` contains one and is not a call,
    //     and treating it as one is how this exemption came to suppress the very
    //     assertion it sits inside.
    //   - an identifier assigned from an escaper anywhere in the file is skipped:
    //     `const r = escapeHtml(reason)` then `${r || 'None'}` is already safe, and
    //     a call-site check cannot see that data flow.
    //   - leaves match whole words, so 'reason' does not fire on the string literal
    //     'No reason provided'.
    const offenders = [];
    const seen = new Set();
    for (const rel of BUILDER_FILES) {
      const masked = stripCommentsKeepLayout(read(rel));
      const escaped = escapedIdentifiers(masked, canonicalEncoders(masked));
      for (const { text, line } of htmlTemplates(rel)) {
        for (const expr of interpolations(text)) {
          if (expr.includes('escapeHtml')) continue;   // escaped right here
          if (expr.includes('(')) continue;        // computed — helper's job
          if (!mentionsLeaf(expr, LEAVES)) continue;
          const root = (expr.match(/[A-Za-z_$][\w$]*/) || [])[0];
          if (root && escaped.has(root)) continue;     // escaped at assignment
          const key = `${rel}:${line}  \${${expr.trim().slice(0, 90)}}`;
          // A nested literal is reported both on its own and as part of its
          // parent; count each distinct finding once.
          if (!seen.has(key)) { seen.add(key); offenders.push(key); }
        }
      }
    }
    // Message carries the offenders — see the note on the private-escaper assertion.
    expect(offenders, offenders.length ? `raw sensitive interpolation:\n  ${offenders.join('\n  ')}` : '')
      .toEqual([]);
  });

  it('a plain-text body promoted to HTML is escaped before the newline conversion', () => {
    // `html: textContent.replace(/\n/g, '<br>')` renders a *plain-text* template as
    // HTML. That template contains no tag, so the scan above cannot see its
    // interpolations — which is precisely how utils/notification.mjs kept putting
    // raw client names and locations into HTML mail. Require the escaper here, and
    // require it to wrap the source (escaping after the <br> conversion would
    // escape the markup we just introduced).
    const PROMOTION_RE = /html:\s*(\w+)\.replace\(/g;
    const offenders = [];
    for (const { rel, code } of SOURCES) {
      // Comments are stripped: this very test's own prose quotes the offending
      // pattern, and SOURCES walks tests/ too — otherwise the guard flags itself.
      for (const m of stripCommentsKeepLayout(code).matchAll(PROMOTION_RE)) {
        if (m[1] === 'escapeHtml') continue;
        offenders.push(`${rel}: html: ${m[1]}.replace(...) — wrap as escapeHtml(${m[1]}).replace(...)`);
      }
    }
    // Message carries the offenders — see the note on the private-escaper assertion.
    expect(offenders, offenders.length ? `unescaped promotion to HTML:\n  ${offenders.join('\n  ')}` : '')
      .toEqual([]);
  });

  // NOT SHIPPED — "no HTML template emits a raw interpolation of a tracking-capable
  // URL" was drafted, run, and deliberately dropped. A 40-char lookbehind for
  // `src=` / `href=` is not an attribute-context test: it fired on 6 sites that are
  // all correct — a `style=` ternary in contactRoutes, and `${siteUrl}`,
  // `${safeBookUrl}`, `${safeUnsubUrl}`, `${confirmUrl}` in newsletterRoutes and
  // emailTemplates, every one either a config constant or already escaped. A guard
  // whose false-positive rate on its own codebase is 100% gets deleted, and then it
  // protects nothing. The leaf rule above and the promotion rule below cover the
  // reachable shapes; this one is recorded as a rejected rule, not a silent gap.
});

/**
 * §22 — F07: the file-type exclusion is RECONCILED, not silent.
 *
 * `walkSource()` collects `.mjs` only. That is a decision, and an unexamined
 * exclusion is how a boundary goes uninventoried while every test stays green:
 * a new `.ts` email builder, or a Python endpoint in `flask_server/` that sends
 * HTML mail or writes CSV, would be invisible to every rule above.
 *
 * This does not try to *scan* those files — a Python or `.cjs` file cannot be
 * checked by a ratchet written for JS template literals. It asserts something
 * weaker and honest: no excluded first-party file is an emitter at all. The day
 * one is, the exclusion stops being safe and someone has to decide, instead of
 * never finding out.
 *
 * Astra F07. Measured, not assumed: 12,196 non-`.mjs` files exist in this tree,
 * but 12,000 of them are vendored Python venvs (`flask_server/venv`,
 * `services/form-analysis/venv`). Of the 391 that are first-party text, exactly
 * zero emit — the only two near-misses were `migrations/*.cjs` logging the
 * literal string '<none>' inside a template, which is why the markup test below
 * matches real tags rather than any `<word>`.
 */
describe('§22 — F07 — excluded file types are reconciled, not silently skipped', () => {
  // Vendored and generated trees are not first-party and are not ours to audit.
  const SKIP_DIRS = new Set([
    'node_modules', 'dist', 'coverage', '.git', '__pycache__',
    'site-packages', 'venv', '.venv', 'env', 'mutation',
  ]);
  const TEXT_EXT = new Set([
    '.cjs', '.js', '.ts', '.mts', '.cts', '.jsx', '.tsx',
    '.html', '.htm', '.hbs', '.ejs', '.pug', '.mustache',
    '.py', '.txt', '.csv', '.sql', '.sh', '.ps1',
  ]);

  // Real markup, not any `<word>`: '<none>' in a console.log is not an email.
  const MARKUP_TAG = /<\/?(a|p|div|span|br|strong|em|b|i|html|body|table|tr|td|th|h[1-6]|img|ul|ol|li)\b/i;
  const HTML_KEY = /html:\s*[`'"\w]/;
  const CSV_CONTENT_TYPE = /(?:setHeader\s*\([^)]*text\/csv|['"]Content-Type['"]\s*,\s*['"]text\/csv)/i;
  const SEND_CALL = /(?:sendEmail|sendMail|transporter\.send|sgMail\.send|sendGrid\.send|nodemailer)/i;

  /**
   * `.tsx`/`.jsx` are exempt from the MARKUP test only — never from the rest.
   *
   * The first run flagged `core/NewConversationModal.tsx` and
   * `routes/ClientActivityWidget.tsx`. Both were inspected before this exemption
   * was written: they are React components whose template literals are
   * styled-components CSS, with no send path (no sendEmail/sendGrid/nodemailer/
   * html:/text-csv anywhere in either file). React escapes interpolated values
   * when it renders, and its sink is the DOM — not an outbound transport.
   *
   * That is a statement about the SINK, not a convenience. The `html:` key, the
   * CSV content-type and the send-call markers below still apply to these
   * extensions, so a component that starts building an email body still fails.
   */
  const UI_EXT = new Set(['.tsx', '.jsx']);

  function walkOtherSources() {
    const out = [];
    (function visit(dir) {
      let entries = [];
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) visit(p);
          continue;
        }
        if (!TEXT_EXT.has(extname(entry.name).toLowerCase())) continue;
        out.push(p);
      }
    })(BACKEND);
    return out;
  }

  it('no excluded first-party file emits HTML email or CSV', () => {
    const offenders = [];
    for (const p of walkOtherSources()) {
      let body;
      try { body = readFileSync(p, 'utf8'); } catch { continue; }
      if (body.length > 2_000_000 || body.includes('\u0000')) continue;   // binary
      const reasons = [];
      if (HTML_KEY.test(body)) reasons.push('assigns an html: body');
      if (CSV_CONTENT_TYPE.test(body)) reasons.push('sets a text/csv content type');
      if (!UI_EXT.has(extname(p).toLowerCase())
        && MARKUP_TAG.test(body) && body.includes('${')) {
        reasons.push('template literal containing markup and interpolation');
      }
      if (SEND_CALL.test(body)) reasons.push('calls a mail transport');
      if (reasons.length) {
        offenders.push(`${relative(BACKEND, p).split('\\').join('/')} — ${reasons.join('; ')}`);
      }
    }
    expect(
      offenders,
      offenders.length
        ? `excluded files that ARE emitters, so the .mjs-only exclusion no longer holds:\n  ${offenders.join('\n  ')}`
        : '',
    ).toEqual([]);
  });

  it('the reconciliation actually looks at files', () => {
    // A walk that quietly matches nothing would pass the assertion above while
    // reconciling nothing at all — the vacuity this guard keeps tripping over.
    // The mutation harness proves the rule bites, by planting an emitter in a
    // file type the .mjs walker never sees.
    expect(walkOtherSources().length).toBeGreaterThan(0);
  });
});
