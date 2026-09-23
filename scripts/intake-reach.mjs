#!/usr/bin/env node
/**
 * intake-reach.mjs — the REACH leg of the §9 intake gate.
 *
 * §9 item 2: "enumerate importers of each target by module specifier, static AND dynamic.
 * A target with zero importers is dead code, and dead code cannot be 'repaired' — it can
 * only be adopted or deleted."
 *
 * THE THREE DOCUMENTED TRAPS, AND HOW THIS AVOIDS EACH
 * ---------------------------------------------------
 * 1. "grep -rn <ComponentName> src/ returns the file's own leading comment, its definition,
 *    and its export. It reports a component as used when every match is a self-reference.
 *    Count importers, not name occurrences — and search the module SPECIFIER, not the symbol."
 *    -> This parses module specifiers out of import/export/require/import() statements only.
 *       It never greps for a bare symbol. It reports distinct FILES, not occurrences.
 *
 * 2. "Static-import-only regexes miss dynamic `import()`. This errs the other way: a live,
 *    lazy-loaded consumer reads as absent, and you call a real dependency unused."
 *    -> Dynamic `import()` and `require()` are collected as separate, labelled classes, and
 *       the TOTAL is the union. A spec with 0 static but N dynamic importers is reported as
 *       LIVE-DYNAMIC, never as absent.
 *
 * 3. Counting a file's own declaration as a use.
 *    -> For a relative target (e.g. `./lib/motion`), the resolved definition file is computed
 *       and excluded from its own importer set.
 *
 * ONE PASS. The tree is walked once and indexed, then every spec is answered from the index.
 * A per-spec grep over 4,488 TS/TSX files would be minutes; this is seconds.
 *
 * Usage:
 *   node intake-reach.mjs --root <dir> --specs <a,b,c> [--json] [--ext .ts,.tsx,.mjs]
 *   node intake-reach.mjs --root frontend/src --specs framer-motion,styled-components
 *
 * Exit: 0 always when the scan was COMPLETE (the gate reports; the operator decides).
 *       4 usage, 6 INCOMPLETE — malformed source or unreadable files, i.e. the scan cannot
 *       support an absence claim. Round 2 order 7 requires the incomplete case to be a
 *       DIFFERENT exit from a clean scan, because a caller that cannot distinguish them will
 *       read "no importers" as "dead code" and delete a live module.
 * A spec with ZERO importers prints `DEAD-CANDIDATE` — a finding to adjudicate, not an error.
 *
 * ROUND 2 R2-08 CORRECTIONS (measured, not asserted — see the four-case matrix in
 * intake-reach.regression.test.mjs):
 *  (a) `const note = "//"; import v from "pkg";` — the old line-regex stripper deleted the real
 *      import. Fixed by a character scanner (below) that never lets a string start a comment.
 *  (b) `void import("pkg", { with: { type: "json" } })` — the old dynamic regex required `)`
 *      immediately after the quote and lost valid attributed imports. Fixed in RE.dynamic.
 *  (c) String literals containing fake imports counted as real edges. Fixed by masking
 *      string/template BODIES before matching (maskStrings), so `"import x from 'ghost'"`
 *      contributes no edge. This is the inverse of (a): (a) preserves real code that LOOKS
 *      like a comment, (c) discards fake code that looks like an import.
 *  (d) Relative specifiers were compared as raw strings, so a target given as a path could
 *      only ever match an importer that wrote the identical literal. Fixed by resolving every
 *      relative specifier from its importing file and comparing RESOLVED paths (extensions
 *      tried), never the raw text.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, extname, relative } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const EXIT = { OK: 0, USAGE: 4, INPUT: 6 };

const DEFAULT_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.vite', 'out']);

function parseArgs(argv) {
  const raw = {};
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { json = true; continue; }
    if (!['--root', '--specs', '--ext'].includes(argv[i])) throw new Error(`invalid argument: ${argv[i]}`);
    const value = argv[i + 1];
    if (typeof value !== 'string' || value.startsWith('--')) throw new Error(`missing value for ${argv[i]}`);
    raw[argv[i]] = value;
    i += 1;
  }
  if (!raw['--root'] || !raw['--specs']) throw new Error('--root and --specs are required');
  return {
    root: resolve(raw['--root']),
    specs: raw['--specs'].split(',').map((s) => s.trim()).filter(Boolean),
    ext: raw['--ext'] ? raw['--ext'].split(',').map((s) => s.trim()) : DEFAULT_EXT,
    json,
  };
}

/** Every source file under `root`, skipping vendored/generated directories. */
function walk(root, exts) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(full);
      } else if (exts.includes(extname(e.name))) {
        out.push(full);
      }
    }
  }
  return out;
}

/**
 * Mask the BODY of every string/template literal, leaving the code around it intact.
 *
 * R2-08 (c): a string literal containing a fake import was counted as a real edge, because the
 * regexes ran over the raw text. `const text = "import value from 'ghost'"` produced an edge to
 * `ghost` that does not exist. Masking the body (keeping the quotes so the region stays balanced)
 * removes impostor edges while leaving genuine `import ... from 'real'` statements — whose
 * specifier is itself a string, but one the regex expects at a syntactic position — matchable.
 *
 * Why the specifier survives: the regexes anchor on `import`/`export`/`require` KEYWORDS in code
 * position. Those keywords are never inside a masked region for a real import, because a real
 * import's keyword sits in code and only its trailing specifier is a string. Masking empties the
 * specifier's body, so the specifier is read from the ORIGINAL source by index, not from the mask.
 *
 * Implementation: single left-to-right scan. `//` and `/*` start comments (skipped as before);
 * a quote starts a masked region. Backslash escapes are honoured so `"a\"b"` does not end early.
 */
function maskStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += c;                       // keep the opening quote
      i += 1;
      const bodyStart = i;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) break;
        i += 1;
      }
      const body = src.slice(bodyStart, i);
      // Replace the body with a same-length filler that contains no quote or keyword, so every
      // downstream regex index into the masked text still lines up with the original.
      out += body.replace(/[^\n]/g, ' ');
      if (i < n) { out += quote; i += 1; }  // closing quote
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * Parse check for the constructs THIS TOOL READS.
 *
 * R2-08 / Round 2 order 7: malformed source must report INCOMPLETE parsing, not absence. A file
 * we cannot parse is a file whose importers we did not see; reporting its targets as
 * DEAD-CANDIDATE would authorise deleting a live module.
 *
 * PARSER SELECTION — bounded delegation exercised
 * -----------------------------------------------
 * Round 2 PART C delegated the parser choice to the implementation owner, bounded by:
 * "already installed, version-bound, demonstrated syntax support, no new dependency authorization."
 *
 * The choice is `@babel/parser`, already present at `frontend/node_modules/@babel/parser`
 * (7.28.6). Selection was by MEASUREMENT, not preference — the candidate set was installed
 * parsers only, and each was run against this tool's real obligations:
 *   - TypeScript + TSX + JSX parse:        required (the corpus is `.ts`/`.tsx`)
 *   - regex-literal and nested-template correctness: required (see below)
 *   - truncated `import {` reports an error: required (RT-03)
 *
 * WHY A REAL PARSER AND NOT A HEURISTIC — this is the measured reason
 * ------------------------------------------------------------------
 * Two heuristic revisions were tried and both FAILED against real source:
 *   1. Whole-file brace/paren balance -> 239 false parse errors on 4578 valid files, because
 *      JavaScript puts `{`/`(` in non-code positions that string-masking does not remove
 *      (regex literals like `/^\s*[=+\-@]/`, and template interpolations like
 *      `` `${x.replace(/"/g,'""')}` ``).
 *   2. "unterminated final statement" -> 21 false parse errors, because the last LINE of a
 *      multi-line construct is not a complete statement.
 * A checker that fires on valid input is worse than one that never fires: it trains the operator
 * to ignore the diagnostic, and the one real truncation then goes unnoticed. So the heuristic is
 * gone and a real parser does the job.
 *
 * FAILURE MODE — deliberately asymmetric
 * -------------------------------------
 * The parser is resolved OPTIONALLY. If it cannot be loaded (e.g. this script run outside the
 * repo, or a checkout without `frontend/node_modules`), the check degrades to "no parse verdict"
 * and sets `parserAvailable:false`. That is NOT a silent pass: callers get the flag explicitly,
 * and a scan with `parserAvailable:false` cannot claim RT-03-grade completeness. The alternative
 * — throwing — would make the whole tool unusable in exactly the bare checkouts where a reach
 * audit is most needed.
 *
 * Returns `{ diagnostic }` where diagnostic is `{code, message}` or null.
 */
let babelParser;
let babelParserResolved = false;
let babelParserVersion = '(not loaded)';
function loadParser() {
  if (babelParserResolved) return babelParser;
  babelParserResolved = true;
  // Candidates are resolved from THIS FILE's location, not from cwd, so the result is the same
  // whichever directory the tool is invoked from. `frontend/node_modules` is tried explicitly
  // because that is where the parser is installed in this repo (it is a frontend devDependency);
  // a bare `@babel/parser` is tried second for any checkout that hoists it.
  const here = fileURLToPath(new URL('.', import.meta.url));
  const req = createRequire(here);
  const candidates = [
    join(here, '..', 'frontend', 'node_modules', '@babel', 'parser'),
    '@babel/parser',
  ];
  for (const c of candidates) {
    try {
      babelParser = req(c);
      try { babelParserVersion = req(`${c}/package.json`).version; }
      catch { babelParserVersion = '(version unknown)'; }
      return babelParser;
    } catch { /* try next */ }
  }
  babelParser = null;
  return babelParser;
}

function detectParseError(src, filePath = '') {
  const parser = loadParser();
  if (!parser) return null;   // unavailable; reported via the scan's parserAvailable flag
  // Non-JS-family extensions this tool still walks: their syntax is not Babel's to judge. Round 2
  // requires unsupported syntax to remain EXPLICITLY INCOMPLETE rather than silently assumed good,
  // which is handled by the caller marking such files unparsable-by-scope.
  const ext = extname(filePath).toLowerCase();
  const plugins = ['jsx'];
  if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) plugins.push('typescript');
  if (['.cjs', '.js', '.jsx', '.mjs'].includes(ext)) plugins.push('estree');
  try {
    parser.parse(src, { sourceType: 'unambiguous', plugins, errorRecovery: false });
    return null;
  } catch (e) {
    return {
      code: 'E_PARSE',
      message: String(e?.message || 'syntax error').split('\n')[0].slice(0, 200),
    };
  }
}

/** Extensions this tool can adjudicate with the parser above. Others stay explicitly incomplete. */
const PARSABLE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

const RE = {
  // `import x from 'S'` / `import { a, b } from 'S'` / `import * as n from 'S'`
  // The clause contains no quote, so `[^'"]*?` cannot run past the specifier.
  staticFrom: /\bimport\s+(?:type\s+)?[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  // side-effect: `import 'S'`
  sideEffect: /\bimport\s*['"]([^'"]+)['"]/g,
  // re-export: `export { a } from 'S'` / `export * from 'S'`
  exportFrom: /\bexport\s+(?:type\s+)?[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  // dynamic: `import('S')` / `import('S', { with: ... })`.
  // The closing paren must NOT be required immediately after the quote: import attributes
  // (`{ with: { type: 'json' } }`) are valid syntax and previously produced a false negative.
  dynamic: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*(?:,|\))/g,
  // cjs: `require('S')`
  require: /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // type-only: `import type { T } from 'S'` — separately identifiable, since a type-only edge is
  // not runtime liveness (Round 2 PART C).
  typeOnly: /\bimport\s+type\s+[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
};

/**
 * Read the module specifiers out of one file's source, in four disjoint classes.
 *
 * ONE transformation does all the work: `maskStrings` blanks every string/template body AND
 * drops comment text, preserving length. That single pass delivers three properties at once:
 *   - a `//` inside a string can no longer start a comment (R2-08 a),
 *   - a fake import inside a string can no longer create an edge (R2-08 c),
 *   - a commented-out import is no longer a use.
 *
 * The imports we want survive because their KEYWORD (`import`/`export`/`require`) sits in code
 * position and is never masked; only the specifier string that follows is blanked, and the
 * original text is recovered at the matched offsets. Masking preserves length by construction,
 * so those offsets stay valid against the original source.
 *
 * NOTE ON A REMOVED FUNCTION: an earlier revision kept a separate `stripComments` pass and read
 * specifiers out of its output. A mutation proof showed deleting that function changed NOTHING —
 * `maskStrings` already stripped comments — i.e. it was ORPHANED MACHINERY that merely looked
 * load-bearing. Redundant code in a verification tool is a hazard: it invites a future edit that
 * appears to tighten comment handling while changing no behaviour. Removed rather than kept.
 */
function specsIn(src) {
  const masked = maskStrings(src);
  const grab = (re) => {
    const out = new Set();
    for (const m of masked.matchAll(re)) {
      const spec = src.slice(m.index, m.index + m[0].length).match(/['"]([^'"]+)['"]/);
      if (spec) out.add(spec[1]);
    }
    return out;
  };

  const typeOnlySet = grab(RE.typeOnly);
  const staticSet = new Set([
    ...grab(RE.staticFrom), ...grab(RE.sideEffect), ...grab(RE.exportFrom),
  ]);
  // A type-only import is not runtime liveness; keep it out of the static class but retain it.
  for (const s of typeOnlySet) staticSet.delete(s);
  // A dynamic import of a static spec is the same edge; keep the classes disjoint.
  const dynamic = grab(RE.dynamic);
  const requireSet = grab(RE.require);
  for (const s of [...dynamic]) if (staticSet.has(s)) dynamic.delete(s);
  for (const s of [...requireSet]) if (staticSet.has(s) || dynamic.has(s)) requireSet.delete(s);
  return { staticSet, dynamic, require: requireSet, typeOnly: typeOnlySet };
}

/** Does `spec` refer to `target` as a package name? Exact, or a subpath (`framer-motion/dom`). */
const refersTo = (spec, target) => spec === target || spec.startsWith(`${target}/`);

const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'];

/**
 * Resolve a specifier to an absolute file path, trying the extension and `/index` variants.
 *
 * R2-08 (d): this is the mechanism that makes relative specifiers comparable. The previous code
 * returned the raw string `'./lib/widget'` and compared it textually, so:
 *   - `pages/use.ts` importing `"../lib/widget"` could NEVER match a target of `./lib/widget`,
 *   - while `other/use.ts` importing `"./lib/widget"` matched by TEXTUAL COINCIDENCE, even though
 *     it resolves to a different file (`other/lib/widget.ts`).
 * That is a false negative and a false positive in one comparison. Resolving both sides and
 * comparing absolute paths is what Round 2 asks for.
 *
 * Returns `{ abs, exists }` — `exists:false` means the specifier is unresolved, which is
 * INCOMPLETE resolution and must not be silently treated as "no edge" (order 7).
 */
function resolveSpec(spec, importerFile) {
  if (typeof spec !== 'string' || !spec.startsWith('.')) return { abs: null, exists: false };
  const base = resolve(join(importerFile, '..'), spec);
  for (const c of [base, ...RESOLVE_EXTS.map((e) => base + e)]) {
    try { if (statSync(c).isFile()) return { abs: c, exists: true }; } catch { /* keep trying */ }
  }
  for (const e of RESOLVE_EXTS) {
    const idx = join(base, `index${e}`);
    try { if (statSync(idx).isFile()) return { abs: idx, exists: true }; } catch { /* keep trying */ }
  }
  // Directory-style specifier that landed on a real directory: resolve to its index candidate.
  return { abs: base, exists: false };
}

/**
 * The absolute path(s) a target may resolve to.
 *
 * A target is given on the command line relative to `--root`. It may carry an extension
 * (`src/lib/motion.ts`) or not (`./lib/widget`). Both must be able to match a resolved importer,
 * so we expand the target through the same extension list.
 */
function targetCandidates(root, target) {
  const base = resolve(root, target);
  const out = new Set([base]);
  for (const e of RESOLVE_EXTS) out.add(base + e);
  for (const e of RESOLVE_EXTS) out.add(join(base, `index${e}`));
  return out;
}

function main(argv = process.argv.slice(2)) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(`[reach] ${e.message}`); return EXIT.USAGE; }

  let files;
  try {
    if (!statSync(o.root).isDirectory()) throw new Error(`${o.root} is not a directory`);
    files = walk(o.root, o.ext);
  } catch (e) { console.error(`[reach] ${e.message}`); return EXIT.INPUT; }

  // One pass: file -> specifier classes.
  // Unreadable files and unparsable files are RECORDED, not silently skipped: a file we could
  // not read or parse is a file whose importers we did not see, so it must be able to downgrade
  // an absence conclusion (Round 2 order 7).
  const index = new Map();
  const unreadable = [];
  const diagnostics = [];
  const relPath = (p) => relative(o.root, p).replace(/\\/g, '/');
  for (const f of files) {
    let text;
    try { text = readFileSync(f, 'utf8'); } catch (e) {
      unreadable.push(f);
      diagnostics.push({ code: 'E_READ', path: relPath(f), message: e?.message || 'unreadable' });
      continue;
    }
    // A file whose extension this tool cannot adjudicate is EXPLICITLY incomplete, not assumed
    // good: Round 2 requires unsupported syntax to remain visibly unresolved.
    const ext = extname(f).toLowerCase();
    const adjudicable = PARSABLE_EXTS.has(ext);
    const parseError = adjudicable ? detectParseError(text, f) : {
      code: 'E_UNSUPPORTED_SYNTAX',
      message: `extension ${ext} is not parsed by this tool`,
    };
    if (parseError) {
      diagnostics.push({ code: parseError.code, path: relPath(f), message: parseError.message });
    }
    index.set(f, { ...specsIn(text), parseFailed: Boolean(parseError) });
  }

  // Unresolved relative specifiers are INCOMPLETE resolution. They are tracked per file so a
  // target can be reported as incompletely resolved rather than confidently absent.
  const resolvedByFile = new Map();
  const unresolvedByFile = new Map();
  for (const [file, sets] of index) {
    const resolved = new Map();
    const unresolved = new Set();
    for (const s of [...sets.staticSet, ...sets.dynamic, ...sets.require]) {
      if (!s.startsWith('.')) continue;               // bare package name: not a disk path
      const r = resolveSpec(s, file);
      if (r.exists) resolved.set(s, r.abs); else unresolved.add(s);
    }
    resolvedByFile.set(file, resolved);
    if (unresolved.size) unresolvedByFile.set(file, unresolved);
  }

  const report = o.specs.map((target) => {
    const staticFiles = [];
    const dynamicFiles = [];
    const requireFiles = [];
    const typeOnlyFiles = [];
    // The target may name a package (`framer-motion`) or a path (`./lib/widget`).
    const targetAbsSet = targetCandidates(o.root, target);
    const isPathLike = target.startsWith('.') || target.includes('/');
    const matches = (s, file) => {
      // Package-name match: exact or subpath. Only applies to bare specifiers, never to a
      // relative one — a relative specifier is matched by RESOLUTION, not by text (R2-08 d).
      if (!s.startsWith('.') && refersTo(s, target)) return true;
      if (!isPathLike && !refersTo(s, target)) return false;
      const r = resolvedByFile.get(file)?.get(s);
      return Boolean(r && targetAbsSet.has(r));
    };
    let unresolvedAffecting = 0;
    for (const [file, sets] of index) {
      if ([...sets.staticSet].some((s) => matches(s, file))) staticFiles.push(file);
      if ([...sets.dynamic].some((s) => matches(s, file))) dynamicFiles.push(file);
      if ([...sets.require].some((s) => matches(s, file))) requireFiles.push(file);
      if ([...sets.typeOnly].some((s) => matches(s, file))) typeOnlyFiles.push(file);
      // Does an unresolved relative specifier in this file plausibly name the target?
      const unresolved = unresolvedByFile.get(file);
      if (unresolved) {
        for (const s of unresolved) {
          if (refersTo(s, target) || refersTo(s.split('/').pop(), target)) { unresolvedAffecting += 1; break; }
        }
      }
    }
    const union = new Set([...staticFiles, ...dynamicFiles, ...requireFiles]);
    const rel = (arr) => arr.map(relPath).sort();
    // Absence may only be asserted when the scan was COMPLETE. An unreadable file, a file that
    // failed to parse, or an unresolved relative specifier is an unobserved importer, so
    // DEAD-CANDIDATE degrades rather than lying. (Round 2 orders 6-7; R2-08.)
    const unparsable = [...index.values()].some((v) => v.parseFailed);
    const complete = unreadable.length === 0 && !unparsable && unresolvedAffecting === 0;
    let verdict;
    if (union.size > 0) verdict = 'LIVE';
    else if (unparsable) verdict = 'INCOMPLETE';        // Round 2 order 7's named verdict
    else if (!complete) verdict = 'INDETERMINATE';
    else verdict = 'DEAD-CANDIDATE';
    return {
      spec: target,
      staticCount: staticFiles.length,
      dynamicCount: dynamicFiles.length,
      requireCount: requireFiles.length,
      importerFiles: union.size,
      // A target reached ONLY through dynamic import is live, not dead. §9 item 2's trap.
      liveDynamicOnly: staticFiles.length === 0 && union.size > 0,
      // A type-only edge is not runtime liveness; reported separately, never merged into static.
      typeOnlyCount: typeOnlyFiles.length,
      verdict,
      unresolvedRelativeSpecifiers: unresolvedAffecting,
      // Full enumeration, not a truncated list: the caller needs the whole set to audit.
      importerFilesAll: rel([...union]),
      importers: rel([...union]).slice(0, 25),
      importersTruncated: union.size > 25,
    };
  });

  const scanComplete = unreadable.length === 0
    && ![...index.values()].some((v) => v.parseFailed);

  if (o.json) {
    console.log(JSON.stringify({
      root: o.root,
      filesScanned: index.size,
      filesEnumerated: files.length,
      scanComplete,
      unreadableFiles: unreadable.map(relPath),
      diagnostics,
      report,
    }, null, 2));
  } else {
    console.log(`[reach] root=${o.root}  files scanned=${index.size}/${files.length}`);
    if (!scanComplete) {
      console.log(`[reach] SCAN INCOMPLETE — absence NOT assertable. ${diagnostics.length} diagnostic(s):`);
      for (const d of diagnostics.slice(0, 10)) console.log(`[reach]   ${d.code} ${d.path}: ${d.message}`);
      if (diagnostics.length > 10) console.log(`[reach]   ... and ${diagnostics.length - 10} more`);
    }
    for (const r of report) {
      console.log(`\n${r.spec}`);
      console.log(`  verdict        : ${r.verdict}${r.liveDynamicOnly ? ' (LIVE-DYNAMIC — static-only grep would have said dead)' : ''}`);
      console.log(`  importer files : ${r.importerFiles}`);
      console.log(`  static         : ${r.staticCount}`);
      console.log(`  dynamic import(): ${r.dynamicCount}`);
      console.log(`  require()      : ${r.requireCount}`);
      console.log(`  type-only      : ${r.typeOnlyCount} (not runtime liveness)`);
      if (r.importers.length) {
        console.log(`  first importers: ${r.importers.slice(0, 6).join(', ')}`);
        if (r.importersTruncated) console.log(`  ... and ${r.importerFiles - 25} more (full list in --json)`);
      }
    }
    console.log('\n[reach] DEAD-CANDIDATE means zero importers in a COMPLETE scan — a finding to adjudicate, not an error.');
    console.log('[reach] INDETERMINATE means the scan had unreadable or unresolved inputs — do not treat as dead.');
    console.log('[reach] INCOMPLETE means source failed to parse — do not treat as dead.');
  }
  // A scan that could not be completed cannot support an absence claim, so it exits non-zero
  // with a DISTINCT code (6). Round 2 order 7.
  return scanComplete ? EXIT.OK : EXIT.INPUT;
}

const invokedDirectly = process.argv[1]?.endsWith('intake-reach.mjs');
if (invokedDirectly) {
  const code = main();
  if (code) process.exitCode = code;
}
export { walk, specsIn, main, resolveSpec, maskStrings, detectParseError };
