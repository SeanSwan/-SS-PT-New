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
 * usual look-behind heuristic (`/` after an operator, bracket or keyword), and it
 * can still misread `a++ / b` as the start of a regex.
 *
 * The first version of this comment claimed that failure mode could only ever be
 * a false POSITIVE — "extra text is scanned, never silently skipped". R2-02
 * (Astra round 2) disproved that. `copyRegex()` emits as it goes, so once it had
 * swallowed a template there was no way back: `n++ / 2; send({html: `<p>${x}</p>`})`
 * yielded ZERO templates and the guard read green. The claim was simply wrong,
 * and a wrong claim about a guard's failure DIRECTION is worse than no claim at
 * all, because it is the reason nobody goes looking.
 *
 * `x++` and `x--` are now excluded explicitly — that slash is division — which
 * closes the demonstrated case. This is NOT a general fix: the heuristic still
 * guesses, and a `/` that begins neither a regex nor a division can still cause a
 * span to be skipped. Closing that properly needs a real parser rather than
 * lexical guessing, which is the deferred work recorded alongside this review.
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
    // R2-02 (Astra round 2): `x++ / 2` and `x-- / 2` are DIVISION, not a regex.
    // Without this the trailing `+` (or `-`) satisfied REGEX_PREV_CHARS below,
    // `copyRegex()` then consumed the rest of the line, and a template sitting on
    // that line was never extracted at all — a FALSE NEGATIVE, which the doc
    // comment above used to claim this heuristic could not produce. Tested before
    // the character class, because `+` and `-` are both members of it.
    if ((code[k] === '+' && code[k - 1] === '+') || (code[k] === '-' && code[k - 1] === '-')) {
      return false;
    }
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
    // A code-point scan, not `/[\u0000-\u001F\u007F]/`: a control character in a
    // regex literal trips ESLint's `no-control-regex`, which is an ERROR here, so the
    // literal form fails `npm run lint:check` even though the control range is exactly
    // what this assertion is about. The scan says the same thing without the false trip.
    const control = [...out].filter(
      (ch) => ch.codePointAt(0) < 0x20 || ch.codePointAt(0) === 0x7f,
    );
    expect(control, `control characters survived: ${JSON.stringify(control)}`).toEqual([]);
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
/**
 * R2-04 (Astra round 2): anchored to the start of a line. The unanchored form
 * matched an import SPELLED INSIDE A STRING — `const s = "import {encode} from
 * './htmlEscape.mjs'"` — and so handed provenance to a locally-defined `encode`
 * that escapes nothing. A real import statement is a top-level statement and
 * begins a line; one quoted inside a string never does.
 *
 * KNOWN LIMITATION, stated rather than hidden: the specifier is not resolved
 * against the importing file, so a DIFFERENT module that happens to be named
 * `htmlEscape.mjs` still matches. The two canonical spellings in this tree are
 * `'./htmlEscape.mjs'` (utils/ siblings) and `'../utils/htmlEscape.mjs'`, so a
 * `utils/`-prefix test is not available. Resolving the path needs the importing
 * file's location — that is the parser-based analysis in the deferred work.
 */
const SHARED_IMPORT_RE =
  /^[ \t]*import\s+([^'"]*?)\s+from\s+['"][^'"]*htmlEscape\.mjs['"]/gm;

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
 * Compound assignment to a simple name (`name += ...`).
 *
 * R2-04 (Astra round 2): ANY_ASSIGN_RE cannot see these — its `=(?![=>])`
 * requires a bare `=`, and `name += x` puts a `+` first. So the F03 fix dropped
 * the exemption on plain reassignment but not on `+=`, and a binding kept its
 * escape proof after raw data had been appended to it. Always disqualified,
 * regardless of the right-hand side: appending escaped text to a value that may
 * already be raw does not make the result escaped.
 */
const COMPOUND_ASSIGN_RE = /(?:^|[,;({[]|\n)\s*([A-Za-z_$][\w$]*)\s*[-+*/%&|^]=(?!=)/g;

/**
 * A destructuring write that could rebind a name (`({ email } = client)`).
 *
 * Bounded to 200 characters between the braces so the lazy quantifier cannot
 * backtrack across a whole file — the shape that made an earlier pattern in this
 * file quadratic.
 */
const DESTRUCTURE_ASSIGN_RE = /[{[]([^{}[\]]{0,200})[}\]]\s*=(?!=)/g;

/**
 * Parameter lists of `function` declarations/expressions and arrow functions.
 *
 * R2-04 (Astra round 2): escape provenance is a set of NAMES, so a parameter
 * named like an escaped binding inherited its exemption, and a raw parameter was
 * read as escaped. Deliberately narrow: only lists introduced by the `function`
 * keyword or by `=>` count. An ordinary CALL argument list (`escapeHtml(heading)`)
 * is indistinguishable from a parameter list by regex, and treating arguments as
 * parameters would revoke the exemption for correctly escaped values — a false
 * positive, which is what would make this guard get switched off.
 */
const PARAM_LIST_RE = /\bfunction\s*[\w$]*\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/g;

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
  // R2-04 — compound writes always disqualify, whatever the right-hand side is.
  for (const m of code.matchAll(COMPOUND_ASSIGN_RE)) safe.delete(m[1]);
  // R2-04 — a destructuring write can rebind any name in the pattern.
  for (const m of code.matchAll(DESTRUCTURE_ASSIGN_RE)) {
    for (const name of m[1].match(/[A-Za-z_$][\w$]*/g) || []) safe.delete(name);
  }
  // R2-04 — a parameter is a DIFFERENT binding that merely shares the name.
  for (const m of code.matchAll(PARAM_LIST_RE)) {
    for (const name of (m[1] || m[2] || '').match(/[A-Za-z_$][\w$]*/g) || []) {
      safe.delete(name);
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

/** Advance past a `//` or `/* *\/` comment starting at `at`. */
function skipComment(text, at) {
  if (text[at + 1] === '/') {
    let j = at + 2;
    while (j < text.length && text[j] !== '\n') j++;
    return j;
  }
  let j = at + 2;
  while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j++;
  return Math.min(j + 2, text.length);
}

/** Advance past a nested template literal starting at the backtick `at`. */
function skipTemplate(text, at) {
  let j = at + 1;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return j + 1;
    if (c === '$' && text[j + 1] === '{') { j = skipBraced(text, j + 1) + 1; continue; }
    j++;
  }
  return j;
}

/**
 * Index of the `}` matching the `{` at `at`.
 *
 * Strings, comments and nested templates inside the expression are skipped, so
 * none of their braces can close the interpolation early.
 */
function skipBraced(text, at) {
  let depth = 0;
  let j = at;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === "'" || c === '"') { j = skipString(text, j); continue; }
    if (c === '`') { j = skipTemplate(text, j); continue; }
    if (c === '/' && (text[j + 1] === '/' || text[j + 1] === '*')) { j = skipComment(text, j); continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return j; }
    j++;
  }
  return j;
}

/**
 * Top-level `${...}` expressions inside a template literal body.
 *
 * String-aware INSIDE an interpolation: a `}` inside `'...'` cannot close the
 * expression early, which is what let mutation M11 hide its payload. Comments
 * and nested templates are skipped there for the same reason.
 *
 * R2-03 (Astra round 2): the BODY level used to apply the same string skipping,
 * but quotes in template TEXT are ordinary characters, not delimiters. So
 * `<a title="${client.email}">` and `<p>You're ${client.email}</p>` both
 * returned ZERO interpolations — the guard read green on a raw interpolation in
 * a quoted attribute, which is the commonest HTML shape there is. Quote
 * handling now applies only where it means something: inside `${...}`.
 */
function interpolations(templateText) {
  const out = [];
  let i = 0;
  while (i < templateText.length) {
    const ch = templateText[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '$' && templateText[i + 1] === '{') {
      const end = skipBraced(templateText, i + 1);
      out.push(templateText.slice(i + 2, end));
      i = end + 1;
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

/**
 * Parameters that ONLY ever receive string literals, across the whole file.
 *
 * WHY THIS EXISTS
 * ---------------
 * `routes/leadRoutes.mjs` has
 *
 *     const unsubPage = (heading, body) => `...${heading}...${body}...`;
 *     const UNSUB_OK_PAGE = unsubPage("&check; You're unsubscribed.", "You won't ...");
 *
 * `${heading}` is raw in SHAPE, so the ratchet above flags it — correctly, by the rule
 * it states. But the rule cannot see that every call site passes a literal, so nothing
 * user-controlled can reach the parameter. Flagging it is a false positive, and this
 * guard's whole survival depends on its false-positive rate.
 *
 * WHAT MAKES THIS NOT A WIDENED EXCLUSION
 * ---------------------------------------
 * Widening an exclusion to make a guard pass is on Astra's own ban list, and it is how
 * the original T-01 defect got in. Three things keep this honest:
 *
 *   1. It is PROPERTY-based, per the §19 lesson. It does not name `leadRoutes.mjs` or
 *      `unsubPage`. Any parameter, any file, qualifies only if EVERY call site passes
 *      a literal.
 *   2. It is FAIL-CLOSED. A parameter with no call site, with a call site in another
 *      file, with a spread argument, with a non-literal argument, or with any
 *      reassignment is NOT literal-only and stays in scope. Absence of evidence is
 *      not evidence here.
 *   3. Mutation **M18** plants a tainted call site and must be KILLED by this very
 *      assertion. If M18 survives, this exemption is a hole and the mutation says so.
 *
 * A helper is also disqualifying: `page(heading)` where `heading` was itself passed
 * in from above is not literal-only, because the literal provenance is lost at the
 * first hop.
 */
function literalOnlyParams(code) {
  const masked = stripComments(code);
  const out = new Set();

  // candidate declarations: (params) => or function (params)
  const decls = [];
  const declRe = /\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)?\s*=?\s*\(([^)]*)\)\s*=>|\bfunction\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  let m;
  while ((m = declRe.exec(masked)) !== null) {
    const fname = m[1] || m[3];
    const params = (m[2] || m[4] || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!fname || params.length === 0) continue;
    decls.push({ fname, params, index: m.index });
  }

  for (const { fname, params } of decls) {
    // Every call site of this function, by name.
    const callRe = new RegExp(`\\b${fname}\\s*\\(([^)]*)\\)`, 'g');
    const argsList = [];
    let c;
    while ((c = callRe.exec(masked)) !== null) {
      // Skip the declaration itself (its own parameter list).
      const isDecl = new RegExp(`\\b${fname}\\s*\\(([^)]*)\\)\\s*=>`).test(
        masked.slice(c.index, c.index + c[0].length + 6),
      );
      if (isDecl) continue;
      argsList.push(c[1]);
    }
    if (argsList.length === 0) continue; // fail closed: never called here

    for (let i = 0; i < params.length; i++) {
      const argFor = (args) => {
        // Split top-level commas only — a nested call's commas are not separators.
        const parts = [];
        let depth = 0; let cur = ''; let q = null;
        for (const ch of args) {
          if (q) { cur += ch; if (ch === q) q = null; continue; }
          if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
          if ('([{'.includes(ch)) depth++;
          if (')]}'.includes(ch)) depth--;
          if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
          cur += ch;
        }
        parts.push(cur);
        return parts.map((p) => p.trim());
      };

      let literalOnly = true;
      for (const args of argsList) {
        const parts = argFor(args);
        if (parts.length !== params.length) { literalOnly = false; break; }
        const val = parts[i];
        // A string literal, and nothing else.
        if (!/^'(?:[^'\\]|\\.)*'$/.test(val) && !/^"(?:[^"\\]|\\.)*"$/.test(val)) {
          literalOnly = false; break;
        }
      }
      if (!literalOnly) continue;

      const name = params[i];
      // Fail closed: a reassignment anywhere re-introduces a non-literal value.
      const reassigned = new RegExp(`(?:^|[,;({[]|\\n)\\s*${name}\\s*[-+*/%&|^]?=(?!=)`).test(masked);
      if (reassigned) continue;
      out.add(name);
    }
  }
  return out;
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
    //   - a PARAMETER whose every call site passes a string literal is skipped:
    //     `${heading}` in a `page(heading, body)` helper is raw in shape but cannot
    //     carry a payload, because nothing user-controlled reaches the parameter.
    //     See the note on `literalOnlyParams` — this is provenance, not a widened
    //     exclusion, and mutation M18 plants a tainted call site to prove it.
    const offenders = [];
    const seen = new Set();
    for (const rel of BUILDER_FILES) {
      const masked = stripCommentsKeepLayout(read(rel));
      const escaped = escapedIdentifiers(masked, canonicalEncoders(masked));
      const literalOnly = literalOnlyParams(read(rel));
      for (const { text, line } of htmlTemplates(rel)) {
        for (const expr of interpolations(text)) {
          // Escaped right here: an actual encoder CALL, not merely a substring
          // that contains "escapeHtml" (e.g. `${client.escapeHtml}` is a property
          // access, not escaping, and must not be exonerated by a substring test).
          if (ENCODER_NAMES.some((n) => new RegExp(`\\b${n}\\s*\\(`).test(expr))) continue;
          if (isCallExpression(expr)) continue;        // computed — helper's job
          if (!mentionsLeaf(expr, LEAVES)) continue;
          const root = (expr.match(/[A-Za-z_$][\w$]*/) || [])[0];
          if (root && escaped.has(root)) continue;     // escaped at assignment
          if (root && literalOnly.has(root)) continue; // only ever a literal
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

  it('the literal-only exemption is granted to a NARROW, known set — and never mis-attributed', () => {
    // HOSTILE REVIEW, 2026-09-22. `literalOnlyParams` returns a set of NAMES, and the
    // exemption is applied as `literalOnly.has(root)` where `root` is just an identifier
    // string. Two functions in one file that both use a parameter called `heading` are
    // therefore indistinguishable, so if only ONE is literal-only the exemption leaks to
    // the other. That is structurally unsound, and it cannot be fixed here without the
    // parser-based binding identity in tests/security/templateBindings.mjs.
    //
    // What CAN be done is make the leak impossible to introduce silently. Two assertions:
    //
    //   1. MIS-ATTRIBUTION. For every granted name, fail when it is (a) a parameter of
    //      more than one function in the same file AND (b) actually the root of an
    //      interpolation inside an HTML template there. Condition (b) is what makes the
    //      leak real: a granted name that never roots an HTML interpolation is exempted
    //      but has no finding to skip. Without (b) this fires on the guard's own test
    //      file, where `${rel}` appears only in test names and diagnostic strings — a
    //      true statement about the bindings and a false alarm about exposure.
    //   2. THE PIN. The exact granted set is asserted, so any widening is a deliberate,
    //      reviewed edit rather than a side effect of an unrelated change.
    const granted = new Map();   // rel -> Set(name)
    const misattributed = [];

    for (const rel of BUILDER_FILES) {
      const names = literalOnlyParams(read(rel));
      if (names.size === 0) continue;
      granted.set(rel, names);

      // Names that are the ROOT of an interpolation inside an HTML template here.
      const rootedInHtml = new Set();
      for (const { text } of htmlTemplates(rel)) {
        for (const expr of interpolations(text)) {
          const root = (expr.match(/[A-Za-z_$][\w$]*/) || [])[0];
          if (root) rootedInHtml.add(root);
        }
      }

      const src = read(rel);
      for (const name of names) {
        if (!rootedInHtml.has(name)) continue;   // exempted but no finding to skip
        const declRe = new RegExp(
          '(?:function\\s+([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)'
          + '|\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s*)?\\(([^)]*)\\)\\s*=>)',
          'g',
        );
        const owners = new Set();
        let m;
        while ((m = declRe.exec(stripComments(src))) !== null) {
          const fname = m[1] || m[3];
          const params = (m[2] || m[4] || '')
            .split(',')
            .map((p) => p.trim().replace(/[={}[\].:].*$/, '').trim());
          if (params.includes(name)) owners.add(fname);
        }
        if (owners.size > 1) {
          misattributed.push(`${rel}: "${name}" is a parameter of ${owners.size} functions `
            + `(${[...owners].join(', ')}) and roots an HTML interpolation — the exemption `
            + 'cannot tell them apart');
        }
      }
    }

    expect(misattributed,
      misattributed.length
        ? `literal-only exemption is mis-attributable:\n  ${misattributed.join('\n  ')}`
        : '')
      .toEqual([]);

    // THE PIN — a SUBSET ratchet, not an equality.
    //
    // This test runs against two different corpora: the real tree, and the mutation
    // harness's throwaway tree (a `PLANTED` subset under `SSPT_GUARD_ROOT`). A granted
    // set is a function of which files are present, so an exact-equality pin is red
    // under the harness for a reason that has nothing to do with the exemption being
    // wrong. Measured 2026-09-22: the real tree grants five names; the harness corpus
    // grants a smaller set, because `services/aiChatService.mjs`,
    // `tests/unit/templateBindings.test.mjs` and `routes/leadRoutes.mjs` are not copied
    // into it. The equality form failed the harness's own sanity test on that alone.
    //
    // So the ratchet asserts the property that actually matters and is corpus-stable:
    // every granted name is one of the known, reviewed grants. A NEW grant fails; a
    // smaller corpus simply grants fewer, which is not a widening. Narrowing is safe by
    // construction — fewer exemptions can only mean more findings, never fewer.
    //
    // GRANTED vs APPLIED, measured by instrumenting the `continue` below: five names are
    // granted, but only `routes/leadRoutes.mjs:heading` is ever APPLIED, because the
    // exemption is reached only after `mentionsLeaf(expr, LEAVES)`. An inert grant is one
    // `LEAVES` edit away from being live, so all five are listed.
    const ALLOWED_GRANTS = new Set([
      'routes/leadRoutes.mjs:body',
      'routes/leadRoutes.mjs:heading',
      'services/aiChatService.mjs:name',
      'services/sessions/session.service.mjs:fieldName',
      'tests/unit/emailHtmlInjectionGuard.test.mjs:rel',
      'tests/unit/templateBindings.test.mjs:name',
    ]);
    const flattened = [...granted.entries()]
      .flatMap(([rel, set]) => [...set].map((n) => `${rel}:${n}`))
      .sort();
    const unexpected = flattened.filter((entry) => !ALLOWED_GRANTS.has(entry));
    expect(unexpected,
      unexpected.length
        ? 'the literal-only exemption granted NEW names — review each one:\n  '
          + unexpected.join('\n  ')
        : '')
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
