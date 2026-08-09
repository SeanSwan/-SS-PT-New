/**
 * @file convergence.test.mjs
 * @description Tests dry-loop convergence, oscillation, and clean-vantage rules.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../../config/verify-until-dry.config.mjs';
import { initialConvergence, recordRound } from './convergence.mjs';

const source = 'a'.repeat(64);

test('two clean rounds require the same source and distinct vantage axes', () => {
  let state = initialConvergence();
  state = recordRound(state, { sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'] }, findings: [] }, config);
  assert.equal(state.status, 'VERIFYING');
  state = recordRound(state, { sourceHash: source, vantage: { reviewer: 'r2', axes: ['dynamic-runtime'] }, findings: [] }, config);
  assert.equal(state.status, 'DRY');
});

test('same vantage or changed source cannot manufacture CLEAN x2', () => {
  const first = recordRound(initialConvergence(), {
    sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'] }, findings: [],
  }, config);
  const duplicate = recordRound(first, {
    sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'], note: 'irrelevant' }, findings: [],
  }, config);
  assert.equal(duplicate.cleanStreak, 1);
  const changed = recordRound(duplicate, {
    sourceHash: 'b'.repeat(64), vantage: { reviewer: 'r2', axes: ['dynamic-runtime'] }, findings: [],
  }, config);
  assert.equal(changed.cleanStreak, 1);
});

test('adding only one axis is not a meaningfully distinct clean vantage', () => {
  let state = recordRound(initialConvergence(), {
    sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'] }, findings: [],
  }, config);
  state = recordRound(state, {
    sourceHash: source, vantage: { reviewer: 'r2', axes: ['static-control-flow', 'dynamic-runtime'] }, findings: [],
  }, config);
  assert.equal(state.status, 'VERIFYING');
  assert.equal(state.cleanStreak, 1);
});

test('repeated validated findings and exhausted rounds escalate', () => {
  let state = initialConvergence();
  state = recordRound(state, { sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'] }, findings: ['race:F1'] }, config);
  state = recordRound(state, { sourceHash: source, vantage: { reviewer: 'r2', axes: ['dynamic-runtime'] }, findings: ['race:F1'] }, config);
  state = recordRound(state, { sourceHash: source, vantage: { reviewer: 'r3', axes: ['adversarial-security'] }, findings: ['race:F1'] }, config);
  assert.equal(state.status, 'ESCALATED');
  assert.match(state.reason, /repeated/i);

  let exhausted = initialConvergence();
  for (let index = 0; index < config.convergence.maxRepairRounds; index += 1) {
    exhausted = recordRound(exhausted, {
      sourceHash: source, vantage: { reviewer: `r${index}`, axes: ['contract-tests'] }, findings: [`new-${index}`],
    }, config);
  }
  assert.equal(exhausted.status, 'ESCALATED');
  assert.match(exhausted.reason, /round/i);
});

test('a repair that substantially reverses the prior repair is oscillation', () => {
  let state = recordRound(initialConvergence(), {
    sourceHash: source, vantage: { reviewer: 'r1', axes: ['static-control-flow'] }, findings: ['F1'],
    repair: { added: ['guard-a', 'guard-b'], removed: ['legacy-x'] },
  }, config);
  state = recordRound(state, {
    sourceHash: source, vantage: { reviewer: 'r2', axes: ['dynamic-runtime'] }, findings: ['F2'],
    repair: { added: ['legacy-x'], removed: ['guard-a', 'guard-b'] },
  }, config);
  assert.equal(state.status, 'ESCALATED');
  assert.match(state.reason, /inverse/i);
});
