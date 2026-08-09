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

import {
  contentExceedsKimiCeiling, partitionKimiEvidencePaths, resolveComparisonBase,
  selectKimiEvidencePaths, validateDeclaredContract,
} from './repository-audit.mjs';

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

test('Kimi evidence partitions sensitive paths without discarding safe logic', () => {
  const partition = partitionKimiEvidencePaths([
    'scripts/verify-until-dry/verdict.mjs',
    'scripts/verify-until-dry/secret-scan-gate.mjs',
    'backend/routes/authRoutes.mjs',
    'docs/auth-flow.md',
    'docs/plan.md',
    'scripts/math.py',
  ]);
  assert.deepEqual(partition.safe, ['scripts/verify-until-dry/verdict.mjs']);
  assert.deepEqual(partition.excluded, [
    'backend/routes/authRoutes.mjs',
    'docs/auth-flow.md',
    'docs/plan.md',
    'scripts/math.py',
    'scripts/verify-until-dry/secret-scan-gate.mjs',
  ]);
  assert.deepEqual(selectKimiEvidencePaths([
    'scripts/verify-until-dry/verdict.mjs', 'scripts/verify-until-dry/secret-scan-gate.mjs',
  ]), ['scripts/verify-until-dry/verdict.mjs']);
});

test('narrative-only Kimi scope is reported as excluded instead of becoming dummy evidence', () => {
  assert.deepEqual(partitionKimiEvidencePaths(['docs/plan.md']), {
    safe: [], excluded: ['docs/plan.md'],
  });
});

test('languages without a semantic transformer remain local-only', () => {
  assert.deepEqual(partitionKimiEvidencePaths(['scripts/math.py', 'scripts/math.mjs']), {
    safe: ['scripts/math.mjs'], excluded: ['scripts/math.py'],
  });
});

test('Kimi content screening catches sensitive logic hidden behind a benign path', () => {
  assert.equal(contentExceedsKimiCeiling(
    "import '../middleware/authMiddleware.mjs'; verifyToken(paymentToken); patientHealthDecision();",
  ), true);
  assert.equal(contentExceedsKimiCeiling('export const add = (a, b) => a + b;'), false);
});

test('Kimi content screening fails closed for payment, identity, health, and privilege evidence', () => {
  for (const sensitive of [
    'cardNumber = "4111111111111111"',
    'passportNumber = "X12345678"',
    'diagnosisCode = "F32.9"',
    'visaNumber = "A123456789"',
    'medication = "lisinopril"',
    'biometricTemplate = "abc123"',
    'prescription = "lisinopril 10mg"',
    'fingerprintTemplate = "base64-user-template"',
    'homeCoordinates = { latitude: 34.052235, longitude: -118.243683 }',
    'athleteName = "Sean Smith"',
    'memberName = "Sean Smith"',
    'lastKnownIp = "203.0.113.42"',
    'swiftCode = "BOFAUS3N"',
    'productionRow = { member_id: 42, accountBalance: 1200 }',
    'export function canElevateRole(user) { return user.role === "admin"; }',
  ]) assert.equal(contentExceedsKimiCeiling(sensitive), true, sensitive);
});

test('tracked binary patches are local-only because their decoded bytes are uninspected', () => {
  assert.equal(contentExceedsKimiCeiling('diff --git a/a.bin b/a.bin\nGIT binary patch\nliteral 4\nLc${NkU|;|M00aO5'), true);
  assert.equal(contentExceedsKimiCeiling('--- UNTRACKED a.bin ---\n[binary omitted]'), true);
});

test('template interpolation is local-only because executable expressions are not flattened', () => {
  assert.equal(contentExceedsKimiCeiling('const out = `${getTenant()}-${fallbackMutation()}`;'), true);
});

test('audit scope requires an objective, requirements, and acceptance ids', () => {
  assert.throws(() => validateDeclaredContract({}), /objective/i);
  assert.throws(() => validateDeclaredContract({ objective: 'Verify it', requirements: [], acceptanceIds: ['A1'] }), /requirements/i);
  assert.throws(() => validateDeclaredContract({ objective: 'Verify it', requirements: ['R1'], acceptanceIds: [] }), /acceptance/i);
  assert.doesNotThrow(() => validateDeclaredContract({
    objective: 'Verify it', requirements: ['R1'], acceptanceIds: ['A1'], exclusions: [],
  }));
});
