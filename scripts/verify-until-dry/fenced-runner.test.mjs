/**
 * @file fenced-runner.test.mjs
 * @description Adversarial tests for exact-source fenced verification execution.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { captureSnapshot } from './snapshot.mjs';
import { createFence, disposeFence, runGates } from './fenced-runner.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repoFixture() {
  const root = mkdtempSync(join(tmpdir(), 'verify-source-'));
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'verify@example.invalid');
  git(root, 'config', 'user.name', 'Verifier Fixture');
  writeFileSync(join(root, 'staged.txt'), 'base\n');
  writeFileSync(join(root, 'dirty.txt'), 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'base');
  writeFileSync(join(root, 'staged.txt'), 'staged\n');
  git(root, 'add', 'staged.txt');
  writeFileSync(join(root, 'dirty.txt'), 'dirty\n');
  writeFileSync(join(root, 'untracked.txt'), 'untracked\n');
  return root;
}

test('fence reconstructs staged, unstaged, and untracked source exactly', () => {
  const root = repoFixture();
  let fence;
  try {
    const scope = { paths: ['.'], exclusions: [], gates: ['test'] };
    const source = captureSnapshot({ cwd: root, scopeContract: scope });
    fence = createFence({ repoRoot: root, snapshot: source, scopeContract: scope });
    const fenced = captureSnapshot({ cwd: fence.path, scopeContract: scope });
    assert.equal(fenced.sourceHash, source.sourceHash);
    assert.equal(readFileSync(join(fence.path, 'untracked.txt'), 'utf8'), 'untracked\n');
  } finally {
    if (fence) disposeFence(fence);
    rmSync(root, { recursive: true, force: true });
  }
});

test('gate execution is shell-free, redacted, hashed, and fence-bound', async () => {
  const calls = [];
  const result = await runGates({
    fencePath: 'C:\\safe-fence',
    expectedSourceHash: 'source-1',
    gates: [{ id: 'probe', command: 'node', args: ['probe.mjs'], cwd: '.', shell: false, timeoutMs: 10 }],
    capture: () => ({ sourceHash: 'source-1' }),
    execute: async (spec) => {
      calls.push(spec);
      return { code: 0, stdout: 'token=super-secret', stderr: '' };
    },
  });
  assert.equal(calls[0].cwd, 'C:\\safe-fence');
  assert.equal(calls[0].shell, false);
  assert.equal(result[0].status, 'passed');
  assert.doesNotMatch(result[0].stdout, /super-secret/);
  assert.match(result[0].outputHash, /^[a-f0-9]{64}$/);
});

test('source mutation during a gate invalidates the whole run', async () => {
  let captures = 0;
  await assert.rejects(
    runGates({
      fencePath: 'C:\\safe-fence',
      expectedSourceHash: 'source-1',
      gates: [{ id: 'probe', command: 'node', args: [], cwd: '.', shell: false, timeoutMs: 10 }],
      capture: () => ({ sourceHash: ++captures === 1 ? 'source-1' : 'source-2' }),
      execute: async () => ({ code: 0, stdout: '', stderr: '' }),
    }),
    /mutated/i,
  );
});
