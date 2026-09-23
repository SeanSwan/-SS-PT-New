/**
 * The repo's own history says the worst failure mode for a guard is a regex that
 * silently never matches (spend-guard-gate's INVOCATION line, corrupted into a
 * literal backspace, reported "SYNTAX OK" while matching nothing). So every
 * allow-case below is paired with a deny-case, and the actual 2026-09-22 defect
 * is pinned as a fixture rather than described.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  candidates,
  findViolations,
  maskSource,
  normalise,
  specifiersIn,
} from './import-closure-guard.mjs';

const F = 'src/example.ts';
const NONE = new Set();

// ── the incident this guard exists for ──────────────────────────────────────
// Names, paths and specifiers below are the REAL ones from adc94c4fe, read out
// of the commit rather than invented — see C:/tmp/prove-import-closure-guard.mjs,
// which reproduces this against real history.

const IMPORTER = 'backend/tests/unit/safeMigrateControlFlow.test.mjs';
const IMPORTER_SRC = `
  import { describe, it } from 'vitest';
  import { runRunner } from '../helpers/f5-runner-harness/runRunner.mjs';
  import { MUTANTS } from '../helpers/f5-runner-harness/mutants.mjs';
`;
/** adc94c4fe: the two importing tests are in the tree; the harness is not. */
const TREE_AT_adc94c4fe = new Set([
  'backend/scripts/safe-migrate.mjs',
  'backend/tests/unit/safeMigrateControlFlow.test.mjs',
  'backend/tests/unit/migrationRunnerContract.test.mjs',
]);
/** b1ab001bd: the harness is tracked too. */
const TREE_AT_b1ab001bd = new Set([
  ...TREE_AT_adc94c4fe,
  'backend/tests/helpers/f5-runner-harness/runRunner.mjs',
  'backend/tests/helpers/f5-runner-harness/mutants.mjs',
]);

test('the real 2026-09-22 defect is caught, and its fix clears it', () => {
  const broken = findViolations(IMPORTER, IMPORTER_SRC, TREE_AT_adc94c4fe);
  assert.equal(broken.length, 2, 'both harness imports must be reported');
  assert.deepEqual(broken.map((v) => v.spec).sort(), [
    '../helpers/f5-runner-harness/mutants.mjs',
    '../helpers/f5-runner-harness/runRunner.mjs',
  ]);
  // The bare 'vitest' specifier must NOT be reported — it is node_modules.
  assert.equal(broken.some((v) => v.spec === 'vitest'), false);
  // Same files, same content, harness tracked -> clean.
  assert.deepEqual(findViolations(IMPORTER, IMPORTER_SRC, TREE_AT_b1ab001bd), []);
});

test('a relative import that DOES resolve to a tracked file is clean', () => {
  const src = `import { helper } from './helper.mjs';`;
  assert.deepEqual(findViolations(F, src, new Set(['src/helper.mjs'])), []);
});

test('the specifier is resolved relative to the importing file, not the repo root', () => {
  const src = `import { h } from '../helpers/thing.mjs';`;
  assert.deepEqual(
    findViolations('backend/tests/unit/x.test.mjs', src, new Set(['backend/tests/helpers/thing.mjs'])),
    [],
  );
  // ...and the wrong-relative guess must NOT satisfy it.
  assert.equal(
    findViolations('backend/tests/unit/x.test.mjs', src, new Set(['helpers/thing.mjs'])).length,
    1,
  );
});

// ── every way to depend on a module ────────────────────────────────────────

test('every import form is caught when the target is untracked', () => {
  const cases = [
    ["import a from './gone.mjs';", 'static default import'],
    ["import { a } from './gone.mjs';", 'named import'],
    ["import './gone.mjs';", 'side-effect import'],
    ["export * from './gone.mjs';", 'export-from'],
    ["export { a } from './gone.mjs';", 're-export'],
    ["const m = await import('./gone.mjs');", 'dynamic import'],
    ["const m = require('./gone.mjs');", 'literal require'],
    ["import type { T } from './gone.mjs';", 'type-only import'],
  ];
  for (const [src, label] of cases) {
    assert.equal(findViolations(F, src, NONE).length, 1, `must catch ${label}`);
  }
});

test('non-relative specifiers are out of scope — no false positives', () => {
  const src = `
    import { test } from 'vitest';
    import express from 'express';
    import { api } from '@/lib/api';
    import x from 'node:fs';
    import y from '~/components/y';
  `;
  assert.deepEqual(findViolations(F, src, NONE), []);
});

// ── TypeScript and bundler resolution ──────────────────────────────────────

test('extensionless TS specifiers resolve to .ts / .tsx', () => {
  assert.deepEqual(findViolations('src/a.ts', "import b from './b';", new Set(['src/b.ts'])), []);
  assert.deepEqual(findViolations('src/a.tsx', "import B from './B';", new Set(['src/B.tsx'])), []);
});

test('the NodeNext .js -> .ts rewrite does not read as broken', () => {
  // Modern TS legally writes './b.js' while the file on disk is b.ts. Missing
  // this would flag the entire frontend, which is how a guard gets disabled.
  assert.deepEqual(findViolations('src/a.ts', "import b from './b.js';", new Set(['src/b.ts'])), []);
  assert.deepEqual(findViolations('src/a.ts', "import b from './b.mjs';", new Set(['src/b.mts'])), []);
});

test('directory imports resolve through index.*', () => {
  assert.deepEqual(findViolations('src/a.ts', "import b from './b';", new Set(['src/b/index.ts'])), []);
  assert.deepEqual(findViolations('src/a.ts', "import b from './b';", new Set(['src/b/index.tsx'])), []);
});

test('Vite query suffixes are stripped before resolution', () => {
  assert.deepEqual(findViolations('src/a.ts', "import s from './logo.svg?raw';", new Set(['src/logo.svg'])), []);
  assert.deepEqual(findViolations('src/a.ts', "import w from './w.js?url';", new Set(['src/w.js'])), []);
});

test('a literal path resolves as-is (css, wasm, extensionless)', () => {
  assert.deepEqual(findViolations('src/a.ts', "import './s.css';", new Set(['src/s.css'])), []);
});

// ── the false-positive cases that would get this guard deleted ─────────────

test('a COMMENTED-OUT import must not block a commit', () => {
  // This repo quotes code inside comments and review documents. If the guard
  // fired on prose, it would be waved through within a week.
  const line = `
    // import { old } from './deleted-last-year.mjs';
    import { live } from './live.mjs';
  `;
  assert.deepEqual(findViolations(F, line, new Set(['src/live.mjs'])), []);

  const block = `
    /*
     * Previously: import { old } from './deleted-last-year.mjs';
     * Removed when the harness moved.
     */
    import { live } from './live.mjs';
  `;
  assert.deepEqual(findViolations(F, block, new Set(['src/live.mjs'])), []);
});

test('a string containing // must not swallow the rest of the line', () => {
  // If '//' inside a string were read as a comment, the import would be blanked
  // and MISSED — a silent false negative, the failure this repo has been bitten
  // by before.
  const src = `const u = 'https://example.com/x'; import('./gone.mjs');`;
  assert.equal(findViolations(F, src, NONE).length, 1);

  const blockInString = `const re = '/*'; import('./gone.mjs');`;
  assert.equal(findViolations(F, blockInString, NONE).length, 1);

  // An apostrophe in a comment must not open a string literal.
  const apostrophe = `// don't do this\nimport('./gone.mjs');`;
  assert.equal(findViolations(F, apostrophe, NONE).length, 1);
});

test('template literal contents are masked, code around them is not', () => {
  // Text inside a template is not a dependency...
  assert.deepEqual(findViolations(F, "const q = `import('./gone.mjs')`;", NONE), []);
  // ...but a real import on the same line still is.
  assert.equal(
    findViolations(F, "const q = `text ${x}`; import('./gone.mjs');", NONE).length,
    1,
  );
});

test('the greppable allow-marker exempts one line, and only that line', () => {
  const marked = `
    // import-closure-guard: allow — generated at build time, not a repo file
    import gen from './generated.mjs';
  `;
  assert.deepEqual(findViolations(F, marked, NONE), []);

  const partial = `
    // import-closure-guard: allow — generated at build time
    import gen from './generated.mjs';
    import other from './gone.mjs';
  `;
  assert.equal(findViolations(F, partial, NONE).length, 1, 'the unmarked import must still be caught');
});

// ── plumbing and edge cases ────────────────────────────────────────────────

test('Windows path separators do not defeat resolution', () => {
  const src = `import { h } from '../helpers/thing.mjs';`;
  assert.deepEqual(
    findViolations('backend\\tests\\unit\\x.test.mjs', src, new Set(['backend/tests/helpers/thing.mjs'])),
    [],
  );
  assert.equal(normalise('a\\b\\c.mjs'), 'a/b/c.mjs');
  assert.equal(normalise('./a/b.mjs'), 'a/b.mjs');
});

test('parent traversal normalises before lookup', () => {
  assert.deepEqual(findViolations('src/a/b.mjs', "import c from '../../lib/c.mjs';", new Set(['lib/c.mjs'])), []);
});

test('non-code files are ignored', () => {
  assert.deepEqual(findViolations('docs/notes.md', "import x from './gone.mjs';", NONE), []);
  assert.deepEqual(findViolations('README.txt', "import x from './gone.mjs';", NONE), []);
  assert.deepEqual(findViolations('scripts/thing.ps1', "import x from './gone.mjs';", NONE), []);
});

test('a repeated specifier is reported once', () => {
  const src = `import a from './gone.mjs';\nimport b from './gone.mjs';`;
  assert.equal(findViolations(F, src, NONE).length, 1);
});

test('candidates() puts the literal path first and offers the TS rewrite', () => {
  const withExt = candidates('src/a.ts', './b.js');
  assert.equal(withExt[0], 'src/b.js', 'the literal path must be tried first');
  assert.ok(withExt.includes('src/b.ts'), 'must offer the .js -> .ts rewrite');
  // An explicit './b.js' names a FILE; index resolution is not a real resolution
  // for it. Asserting otherwise would be inventing a contract, not testing one.
  assert.equal(withExt.includes('src/b/index.ts'), false);

  const bare = candidates('src/a.ts', './b');
  assert.equal(bare[0], 'src/b');
  assert.ok(bare.includes('src/b.ts'), 'extensionless must offer .ts');
  assert.ok(bare.includes('src/b/index.ts'), 'a directory specifier must offer index resolution');
});

test('candidates() never appends an extension to a path that already has one', () => {
  // The first draft produced 'x.mjs.mjs' / 'x.mjs.js' in the diagnostic. A guard
  // whose output looks wrong is one people stop reading, so the shape is pinned.
  const withExt = candidates('src/a.ts', './b.mjs');
  assert.equal(
    withExt.some((p) => /\.(mjs|js|cjs|mts|cts|ts|tsx)\./.test(p)),
    false,
    `nonsense candidate in: ${withExt.join(', ')}`,
  );
  assert.deepEqual(withExt, ['src/b.mjs', 'src/b.mts'], 'only the literal path and the TS rewrite');

  assert.deepEqual(candidates('src/a.ts', './s.css'), ['src/s.css']);
  assert.deepEqual(candidates('src/a.ts', './logo.svg'), ['src/logo.svg']);
});

test('a multi-dot basename is a STEM, not a file (the 2,430-false-positive bug)', () => {
  // MEASURED BUG, pinned. The first version treated any trailing dot-segment as
  // an extension, so './x.helpers' never got '.ts' appended and every
  // *.helpers.ts / *.fixture.ts / *.sectionFilter.ts import in frontend/ was
  // reported — 2,430 false positives, which is how a guard gets deleted. The
  // tail must be a KNOWN extension to suppress appending.
  const cases = [
    ['frontend/e2e/a.spec.ts', './adminComplianceTruthSmoke.helpers', 'frontend/e2e/adminComplianceTruthSmoke.helpers.ts'],
    ['frontend/e2e/a.spec.ts', './fixtures/auth.fixture', 'frontend/e2e/fixtures/auth.fixture.ts'],
    ['frontend/src/a.ts', './X.sectionFilter', 'frontend/src/X.sectionFilter.ts'],
  ];
  for (const [from, spec, target] of cases) {
    assert.deepEqual(
      findViolations(from, `import x from '${spec}';`, new Set([target])),
      [],
      `${spec} must resolve to ${target}`,
    );
  }
  // An unknown tail still offers index resolution, so a dotted DIRECTORY is not lost.
  assert.ok(candidates('src/a.ts', './v1.2').includes('src/v1.2/index.ts'));
  // ...and a real extension still suppresses appending.
  assert.deepEqual(candidates('src/a.ts', './s.css'), ['src/s.css']);
});

test('maskSource preserves line numbers in both views', () => {
  const src = `// one\n/* two\nthree */\nimport a from './gone.mjs';`;
  const { code, keep } = maskSource(src);
  assert.equal(code.split('\n').length, src.split('\n').length);
  assert.equal(keep.split('\n').length, src.split('\n').length);
  assert.equal(specifiersIn(keep, code)[0].line, 4);
});

test('a string that CONTAINS an import statement is not a dependency', () => {
  // MEASURED BUG, pinned. The guard flagged its OWN test file, because a fixture
  // like "import a from './gone.mjs';" is indistinguishable from a real import if
  // only comments are masked. Exempting *.test.mjs would have been the easy fix
  // and the wrong one — the 2026-09-22 incident WAS a test file. Fixed by finding
  // keywords in the string-blanked view and reading specifiers from the other.
  const fixture = 'const cases = ["import a from \'./gone.mjs\';"];';
  assert.deepEqual(findViolations(F, fixture, NONE), []);

  const reexport = 'const s = \'export * from "./nope.mjs"\';';
  assert.deepEqual(findViolations(F, reexport, NONE), []);

  // ...while the very same text as REAL code is still caught.
  assert.equal(findViolations(F, "import a from './gone.mjs';", NONE).length, 1);
  assert.equal(findViolations(F, "export * from './gone.mjs';", NONE).length, 1);

  // A real import whose specifier is a string still resolves normally.
  assert.deepEqual(findViolations(F, "import a from './live.mjs';", new Set(['src/live.mjs'])), []);
});

test('a differently-named importer does not trigger main()', () => {
  // MEASURED BUG, pinned. The house entry-point pattern
  //   argv[1].replace(/\\/g,'/').endsWith('<name>.mjs')
  // also matches any file whose name merely ENDS with the guard's — so a prover
  // named `prove-import-closure-guard.mjs` imported the predicates and got the
  // guard's main() instead of its own output. Every other guard in this
  // directory still carries that pattern; this test is the evidence for fixing
  // them. The import must be silent and the importer's own code must run.
  const dir = mkdtempSync(join(tmpdir(), 'icg-entrypoint-'));
  try {
    const probe = join(dir, 'probe-import-closure-guard.mjs');
    const guardUrl = pathToFileURL(
      join(fileURLToPath(new URL('.', import.meta.url)), 'import-closure-guard.mjs'),
    ).href;
    writeFileSync(probe, `import ${JSON.stringify(guardUrl)};\nconsole.log('SENTINEL-REACHED');\n`);
    const out = execFileSync(process.execPath, [probe], { encoding: 'utf8' });
    assert.match(out, /SENTINEL-REACHED/, "the importer's own code must run");
    assert.doesNotMatch(out, /import-closure\]/, 'the guard must not run main() on import');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
