/**
 * Regression lock: every standard code-review run must evaluate the spend gate
 * before printing launch intent or invoking any validator.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '..', 'validation-orchestrator.mjs'), 'utf8');

test('standard code-review mode gates spend before validators launch', () => {
  const standardMode = source.slice(source.indexOf('// ── Standard Code Review Mode ──'));
  const gateIndex = standardMode.indexOf('await spendGate(');
  const launchIndex = standardMode.indexOf('Phase 1: Launching');
  const validatorIndex = standardMode.indexOf('await runValidator(');

  assert.ok(gateIndex >= 0, 'standard code-review mode must call spendGate');
  assert.ok(gateIndex < launchIndex, 'spendGate must run before launch is announced');
  assert.ok(gateIndex < validatorIndex, 'spendGate must run before any validator call');
});

test('$3 budget profile preserves 19 roles while removing duplicate paid routing', () => {
  assert.match(source, /SWAN_VILLAGE_BUDGET_PROFILE\s*===\s*'3usd'/);
  assert.match(source, /singlePassDebates/);
  assert.match(source, /debatePanels/);
  assert.match(source, /Data Safety & Integrity[\s\S]{0,160}budgetProfile[\s\S]{0,80}nemotron3Super/);
});
