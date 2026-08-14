/**
 * index.test.mjs — one entry point that runs every suite in this directory's mcp-health family.
 * Run: node --test scripts/__tests__/mcp-health/index.test.mjs
 *
 * WHY THIS FILE EXISTS: the 300-line-cap extraction (round 16, L1) split one test file into three.
 * The first mitigation was a COMMENT in the parent header naming the siblings — which is prose
 * describing a process, the exact untrue-doc-claim class this whole slice exists to delete. Someone
 * runs the parent file alone, gets green, and the path-redaction suite — the security control the
 * round was fought over — silently does not run. A control whose enforcement is a comment has no
 * enforcement (Kimi round 17, finding 1).
 *
 * Importing a node:test file registers its tests, so this is a real runner, not a pointer.
 *
 * New `*.test.mjs` files in this directory are AUTO-DETECTED: the assertion below reads this file's
 * own imports and diffs them against the directory, so a suite that is not imported fails the run
 * and is named in the message. "Add it here" is not an instruction you have to remember — it is
 * enforced. (An earlier header said "ADD NEW SIBLINGS HERE", which recreated the comment-shaped
 * expectation this runner exists to replace — HY3, S4.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, basename } from 'node:path';
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
test('every sibling suite in this directory is actually imported by this runner', () => {
  // NO hand-written list of any kind — and none is possible, because MEMBERSHIP IS THE FOLDER.
  //
  // History worth keeping, because it took three tries: (1) a header comment naming the siblings —
  // prose pretending to be enforcement; (2) an array compared to a constant — passes if an import
  // is deleted; (3) a `FAMILY` regex naming four exact files — a NEW suite was invisible to BOTH
  // sides of the comparison, so the assertion stayed green (verified: `brand-new-suite.test.mjs`
  // was undetectable). Each fix removed one hand-written list and left another.
  //
  // Removing the regex alone was NOT the answer either: `scripts/__tests__/` holds eleven
  // unrelated suites, so "import every sibling" would make this runner claim the whole directory.
  // The fix is structural — the family got its own folder, so "which files belong?" is answered by
  // the filesystem instead of by any enumeration a human has to maintain (HY3 S1, synthesized).
  const self = fileURLToPath(import.meta.url);
  const dir = dirname(self);
  const onDisk = readdirSync(dir)
    .filter((f) => f.endsWith('.test.mjs') && f !== basename(self))
    .sort();
  const source = readFileSync(self, 'utf8'); // read SELF by url, not by hardcoded filename
  // Tolerant of quote style and a missing semicolon — the guard must not be defeatable by
  // reformatting, which would be another way for it to stop guarding without anyone noticing.
  const imported = [...source.matchAll(/^import\s+['"]\.\/([^'"]+\.test\.mjs)['"];?\s*$/gm)]
    .map((m) => m[1]).sort();

  assert.deepEqual(imported, onDisk,
    `runner imports [${imported}] but the suites on disk are [${onDisk}] — `
    + 'a suite that is not wired here is coverage silently lost');
});
