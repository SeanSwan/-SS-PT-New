/**
 * FILE: probe-parser-lib.mjs
 * WHY:  The four HIGH findings of round 116 were all false PASSES in the hand-rolled text scanner.
 *       The extraction now uses acorn (the AST), so this probe replays the reviewer's fixtures plus
 *       the earlier ones. Every case states the EXPECTED answer, and the checked-in control case
 *       proves the probe can fail.
 * RUN:  node probe-parser-lib.mjs     (read-only)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectImportStatements, importsFile, exportSurface } from './lib-imports.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const mounter = path.join(root, 'backend', 'core', 'routes.mjs');
const target = path.join(root, 'backend', 'routes', 'bootcampRoutes.mjs');
const real = readFileSync(mounter, 'utf8');

const cases = [
  // [label, source, expected importsFile(mounter -> target)]
  ['real mounter', real, true],
  ['round-113: import line commented out with //', `// import x from '../routes/bootcampRoutes.mjs';\n`, false],
  ['round-114: import inside a BLOCK comment', `/*\nimport x from '../routes/bootcampRoutes.mjs';\n*/\n`, false],
  ['round-114: import inside a TEMPLATE LITERAL', 'const s = `\nimport x from \'../routes/bootcampRoutes.mjs\';\n`;\n', false],
  ['round-114: DIFFERENT file, same basename', `import x from '../routes/archive/bootcampRoutes.mjs';\n`, false],
  ['round-114: filename mentioned in a comment only', `// used to import bootcampRoutes.mjs\nconst n = 'bootcampRoutes.mjs';\n`, false],
  ['round-116 F1: NESTED template un-masking (valid JS)', 'const s = `a${\n`\nimport x from \'../routes/bootcampRoutes.mjs\';\n`}b`;\n', false],
  ['round-116 F2: backslash-newline continuation then a real import', "const s = 'a\\\nb';\nimport x from '../routes/bootcampRoutes.mjs';\n", true],
  ['round-116 F3: regex literal containing /* then a real import', "const SEP = /[/*]/;\nimport x from '../routes/bootcampRoutes.mjs';\n", true],
  ['round-116 F9: two imports on ONE line (first is another file)', "import a from '../routes/sprintRoutes.mjs'; import x from '../routes/bootcampRoutes.mjs';\n", true],
  ['round-116 F14: regex literal with a quote on the last line', "const re = /'/;\nimport x from '../routes/bootcampRoutes.mjs';\n", true],
  ['quoted /* then a real import (round 115 F3)', "const s = '/*';\nimport x from '../routes/bootcampRoutes.mjs';\n", true],
  ['CONTROL: a file that genuinely does not import it', "import a from '../routes/sprintRoutes.mjs';\n", false],
];

let failures = 0;
for (const [label, source, expected] of cases) {
  const got = importsFile(mounter, target, source);
  const ok = got === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: matched=${got} expected=${expected}`);
}

// Parse errors must be REPORTED, never silently treated as "no imports".
const broken = collectImportStatements('import { from missing braces;\n');
const brokenOk = Boolean(broken.parseError) && broken.length === 0;
console.log(`${brokenOk ? 'ok  ' : 'FAIL'}  unparseable source reports parseError instead of silence: ${broken.parseError ?? 'NONE'}`);
if (!brokenOk) failures += 1;

// The export surface must come from the AST: commented-out exports are not exports, and a
// multi-declarator statement exports BOTH names.
const surface = exportSurface(path.join(root, 'backend', 'services', 'bootcamp', 'bootcampStructure.mjs'));
const surfaceNames = [...surface.names].sort();
console.log(`scanner sanity: core/routes.mjs yields ${collectImportStatements(real).length} statements`);
console.log(`export surface of bootcampStructure.mjs: ${surfaceNames.join(', ')}`);
if (surfaceNames.length < 2) { console.log('FAIL  export surface looks empty'); failures += 1; }

console.log(failures === 0 ? 'PARSER_LIB_DISCRIMINATES' : `PARSER_LIB_UNDISCRIMINATING: ${failures} case(s)`);
process.exit(failures === 0 ? 0 : 1);
