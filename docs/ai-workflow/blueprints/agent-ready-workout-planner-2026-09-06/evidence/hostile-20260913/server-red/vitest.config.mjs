/**
 * Server RED replay harness — REPAIRED 2026-09-14.
 *
 * The previous version hard-coded `path.resolve(evidenceDir, '../../../backend')`
 * and a relative vitest import. From this preserved location that resolves to
 * `docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/backend`,
 * which does not exist, so the suite could not be started at all. Vitest then
 * reported only a config/import error rather than the intended assertions.
 *
 * This version locates the repository root by walking up until it finds both
 * `backend/package.json` and `frontend/package.json`, so it is independent of
 * how deep inside the tree this file is copied. It runs the CANONICAL fixtures
 * from `tmp/rolodex-audit-evidence/server-red/`, which is the location
 * RESULTS.md documents as authoritative and whose relative module specifiers
 * are correct for their own depth. The sibling `*.red.test.mjs` files in this
 * directory are preserved historical snapshots; replay uses the canonical
 * copies so the two cannot drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (let depth = 0; depth < 24; depth += 1) {
    const hasBackend = fs.existsSync(path.join(dir, 'backend', 'package.json'));
    const hasFrontend = fs.existsSync(path.join(dir, 'frontend', 'package.json'));
    if (hasBackend && hasFrontend) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`server-red replay: could not locate repository root above ${start}`);
}

const REPO_ROOT = findRepoRoot(HERE);
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');
const CANONICAL_FIXTURES = path.join(REPO_ROOT, 'tmp', 'rolodex-audit-evidence', 'server-red');

if (!fs.existsSync(CANONICAL_FIXTURES)) {
  throw new Error(`server-red replay: canonical fixture directory missing at ${CANONICAL_FIXTURES}`);
}

// Glob patterns must use forward slashes. On Windows `path.join` yields
// backslashes, which the glob matcher treats as escape characters, so the
// include never matches and the runner sits idle instead of reporting a result.
const glob = (...segments) => path.join(...segments).split(path.sep).join('/');

const { defineConfig } = await import(
  pathToFileURL(path.join(BACKEND_DIR, 'node_modules', 'vitest', 'dist', 'config.js')).href
);

export default defineConfig({
  root: BACKEND_DIR,
  test: {
    environment: 'node',
    globals: false,
    include: [
      glob(CANONICAL_FIXTURES, '*.red.test.mjs'),
      glob(CANONICAL_FIXTURES, '*.red.integration.test.mjs'),
    ],
    exclude: ['**/node_modules/**'],
    setupFiles: [],
    retry: 0,
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
  },
});
