/**
 * @file cli.test.mjs
 * @description Tests command parsing, surface inference, and off-repo receipt storage.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import test from 'node:test';

import {
  appendUntrackedEvidence, defaultReceiptPath, inferSurfaces, parseCli, selectKimiEvidencePaths,
} from './cli.mjs';

test('parses run, finalize, audit, and verify commands without shell syntax', () => {
  assert.deepEqual(parseCli(['run', '--tier', '2', '--base', 'origin/main']), {
    command: 'run', tier: 2, base: 'origin/main', out: null, receipt: null, reviews: null,
    approval: null,
  });
  assert.equal(parseCli(['audit']).command, 'audit');
  assert.equal(parseCli(['finalize', '--receipt', 'r.json', '--reviews', 'v.json']).reviews, 'v.json');
  assert.equal(parseCli(['kimi', '--approval', 'approval.json']).approval, 'approval.json');
  assert.throws(() => parseCli(['destroy']), /command/i);
  assert.throws(() => parseCli(['run', '--tier', '9']), /tier/i);
});

test('surface inference is deterministic and gate-registry compatible', () => {
  assert.deepEqual(inferSurfaces(['frontend/a.tsx', 'backend/b.mjs']), ['backend', 'frontend']);
  assert.deepEqual(inferSurfaces(['docs/a.md']), ['docs']);
  assert.deepEqual(inferSurfaces(['scripts/tool.mjs', '.github/workflows/a.yml']), ['tooling']);
});

test('default receipts live under OS temp, never the repository', () => {
  const path = defaultReceiptPath('C:\\example\\repo');
  assert.equal(isAbsolute(path), true);
  assert.equal(relative(tmpdir(), path).startsWith('..'), false);
  assert.match(path, /verify-until-dry/);
});

test('untracked text contributes content and line complexity while binary stays bounded', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-cli-'));
  try {
    writeFileSync(join(root, 'new.mjs'), 'one\ntwo\nthree\n');
    writeFileSync(join(root, 'asset.bin'), Buffer.from([0, 1, 2, 3]));
    const result = appendUntrackedEvidence(root, ['new.mjs', 'asset.bin'], '', 0);
    assert.match(result.diffText, /one\ntwo\nthree/);
    assert.match(result.diffText, /binary omitted/i);
    assert.equal(result.changedLines, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Kimi packet selection favors production logic and discloses its exact subset', () => {
  assert.deepEqual(selectKimiEvidencePaths([
    'docs/plan.md',
    '.agents/skills/verify-until-dry/SKILL.md',
    'scripts/verify-until-dry/engine.test.mjs',
    'scripts/verify-until-dry/engine.mjs',
    'config/verify-until-dry.config.mjs',
  ]), [
    'config/verify-until-dry.config.mjs',
    'scripts/verify-until-dry/engine.mjs',
  ]);
});
