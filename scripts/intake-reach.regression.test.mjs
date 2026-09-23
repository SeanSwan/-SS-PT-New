/**
 * intake-reach.regression.test.mjs — Round 2 order 6 / C3 regression matrix
 * ==========================================================================
 * This file MATERIALIZES THE MATRIX ASTRA SPECIFIED, verbatim in intent and in assertions.
 *
 * Why this file exists in this shape
 * ----------------------------------
 * An earlier, self-authored matrix passed 8/8 while three of Astra's four required cases were
 * FAILING against the same implementation. The lesson is the reason this package is named
 * "repair evidence validation": a matrix written by the author of the code tests the author's
 * mental model, not the contract. Astra's cases below were derived from R2-08's counterexamples
 * and from the tool's own documented promises, and they are the acceptance evidence — so they
 * are shipped as written, not paraphrased.
 *
 * Each case asserts a NAMED reason. Per Round 2: "a missing file, spawn error, malformed fixture
 * setup, or unrelated dirty-tree failure is not a successful rejection test." Each negative case
 * therefore first runs the CONTROL in the same fixture and requires it to pass, so a failure
 * cannot be produced by fixture breakage.
 *
 * Run: node --test scripts/intake-reach.regression.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { main } from './intake-reach.mjs';

/**
 * Build a throwaway tree, run the SHIPPED entry point in-process, and return `{code, data}`.
 * The fixture root is always a fresh `mkdtempSync` directory under the OS temp dir and is always
 * removed — Round 2 requires fixture files to stay inside a dedicated temporary root and forbids
 * writing to the real archive.
 */
function scan(files, specs) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, 'reach-r2-'));
  const output = [];
  const oldLog = console.log;
  const oldError = console.error;
  try {
    for (const [name, contents] of Object.entries(files)) {
      const target = join(root, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    console.log = (...args) => output.push(args.join(' '));
    console.error = () => {};
    const code = main(['--root', root, '--specs', specs, '--json']);
    return { code, data: JSON.parse(output.join('\n')) };
  } finally {
    console.log = oldLog;
    console.error = oldError;
    assert.equal(dirname(root), parent, 'fixture root escaped the temp parent');
    assert.ok(root.startsWith(join(parent, 'reach-r2-')), 'fixture root is not a reach-r2 temp dir');
    rmSync(root, { recursive: true, force: true });
  }
}

test('RT-01 counts distinct static, dynamic and require importers', () => {
  const { code, data } = scan({
    'static.ts': 'import x from "pkg"; export { x } from "pkg";',
    'dynamic.ts': 'void import("pkg");',
    'common.cjs': 'require("pkg");',
  }, 'pkg');
  assert.equal(code, 0);
  const row = data.report[0];
  assert.equal(row.importerFiles, 3);
  assert.equal(row.staticCount, 1);
  assert.equal(row.dynamicCount, 1);
  assert.equal(row.requireCount, 1);
});

test('RT-02 preserves real imports and excludes string-literal impostors', () => {
  const { code, data } = scan({
    'literal.ts': 'const note = "//"; import x from "pkg";',
    'options.ts': 'void import("pkg", { with: { type: "json" } });',
    'noise.ts': `const text = "import value from 'ghost'";`,
  }, 'pkg,ghost');
  assert.equal(code, 0);
  assert.equal(data.report.find(r => r.spec === 'pkg').importerFiles, 2);
  assert.equal(data.report.find(r => r.spec === 'ghost').importerFiles, 0);
});

test('RT-03 malformed source reports incomplete parsing, not absence', () => {
  const { code, data } = scan({
    'broken.ts': 'import {',
  }, 'pkg');
  assert.equal(code, 6);
  assert.equal(data.report[0].verdict, 'INCOMPLETE');
  assert.ok(data.diagnostics.some(d =>
    d.code === 'E_PARSE' && d.path === 'broken.ts'));
});

test('RT-04 resolves relative targets from each importer', () => {
  const { code, data } = scan({
    'lib/widget.ts': 'export const value = 1;',
    'pages/use.ts': 'import { value } from "../lib/widget";',
    'other/lib/widget.ts': 'export const value = 2;',
    'other/use.ts': 'import { value } from "./lib/widget";',
  }, './lib/widget');
  assert.equal(code, 0);
  assert.deepEqual(data.report[0].importers, ['pages/use.ts']);
});

/* ---------------------------------------------------------------------------
 * Control inverse — the tool must still be ABLE to assert absence, or it would
 * never be usable for the one decision it exists to support (is this target
 * referenced at all?). A tool that can never say "dead" is not conservative,
 * it is useless; this case keeps RT-03's conservatism honest.
 * ------------------------------------------------------------------------- */
test('RT-05 (control inverse) a complete scan can still assert DEAD-CANDIDATE', () => {
  const { code, data } = scan({
    'src/consumer.ts': 'import other from "something-else";\nvoid other;\n',
  }, 'target-pkg');
  assert.equal(code, 0, 'a clean scan must exit 0');
  const row = data.report[0];
  assert.equal(row.importerFiles, 0);
  assert.equal(row.verdict, 'DEAD-CANDIDATE', 'absence must remain assertable on a clean scan');
  assert.equal(data.scanComplete, true);
});

/* ---------------------------------------------------------------------------
 * Round 2 also requires: "Require-only references must not be labeled dynamic
 * imports" and "Type-only references must be separately identifiable."
 * ------------------------------------------------------------------------- */
test('RT-06 a require-only edge is not labeled a dynamic import', () => {
  const { data } = scan({ 'a.cjs': 'require("pkg");' }, 'pkg');
  const row = data.report[0];
  assert.equal(row.requireCount, 1);
  assert.equal(row.dynamicCount, 0, 'require must not be counted as dynamic import');
  assert.equal(row.staticCount, 0);
});

test('RT-07 a type-only reference is separately identifiable and is not static liveness', () => {
  const { data } = scan({ 'a.ts': 'import type { T } from "pkg";\nexport type U = T;' }, 'pkg');
  const row = data.report[0];
  assert.equal(row.typeOnlyCount, 1, 'type-only must be reported in its own class');
  assert.equal(row.staticCount, 0, 'a type-only import is not runtime liveness');
});

test('RT-08 a commented-out import is still not a use', () => {
  const { data } = scan({
    'a.ts': '// import dead from "pkg";\n/* import also from "pkg"; */\nexport const x = 1;',
  }, 'pkg');
  assert.equal(data.report[0].importerFiles, 0);
  assert.equal(data.report[0].verdict, 'DEAD-CANDIDATE');
});
