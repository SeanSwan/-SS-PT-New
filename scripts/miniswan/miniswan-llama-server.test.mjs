import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const launcher = path.join(import.meta.dirname, 'miniswan-llama-server.ps1');

test('launcher is present and binds llama-server to localhost', () => {
  assert.ok(existsSync(launcher), 'launcher file is missing');
  const source = readFileSync(launcher, 'utf8');
  assert.match(source, /127\.0\.0\.1/, 'launcher must use a loopback bind');
  assert.doesNotMatch(source, /0\.0\.0\.0/, 'launcher must not expose a wildcard bind');
  assert.match(source, /C:\\llama\\bin\\llama-server\.exe/, 'launcher must use the verified binary');
});

test('launcher fails closed when the requested model is absent', () => {
  const root = path.join(os.tmpdir(), `miniswan-launcher-test-${process.pid}`);
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      launcher,
      '-Model',
      'missing-model.gguf',
      '-Root',
      root,
    ],
    { encoding: 'utf8', windowsHide: true },
  );

  assert.notEqual(result.status, 0, 'missing model must produce a non-zero exit');
  assert.match(`${result.stdout}\n${result.stderr}`, /MODEL_NOT_FOUND/);
});

test('launcher rejects an absolute model path outside the worker model root', () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const root = path.join(os.tmpdir(), `miniswan-launcher-root-${suffix}`);
  const outside = path.join(os.tmpdir(), `miniswan-outside-${suffix}.gguf`);
  mkdirSync(path.join(root, 'models'), { recursive: true });
  writeFileSync(outside, 'synthetic test fixture');

  try {
    const result = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        launcher,
        '-Model',
        outside,
        '-Root',
        root,
      ],
      { encoding: 'utf8', windowsHide: true },
    );

    assert.notEqual(result.status, 0, 'outside-root model must be rejected');
    assert.match(`${result.stdout}\n${result.stderr}`, /MODEL_PATH_OUTSIDE_ROOT/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});
