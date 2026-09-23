/**
 * F5 harness — mutant root.
 *
 * A green test proves nothing unless it can be shown to go red for the RIGHT
 * reason. The behavioural harness in safeMigrateControlFlow.test.mjs asserts on
 * outcomes produced by running the real runner, so the risk it carries is not
 * vacuity — it is that the assertions are not load-bearing. The only way to know
 * is to break the runner deliberately and watch them fail.
 *
 * Doing that in the real tree is what tests/mutation/guards.mutation.test.mjs
 * explicitly refuses to do, and rightly: this repo carries a thousand
 * uncommitted changes and a harness killed mid-run would leave mutated source
 * behind with no git safety net.
 *
 * So this builds a throwaway root that LOOKS like backend/ from the runner's
 * point of view:
 *
 *     .mutant-root/
 *       scripts/safe-migrate.mjs   <- a mutated copy, written per mutation
 *       migrations                 <- a JUNCTION to the real migrations directory
 *
 * safe-migrate.mjs resolves `backendDir = path.resolve(__dirname, '..')` and
 * `migrationsDir = backendDir/migrations`, so the copy at `.mutant-root/scripts/`
 * finds the real migration set through the junction — real discovery, real
 * filenames, no copy of 350 files and no drift.
 *
 * WHY THIS DIRECTORY IS NEVER DELETED RECURSIVELY: `.mutant-root/migrations` is
 * a junction into the repository's real migrations. A recursive delete that
 * followed it would destroy real source. Only individual mutant files are ever
 * removed, and the root is created once and reused.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..', '..', '..');

export const REAL_RUNNER = join(BACKEND, 'scripts', 'safe-migrate.mjs');
const ROOT = join(HERE, '.mutant-root');
const MUTANT_DIR = join(ROOT, 'scripts');

export function ensureMutantRoot() {
  mkdirSync(MUTANT_DIR, { recursive: true });
  const link = join(ROOT, 'migrations');
  if (!existsSync(link)) {
    symlinkSync(join(BACKEND, 'migrations'), link, 'junction');
  }
  return ROOT;
}

let sequence = 0;
const written = [];

/**
 * Write a mutated copy of the real runner and return its path.
 *
 * `transform` must return a DIFFERENT string; a mutation that silently fails to
 * apply would leave a pristine copy behind and the "test went red" verdict would
 * be a verdict about nothing.
 */
export function writeMutant(transform) {
  ensureMutantRoot();

  const original = readFileSync(REAL_RUNNER, 'utf8');
  const mutated = transform(original);
  if (typeof mutated !== 'string' || mutated === original) {
    throw new Error('F5 mutation did not apply — the runner source moved or the pattern no longer matches');
  }

  const file = join(MUTANT_DIR, `mutant-${(sequence += 1)}.mjs`);
  writeFileSync(file, mutated);
  written.push(file);
  return file;
}

/**
 * Best-effort, and deliberately not an assertion — the same reasoning as
 * guards.mutation.test.mjs's afterAll: this environment rate-limits deletes, and
 * a cleanup that fails is not a statement about the runner. The names are
 * deterministic per run, so a leftover is overwritten rather than accumulated,
 * and nothing imports this directory.
 */
export function cleanupMutants() {
  for (const file of written.splice(0)) {
    try {
      rmSync(file, { force: true });
    } catch {
      try {
        writeFileSync(file, '// F5 mutant — cleanup deferred by the safe-delete shim.\n');
      } catch { /* nothing further to try */ }
    }
  }
}
