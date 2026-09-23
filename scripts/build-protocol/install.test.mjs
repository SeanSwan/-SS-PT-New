/** Installer integrity tests: preserve, merge, restore, refuse races, rerun safely. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { applyTargets, managed, mergeHooks, BEGIN, sha } from './install-lib.mjs';

const root = mkdtempSync(join(tmpdir(), 'makeer-installer-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
test('managed block preserves prior instructions and is idempotent', () => {
  const original = '# Existing\r\nKeep this exact text.\r\n';
  const first = managed(original, 'Mega Blueprints policy');
  assert.ok(first.endsWith(original));
  assert.equal(managed(first, 'Mega Blueprints policy'), first);
  assert.ok(managed(first, 'Updated policy').endsWith(original));
  assert.throws(() => managed(`${BEGIN}\nbroken`, 'replacement'));
});
test('native hook merge preserves unrelated settings and siblings on rerun', () => {
  const original = { permissions: { deny: ['unrelated'] }, hooks: {
    Stop: [{ hooks: [{ command: 'other-stop' }] }],
    UserPromptSubmit: [{ matcher: '*', hooks: [{ command: 'existing-router', type: 'command' }] }],
  } };
  const command = 'node "C:/native/build-protocol/prompt-hook.mjs" codex';
  const merged = mergeHooks(original, command, true);
  assert.deepEqual(merged.permissions, original.permissions);
  assert.deepEqual(merged.hooks.Stop, original.hooks.Stop);
  assert.deepEqual(merged.hooks.UserPromptSubmit[0], original.hooks.UserPromptSubmit[0]);
  assert.deepEqual(mergeHooks(merged, command, true), merged);
  assert.equal(original.hooks.UserPromptSubmit.length, 1);
});
test('writes produce verified originals and repeat install changes nothing', () => {
  const path = join(root, 'instructions.md');
  const original = Buffer.from('original\r\n'); writeFileSync(path, original);
  const options = { backupRoot: join(root, 'backups'), allowedRoots: [root] };
  const result = applyTargets([{ path, content: 'updated' }], options);
  const manifest = JSON.parse(readFileSync(result.manifest));
  assert.equal(manifest.status, 'INSTALLED_READBACK_VERIFIED');
  assert.equal(sha(readFileSync(join(dirname(result.manifest), manifest.entries[0].backup))), sha(original));
  assert.equal(sha(readFileSync(path)), manifest.entries[0].afterSha256);
  assert.equal(applyTargets([{ path, content: 'updated' }], options).changed, 0);
});
test('a concurrent edit stops the write and preserves the new contents', () => {
  const path = join(root, 'race.md'); writeFileSync(path, 'before');
  assert.throws(() => applyTargets([{ path, content: 'proposed' }], {
    backupRoot: join(root, 'backups'), allowedRoots: [root],
    beforeWrite: () => writeFileSync(path, 'other agent'),
  }), /Concurrent modification/);
  assert.equal(readFileSync(path, 'utf8'), 'other agent');
});
test('targets outside the declared roots are refused before installation', () => {
  assert.throws(() => applyTargets([{ path: join(root, '..', 'outside.md'), content: 'no' }], {
    backupRoot: join(root, 'backups'), allowedRoots: [root],
  }), /Unapproved/);
});
test('a change between planning the content and starting install is rejected', () => {
  const path = join(root, 'prior-race.md'); writeFileSync(path, 'other agent');
  assert.throws(() => applyTargets([{ path, content: 'mine', expectedBefore: sha('older source') }], {
    backupRoot: join(root, 'backups'), allowedRoots: [root],
  }), /Concurrent modification before snapshot/);
  assert.equal(readFileSync(path, 'utf8'), 'other agent');
});
