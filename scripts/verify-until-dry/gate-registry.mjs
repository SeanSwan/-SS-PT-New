/**
 * @file gate-registry.mjs
 * @description Deterministic gate selection for Code Perfectionist risk tiers.
 *
 * Gates are inert data. They never use a shell, interpolate user input, or mutate
 * the source checkout. The fenced runner is the only execution authority.
 */
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_TESTS = readdirSync(dirname(fileURLToPath(import.meta.url)))
  .filter((name) => name.endsWith('.test.mjs'))
  .map((name) => `scripts/verify-until-dry/${name}`)
  .concat(
    'scripts/scan-secrets.range.test.mjs',
    'scripts/hooks/dry-loop-gate.test.mjs',
    'scripts/hooks/verify-until-dry-gate.test.mjs',
  )
  .sort();

const gate = (id, command, args, cwd = '.', timeoutMs = 120_000) =>
  Object.freeze({ id, command, args: Object.freeze(args), cwd, timeoutMs, shell: false });

export const GATES = Object.freeze({
  'diff-check': gate('diff-check', 'git', ['diff', '--check', 'HEAD']),
  'verifier-tests': gate(
    'verifier-tests',
    process.execPath,
    ['--test', '--test-concurrency=1', ...SELF_TESTS],
    '.',
    180_000,
  ),
  'secret-scan': gate(
    'secret-scan', process.execPath,
    ['scripts/verify-until-dry/secret-scan-gate.mjs', '--all'], '.', 600_000,
  ),
  'frontend-typecheck': gate(
    'frontend-typecheck',
    process.execPath,
    ['--max-old-space-size=8192', './node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'],
    'frontend',
    600_000,
  ),
  'frontend-tests': gate(
    'frontend-tests',
    process.execPath,
    ['./scripts/run-vitest-shards.mjs'],
    'frontend',
    1_200_000,
  ),
  'frontend-build': gate(
    'frontend-build',
    process.execPath,
    ['./node_modules/vite/bin/vite.js', 'build'],
    'frontend',
    600_000,
  ),
  'backend-tests': gate(
    'backend-tests',
    process.execPath,
    ['./node_modules/vitest/vitest.mjs', 'run'],
    'backend',
    1_200_000,
  ),
  'release-preflight': gate(
    'release-preflight',
    process.execPath,
    ['scripts/qa/render-payment-preflight.mjs'],
  ),
});

const KNOWN_SURFACES = new Set(['frontend', 'backend', 'tooling', 'docs']);

/** Return the stable ordered gate set required by deterministic policy. */
export function selectGates({ tier, surfaces = [] }) {
  if (!Number.isInteger(tier) || tier < 0 || tier > 3) throw new Error(`Unknown risk tier: ${tier}`);
  for (const surface of surfaces) {
    if (!KNOWN_SURFACES.has(surface)) throw new Error(`Unknown verification surface: ${surface}`);
  }

  const ids = ['diff-check', 'verifier-tests', 'secret-scan'];
  const selected = new Set(surfaces);
  if (selected.has('frontend') && tier >= 1) ids.push('frontend-typecheck');
  if (selected.has('frontend') && tier >= 2) ids.push('frontend-tests', 'frontend-build');
  if (selected.has('backend') && tier >= 1) ids.push('backend-tests');
  if (selected.has('backend') && tier >= 3) ids.push('release-preflight');
  return Object.freeze(ids.map((id) => GATES[id]));
}
