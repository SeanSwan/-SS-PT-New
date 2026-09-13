/**
 * FILE: boot-gate.mjs
 * WHY:  A green vitest run does NOT prove the backend boots. vitest's transform
 *       tolerates a duplicate `import` declaration that Node's own parser rejects
 *       (measured: a duplicate import in bootcampRoutes.mjs rode through several
 *       full-suite runs before `node --check` found it). This gate is the missing
 *       half of the test signal:
 *         1. `node --check` over every changed/untracked backend code file, so a
 *            file the test runner transforms but Node cannot parse fails here.
 *         2. a real dynamic `import()` of the mounted route modules, so a module
 *            that parses but cannot LINK (e.g. imports a name its source never
 *            exports) fails here instead of at Render boot.
 *         3. a link check over the mount graph, so a route module that exists but
 *            is wired to nothing is visible.
 * RUN:  from <checkout>/backend :  node ..\.mega-blueprints\artifacts\<id>\boot-gate.mjs
 * EXIT: 0 = BOOT_GATE_OK, 1 = at least one module failed to parse, link or mount.
 * NOTE: read-only. It writes no file and touches no database.
 *
 * Export shapes are MEASURED, not assumed: a previous version of this gate
 * assumed every route module has a default export and reported
 * `NO-ROUTER routes/sprintStream.mjs` — the module is fine, it exports
 * `registerSprintStreamRoute` by name and sprintRoutes.mjs imports and calls it
 * (lines 34 and 240). The gate was wrong, not the code.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { importsFile } from './lib-imports.mjs';

// Round 149: resolve the packet root by WALKING UP, not by assuming CWD is `backend/` — the same
// assumption TRAP 3 removed from preflight-freshness, encoding-scan and drift-audit. This file was
// MISSED by that sweep and crashed outright when run from the packet root, which is how the omission
// surfaced: a gate that dies is loud, but a sweep that stops one file short is not.
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
  console.log(`BOOT_GATE_FAILED: no packet root at or above ${process.cwd()}`);
  console.log('  a packet root holds BOTH backend/ and .mega-blueprints/');
  process.exit(1);
}

// The backend directory is DERIVED from the root, not taken from the working directory. Every use
// below is `path.join(backend, rel)` with a repo-relative path that has already had its `backend/`
// prefix stripped, so from `backend/` this is identical to the old `process.cwd()` value — and from
// anywhere else it is now correct instead of accidentally pointing somewhere else.
const backend = path.join(root, 'backend');

const git = (args) => {
  const out = execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
};

const untracked = git(['ls-files', '--others', '--exclude-standard', 'backend/']);
const modified = git(['diff', '--name-only', 'HEAD', 'backend/']);
const changed = [...new Set([...untracked, ...modified])]
  .map((p) => p.replace(/^backend\//, ''))
  .filter((p) => /\.(mjs|cjs|js)$/.test(p))
  .sort();

const isTest = (p) => /(^|\/)(tests?|__tests__)\//.test(p);
const production = changed.filter((p) => !isTest(p));
const tests = changed.filter(isTest);

console.log(`changed/untracked backend code files: ${changed.length} (${production.length} production, ${tests.length} test)`);

let parseFailures = 0;
for (const rel of changed) {
  const abs = path.join(backend, rel);
  if (!existsSync(abs)) {
    console.log(`  MISSING  ${rel}`);
    parseFailures += 1;
    continue;
  }
  try {
    execFileSync(process.execPath, ['--check', abs], { stdio: 'pipe' });
  } catch (error) {
    parseFailures += 1;
    console.log(`  PARSE-FAIL  ${rel}`);
    console.log(String(error.stderr || error.message).split(/\r?\n/).slice(0, 6).join('\n'));
  }
}
console.log(parseFailures === 0
  ? `PARSE_OK: all ${changed.length} modules parse under node --check`
  : `PARSE_FAILED: ${parseFailures} module(s)`);

let linkFailures = 0;

// 1. Every route module must be imported BY NAME from its mounter. The check RESOLVES the
//    specifier to a real file instead of matching the filename: a regex on the name is satisfied
//    by an import inside a block comment, one inside a template literal, and an import of a
//    different file that merely shares the basename — hostile review, round 114 F1, all three
//    demonstrated. Resolution is the only test that means "wired to THIS module".
const mountGraph = [
  { mounter: 'core/routes.mjs', target: 'routes/bootcampRoutes.mjs' },
  { mounter: 'core/routes.mjs', target: 'routes/sprintRoutes.mjs' },
  { mounter: 'routes/sprintRoutes.mjs', target: 'routes/sprintStream.mjs' },
];
for (const { mounter, target } of mountGraph) {
  const mounterFile = path.join(backend, mounter);
  const targetFile = path.join(backend, target);
  const source = readFileSync(mounterFile, 'utf8');
  if (!importsFile(mounterFile, targetFile, source)) {
    linkFailures += 1;
    console.log(`  UNMOUNTED  ${target} is not imported by ${mounter} (no resolving import statement)`);
  } else {
    console.log(`  mount link ok  ${mounter} -> ${target} (specifier resolves to this file)`);
  }
}

// 2. Every route module must LOAD, with the export shape it actually declares.
const expectations = [
  { rel: 'routes/bootcampRoutes.mjs', kind: 'default' },
  { rel: 'routes/sprintRoutes.mjs', kind: 'default' },
  { rel: 'routes/sprintStream.mjs', kind: 'named', name: 'registerSprintStreamRoute' },
];
for (const { rel, kind, name } of expectations) {
  const abs = path.join(backend, rel);
  if (!existsSync(abs)) {
    linkFailures += 1;
    console.log(`  MISSING  ${rel}`);
    continue;
  }
  try {
    const loaded = await import(pathToFileURL(abs).href);
    const target = kind === 'default' ? loaded.default : loaded[name];
    if (typeof target !== 'function') {
      linkFailures += 1;
      console.log(`  BAD-EXPORT  ${rel} ${kind === 'default' ? 'default' : name} is ${typeof target}`);
    } else {
      const detail = kind === 'default' ? `stack layers: ${target.stack?.length ?? 'n/a'}` : 'named export is a function';
      console.log(`  linked  ${rel} (${detail})`);
    }
  } catch (error) {
    linkFailures += 1;
    console.log(`  LINK-FAIL  ${rel}`);
    console.log(String(error.stack || error.message).split(/\r?\n/).slice(0, 8).join('\n'));
  }
}

// 3. RUNTIME COVERAGE OF THE REST OF THE CHANGED SET (added round 125).
//
// The three route imports above load 30 of the 37 changed production modules; a coverage report
// (`coverage-report.mjs`) showed the other SEVEN are only checked statically — including
// `services/bootcamp/bootcampAttendance.mjs` (the H28 attendance service) and
// `models/BootcampClassLog.mjs` (the H29 model). A static check cannot see an import-time throw, so
// those modules could crash a request while this gate still printed OK.
//
// So every changed/untracked PRODUCTION module is imported too, EXCEPT three classes that are not
// safe to import because importing them RUNS them:
//   - `migrations/**`      — sequelize-cli migrations mutate a database when executed;
//   - `scripts/**`         — operator scripts (this packet's own fixture migration hits PostgreSQL);
//   - `*.config.mjs`       — test-runner configuration, not served code.
// Those stay statically checked only, and that exclusion is stated here rather than implied.
const NOT_SAFE_TO_IMPORT = [
  /(^|\/)migrations\//,
  /(^|\/)scripts\//,
  /\.config\.mjs$/,
];
const productionChanged = changed.filter((rel) => !/(^|\/)(tests?|__tests__)\//.test(rel));
const runtimeCandidates = productionChanged.filter((rel) => !NOT_SAFE_TO_IMPORT.some((re) => re.test(rel)));
const importOnly = runtimeCandidates.filter((rel) => !expectations.some((e) => e.rel === rel));

let runtimeFailures = 0;
for (const rel of importOnly) {
  try {
    await import(pathToFileURL(path.join(backend, rel)).href);
  } catch (error) {
    runtimeFailures += 1;
    console.log(`  IMPORT-FAIL  ${rel}`);
    console.log(String(error.stack || error.message).split(/\r?\n/).slice(0, 6).join('\n'));
  }
}
console.log(`  runtime-imported ${importOnly.length} further production module(s); ${productionChanged.length - runtimeCandidates.length} left static-only by class (migrations/scripts/config)`);

const ok = parseFailures === 0 && linkFailures === 0 && runtimeFailures === 0;
console.log(ok ? 'ROUTE_GRAPH_LINKS_OK' : `ROUTE_GRAPH_LINKS_FAILED: ${linkFailures + runtimeFailures} link problem(s)`);
console.log(ok ? 'BOOT_GATE_OK' : 'BOOT_GATE_FAILED');
process.exit(ok ? 0 : 1);
