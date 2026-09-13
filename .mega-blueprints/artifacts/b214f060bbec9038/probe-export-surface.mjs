/**
 * FILE: probe-export-surface.mjs
 * WHY:  Round 116 found four false PASSES and two false FAILURES in the drift audit's export surface,
 *       all of them artefacts of reading RAW SOURCE with regexes. The surface now comes from acorn's
 *       AST. These fixtures are the reviewer's, with the expected answer stated, plus a control.
 * RUN:  node probe-export-surface.mjs   (writes only under the OS temp dir)
 */
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportSurface } from './lib-imports.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'probe-exports-'));
const write = (name, source) => {
  const file = path.join(dir, name);
  writeFileSync(file, source);
  return file;
};

const cases = [
  // [label, module source, name to look for, expected present?]
  ['F5: export at line start inside a BLOCK COMMENT is not an export',
    '/*\nexport const ghost = 1;\n*/\nexport const real = 2;\n', 'ghost', false],
  ['F6: the SECOND name of a multi-declarator statement IS exported',
    'export const first = 1, second = 2;\n', 'second', true],
  ['F7: `export * as ns from` exports the namespace name',
    "export * as ns from './other.mjs';\n", 'ns', true],
  ['plain named export', 'export function thing() {}\n', 'thing', true],
  ['export with rename', 'const a = 1;\nexport { a as renamed };\n', 'renamed', true],
  ['export default', 'export default function named() {}\n', 'default', true],
  ['CONTROL: a name that is genuinely absent', 'export const present = 1;\n', 'absent', false],
];

let failures = 0;
for (const [label, source, name, expected] of cases) {
  const file = write('m.mjs', source);
  const surface = exportSurface(file);
  const got = surface.names.has(name);
  const ok = got === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: has(${name})=${got} expected=${expected}`);
}

// A module the parser cannot read must be reported as wildcard (i.e. unverifiable), never as an
// empty surface that would make every import look broken.
const brokenFile = write('broken.mjs', 'export const = ;\n');
const broken = exportSurface(brokenFile);
const brokenOk = Boolean(broken.parseError) && broken.wildcard === true;
console.log(`${brokenOk ? 'ok  ' : 'FAIL'}  unparseable module -> wildcard + parseError (${broken.parseError ?? 'NONE'})`);
if (!brokenOk) failures += 1;

console.log(failures === 0 ? 'EXPORT_SURFACE_DISCRIMINATES' : `EXPORT_SURFACE_UNDISCRIMINATING: ${failures} case(s)`);
process.exit(failures === 0 ? 0 : 1);
