/**
 * index.test.mjs — one entry point that runs every suite in this directory's mcp-health family.
 * Run: node --test scripts/__tests__/index.test.mjs
 *
 * WHY THIS FILE EXISTS: the 300-line-cap extraction (round 16, L1) split one test file into three.
 * The first mitigation was a COMMENT in the parent header naming the siblings — which is prose
 * describing a process, the exact untrue-doc-claim class this whole slice exists to delete. Someone
 * runs the parent file alone, gets green, and the path-redaction suite — the security control the
 * round was fought over — silently does not run. A control whose enforcement is a comment has no
 * enforcement (Kimi round 17, finding 1).
 *
 * Importing a node:test file registers its tests, so this is a real runner, not a pointer.
 * ADD NEW SIBLINGS HERE. The count assertion below fails loudly if a suite stops contributing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import './check-mcp-health.test.mjs';
import './display-path.test.mjs';
import './mcp-health-cli.test.mjs';
import './read-capped.test.mjs';

/**
 * The tripwire reads THIS FILE'S OWN import statements and compares them against the directory
 * listing. An earlier version compared a hand-written array to a constant — which passes happily
 * when someone deletes an `import` and leaves the array, i.e. it was prose pretending to be
 * enforcement, the exact defect it was written to fix, one level down. Self-found.
 *
 * Now: add a `*.test.mjs` to this directory without wiring it here, or delete an import, and this
 * goes red naming the file.
 */
const FAMILY = /^(check-mcp-health|display-path|mcp-health-cli|read-capped)\.test\.mjs$/;

test('every sibling suite in this directory is actually imported by this runner', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const onDisk = readdirSync(dir).filter((f) => FAMILY.test(f)).sort();
  const source = readFileSync(join(dir, 'index.test.mjs'), 'utf8');
  const imported = [...source.matchAll(/^import\s+'\.\/([^']+\.test\.mjs)';$/gm)]
    .map((m) => m[1]).sort();

  assert.deepEqual(imported, onDisk,
    `runner imports [${imported}] but the family on disk is [${onDisk}] — `
    + 'an extraction that is not wired here is coverage silently lost');
  assert.ok(onDisk.length >= 4, `expected at least 4 family suites, found ${onDisk.length}`);
});
