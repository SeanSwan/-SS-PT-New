#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: audit-named-exports.mjs
 * PURPOSE: Prove every `import { X } from 'pkg'` actually resolves binding X.
 * ADDED: 2026-07-29 (continuous-cleanup loop; SWA-79)
 * ============================================================================
 *
 * WHAT THIS DOES: collects every named-import-from-a-bare-package statement in backend/, imports
 * each package for real, and checks each requested binding exists on the resolved namespace.
 * Covered forms: single- AND double-quoted specifiers, `import { X }`, `import Default, { X }`,
 * and `export { X } from 'pkg'` re-exports — each one is the same crash at module load.
 *
 * WHY IT EXISTS — this is one of the TWO crash classes CLAUDE.md rule 42 names:
 *   1. ERR_MODULE_NOT_FOUND                         -> a path that does not resolve
 *   2. "does not provide an export named 'X'"       -> a path that resolves, binding that does not
 * Path-based scanning only catches (1). This catches (2), and they are genuinely different: the
 * live example (`import { ZipArchive } from 'archiver'`) has a perfectly valid path — `archiver` is
 * installed — but is CommonJS and exports no such name. Node throws at module load, and the process
 * dies at boot with everything else looking fine.
 *
 * It is easy to introduce: CJS packages have no static export list, so an editor autocompletes
 * nothing and TypeScript often shrugs. Only actually importing it settles the question.
 *
 * SAFETY: read-only with respect to the repo and the database. It DOES import third-party packages,
 * which is exactly what the server does at boot — no additional exposure.
 *
 * USAGE:
 *   node backend/scripts/audit-named-exports.mjs
 *   node backend/scripts/audit-named-exports.mjs --verbose   # list every statement checked
 *   node backend/scripts/audit-named-exports.mjs --help      # usage only; imports nothing
 *
 * EXIT CODES: 0 = all bindings resolve · 1 = at least one missing · 2 = the audit itself failed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..');
const verbose = process.argv.includes('--verbose');

// `--help` must NOT run the audit — see audit-write-paths.mjs. This one imports every third-party
// package in the backend, so a help request was doing real work for nothing.
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node backend/scripts/audit-named-exports.mjs [--verbose]');
  console.log('  Imports every bare package named in a `import { X } from "pkg"` and checks that');
  console.log('  binding X actually exists — CLAUDE.md rule 42 crash class 2. Exit 0 = all');
  console.log('  resolve, 1 = at least one missing, 2 = the audit itself failed.');
  process.exit(0);
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.understand-anything', 'coverage', 'dist', 'build', 'venv', '__pycache__',
]);

/**
 * `import { a, b as c } from 'pkg'` — bare specifiers only (no leading . or /).
 *
 * Statement shapes the first version silently missed — each one is the SAME load-time crash class,
 * so a miss here is an invisible coverage hole, not a stylistic gap:
 *   - double-quoted specifiers: real instances exist (sessionRoutes.mjs `from "uuid"`,
 *     models/contact.mjs `from "sequelize"`) and were checked zero times
 *   - `import Default, { X } from 'pkg'` — the named part crashes identically
 *   - `export { X } from 'pkg'` — a named re-export binds X exactly like an import
 */
const NAMED_IMPORT =
  /^(?:import|export)(?:\s+[A-Za-z_$][\w$]*\s*,)?\s*\{([^}]+)\}\s*from\s*(['"])([a-z@][a-z0-9@/._-]*)\2/gim;

function collectStatements(root) {
  const found = new Map(); // "pkg::a,b" -> { pkg, names, files:Set }
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.name.endsWith('.mjs') && !entry.name.endsWith('.js')) continue;
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }

      NAMED_IMPORT.lastIndex = 0;
      let match;
      while ((match = NAMED_IMPORT.exec(text)) !== null) {
        const names = match[1]
          .split(',')
          .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        if (!names.length) continue;
        const pkg = match[3];
        const key = `${pkg}::${names.join(',')}`;
        if (!found.has(key)) found.set(key, { pkg, names, files: new Set() });
        found.get(key).files.add(path.relative(BACKEND, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(root);
  return [...found.values()];
}

async function main() {
  const statements = collectStatements(BACKEND);

  const healthy = [];
  const broken = [];

  for (const stmt of statements) {
    try {
      const mod = await import(stmt.pkg);
      const missing = stmt.names.filter((n) => !(n in mod));
      if (missing.length) broken.push({ ...stmt, reason: `missing binding(s): ${missing.join(', ')}` });
      else healthy.push(stmt);
    } catch (error) {
      broken.push({ ...stmt, reason: `import failed: ${String(error.message).split('\n')[0]}` });
    }
  }

  const total = healthy.length + broken.length;

  console.log('\n=== Named-export audit (bare package imports) ===');
  console.log(`  statements checked : ${total}`);
  console.log(`  all bindings OK    : ${healthy.length}`);
  console.log(`  BROKEN             : ${broken.length}`);

  for (const b of broken) {
    console.log(`\n  ✗ import { ${b.names.join(', ')} } from '${b.pkg}'`);
    console.log(`      ${b.reason}`);
    for (const f of b.files) console.log(`      used in: ${f}`);
  }

  if (verbose) {
    console.log('\n  --- OK ---');
    for (const h of healthy) console.log(`    { ${h.names.join(', ')} } from '${h.pkg}'`);
  }

  // A check that examined NOTHING must never report success — see audit-model-health.mjs, whose
  // first version reported "ALL HEALTHY" having queried zero models.
  if (total === 0) {
    console.log('\n  AUDIT FAILED: zero import statements were found.');
    console.log('  That is a fault in this audit (bad root or regex), not a clean bill of health.\n');
    process.exit(2);
  }

  console.log(broken.length === 0
    ? '\n  ALL NAMED IMPORTS RESOLVE\n'
    : `\n  ${broken.length} broken named import(s) — these crash at module load (rule 42).\n`);

  process.exit(broken.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('audit-named-exports failed:', error);
  process.exit(2);
});
