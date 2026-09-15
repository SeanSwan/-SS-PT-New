#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/consistency.test.mjs
 * PURPOSE: The four surfaces that restate the same facts must still agree.
 * PART OF: Creator Brains — SS-PT acquisition engine (hostile-pass claim group 6)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS EXISTS: HR26's finding was that the blueprint, the record and the receipt
 * disagreed with each other and with the artifacts. Fixing that once does not keep it
 * fixed — the very next slice (HR23l) added a test and left both documents claiming a
 * count one lower than the suite, which is the same drift in miniature.
 *
 * `consistency-check.mjs` re-derives the facts from the artifacts of record (test
 * files, logs, manifest) and checks every surface against them. This test runs it, so
 * the drift fails the suite instead of waiting for a reviewer to notice.
 *
 * WHEN THIS FAILS: regenerate the derived evidence rather than editing the numbers —
 * `node scripts/creator-brains/readiness.mjs --write` for the receipt and the map, and
 * the counts in the record/blueprint must match the log the script names.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/consistency.test.mjs
 * @module creator-brains/test/consistency
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ENGINE, '..', '..');

test('C1 every surface agrees with the artifacts of record', () => {
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [join(ENGINE, 'consistency-check.mjs')], {
      encoding: 'utf8', cwd: REPO,
    });
  } catch (e) {
    // A non-zero exit means a real disagreement: show which claim, not just that it failed.
    throw new Error(`cross-surface contradictions:\n${e.stdout || ''}${e.stderr || ''}`);
  }
  assert.match(stdout, /15\/15 consistent/, `unexpected sweep output:\n${stdout}`);
  assert.match(stdout, /AGREE {3}no engine file exceeds the Rule 4 cap/);
  assert.match(stdout, /AGREE {3}suite log is green/);
});
