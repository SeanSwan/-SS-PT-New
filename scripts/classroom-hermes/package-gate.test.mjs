/** Whole-package fail-closed acceptance gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { runPackageGate } from './package-gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

test('Mac preparation package passes deterministic acceptance gates', () => {
  const result = runPackageGate(repoRoot);
  assert.equal(result.ok, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.hostilePayloadsRejected, 50);
  assert.equal(result.externalCallsMade, 0);
  assert.equal(result.realChildFixtures, 0);
  assert.equal(result.maxOwnedFileLines <= 300, true);
});

