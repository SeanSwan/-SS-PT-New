import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrompt,
  isSafeDiffRange,
  resolveRepoPath,
} from './consult-codex.mjs';

test('consult scope rejects traversal and absolute paths', () => {
  assert.throws(() => resolveRepoPath('../outside.txt', 'C:\\repo'), /escapes repository root/);
  assert.throws(() => resolveRepoPath('C:\\outside.txt', 'C:\\repo'), /repository-relative path required/);
  assert.throws(() => resolveRepoPath('', 'C:\\repo'), /repository-relative path required/);
});

test('consult diff range validation rejects shell metacharacters', () => {
  assert.equal(isSafeDiffRange('HEAD'), true);
  assert.equal(isSafeDiffRange('HEAD~1..HEAD'), true);
  assert.equal(isSafeDiffRange('main...feature/x'), true);
  assert.equal(isSafeDiffRange('HEAD; whoami'), false);
  assert.equal(isSafeDiffRange('HEAD && echo leaked'), false);
});

test('consult prompt declares explicit scope and omitted content', () => {
  const prompt = buildPrompt({
    mode: 'review', files: ['../outside.txt'], filePath: null, diff: false,
    diffRange: 'HEAD', prompt: 'check safety', model: null,
  }, { root: 'C:\\repo' });
  assert.match(prompt, /Review scope/);
  assert.match(prompt, /untracked files: excluded/);
  assert.match(prompt, /rejected or unreadable/);
  assert.match(prompt, /omitted or truncated content/);
  assert.match(prompt, /check safety/);
});
