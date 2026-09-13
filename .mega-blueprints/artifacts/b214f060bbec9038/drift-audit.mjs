/**
 * FILE: drift-audit.mjs
 * WHY:  Rule 42's failure mode is a Render boot crash: a module imports a file that was never
 *       committed (ERR_MODULE_NOT_FOUND) or a name its source never exports (SyntaxError: does
 *       not provide an export named 'X'). `node --check` cannot see either — it parses one file
 *       and resolves nothing. The boot gate catches them only for the modules it actually
 *       imports (the mounted route graph). This audit closes that gap STATICALLY for EVERY
 *       changed/untracked backend module: it resolves each relative import to a file and checks
 *       that every named import exists in the target's export surface.
 *
 *       Round-104 precedent, which this would have caught: `bootcampCrud.mjs` imported
 *       `normalizeExerciseLibraryId` from `bootcampTemplateMedia.mjs`, which never exported it.
 *       The whole backend suite stayed green; the server could not boot.
 *
 * RUN:  from <checkout>/backend :  node ..\.mega-blueprints\artifacts\<id>\drift-audit.mjs
 * EXIT: 0 = DRIFT_AUDIT_OK, 1 = at least one unresolvable or unexported import.
 * NOTE: read-only, static (executes nothing, opens no database).
 *
 * LIMITS, stated so the result is not over-read:
 *  - Extraction is done by acorn (the AST), not by text matching — see lib-imports.mjs for the four
 *    FALSE PASSES that ended the hand-rolled approach.
 *  - It checks RESOLUTION and EXPORT NAMES, not types, arity or runtime behaviour.
 *  - A LOCAL `export * from './x.mjs'` is FOLLOWED: the target's surface is unioned in (depth 4,
 *    cycle-guarded), so names re-exported that way are verified rather than shrugged at. Only an
 *    EXTERNAL (`export * from 'some-package'`) or unresolvable re-export is counted UNVERIFIABLE.
 *    Round 115 changed this — the earlier count of 31 unverifiable was a blind spot, and the header
 *    text that described the old behaviour is what the reviewer caught.
 *  - A file the parser cannot read is reported as PARSE-ERROR: the audit may then be checking less
 *    than it thinks, which is stated rather than silent.
 *  - Dynamic `await import(...)` and side-effect `import './x.mjs'` are invisible to this scan;
 *    `boot-gate.mjs` covers the mount graph with a real `import()`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
// Import scanning, specifier resolution AND the export surface all come from lib-imports.mjs, which
// parses with acorn. This file used to carry its own text-based versions; round 116 showed four of
// their holes were FALSE PASSES (a commented-out `export` counted as real, only the first name of a
// multi-declarator statement was seen, `export * as ns` matched nothing, and default imports were
// never checked at all because the clause regex could not match). A real parser removes the class.
import { collectImportStatements, resolveSpecifier, exportSurface } from './lib-imports.mjs';

// Round 147: resolve the packet root by WALKING UP, not by assuming CWD is `backend/`. The former
// `path.resolve(process.cwd(), '..')` pointed the whole audit at a tree that was not this one — from the
// packet root it crashed, and from the artifact directory it would have audited nothing and still had a
// verdict to print. An import audit against the wrong root is not a weaker audit; it is an audit of
// something else.
function resolveRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, 'backend')) && existsSync(path.join(dir, '.mega-blueprints'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = resolveRoot(process.cwd());
if (!root) {
  console.log(`DRIFT_AUDIT_FAILED: no packet root at or above ${process.cwd()}`);
  console.log('  a packet root holds BOTH backend/ and .mega-blueprints/');
  process.exit(1);
}

const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const untracked = new Set(git(['ls-files', '--others', '--exclude-standard', 'backend/'])
  .map((p) => path.resolve(root, p)));
const trackedModified = new Set(git(['diff', '--name-only', 'HEAD', 'backend/'])
  .map((p) => path.resolve(root, p)));

const changed = [...new Set([...untracked, ...trackedModified])]
  .filter((abs) => /\.(mjs|cjs|js)$/.test(abs) && existsSync(abs));

let unresolved = 0;
let unexported = 0;
let unverifiable = 0;
let unparseable = 0;
let checkedImports = 0;
const problems = [];

for (const file of changed) {
  const src = readFileSync(file, 'utf8');
  const statements = collectImportStatements(src);
  // A file the PARSER cannot read is reported, never silently treated as "no imports" (round 116).
  // Before this, an unparseable or mis-masked file contributed zero imports and the audit still
  // printed OK — the false pass that four review findings were built on.
  if (statements.parseError) {
    unparseable += 1;
    problems.push(`PARSE-ERROR  ${path.relative(root, file)} — ${statements.parseError}; its imports could NOT be checked`);
  }
  for (const { clause, specifier: spec } of statements) {
    checkedImports += 1;
    const resolved = resolveSpecifier(file, spec);
    if (resolved.external) continue;
    if (resolved.directory) {
      // Node refuses directory imports outright (ERR_UNSUPPORTED_DIR_IMPORT), so this is a boot
      // failure even though `index.mjs` exists. Resolving it silently would be a FALSE PASS.
      unresolved += 1;
      problems.push(`DIRECTORY-IMPORT  ${path.relative(root, file)} -> '${spec}' is a directory; Node ESM will refuse to load it`);
      continue;
    }
    if (resolved.missing) {
      unresolved += 1;
      problems.push(`UNRESOLVED  ${path.relative(root, file)} -> '${spec}' (no file at ${path.relative(root, resolved.missing)})`);
      continue;
    }
    const wanted = [];
    const braceMatch = clause.match(/\{([^}]*)\}/);
    if (braceMatch) {
      for (const part of braceMatch[1].split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const asMatch = trimmed.match(/^([A-Za-z_$][\w$]*)\s+as\s+/);
        wanted.push(asMatch ? asMatch[1] : trimmed);
      }
    }
    if (/^\s*,?\s*[A-Za-z_$][\w$]*\s*(?:,|$)/.test(clause.replace(/^[^,]*/, '')) && /^\s*[A-Za-z_$][\w$]*\s*,/.test(clause)) {
      wanted.push(clause.trim().split(',')[0]);
    }
    const defaultMatch = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (defaultMatch && !clause.trim().startsWith('{')) wanted.push('default');
    const surface = exportSurface(resolved.file);
    for (const name of wanted) {
      if (surface.commonJs) {
        // default is provided by the interop; named imports from CJS are not statically checkable
        if (name === 'default') continue;
        unverifiable += 1;
        continue;
      }
      if (surface.names.has(name)) continue;
      if (surface.wildcard) { unverifiable += 1; continue; }
      unexported += 1;
      problems.push(`UNEXPORTED  ${path.relative(root, file)} imports { ${name} } from '${spec}' - not found in ${path.relative(root, resolved.file)}`);
    }
  }
}

console.log(`changed/untracked backend modules: ${changed.length}`);
console.log(`relative imports checked         : ${checkedImports}`);

// ── REVERSE-EDGE PASS (added round 126) ──────────────────────────────────────────────────────
// Everything above scans the imports OF changed modules. The MIRROR case — an UNCHANGED module that
// imports a name a changed module no longer exports — is the same boot-crash shape with the arrow
// reversed, and it was invisible: 9 such edges exist in this tree today, including the
// `services/bootcamp/index.mjs` barrel importing 13+ named exports from five changed modules. Removing
// or renaming one of those exports would have kept `DRIFT_AUDIT_OK` while the barrel failed to load.
//
// Scope: tracked + untracked PRODUCTION modules (tests are not loaded at boot; the suite catches those
// edges itself). Unchanged modules are read but never modified.
const changedSet = new Set(changed);
const allProduction = [...new Set([
  ...git(['ls-files', 'backend/']),
  ...git(['ls-files', '--others', '--exclude-standard', 'backend/']),
])]
  .map((p) => path.resolve(root, p))
  .filter((abs) => /\.(mjs|cjs|js)$/.test(abs))
  .filter((abs) => !/(^|\/)(tests?|__tests__)\//.test(abs))
  .filter((abs) => existsSync(abs));

const wantedNames = (clause) => {
  const names = [];
  const brace = clause.match(/\{([^}]*)\}/);
  if (brace) {
    for (const part of brace[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const asMatch = trimmed.match(/^([A-Za-z_$][\w$]*)\s+as\s+/);
      names.push(asMatch ? asMatch[1] : trimmed);
    }
  }
  const defaultMatch = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch && !clause.trim().startsWith('{')) names.push('default');
  return names;
};

let reverseEdges = 0;
for (const file of allProduction) {
  if (changedSet.has(file)) continue; // the forward pass already covered changed importers
  let statements;
  try {
    statements = collectImportStatements(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  for (const { clause, specifier: spec } of statements) {
    const resolved = resolveSpecifier(file, spec);
    if (!resolved.file || !changedSet.has(resolved.file)) continue;
    reverseEdges += 1;
    const surface = exportSurface(resolved.file);
    for (const name of wantedNames(clause)) {
      if (surface.commonJs) {
        if (name === 'default') continue;
        unverifiable += 1;
        continue;
      }
      if (surface.names.has(name)) continue;
      if (surface.wildcard) { unverifiable += 1; continue; }
      unexported += 1;
      problems.push(`REVERSE-UNEXPORTED  ${path.relative(root, file)} still imports { ${name} } from ${path.relative(root, resolved.file)}, which no longer exports it`);
    }
  }
}
console.log(`reverse edges into changed modules: ${reverseEdges} (unchanged importers)`);

console.log(`unresolved imports               : ${unresolved}`);
console.log(`named imports not exported       : ${unexported}`);
console.log(`unverifiable (external export *): ${unverifiable}`);
console.log(`files the parser could not read : ${unparseable}`);
for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
if (problems.length > 40) console.log(`  ...and ${problems.length - 40} more`);
// Round 147 vacuity guard: every clause of `ok` below is a zero-count test, so a run that found no
// changed modules satisfied all of them without reading an import. Forbid the empty verdict.
if (changed.length === 0) {
  // ROUND 210: distinguish a CLEAN TREE from a WRONG ROOT. Zero changed modules is the normal state
  // immediately after a commit, and failing there would report a healthy tree as broken — the mirror of
  // the false pass this guard was added to prevent. A wrong root still fails, because git status under
  // the wrong root lists something.
  const dirtyUnderRoot = git(['status', '--porcelain', 'backend/']).length > 0;
  if (!dirtyUnderRoot) {
    console.log('DRIFT_AUDIT_OK: nothing to audit — the working tree has no uncommitted backend changes');
    process.exit(0);
  }
  console.log('DRIFT_AUDIT_FAILED: the working tree has changes but no changed/untracked backend modules were found,');
  console.log('  so no import was resolved — check the root and the git state');
  process.exit(1);
}
const ok = unresolved === 0 && unexported === 0 && unparseable === 0;
console.log(ok ? 'DRIFT_AUDIT_OK' : 'DRIFT_AUDIT_FAILED');
process.exit(ok ? 0 : 1);
