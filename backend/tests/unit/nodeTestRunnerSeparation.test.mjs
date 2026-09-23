/**
 * Runner-separation guard — node:test files and vitest must never see each other.
 * ============================================================================
 *
 * WHY. The Sheen Forge suite is written for node:test. Vitest loads such a file,
 * finds no vitest suites, and reports "No test suite found" — a FAIL. That put 15
 * perfectly green files (175 passing tests) into backend/tests/known-failing-baseline.json,
 * where they sat for weeks making the repo look sicker than it is and hiding real
 * failures behind a wall of fake ones.
 *
 * The fix is a three-way lock, and this test IS the lock:
 *   (a) every *.test.{js,mjs} under tests/ + __tests__/ that imports node:test must
 *       live in tests/node-runner/, which vitest.config.mjs excludes by glob;
 *   (b) every tests/**\/*.test.mjs entry in that exclude must actually BE a
 *       node:test file — so the exclude list cannot become a place to hide a
 *       broken vitest file;
 *   (c) the package.json "test:node" script must run exactly the node:test set —
 *       so excluding a file from vitest never silently removes it from CI.
 *
 * A new node:test file therefore fails HERE (with instructions), never as a
 * confusing "No test suite found" in an unrelated run.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..', '..');

function walkTestFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'integration') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkTestFiles(full, out);
    else if (/\.test\.(js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * node-test-ONLY files declare themselves by importing node:test and never
 * mentioning vitest. Dual-runner files (they branch on VITEST at runtime and
 * self-adapt — e.g. deterministicCoachCommandIntent.test.mjs) are vitest-capable
 * and stay in the vitest suite. Read the whole file: the discriminating import
 * sits past any head, and the first version of this guard misclassified three
 * files by reading only the first lines.
 */
function isNodeTestOnlyFile(file) {
  const src = readFileSync(file, 'utf8');
  const importsNodeTest = /from\s+['"]node:test['"]|require\(\s*['"]node:test['"]\s*\)/.test(src);
  const vitestCapable = /['"]vitest['"]|VITEST/.test(src);
  return importsNodeTest && !vitestCapable;
}

function relPosix(file) {
  return path.relative(BACKEND, file).replace(/\\/g, '/');
}

const detected = [...walkTestFiles(path.join(BACKEND, 'tests')), ...walkTestFiles(path.join(BACKEND, '__tests__'))]
  .filter(isNodeTestOnlyFile)
  .map(relPosix)
  .sort();

const vitestConfigSrc = readFileSync(path.join(BACKEND, 'vitest.config.mjs'), 'utf8');
const excludeBlock = vitestConfigSrc.match(/exclude:\s*\[([\s\S]*?)\]/)?.[1] ?? '';

const pkg = JSON.parse(readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
const testNodeScript = pkg.scripts?.['test:node'] ?? '';

// 2026-09-22 (coach P0 merge): origin/main moved node:test files into ONE directory,
// tests/node-runner/, excluded by a single glob (SWA-231). The coach lineage used an
// explicit per-file list. The merge adopts the directory convention and keeps this
// guard's three guarantees, restated for a directory instead of a list:
//   (a) every node:test-only file lives in tests/node-runner/ (so the glob excludes it);
//   (b) every *.test.mjs in tests/node-runner/ really is node:test-only (no hiding place);
//   (c) vitest excludes that directory, and test:node runs exactly that directory.
const RUNNER_DIR = 'tests/node-runner';
const runnerFiles = readdirSync(path.join(BACKEND, RUNNER_DIR))
  .filter((f) => /\.test\.mjs$/.test(f))
  .map((f) => `${RUNNER_DIR}/${f}`)
  .sort();

describe('node:test / vitest runner separation', () => {
  it('every node:test file lives in tests/node-runner/ (or vitest reds on it as "No test suite found")', () => {
    const outside = detected.filter((f) => !f.startsWith(`${RUNNER_DIR}/`));
    expect(outside, `node:test files outside ${RUNNER_DIR}/: ${outside.join(', ')} — git mv them there`).toEqual([]);
  });

  it('every file in tests/node-runner/ really is a node:test file — the directory is not a hiding place', () => {
    const notNodeTest = runnerFiles.filter((f) => !detected.includes(f));
    expect(notNodeTest, `vitest files hidden in ${RUNNER_DIR}/: ${notNodeTest.join(', ')}`).toEqual([]);
  });

  it('vitest excludes the runner directory and test:node runs exactly that directory', () => {
    expect(excludeBlock).toContain(`'${RUNNER_DIR}/**'`);
    expect(testNodeScript).toContain(`node --test ${RUNNER_DIR}/*.test.mjs`);
  });

  it('the guard itself sees a sane world (non-empty set, script present)', () => {
    expect(detected.length).toBeGreaterThan(0);
    expect(runnerFiles).toEqual(detected);
  });
});
