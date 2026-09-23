#!/usr/bin/env node
/**
 * import-closure-guard.mjs — a commit must not add a file that imports a module
 * the same commit leaves untracked.
 * ===========================================================================
 * WHY (measured, not inferred — 2026-09-22, commit adc94c4fe):
 * That commit added two test files importing
 *   ../helpers/f5-runner-harness/runRunner.mjs
 *   ../helpers/f5-runner-harness/mutants.mjs
 * The whole f5-runner-harness/ directory was untracked. It was not ignored —
 * merely never `git add`ed (`git check-ignore -v` on it returns nothing, so this
 * was never a .gitignore question). Measured:
 *   git grep -l f5-runner-harness HEAD~2   -> (empty)
 *   git grep -l f5-runner-harness HEAD     -> exactly the two importing tests
 * So HEAD could not pass on a fresh clone: `git archive HEAD backend/tests`
 * extracts both importing tests and neither imported module. Fixed in b1ab001bd.
 *
 * WHY THIS NEEDS A MECHANISM AND NOT A RESOLUTION: that commit was internally
 * consistent. Every path it named was present, `git diff --cached` over those
 * paths was empty, and the full suite was GREEN on the author's machine —
 * because the modules were sitting right there on disk. Commit composition and
 * tree consistency are different questions, and only the second one is asked by
 * a fresh clone. The failure therefore surfaces LATER, on someone else's
 * machine, and gets attributed to whatever they were doing when it broke.
 * Prose cannot hold this: the author had already written the rule down.
 *
 * Named M1 in:
 *   Z:\HostileReviews\2026-09-22-140700-ss-pt-head-depends-on-untracked-module.md
 *
 * WHAT THIS IS, HONESTLY: a lint on RELATIVE specifiers, not a module resolver.
 * It does not evaluate tsconfig `paths`, package `exports` maps, bundler aliases
 * (`@/...`), or conditional exports, and it does not care whether Node would
 * accept the specifier's extension. It answers exactly one question: "does the
 * file this specifier points at exist in the tree this commit produces?" That is
 * the accident class — an author who forgot to `git add`. A determined author
 * can bypass it with an alias or the allow-marker below.
 *
 * One known false-positive shape, measured rather than imagined: a script that
 * reaches into node_modules by RELATIVE path —
 * docs/qa/playwright-phase0/audit-script.mjs importing
 * ../node_modules/playwright/index.mjs — is flagged. Correct by the letter of the
 * rule, unhelpful in practice, and exactly what the allow-marker is for.
 *
 * "CLOSURE" HERE MEANS THE COMMITTED TREE, NOT THE IMPORT GRAPH. It is ONE HOP:
 * it checks the specifiers written in the files this commit touches. It does NOT
 * walk transitively, so a staged file that imports a tracked module which itself
 * imports an untracked one is NOT caught. Named for the tree property it does
 * check, and scoped this way deliberately — a transitive walk would block on
 * pre-existing breakage the commit did not introduce, which is not a ratchet.
 *
 * THE TRACKED SET IS THE RESULTING TREE, NOT THE WORKING TREE. This is the whole
 * point: the working tree always has the file, which is why the defect is
 * invisible locally. `--staged` reads file CONTENT from the index (what will be
 * committed) via one `git cat-file --batch`, and the closure set from
 * `git ls-files` — which, at pre-commit, IS the tree that is about to exist, so
 * a module added by the same commit resolves correctly.
 *
 * SCOPED TO CODE FILES: .mjs .js .cjs .jsx .mts .cts .ts .tsx. Measured
 * composition of this repo: 4,899 tracked .ts/.tsx against 3,481 .mjs/.js — it
 * is TypeScript-heavy, so extensionless specifiers (`./foo` -> foo.ts), the
 * NodeNext `.js` -> `.ts` rewrite, directory `index.*` resolution, and Vite
 * query suffixes (`./s.svg?raw`) are all mandatory. A guard that only understood
 * Node ESM would have flagged the entire frontend and been deleted the same day.
 *
 * COMMENTS AND TEMPLATE LITERALS ARE MASKED BEFORE SCANNING, because this repo
 * quotes code inside comments and inside review documents, and a commented-out
 * `// import x from './gone.mjs'` must not block a commit. Single- and
 * double-quoted string contents are KEPT — that is where specifiers live. The
 * masker is not a parser: a backtick nested inside a template `${}` can still
 * desynchronise it. That failure mode errs toward silence, never toward a false
 * block.
 *
 * RATCHET, NOT SWEEP — and the ratchet is real, not nominal. `--staged` blocks
 * only what THIS commit introduces:
 *   · a file the commit ADDS       -> every unresolved import in it blocks;
 *   · a file the commit MODIFIES   -> only imports that were NOT already
 *                                     unresolved at HEAD block. The rest are
 *                                     printed as a NOTE and do not block.
 * That distinction is load-bearing, not a nicety. Measured against HEAD's own
 * tree on 2026-09-22: this repo already has 177 unresolved relative imports in
 * live code. Blocking on those would block any edit to any of those files, and a
 * gate that fires on work you did not break is a gate people learn to wave
 * through. `--all` reports the whole backlog instead.
 *
 * WHAT THIS FOUND, MEASURED 2026-09-22 (HEAD 24ab9159a, 7,850 live code files —
 * 7,848 at b1ab001bd plus this guard and its test):
 *   177 unresolved relative imports in a fresh clone, in THREE populations.
 *   Three, because "exists on disk but not in git" conflates two situations that
 *   a reader acts on differently, and acting on the wrong one wastes a morning:
 *     11  M1: a real FILE on disk, absent from git, NOT ignored — a forgotten
 *         `git add`. HEAD genuinely cannot load it. 9 distinct modules.
 *         Examples: a tracked test,
 *         backend/tests/unit/userSerializationCredentialLeak.test.mjs, importing
 *         backend/utils/userSerialization.mjs, which is in no branch's history
 *         (`git log --all -- <path>` returns 0 commits); and four modules under
 *         packages/creator-brains-console/web/src/components/.
 *      1  BY DESIGN: a real file on disk, absent from git, IS ignored —
 *         frontend/node_modules/playwright/index.mjs, reached by relative path.
 *         Correct by the letter of the rule and useless in practice; the
 *         allow-marker is the answer, and the hint below prints it.
 *    165  STALE: no such file anywhere — a dead reference, a different bug with a
 *         different owner. Includes a specifier naming a TRACKED DIRECTORY that
 *         holds no index module (frontend/src/components/Checkout).
 *
 * THREE CORRECTIONS, RECORDED SO THEY ARE NOT REDISCOVERED.
 * (1) An earlier pass reported 3,968 findings, then 1,530. Both were this guard's
 *     OWN bugs, not the repo's. The first resolver treated any trailing
 *     dot-segment as a file extension, so './x.helpers' never got '.ts' appended
 *     and every *.helpers.ts / *.fixture.ts / *.sectionFilter.ts import was
 *     reported — 2,430 false positives in frontend/ alone. The fix is
 *     FILE_EXTENSIONS: only a KNOWN extension means "this names a file".
 * (2) An earlier pass reported the M1 population as 123. It was never 123. The
 *     other 110 were imports present only in the WORKING TREE, not in HEAD — a
 *     measurement artefact of reading content from disk instead of from the
 *     commit. The corrected figure compares HEAD's blob against HEAD's tree.
 * (3) The M1 population was then reported as 13, and then 12. It is 11. Both
 *     earlier figures came from the CLASSIFIER, not from this guard: it used
 *     fs.existsSync() to decide "this module is on disk", and existsSync is TRUE
 *     FOR A DIRECTORY. Because candidates() includes the bare specifier path, a
 *     specifier naming a tracked directory that holds no index module counted as
 *     a module git had forgotten. Only statSync(p).isFile() is a module test.
 *     This guard never calls existsSync — it is pure path logic against the
 *     tracked set — so no finding it reports was affected. The error was in the
 *     instrument that split its output into populations.
 *     A guard whose author's first four numbers were wrong by 300x, then 9x, then
 *     2x, and whose population split was wrong twice, is a guard whose numbers are
 *     measured. These are: see C:/tmp/icg-classify-final.mjs.
 *
 * FAIL-OPEN on its own errors, loudly. A pre-commit hook that bricks committing
 * gets deleted within a day, and a deleted gate protects nothing.
 *
 * Usage:
 *   node scripts/hooks/import-closure-guard.mjs --staged   (pre-commit)
 *   node scripts/hooks/import-closure-guard.mjs --all      (baseline audit; scans the
 *                                                           WORKING TREE, so its total is
 *                                                           NOT comparable to the HEAD figure)
 *   node scripts/hooks/import-closure-guard.mjs <file>...
 * Exit: 0 clean · 1 violations found · anything else = its own bug (fail open)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CODE_FILE = /\.(mjs|cjs|js|jsx|mts|cts|ts|tsx)$/i;

/**
 * Tried in order when the specifier carries no extension. The empty string first,
 * so a literal path (a .css, a .wasm, an extensionless binary) resolves as-is.
 */
const EXTENSIONS = ['', '.mjs', '.js', '.cjs', '.jsx', '.mts', '.cts', '.ts', '.tsx', '.json'];

/**
 * NodeNext / allowImportingTsExtensions: a TS file may legally write './x.js'
 * while the file that exists is x.ts. Without this map the whole frontend reads
 * as broken, which is how a guard earns the reputation that gets it disabled.
 */
const TS_REWRITE = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

/**
 * Trailing dot-segments that mean "this specifier names a FILE", so appending
 * extensions would be wrong.
 *
 * This must be a KNOWN-extension list and not merely "contains a dot". Measured
 * the hard way: the first version tested /\\.[a-z0-9]+$/ and therefore read
 * `./adminComplianceTruthSmoke.helpers` as already-extensioned, never tried
 * `.ts`, and reported 2,430 false positives in frontend/ alone — every
 * `*.helpers.ts`, `*.fixture.ts` and `*.sectionFilter.ts` import in the repo.
 * A multi-dot basename is a stem, not a file, unless the tail is a real type.
 */
const FILE_EXTENSIONS = new Set([
  '.mjs', '.js', '.cjs', '.jsx', '.mts', '.cts', '.ts', '.tsx',
  '.json', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.jpeg',
  '.gif', '.webp', '.wasm', '.html', '.txt', '.vue', '.svelte', '.node',
]);

/**
 * Deliberate, greppable exemption, in the same spirit as the egress guard's:
 * an escape hatch that leaves a trace beats one nobody can audit. Put it on the
 * offending line or the line above it:
 *   // import-closure-guard: allow — generated at build time, not a repo file
 */
const ALLOW_MARKER = /import-closure-guard:\s*allow/;

/** Normalise a repo-relative path: forward slashes, no leading './'. */
export function normalise(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Resolve a relative specifier against the importing file's directory, then list
 * every path that would satisfy it. Pure: no filesystem, no git.
 * @returns {string[]} candidates, most specific first
 */
export function candidates(fromFile, spec) {
  const clean = spec.split(/[?#]/)[0];
  const file = normalise(fromFile);
  const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
  const stack = dir ? dir.split('/') : [];
  for (const part of clean.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') { stack.pop(); continue; }
    stack.push(part);
  }
  const base = stack.join('/');

  const out = [];
  const push = (p) => { if (p && !out.includes(p)) out.push(p); };
  push(base);

  // A specifier whose tail is a REAL extension names a file: appending more
  // would print nonsense like 'x.mjs.mjs' in the diagnostic, and a guard whose
  // output looks wrong is one people stop reading. No resolver maps './b.js'
  // onto 'b.js/index.ts' either, so index forms are not offered here.
  // A tail that is NOT a known extension is part of the stem — '.helpers',
  // '.fixture', '.sectionFilter' — and must still get extensions appended.
  const tail = base.slice(base.lastIndexOf('/') + 1);
  const dot = tail.lastIndexOf('.');
  const named = dot > 0 && FILE_EXTENSIONS.has(tail.slice(dot).toLowerCase());
  if (named) {
    for (const [from, alts] of Object.entries(TS_REWRITE)) {
      if (base.endsWith(from)) {
        const stem = base.slice(0, -from.length);
        for (const alt of alts) push(stem + alt);
      }
    }
    return out;
  }

  for (const ext of EXTENSIONS) push(base + ext);
  for (const ext of EXTENSIONS) push(`${base}/index${ext}`);
  return out;
}

/**
 * Two ALIGNED views of the source — same length, same line breaks — because one
 * view alone cannot answer both halves of the question:
 *
 *   code — comments, template literals, and the CONTENTS of ordinary strings are
 *          blanked (string delimiters kept). Use this to find import KEYWORDS: a
 *          `from` that lives inside a string is invisible here, so a test fixture
 *          such as "import a from './gone.mjs';" is not a dependency. Exempting
 *          *.test.mjs instead would have been the easy fix and the wrong one —
 *          the 2026-09-22 incident WAS a test file.
 *   keep — comments and templates blanked, string contents preserved. Use this to
 *          READ the specifier once the keyword is known to be real code.
 *
 * Returns { code, keep }.
 */
export function maskSource(src) {
  const text = String(src);
  const code = text.split('');
  const keep = text.split('');
  const blank = (j) => { code[j] = ' '; keep[j] = ' '; };
  let mode = 'code';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const d = i + 1 < text.length ? text[i + 1] : '';
    if (mode === 'code') {
      if (c === '/' && d === '/') { blank(i); blank(i + 1); i += 2; mode = 'line'; continue; }
      if (c === '/' && d === '*') { blank(i); blank(i + 1); i += 2; mode = 'block'; continue; }
      if (c === "'") { mode = 'sq'; i += 1; continue; }
      if (c === '"') { mode = 'dq'; i += 1; continue; }
      if (c === '`') { blank(i); i += 1; mode = 'tpl'; continue; }
      i += 1; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; i += 1; continue; }
      blank(i); i += 1; continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') { blank(i); blank(i + 1); i += 2; mode = 'code'; continue; }
      if (c !== '\n') blank(i);
      i += 1; continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { blank(i); if (i + 1 < text.length) blank(i + 1); i += 2; continue; }
      if (c === '`') { blank(i); i += 1; mode = 'code'; continue; }
      if (c !== '\n') blank(i);
      i += 1; continue;
    }
    // sq / dq: `keep` retains the content — a specifier is a string literal —
    // while `code` blanks it, so a `from` INSIDE a string cannot masquerade as a
    // real import statement.
    if (c === '\\') {
      if (i + 1 < text.length) { code[i] = ' '; code[i + 1] = ' '; }
      i += 2; continue;
    }
    if (mode === 'sq' && c === "'") { mode = 'code'; i += 1; continue; }
    if (mode === 'dq' && c === '"') { mode = 'code'; i += 1; continue; }
    if (c !== '\n') code[i] = ' ';
    i += 1; continue;
  }
  return { code: code.join(''), keep: keep.join('') };
}

/**
 * Every relative specifier the source depends on, with its line number.
 * Covers static `from '...'` (which also catches `export ... from`), side-effect
 * `import '...'`, dynamic `import('...')`, and literal `require('...')`.
 *
 * The keyword must match in `code` (real syntax); the specifier is then read from
 * `keep` at the same offset, where string contents survive.
 */
export function specifiersIn(keep, code) {
  const patterns = [
    /\bfrom\s*['"]([^'"\n]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"\n]+)['"]/g,
    /\bimport\s+['"]([^'"\n]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"\n]+)['"]/g,
  ];
  const found = [];
  const seen = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      re.lastIndex = m.index;
      const real = re.exec(keep);
      const spec = real && real[1] ? real[1] : m[1];
      if (!/^\.\.?\//.test(spec)) continue; // bare specifiers are node_modules / aliases
      if (seen.has(spec)) continue;
      seen.add(spec);
      found.push({ spec, line: code.slice(0, m.index).split('\n').length });
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

/**
 * @param {string} path repo-relative path of the importing file
 * @param {string} source its content
 * @param {Set<string>} tracked normalised paths present in the resulting tree
 * @returns {{spec: string, line: number, candidates: string[]}[]} empty = clean
 */
export function findViolations(path, source, tracked) {
  const norm = normalise(path);
  if (!CODE_FILE.test(norm)) return [];
  const { code, keep } = maskSource(source);
  const rawLines = String(source).split(/\r?\n/);
  const out = [];
  for (const { spec, line } of specifiersIn(keep, code)) {
    if (ALLOW_MARKER.test(rawLines[line - 1] ?? '')) continue;
    if (ALLOW_MARKER.test(rawLines[line - 2] ?? '')) continue;
    const cands = candidates(norm, spec);
    if (cands.some((c) => tracked.has(c))) continue;
    out.push({ spec, line, candidates: cands });
  }
  return out;
}

// ── git plumbing ────────────────────────────────────────────────────────────

const git = (args, opts = {}) =>
  execFileSync('git', args, { maxBuffer: 1 << 28, ...opts });

const splitZ = (buf) => buf.toString('utf8').split('\0').filter(Boolean);

/** Files this commit ADDS (or copies). A new path, so every finding in it is new. */
function addedLikeFiles() {
  return splitZ(git(['diff', '--cached', '--name-only', '--diff-filter=AC', '--no-renames', '-z']))
    .map(normalise);
}

/** Files this commit MODIFIES. A finding in one may already have been there at HEAD. */
function modifiedFiles() {
  return splitZ(git(['diff', '--cached', '--name-only', '--diff-filter=M', '--no-renames', '-z']))
    .map(normalise);
}

/** The index. At pre-commit this IS the tree that is about to exist. */
function trackedFiles() {
  return splitZ(git(['ls-files', '-z'])).map(normalise);
}

/** The committed tree, used only to decide whether a finding is NEW. */
function headFiles() {
  return splitZ(git(['ls-tree', '-r', '--name-only', '-z', 'HEAD'])).map(normalise);
}

/**
 * Read many blobs in ONE process. Per-file `git show` would be ~200 spawns on
 * Windows, which is a pre-commit hook people wait on and then disable.
 * `git cat-file --batch` answers `<sha> blob <size>\n<payload>\n`, or
 * `<name> missing\n` for a path git does not have at that revision.
 */
function readBlobs(paths, prefix) {
  const map = new Map();
  if (!paths.length) return map;
  const input = Buffer.from(paths.map((p) => `${prefix}${p}`).join('\n') + '\n', 'utf8');
  const buf = git(['cat-file', '--batch'], { input });
  let pos = 0;
  for (const p of paths) {
    const nl = buf.indexOf(10, pos);
    if (nl === -1) break;
    const parts = buf.toString('utf8', pos, nl).split(' ');
    pos = nl + 1;
    if (parts.length < 3 || parts[1] !== 'blob') { map.set(p, null); continue; }
    const size = Number(parts[2]);
    map.set(p, buf.toString('utf8', pos, pos + size));
    pos += size + 1; // git writes a newline after each payload
  }
  return map;
}

function readFromDisk(file) {
  try { return readFileSync(file, 'utf8'); } catch { return null; }
}

function group(findings) {
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  return byFile;
}

// ── main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const blocking = [];   // what THIS commit introduces
  const inherited = [];  // already broken at HEAD, in a file this commit edits
  let scanned = 0;

  if (args.includes('--staged')) {
    const added = new Set(addedLikeFiles());
    const modified = modifiedFiles();
    const files = [...new Set([...added, ...modified])].filter((f) => CODE_FILE.test(f));

    const indexTracked = new Set(trackedFiles());
    const headTracked = new Set(headFiles());
    const indexBlobs = readBlobs(files, ':0:');
    const headBlobs = readBlobs(files.filter((f) => !added.has(f)), 'HEAD:');

    for (const file of files) {
      const source = indexBlobs.has(file) ? indexBlobs.get(file) : readFromDisk(file);
      if (source == null) continue;
      scanned += 1;
      const now = findViolations(file, source, indexTracked);
      if (!now.length) continue;
      if (added.has(file)) {
        for (const v of now) blocking.push({ file, ...v });
        continue;
      }
      // A MODIFIED file may already have been broken at HEAD. Blocking on a
      // violation this commit did not introduce is how a ratchet turns into the
      // gate everyone waves through — and this repo has 613 such pre-existing
      // findings in live code, 123 of them modules that are simply not in git.
      const before = headBlobs.get(file);
      const had = new Set(
        before == null ? [] : findViolations(file, before, headTracked).map((v) => v.spec),
      );
      for (const v of now) (had.has(v.spec) ? inherited : blocking).push({ file, ...v });
    }
  } else {
    const files = (args.includes('--all') ? trackedFiles() : args.filter((a) => !a.startsWith('--')))
      .map(normalise)
      .filter((f) => CODE_FILE.test(f));
    const tracked = new Set(trackedFiles());
    for (const file of files) {
      const source = readFromDisk(file); // baseline audit; index-vs-worktree is not the question
      if (source == null) continue;
      scanned += 1;
      for (const v of findViolations(file, source, tracked)) blocking.push({ file, ...v });
    }
  }

  if (inherited.length) reportInherited(inherited);

  if (!blocking.length) {
    if (!args.includes('--staged')) {
      console.log(`[import-closure] clean — every relative import in ${scanned} file(s) resolves to a tracked path.`);
    }
    process.exit(0);
  }
  reportBlocking(blocking); // exits 1
}

function reportInherited(inherited) {
  const byFile = group(inherited);
  console.error('');
  console.error(`  [import-closure] NOTE — ${inherited.length} PRE-EXISTING unresolved import(s) in`);
  console.error('  file(s) this commit touches. These are already broken at HEAD, so they do NOT block');
  console.error('  this commit. Listed so the backlog is visible rather than silently inherited:');
  for (const [file, list] of [...byFile].slice(0, 10)) {
    console.error(`    ${file}: ${list.map((v) => `'${v.spec}'`).join(', ')}`);
  }
  if (byFile.size > 10) console.error(`    ... and ${byFile.size - 10} more file(s)`);
}

function reportBlocking(blocking) {
  const byFile = group(blocking);
  const MAX_FILES = 50;
  const MAX_PER_FILE = 10;

  console.error('');
  console.error('  IMPORT CLOSURE — a committed file imports a module this commit does not contain.');
  console.error('');
  console.error('  On a fresh clone these files cannot load. The suite is green on the machine that');
  console.error('  wrote them because the module is sitting on disk there — which is exactly why this');
  console.error('  is invisible until someone else checks out, and why it is attributed to them.');
  console.error('');

  const offending = [...byFile.keys()];
  for (const file of offending.slice(0, MAX_FILES)) {
    const list = byFile.get(file);
    console.error(`    ${file}`);
    for (const v of list.slice(0, MAX_PER_FILE)) {
      console.error(`      line ${v.line}: imports '${v.spec}' — no tracked file among:`);
      console.error(`        ${v.candidates.slice(0, 6).join(', ')}`);
    }
    if (list.length > MAX_PER_FILE) {
      console.error(`      ... and ${list.length - MAX_PER_FILE} more in this file`);
    }
  }
  if (offending.length > MAX_FILES) {
    console.error(`    ... and ${offending.length - MAX_FILES} more file(s)`);
  }

  // The totals are ALWAYS printed. A listing that stops at "..." without a count
  // is how nobody learns there were four hundred of them.
  console.error('');
  console.error(`  TOTAL: ${blocking.length} NEW unresolved import(s) across ${offending.length} file(s).`);
  console.error('');
  console.error('  FIX — commit the module too:');
  console.error('    git add <the imported file>   # then re-run the commit');
  console.error('  Or, if the file is genuinely not meant to be in the repo, that import is a bug:');
  console.error('    a fresh clone will not have it either.');
  console.error('');
  console.error('  If this is deliberate and auditable, mark it so the exemption is greppable:');
  console.error('    // import-closure-guard: allow — <why this module is not in the repo>');
  console.error('');
  process.exit(1);
}

/**
 * Entry-point test. The house pattern used by the other guards in this directory
 * — `argv[1].replace(/\\/g,'/').endsWith('<name>.mjs')` — is silently too loose:
 * it also matches any file whose name merely ENDS with the guard's. Measured, not
 * theorised: a prover named `prove-import-closure-guard.mjs` importing these
 * predicates ran the guard's main() instead, so its own output was replaced by
 * the guard's. Realpath also closes the symlink / 8.3-short-name gap flagged as
 * Astra D9 on safe-migrate.mjs, and the comparison is case-insensitive because
 * the Windows filesystem is.
 */
function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    const argv = realpathSync(process.argv[1]);
    return self.toLowerCase() === argv.toLowerCase();
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    main();
  } catch (err) {
    console.error(`[import-closure] guard error, failing open: ${err?.message}`);
    process.exit(0);
  }
}
