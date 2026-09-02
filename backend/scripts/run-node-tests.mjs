/**
 * Run the suites written for node:test — the ones vitest cannot see.
 * ============================================================================
 *
 * SIXTEEN FILES IN THIS REPOSITORY ARE WRITTEN AGAINST `node:test`, NOT VITEST. Vitest's
 * `include` pattern matched them anyway, failed to collect them, and reported each as a
 * failing FILE while counting ZERO of their tests. They were then recorded in
 * `tests/known-failing-baseline.json` as "failing for reasons that predate current work".
 *
 * They were not failing. They pass 178/178 under their own runner, and were executed by no
 * automated path at all: no npm script ran `node --test`, and vitest could only mis-collect
 * them. A suite that cannot be seen to fail is not a suite — it is decoration that costs
 * maintenance.
 *
 * The fix has three parts and this is one of them: the files carry a `.nodetest.mjs`
 * suffix so vitest's `*.test.{js,mjs}` pattern no longer claims them, vitest excludes the
 * suffix explicitly, and this script actually runs them.
 *
 * WHY A SCRIPT AND NOT A GLOB IN package.json. `node --test tests/unit/*.nodetest.mjs`
 * depends on the shell expanding the glob, which cmd.exe does not do — the same class of
 * portability trap that has bitten this repo through Git Bash paths more than once. This
 * enumerates the files itself.
 *
 *   node backend/scripts/run-node-tests.mjs        # run them
 *   node backend/scripts/run-node-tests.mjs --list # just say which files these are
 */

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isMainModule } from '../../scripts/lib/is-main-module.mjs';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** Every `.nodetest.mjs` under tests/, relative to the backend root. */
export function findNodeTestFiles(root = ROOT) {
  const out = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const abs = join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(abs, r);
      else if (e.name.endsWith('.nodetest.mjs')) out.push(r);
    }
  };
  walk(join(root, 'tests'), 'tests');
  return out.sort();
}

/**
 * ONLY WHEN RUN DIRECTLY. `findNodeTestFiles` is imported by a drift test, and everything
 * below spawns a test run — so without this guard, importing the finder would execute the
 * whole node:test suite from inside vitest.
 *
 * That is the second time this exact trap has come up today; the push gate had it too, and
 * there the answer was to move the pure function into `scripts/lib/`. Here it is one small
 * function and a guard says the same thing without adding a file for it.
 */
const invokedDirectly = isMainModule(import.meta.url);

if (invokedDirectly) {
  const files = findNodeTestFiles();

  if (process.argv.includes('--list')) {
    process.stdout.write(`${files.join('\n')}\n`);
    process.exit(0);
  }

  // AN EMPTY RUN IS A FAILURE, NOT A PASS. If the suffix is ever renamed or the directory
  // moves, this would otherwise exit 0 having run nothing — which is exactly the silence
  // these files spent their whole life in.
  if (files.length === 0) {
    process.stderr.write('\n  run-node-tests: found no .nodetest.mjs files. That is a wiring error, not a clean run.\n\n');
    process.exit(2);
  }

  process.stdout.write(`\n  running ${files.length} node:test file(s)\n\n`);
  const child = spawn(process.execPath, ['--test', ...files], { cwd: ROOT, stdio: 'inherit' });
  child.on('close', (code) => process.exit(code ?? 1));
}
