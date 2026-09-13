/**
 * FILE: probe-mountregex.mjs
 * WHY:  The mount check must be shown to DISCRIMINATE, not assumed to. Round 113 proved the
 *       filename-regex form was satisfied by a comment; round 114 (F1) then showed THREE more
 *       inputs that satisfied it without any wiring at all:
 *         (i)   an import inside a BLOCK comment,
 *         (ii)  an import inside a TEMPLATE LITERAL,
 *         (iii) an import of a DIFFERENT file that shares the basename.
 *       The check now resolves the specifier to a real path (lib-imports.mjs), so this probe
 *       carries all five shapes: one positive, four negatives.
 * RUN:  node probe-mountregex.mjs   (reads only; derives the checkout from its own location)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importsFile, collectImportStatements } from './lib-imports.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const mounter = path.join(root, 'backend', 'core', 'routes.mjs');
const target = path.join(root, 'backend', 'routes', 'bootcampRoutes.mjs');
const real = readFileSync(mounter, 'utf8');

// Mutate LINE-BASED, not with a second regex: an earlier version commented the import out with a
// regex whose `^\s*` anchor slid onto the PREVIOUS import line, so the "commented" fixture still
// contained a live import and the probe blamed the gate for its own bug.
const lines = real.split('\n');
const targetIndex = lines.findIndex((l) => /^\s*import\b[^;]*from\s*['"][^'"]*bootcampRoutes\.mjs['"]/.test(l));
if (targetIndex === -1) {
  console.log('PROBE_BROKEN: could not find the import line to mutate');
  process.exit(1);
}
const withLine = (replacement) => {
  const copy = [...lines];
  copy[targetIndex] = replacement;
  return copy.join('\n');
};
const commented = withLine(`// ${lines[targetIndex]}`);
if (commented === real || !commented.split('\n')[targetIndex].startsWith('//')) {
  console.log('PROBE_BROKEN: the line-comment mutation did not apply');
  process.exit(1);
}

const cases = [
  ['real mounter', real, true],
  ['import line commented out with //', commented, false],
  ['import inside a BLOCK comment (F1-i)', withLine(`/*\n${lines[targetIndex]}\n*/`), false],
  ['import inside a TEMPLATE LITERAL (F1-ii)', withLine(`const s = \`\n${lines[targetIndex]}\n\`;`), false],
  ['import of a DIFFERENT file with the same basename (F1-iii)',
    withLine("import bootcampRoutes from '../routes/archive/bootcampRoutes.mjs';"), false],
  ['filename mentioned in a comment only', `// used to import bootcampRoutes.mjs\nconst n = 'bootcampRoutes.mjs';\n`, false],
];

let failures = 0;
for (const [label, source, expected] of cases) {
  const got = importsFile(mounter, target, source);
  const ok = got === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: matched=${got} expected=${expected}`);
}

// Sanity on the scanner itself: the real file's multi-line imports must still be SEEN, otherwise
// "matched=false" could just mean "the scanner found nothing anywhere".
const seen = collectImportStatements(real).length;
console.log(`scanner sanity: ${seen} import statements collected from the real mounter`);
if (seen < 5) { failures += 1; console.log('FAIL  scanner sanity: too few statements collected'); }

console.log(failures === 0 ? 'MOUNT_REGEX_DISCRIMINATES' : `MOUNT_REGEX_UNDISCRIMINATING: ${failures} case(s)`);
process.exit(failures === 0 ? 0 : 1);
