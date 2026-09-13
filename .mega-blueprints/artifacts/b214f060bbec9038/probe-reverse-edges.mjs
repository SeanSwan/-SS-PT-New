/**
 * PROBE: does the drift audit see a BROKEN EDGE FROM AN UNCHANGED MODULE INTO A CHANGED ONE?
 *
 * The audit scans the imports OF changed modules. The mirror case — an unchanged module that imports
 * a name the changed module no longer exports — is the round-104 crash shape with the arrow reversed,
 * and if it is unchecked then renaming or removing an export in a changed file can pass the gate.
 *
 * This probe reasons over the real tree: it finds every UNCHANGED production module that imports a
 * CHANGED one, then checks whether an import of a name that no longer exists would be visible to
 * `drift-audit.mjs`. It prints the edges it finds so the answer is concrete.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { collectImportStatements, resolveSpecifier, exportSurface } from './lib-imports.mjs';

const backend = process.cwd();
const root = path.resolve(backend, '..');
const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);

const changed = new Set([...new Set([
  ...git(['ls-files', '--others', '--exclude-standard', 'backend/']),
  ...git(['diff', '--name-only', 'HEAD', 'backend/']),
])].map((p) => path.resolve(root, p)));

// every production module in the tree, changed or not
const all = git(['ls-files', 'backend/'])
  .concat(git(['ls-files', '--others', '--exclude-standard', 'backend/']))
  .filter((p) => /\.(mjs|cjs|js)$/.test(p))
  .filter((p) => !/(^|\/)(tests?|__tests__)\//.test(p))
  .map((p) => path.resolve(root, p))
  .filter((abs) => existsSync(abs));

const edges = [];
for (const file of all) {
  const fromChanged = changed.has(file);
  for (const { clause, specifier } of collectImportStatements(readFileSync(file, 'utf8'))) {
    const resolved = resolveSpecifier(file, specifier);
    if (!resolved.file || !changed.has(resolved.file)) continue;
    edges.push({ from: file, to: resolved.file, clause, fromChanged });
  }
}

const reverse = edges.filter((e) => !e.fromChanged);
console.log(`edges INTO changed modules: ${edges.length}`);
console.log(`  from CHANGED modules (the audit's current scope): ${edges.length - reverse.length}`);
console.log(`  from UNCHANGED modules (NOT scanned today)       : ${reverse.length}`);
for (const e of reverse.slice(0, 15)) {
  console.log(`    ${path.relative(root, e.from)}  ->  ${path.relative(root, e.to)}   ${e.clause.trim().slice(0, 60)}`);
}

// Would a name that vanished be visible? Demonstrate on one real edge by asking the export surface
// whether the name the unchanged file asks for is present.
let checked = 0;
let missing = 0;
for (const e of reverse) {
  const brace = e.clause.match(/\{([^}]*)\}/);
  const wanted = brace
    ? brace[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)
    : (/^\s*import\s+[A-Za-z_$][\w$]*\s*(,|$)/.test(e.clause) ? ['default'] : []);
  const surface = exportSurface(e.to);
  for (const name of wanted) {
    if (name === '*' || surface.commonJs) continue;
    checked += 1;
    if (!surface.names.has(name) && !surface.wildcard) {
      missing += 1;
      console.log(`  WOULD-BE-MISSED  ${path.relative(root, e.from)} wants { ${name} } from ${path.relative(root, e.to)}`);
    }
  }
}
console.log(`names requested through reverse edges: ${checked}; currently missing: ${missing}`);
console.log(missing === 0
  ? 'REVERSE_EDGES_CURRENTLY_SATISFIED (no live breakage today - the question is whether the audit would SEE one)'
  : 'REVERSE_EDGE_BREAKAGE_PRESENT');
