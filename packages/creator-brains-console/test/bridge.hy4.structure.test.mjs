#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.structure.test.mjs
 * PURPOSE: The 300-line rule (HY4-H7) across every console source file.
 *          (H6 moved to bridge.hy4.allowlist.test.mjs when S3 grew the allowlist)
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE NO LONGER CARRIES BOTH HY4 FINDINGS.
 *
 * H6 and H7 were both findings about the SHAPE OF THE CODEBASE, and that is why
 * they shared a file — and why the shared file crossed the 300-line cap the
 * moment S3 added a tenth route to H6's allowlist. Rule 4's repair is to extract
 * at the seam, so H6 now lives in `bridge.hy4.allowlist.test.mjs`. Both files
 * remain under the cap, and neither finding lost a case to the move.
 *
 * WHAT REMAINS HERE (H7). H7 is the kind of finding no behavioural test can
 * catch: three files exceeded the repo's hard 300-line cap (CLAUDE.md rule 4) —
 * `server.mjs` 355, `api.mjs` 379, the test monolith 419. The cap is not
 * cosmetic. Its whole purpose is that a reviewer can hold one concern in view at
 * once, and the 379-line `api.mjs` had merged the TRUST BOUNDARY with the
 * TRANSPORT CONTRACT. FIXED by splitting into `lib/*`.
 *
 * Had this H7 test existed while H7 was being fixed, it would have been the thing
 * that caught the three over-length files rather than a human reading `wc -l`.
 * That is the point — and it is also why this file is now ITSELF the live example:
 * it caught its own successor crossing the cap. A rule that only ever catches
 * other people's files is not being enforced.
 *
 * H6's own record travels with it, in `bridge.hy4.allowlist.test.mjs`.
 *
 * @module creator-brains-console/test/bridge.hy4.structure
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startBridge } from '../server.mjs';
import { fixtureRoot, rawRequest } from './fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE_ROOT = join(HERE, '..');

/* ── H7 · the file-size rule ─────────────────────────────────────────────── */

/**
 * Byte-for-byte the same `lineCount` the repo's own consistency check uses.
 *
 * WHY THIS IS MATCHED RATHER THAN IMPROVISED. The obvious
 * `text.split('\n').length` is WRONG by one for every file that ends in a
 * newline — which is every file in this repo — because `split` yields a trailing
 * empty element for the text after the final `\n`. The first version of this
 * test used that form and reported a 328-line file as a 329-line rule-4
 * violation: it invented a defect that did not exist while sitting one newline
 * away from missing a real one. `consistency-check.mjs` had already solved this;
 * the honest move was to match its definition of "a line" rather than to write a
 * second, subtly different one. If that definition ever changes, rule 4 should
 * change for the whole repo at once — not for this suite privately.
 */
function lineCount(text) {
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

/** CLAUDE.md rule 4 — hard cap, in one place. */
const RULE_4_CAP = 300;

/*
 * Directories that are not this repo's source and must never be measured:
 * `node_modules` is third-party code (its file lengths are not our rule 4
 * concern), `dist` is build output.
 *
 * S1 added `console/web/`, which put a `node_modules` tree under CONSOLE_ROOT
 * for the first time. Before this skip, the walk measured ~184 installed
 * packages instead of console sources — the test failed on a dependency's line
 * count, which is not a rule 4 violation by any reading.
 */
const NOT_OUR_SOURCE = new Set(['node_modules', 'dist', '.git']);

/*
 * S1-H7 — extensions rule 4 applies to.
 *
 * This list used to be `.mjs` alone (the `entry.endsWith('.mjs')` test below),
 * which meant that when S1 added `console/web/`, the whole TypeScript tree went
 * UNMEASURED: ~16 files including a 267-line component. The cap test stayed
 * green regardless of how large a UI file grew. Rule 4 is a repo-wide cap
 * (CLAUDE.md), not a Node-only one, so the walk has to see the UI too.
 */
const SOURCE_EXT = ['.mjs', '.ts', '.tsx', '.css'];

/** Recursively collect the console's own sources, skipping non-source dirs. */
function walkConsoleSources(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (NOT_OUR_SOURCE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walkConsoleSources(full, acc); continue; }
    if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

test('HY4-H7: every console source file honours the 300-line cap (rule 4)', () => {
  const files = walkConsoleSources(CONSOLE_ROOT);

  assert.ok(files.length >= 12,
    `the walk found only ${files.length} console sources — it is not reaching the whole tree`);

  const over = [];
  for (const f of files) {
    const lines = lineCount(readFileSync(f, 'utf8'));
    if (lines > RULE_4_CAP) over.push(`${f.replace(CONSOLE_ROOT, '.')} = ${lines}`);
  }
  assert.deepEqual(over, [],
    `rule 4 violations (cap ${RULE_4_CAP}): ${over.join(', ')}`);
});

test('HY4-H7: the walk itself is not fooled by a nested directory', () => {
  // A cap test that silently stops descending would pass forever. This asserts
  // the walk reaches a file that is two levels deep, which is enough to prove
  // the recursion works.
  const files = walkConsoleSources(CONSOLE_ROOT);
  const nested = files.filter((f) => f.includes(`${join('lib', '')}`) || /[\\/]lib[\\/]/.test(f));
  assert.ok(nested.length >= 5,
    `the walk reached ${nested.length} files under lib/ — it must descend two levels`);
});

test('HY4-H7: the walk reaches the web slice, not only the .mjs bridge (S1-H7)', () => {
  // The cap test is only as wide as this walk. When S1 added console/web/, the
  // walk still collected `.mjs` alone, so every UI file went unmeasured and the
  // cap test could not fail no matter how large a component grew. This asserts
  // the UI is inside the measurement, so that hole cannot silently reopen.
  const files = walkConsoleSources(CONSOLE_ROOT);
  const web = files.filter((f) => /[\\/]web[\\/]src[\\/]/.test(f));
  assert.ok(web.length >= 10,
    `the walk reached only ${web.length} files under web/src — the cap does not cover the UI`);

  const tsx = web.filter((f) => f.endsWith('.tsx'));
  assert.ok(tsx.length >= 2,
    `the walk reached ${tsx.length} .tsx files — components are not being measured`);
});
