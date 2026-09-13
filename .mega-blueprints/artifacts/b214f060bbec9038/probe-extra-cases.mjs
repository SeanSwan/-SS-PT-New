/**
 * FILE: probe-extra-cases.mjs
 * WHY:  The main parser probe (probe-parser-lib.mjs) covers the fourteen import shapes four rounds of
 *       review produced. These nine are the cases a reviewer is most likely to reach for NEXT — the
 *       ones about specifier RESOLUTION rather than statement extraction — and one of them found a
 *       real false pass in this tool while it was being written:
 *
 *       The resolver used to accept a bare DIRECTORY specifier by trying `index.mjs`. Node ESM refuses
 *       directory imports outright (ERR_UNSUPPORTED_DIR_IMPORT), so the audit would have reported OK
 *       for a module the server cannot load — a false pass in the tool whose purpose is catching those.
 *       Directories now come back as `{ directory }` and the audit reports DIRECTORY-IMPORT.
 *
 * RUN:  node probe-extra-cases.mjs   (writes only under the OS temp dir)
 */
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectImportStatements, resolveSpecifier, exportSurface } from './lib-imports.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'probe-extra-'));
const write = (name, source) => {
  const file = path.join(dir, name);
  writeFileSync(file, source);
  return file;
};
const from = write('any.mjs', '');
mkdirSync(path.join(dir, 'pkg'));
writeFileSync(path.join(dir, 'pkg', 'index.mjs'), 'export const fromIndex = 1;\n');
writeFileSync(path.join(dir, 'legacy.cjs'), 'module.exports = { legacy: 1 };\n');
void fileURLToPath; // kept imported for parity with the other probes

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
};

// 1. A re-export is an import edge: a broken one must be visible, not skipped.
const reexport = collectImportStatements("export { thing } from './missing.mjs';\n");
check('re-export collected with its specifier', [reexport.length, reexport[0]?.specifier], [1, './missing.mjs']);
check('re-export of a missing file reports missing', Boolean(resolveSpecifier(from, './missing.mjs').missing), true);

// 2. `export * as ns from` must be collected AND must export the namespace name.
check('export * as ns collected', collectImportStatements("export * as ns from './other.mjs';\n").length, 1);

// 3. A side-effect import has no clause but is still an edge.
const sideEffect = collectImportStatements("import './side.mjs';\n");
check('side-effect import collected', [sideEffect.length, sideEffect[0]?.specifier], [1, './side.mjs']);

// 4. A query string is a BUNDLER form; Node cannot load it, so leaving it unresolved matches Node.
check('query-string specifier stays unresolved', Boolean(resolveSpecifier(from, './q.mjs?raw').missing), true);

// 5. THE ONE THAT FOUND A BUG: a bare directory must NOT resolve to index.mjs.
const dirResolution = resolveSpecifier(from, './pkg');
check('bare directory is reported as a directory, not resolved',
  [Boolean(dirResolution.directory), Boolean(dirResolution.file)], [true, false]);

// 5b. THE SECOND ONE, found by a reviewer comparing the tool with Node (round 122): an EXTENSIONLESS
//     specifier must NOT be resolved by guessing `.mjs`/`.cjs`/`.js`. Node ESM never guesses, so
//     resolving it made the audit print OK while Node threw ERR_MODULE_NOT_FOUND — the same false
//     pass as the directory case, one line further down.
writeFileSync(path.join(dir, 'plain.mjs'), 'export const plain = 1;\n');
const extensionless = resolveSpecifier(from, './plain');
check('extensionless specifier is NOT resolved by guessing extensions',
  [Boolean(extensionless.missing), Boolean(extensionless.file)], [true, false]);
const exact = resolveSpecifier(from, './plain.mjs');
check('the same specifier WITH its extension resolves', Boolean(exact.file), true);

// 6. A `.cjs` target: interop gives a default import; named imports are not statically checkable.
const cjsSurface = exportSurface(path.join(dir, 'legacy.cjs'));
check('.cjs target reports commonJs + no named surface',
  [cjsSurface.commonJs, cjsSurface.names.size], [true, 0]);

// 7. A shebang must not stop the first import being seen.
check('shebang file still yields its import',
  collectImportStatements("#!/usr/bin/env node\nimport x from './after.mjs';\n").length, 1);

// 8. Dynamic import() is out of scope by design — recorded, not silently assumed.
check('dynamic import() is NOT collected (documented scope)',
  collectImportStatements("const m = await import('./d.mjs');\n").length, 0);

// 9. Import attributes (`with { type: 'json' }`, Node 22+) must parse and yield the specifier.
let attributes = [];
try {
  attributes = collectImportStatements("import data from './d.json' with { type: 'json' };\n");
} catch (error) {
  attributes = [`threw: ${error.message}`];
}
check('import attributes parse and yield the specifier',
  [attributes.length, attributes[0]?.specifier], [1, './d.json']);

console.log(failures === 0 ? 'EXTRA_CASES_DISCRIMINATE' : `EXTRA_CASES_FAILED: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
