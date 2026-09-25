/**
 * contractSuites — which dependency-free suites this gate runs, and proof that it runs all of them.
 * @module scripts/swan-brain-console/contractSuites
 *
 * WHY THIS IS ITS OWN MODULE
 * The list of suites `npm run verify` runs was a hand-written array inside `verify-all.mjs`,
 * and it was wrong. Twice. `gateHealth.test.mjs` passed on its own for a whole slice while the
 * list did not name it; round 6 then compared the list against the directory and found SIX
 * more suites in the same condition — the five `app/*.test.mjs` files (76 tests) and
 * `shot-diff.test.mjs` (16 at the time). **92 passing tests that `npm run verify` never ran.**
 * `gateHealth.summary.test.mjs`, added in the same round, would have been the seventh.
 *
 * A suite nothing invokes is a suite that never runs, and a guard that never runs is
 * indistinguishable from a guard that passes. The list itself was never the problem; the
 * problem was that nothing checked it against reality. That check lives here, in a module
 * that can be imported and therefore tested — `verify-all.mjs` calls `main()` at module
 * load, so nothing could ever assert anything about the list while it lived there.
 *
 * WHY THE SCAN IS SCOPED
 * There are ~124 `*.test.mjs` files under `scripts/` in this repo — hermes, hooks,
 * design-brain, context-gateway, lib, ci — and this gate does not run them and must not claim
 * to. An unscoped scan would report 100+ "missing" on its first run, which is how a guard gets
 * switched off. `OWNED_SUITE_ROOTS` names exactly the directories this gate draws from.
 *
 * BOUNDS: reads directory names under two fixed roots. No writes, no network, no clock.
 */

import { readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The list and its roots live in `contractSuites.list.mjs`; this module is the check over them.
// Re-exported so every existing importer (`verify-all.mjs`, `contractSuites.test.mjs`) keeps
// reading one module, and so the split is invisible to callers.
export { NODE_CONTRACT_SUITES, OWNED_SUITE_ROOTS } from './contractSuites.list.mjs';
import { NODE_CONTRACT_SUITES, OWNED_SUITE_ROOTS } from './contractSuites.list.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/** Every `*.test.mjs` under one root, repo-relative with forward slashes. */
function findSuites(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) found.push(...findSuites(full));
    else if (entry.name.endsWith('.test.mjs')) {
      found.push(relative(REPO, full).split(sep).join('/'));
    }
  }
  return found;
}

/** Every suite that exists under the owned roots. */
export function suitesOnDisk() {
  return OWNED_SUITE_ROOTS
    .flatMap((root) => findSuites(resolve(REPO, root)))
    .sort();
}

/**
 * Suites that exist on disk but that the given list does not name. Empty is the only healthy
 * value. `named` is a parameter so a test can hand it a deliberately incomplete list and prove
 * the check actually fires — a guard only ever seen green is a guard nobody has read.
 */
export function missingSuites(named = NODE_CONTRACT_SUITES) {
  const declared = new Set(named);
  return suitesOnDisk().filter((f) => !declared.has(f));
}
