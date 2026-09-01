/**
 * A suite written for the wrong runner must not be able to disappear.
 * ============================================================================
 *
 * Sixteen files here are written against `node:test`. Vitest's include pattern matched them,
 * it could not collect them, and it reported each as a failing FILE while counting ZERO of
 * their tests. They were then written into `known-failing-baseline.json` as "failing for
 * reasons that predate current work" — where they would have stayed forever, because a file
 * vitest cannot collect never starts passing, so the baseline's own rot detector could not
 * fire for them.
 *
 * They were passing the whole time: 178/178 under `node --test`, executed by no automated
 * path at all.
 *
 * The convention is now `*.nodetest.mjs`, which vitest does not claim and
 * `npm run test:node` does. This test is what stops the next one going missing: a new file
 * written against node:test but named `*.test.mjs` would be silently mis-collected again,
 * and nothing else in the repository would notice.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNodeTestFiles } from '../../scripts/run-node-tests.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..', '..');
const TESTS = join(ROOT, 'tests');

function walk(dir, rel = 'tests') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const abs = join(dir, e.name);
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(abs, r));
    else if (e.name.endsWith('.mjs')) out.push({ rel: r, abs });
  }
  return out;
}

/**
 * A file BELONGS to node:test if it imports the module and actually uses the imported
 * binding as its test function. Two files import `node:test` under an alias and then call
 * bare `test(...)`, which resolves to vitest's global — they run under vitest correctly and
 * must NOT be renamed. Renaming them would have removed real coverage, which is why this
 * checks usage rather than the import alone.
 */
function usesNodeTestRunner(src) {
  const m = src.match(/import\s+(?:(\w+)|\{\s*test\s+as\s+(\w+)\s*\})\s+from\s+'node:test'/);
  if (!m) return false;
  const binding = m[1] || m[2];
  return new RegExp(`(^|[^.\\w])${binding}\\s*\\(`, 'm').test(src);
}

const all = walk(TESTS);

describe('node:test suites are named so they cannot be silently mis-collected', () => {
  it('the scan finds files at all — otherwise every assertion below is vacuous', () => {
    expect(all.length).toBeGreaterThan(50);
  });

  it('every file that USES node:test as its runner carries the .nodetest.mjs suffix', () => {
    const wrong = all
      .filter(({ abs }) => usesNodeTestRunner(readFileSync(abs, 'utf8')))
      .filter(({ rel }) => !rel.endsWith('.nodetest.mjs'))
      .map(({ rel }) => rel);
    expect(wrong, 'rename these to *.nodetest.mjs, or vitest will report them as failures and count none of their tests').toEqual([]);
  });

  it('every .nodetest.mjs really is a node:test suite', () => {
    // The rule has to hold both ways. A vitest file wearing the suffix would be excluded
    // from vitest AND meaningless to `node --test` — invisible to both runners.
    const misnamed = all
      .filter(({ rel }) => rel.endsWith('.nodetest.mjs'))
      .filter(({ abs }) => !usesNodeTestRunner(readFileSync(abs, 'utf8')))
      .map(({ rel }) => rel);
    expect(misnamed, 'these carry the node:test suffix but do not use node:test').toEqual([]);
  });

  it('the runner finds every one of them', () => {
    // The suffix convention is worth nothing if the thing that executes them disagrees
    // about which files it covers.
    const named = all.filter(({ rel }) => rel.endsWith('.nodetest.mjs')).map(({ rel }) => rel).sort();
    expect(findNodeTestFiles(ROOT)).toEqual(named);
    expect(named.length).toBeGreaterThan(0);
  });
});

describe('the known-failing baseline does not re-absorb them', () => {
  const baseline = JSON.parse(readFileSync(join(TESTS, 'known-failing-baseline.json'), 'utf8')).failingFiles;

  it('contains no .nodetest.mjs file', () => {
    // They were in it for twelve days as "failing", while passing. A baseline entry is a
    // promise that a file is expected to fail; one made because the wrong runner looked at
    // it is a promise about nothing.
    expect(baseline.filter((f) => f.endsWith('.nodetest.mjs'))).toEqual([]);
  });

  it('contains no file that no longer exists', () => {
    // The 16 were removed by renaming them. An entry naming a path that is gone can never
    // be pruned by the gate's rot detector, because a file that does not exist never passes.
    const present = new Set(all.map(({ rel }) => rel));
    const ghosts = baseline.filter((f) => f.startsWith('tests/') && !present.has(f));
    expect(ghosts, 'baseline names files that do not exist').toEqual([]);
  });
});
