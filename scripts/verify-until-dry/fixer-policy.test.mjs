/**
 * @file fixer-policy.test.mjs
 * @description Tests bounded, allowlisted repair authorization.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../../config/verify-until-dry.config.mjs';
import { validateFixProposal } from './fixer-policy.mjs';

test('focused Tier 1 repairs inside the allowlist are accepted', () => {
  const result = validateFixProposal({
    tier: 1, fixer: 'agent-fix', reviewer: 'agent-review', allowlist: ['src/**'], config,
    files: [{ path: 'src/math.mjs', added: 8, deleted: 3, deletesTests: false }],
  });
  assert.equal(result.allowed, true);
  assert.equal(result.netLines, 11);
});

test('path escape, out-of-scope files, reviewer-as-fixer, and test deletion fail closed', () => {
  const base = { tier: 1, fixer: 'fix', reviewer: 'review', allowlist: ['src/**'], config };
  assert.equal(validateFixProposal({ ...base, files: [{ path: '../escape', added: 1, deleted: 0 }] }).allowed, false);
  assert.equal(validateFixProposal({ ...base, files: [{ path: 'docs/a.md', added: 1, deleted: 0 }] }).allowed, false);
  assert.equal(validateFixProposal({ ...base, fixer: 'review', files: [] }).allowed, false);
  assert.equal(validateFixProposal({ ...base, files: [{ path: 'src/a.test.mjs', added: 0, deleted: 10, deletesTests: true }] }).allowed, false);
});

test('budgets and Tier 3 owner approval cannot be bypassed', () => {
  const tooLarge = validateFixProposal({
    tier: 0, fixer: 'fix', reviewer: 'review', allowlist: ['src/**'], config,
    files: [{ path: 'src/a.mjs', added: 251, deleted: 0 }],
  });
  assert.equal(tooLarge.allowed, false);

  const tier3 = { tier: 3, fixer: 'fix', reviewer: 'review', allowlist: ['src/**'], config,
    scopeHash: 'a'.repeat(64), files: [{ path: 'src/a.mjs', added: 1, deleted: 0 }] };
  assert.equal(validateFixProposal(tier3).allowed, false);
  assert.equal(validateFixProposal({ ...tier3, ownerApproval: {
    scopeHash: tier3.scopeHash, maxFiles: 1, maxNetLines: 2,
  } }).allowed, true);
});
