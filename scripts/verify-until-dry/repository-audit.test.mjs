/**
 * @file repository-audit.test.mjs
 * @description Tests resolved base identity and review evidence selection.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { resolveComparisonBase, selectKimiEvidencePaths, validateDeclaredContract } from './repository-audit.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

test('comparison scope binds both moving base tip and merge-base SHAs', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-base-'));
  try {
    git(root, 'init', '-q');
    git(root, 'config', 'user.email', 'verify@example.invalid');
    git(root, 'config', 'user.name', 'Verifier');
    writeFileSync(join(root, 'a.txt'), 'base\n');
    git(root, 'add', '.');
    git(root, 'commit', '-qm', 'base');
    git(root, 'branch', '-M', 'main');
    git(root, 'switch', '-qc', 'feature');
    writeFileSync(join(root, 'a.txt'), 'feature\n');
    git(root, 'commit', '-am', 'feature', '-q');
    const first = resolveComparisonBase(root, 'main');
    git(root, 'branch', '-f', 'main', 'HEAD');
    const second = resolveComparisonBase(root, 'main');
    assert.notEqual(first.tipSha, second.tipSha);
    assert.notEqual(first.mergeBaseSha, second.mergeBaseSha);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('review evidence includes changed tests but excludes narrative skill docs', () => {
  assert.deepEqual(selectKimiEvidencePaths([
    'scripts/verify-until-dry/a.test.mjs', '.agents/skills/verify-until-dry/SKILL.md',
    'scripts/verify-until-dry/a.mjs',
  ]), ['scripts/verify-until-dry/a.mjs', 'scripts/verify-until-dry/a.test.mjs']);
});

test('audit scope requires an objective, requirements, and acceptance ids', () => {
  assert.throws(() => validateDeclaredContract({}), /objective/i);
  assert.throws(() => validateDeclaredContract({ objective: 'Verify it', requirements: [], acceptanceIds: ['A1'] }), /requirements/i);
  assert.throws(() => validateDeclaredContract({ objective: 'Verify it', requirements: ['R1'], acceptanceIds: [] }), /acceptance/i);
  assert.doesNotThrow(() => validateDeclaredContract({
    objective: 'Verify it', requirements: ['R1'], acceptanceIds: ['A1'], exclusions: [],
  }));
});
