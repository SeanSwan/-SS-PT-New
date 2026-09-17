import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const helper = path.join(import.meta.dirname, 'miniswan-wake.ps1');

test('wake helper dry-run builds a Wake-on-LAN request without changing power state', () => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      helper,
      '-Mac',
      '10-FF-E0-85-27-89',
      '-BroadcastAddress',
      '192.168.50.255',
      '-DryRun',
    ],
    { encoding: 'utf8', windowsHide: true },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /WOL_DRY_RUN/);
  assert.match(result.stdout, /mac=10-FF-E0-85-27-89/);
  assert.match(result.stdout, /broadcast=192\.168\.50\.255/);
});

test('wake helper rejects malformed MAC addresses and has no power-state mutation', () => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      helper,
      '-Mac',
      'not-a-mac',
      '-DryRun',
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  const source = readFileSync(helper, 'utf8');

  assert.ok(existsSync(helper));
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /INVALID_MAC/);
  assert.doesNotMatch(source, /powercfg\s+\/hibernate\s+off/i);
  assert.doesNotMatch(source, /SetSuspendState/i);
  assert.doesNotMatch(source, /Stop-Process/i);
});
