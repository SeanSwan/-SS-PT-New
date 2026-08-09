/**
 * @file secret-scan-gate.test.mjs
 * @description Proves the cross-platform secret gate cannot pass on zero evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { selectBashExecutable, validateSecretScanResult } from './secret-scan-gate.mjs';

test('selects Git Bash explicitly on Windows and bash on POSIX', () => {
  const exists = (path) => path === 'C:/Program Files/Git/bin/bash.exe';
  assert.equal(selectBashExecutable('win32', exists), 'C:/Program Files/Git/bin/bash.exe');
  assert.equal(selectBashExecutable('linux', exists), 'bash');
});

test('accepts only a successful non-empty clean scan', () => {
  assert.deepEqual(validateSecretScanResult({
    status: 0, stdout: 'Scanned: 42 files\nHits: 0\nCLEAN.\n', stderr: '',
  }), { valid: true, scanned: 42 });
  for (const result of [
    { status: 0, stdout: 'Scanned: 0 files\nHits: 0\nCLEAN.\n', stderr: '' },
    { status: 0, stdout: 'Hits: 0\nCLEAN.\n', stderr: '' },
    { status: 0, stdout: 'Scanned: 42 files\nHits: 0\nCLEAN.\n', stderr: 'fatal: bad gitdir' },
    { status: 1, stdout: 'Scanned: 42 files\nHits: 1\n', stderr: '' },
    { status: null, stdout: '', stderr: '', error: new Error('spawn failed') },
  ]) {
    assert.equal(validateSecretScanResult(result).valid, false);
  }
});
