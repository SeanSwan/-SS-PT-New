/** Read-only macOS fact collector parser tests. */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSafeMacReport,
  parseDiskBytes,
  parseMacVersion,
  parseMemoryBytes,
  parseSystemChip,
} from './mac-preflight.mjs';

test('parses hardware facts from synthetic macOS output', () => {
  const hardware = `Hardware:\n    Chip: Apple M3 Pro\n    Memory: 36 GB\n`;
  assert.equal(parseSystemChip(hardware), 'Apple M3 Pro');
  assert.equal(parseMemoryBytes(hardware), 36 * 1024 ** 3);
  assert.equal(parseMacVersion('ProductVersion: 15.6.1\n'), '15.6.1');
  assert.equal(parseDiskBytes('Container Free Space: 180.0 GB (180000000000 Bytes)'), 180000000000);
});

test('safe report reduces command output to facts and contains no raw account text', () => {
  const report = buildSafeMacReport({
    hardware: 'Chip: Apple M3 Pro\nMemory: 36 GB\nUser Name: SYNTHETIC PERSON',
    version: 'ProductVersion: 15.6.1',
    disk: 'Container Free Space: 180.0 GB (180000000000 Bytes)',
    fileVault: 'FileVault is On.',
    admin: 'no SYNTHETIC_USER is NOT a member of admin',
    mdm: 'Enrolled via DEP: No\nMDM enrollment: No',
    hermesVersion: 'hermes 0.20.0',
    ollamaVersion: 'ollama version is 0.11.5',
    h0Show: 'classroom:latest    abc123    9.3 GB    2 days ago',
  });
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('SYNTHETIC PERSON'), false);
  assert.equal(serialized.includes('SYNTHETIC_USER'), false);
  assert.equal(report.fileVaultEnabled, true);
  assert.equal(report.isStandardAccount, true);
  assert.equal(report.mdmEnrollment, 'not-enrolled');
  assert.equal(report.h0Installed, true);
  assert.equal(report.ownership, 'unresolved');
  assert.equal(report.directorPolicy, 'unresolved');
});
