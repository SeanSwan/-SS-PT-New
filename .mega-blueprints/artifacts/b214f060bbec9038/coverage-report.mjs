/**
 * FILE: coverage-report.mjs
 * WHY:  `boot-gate.mjs` proves the three mounted route modules LOAD, and `drift-audit.mjs` checks
 *       every changed module's imports statically. Neither answers the question a reader actually
 *       has: **how much of the changed set does the runtime gate really exercise?** This walks the
 *       import graph from the same three route modules and reports which changed production modules
 *       are reachable from them — i.e. which ones the boot gate genuinely loads — and which are only
 *       checked statically.
 * RUN:  from <checkout>/backend :  node ..\.mega-blueprints\artifacts\<id>\coverage-report.mjs
 * NOTE: read-only. It executes nothing (the graph comes from the parser, not from import()).
 *
 * LIMITS: reachability here is STATIC (relative specifiers only, no dynamic import()). A module
 * reached only through `await import(...)` will appear unreachable even though the server loads it at
 * runtime — so "unreachable" means "the boot gate does not load it at startup", not "dead code".
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { collectImportStatements, resolveSpecifier } from './lib-imports.mjs';

const backend = process.cwd();
const root = path.resolve(backend, '..');

const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const changed = [...new Set([
  ...git(['ls-files', '--others', '--exclude-standard', 'backend/']),
  ...git(['diff', '--name-only', 'HEAD', 'backend/']),
])]
  .filter((p) => /\.(mjs|cjs|js)$/.test(p))
  .map((p) => path.resolve(root, p))
  .filter((abs) => existsSync(abs));

const ENTRIES = ['routes/bootcampRoutes.mjs', 'routes/sprintRoutes.mjs', 'routes/sprintStream.mjs']
  .map((rel) => path.join(backend, rel))
  .filter((abs) => existsSync(abs));

/** Breadth-first over relative import edges, from the three route modules. */
function reachableFrom(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let statements;
    try {
      statements = collectImportStatements(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    for (const { specifier } of statements) {
      const resolved = resolveSpecifier(file, specifier);
      if (resolved.file) queue.push(resolved.file);
    }
  }
  return seen;
}

const reached = reachableFrom(ENTRIES);
const isTest = (abs) => /(^|[\\/])(tests?|__tests__)[\\/]/.test(abs);
const productionChanged = changed.filter((abs) => !isTest(abs));
const reachableProduction = productionChanged.filter((abs) => reached.has(abs));
const staticOnly = productionChanged.filter((abs) => !reached.has(abs));

const rel = (abs) => path.relative(root, abs).replace(/\\/g, '/');
console.log(`changed/untracked backend modules : ${changed.length} (${productionChanged.length} production, ${changed.length - productionChanged.length} test)`);
console.log(`loaded by the boot gate (from ${ENTRIES.length} route entries) : ${reachableProduction.length}`);
console.log(`checked STATICALLY only (not loaded at boot)                 : ${staticOnly.length}`);
for (const abs of staticOnly.sort()) console.log(`  static-only  ${rel(abs)}`);
console.log(`graph files visited (incl. unchanged): ${reached.size}`);
process.exit(0);
