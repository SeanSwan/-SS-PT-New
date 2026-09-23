/**
 * F5 harness — driver.
 *
 * Runs safe-migrate.mjs's REAL `main()` against the stubbed boundaries, then
 * emits a JSON report on stdout between markers.
 *
 * Why call the exported `main()` instead of running the file as the entry point:
 * the driver needs `getAllMigrationFiles()` — the runner's own view of what is
 * executable — in order to script a scenario in terms of real migration names.
 * Importing the module for that list and then also invoking it as an entry point
 * is impossible in one process. Since the runner's invocation guard makes
 * importing side-effect free, calling `main()` explicitly is the same code path
 * the CLI takes, minus the argv check the CLI test already covers.
 *
 * `env` is read by safe-migrate.mjs at module scope from `process.argv[2]`, so
 * this driver must be invoked as `node --import register.mjs driver.mjs <env>`.
 *
 * In:  F5_SCENARIO_JSON — { pending: [...], byTarget: {...}, default: {...} }
 *      F5_RUNNER_PATH   — optional: an alternative safe-migrate.mjs to drive
 *                         (used by the mutation self-check)
 * Out: one line `@@F5_REPORT@@ <json>` on fd 1, plus the process exit code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const spec = JSON.parse(process.env.F5_SCENARIO_JSON || '{}');

const runnerHref = process.env.F5_RUNNER_PATH
  ? pathToFileURL(path.resolve(process.env.F5_RUNNER_PATH)).href
  : new URL('../../../scripts/safe-migrate.mjs', import.meta.url).href;

const runner = await import(runnerHref);
const cp = await import('./stubs/child_process.mjs');
const sq = await import('./stubs/sequelize.mjs');

if (typeof runner.main !== 'function' || typeof runner.getAllMigrationFiles !== 'function') {
  // Loud, and before anything is scripted: a driver that cannot reach the real
  // runner must never be able to produce a report that looks like a clean run.
  fs.writeSync(2, `F5 harness: ${runnerHref} does not export main()/getAllMigrationFiles()\n`);
  process.exit(97);
}

const { executable, inert } = runner.getAllMigrationFiles();

// `pending` is expressed in the runner's own vocabulary. A name that is not
// executable cannot be made pending, so the scenario would silently shrink —
// record it rather than letting a test pass against a run that never happened.
const pendingWanted = Array.isArray(spec.pending) ? spec.pending : [];
const executableSet = new Set(executable);
const pendingNotFound = pendingWanted.filter(name => !executableSet.has(name));

const executed = executable.filter(name => !pendingWanted.includes(name));
sq.setExecutedRows(executed);
cp.setScenario({
  byTarget: spec.byTarget || {},
  default: spec.default || { code: 0, stdout: '', stderr: '' },
  maxSpawns: typeof spec.maxSpawns === 'number' ? spec.maxSpawns : 500,
});

// Prove the runner actually ran. A harness that silently no-ops would make every
// assertion downstream vacuous — the failure mode Astra's F5 exists to close.
let sawBanner = false;
const realWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...rest) => {
  if (String(chunk).includes('Safe Migration Runner')) sawBanner = true;
  return realWrite(chunk, ...rest);
};

function buildReport() {
  const spawnTargets = cp.getSpawnTargets();
  return {
    argv2: process.argv[2],
    runnerPath: runnerHref,
    executableCount: executable.length,
    inertCount: inert.length,
    executedCount: executed.length,
    pendingCount: executable.length - executed.length,
    pendingWanted,
    pendingNotFound,
    sawBanner,
    exitCode: process.exitCode === undefined ? 0 : process.exitCode,
    spawnCount: spawnTargets.length,
    spawnTargets,
    inserts: sq.getMetadataInserts(),
    queryCount: sq.getQueries().length,
  };
}

// `main()` calls process.exit() on the failure paths, so the report has to be
// emitted from an exit handler — and it must be a SYNCHRONOUS write to fd 1.
// `process.stdout.write` on a pipe is asynchronous, so a buffered report would
// be lost exactly on the runs whose exit code matters most.
process.on('exit', () => {
  try {
    fs.writeSync(1, `\n@@F5_REPORT@@ ${JSON.stringify(buildReport())}\n`);
  } catch { /* the process exit code is still authoritative */ }
});

try {
  await runner.main();
} catch (err) {
  process.exitCode = 3;
  fs.writeSync(2, `F5 harness: main() threw —\n${(err && err.stack) || String(err)}\n`);
}
