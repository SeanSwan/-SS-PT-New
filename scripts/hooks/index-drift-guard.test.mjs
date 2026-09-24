import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const guard = resolve(process.env.DRIFT_GUARD_UNDER_TEST || 'scripts/hooks/index-drift-guard.mjs');
const env = { ...process.env, GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0' };
for (const k of ['GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']) delete env[k];
function fixture(t, file = 'tracked.txt', data = 'current\n') {
  const dir = mkdtempSync(join(tmpdir(), 'index-drift-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.autocrlf', 'false'); git('config', 'core.hooksPath', '.no-hooks');
  if (file) { writeFileSync(join(dir, file), data); git('add', '--', file); git('commit', '-qm', 'fixture'); }
  const run = () => spawnSync(process.execPath, [guard, '--repo', dir, '--json'], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
  return { dir, git, run, file };
}
test('blocks a staged deletion while the committed file remains on disk', t => {
  const f = fixture(t); f.git('update-index', '--force-remove', f.file);
  const r = f.run(); assert.equal(r.status, 1, r.stderr); assert.equal(JSON.parse(r.stdout).hazards, 1);
});
test('accepts a real staged change and leaves it untouched', t => {
  const f = fixture(t); writeFileSync(join(f.dir, f.file), 'new\n'); f.git('add', f.file);
  const before = f.git('write-tree'); assert.equal(f.run().status, 0); assert.equal(f.git('write-tree'), before);
});
test('accepts a deliberate deletion where the disk file is absent', t => {
  const f = fixture(t); f.git('rm', f.file); assert.equal(f.run().status, 0);
});
test('handles a quoted Unicode path without silently missing its staged deletion', t => {
  const f = fixture(t, 'résumé file.txt'); f.git('update-index', '--force-remove', f.file);
  const r = f.run(); assert.equal(r.status, 1, r.stderr); assert.equal(JSON.parse(r.stdout).hazards, 1);
});
test('handles a tab in a path on platforms that support it', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t, 'tab\tfile.txt'); f.git('update-index', '--force-remove', f.file); assert.equal(f.run().status, 1);
});
test('accepts a mode-only change', t => {
  const f = fixture(t); f.git('update-index', '--chmod=+x', f.file); assert.equal(f.run().status, 0);
});
test('accepts an initial commit in an unborn repository', t => {
  const f = fixture(t, null); writeFileSync(join(f.dir, 'first.txt'), 'first\n'); f.git('add', 'first.txt'); assert.equal(f.run().status, 0);
});
test('treats CRLF checkout text as matching its LF committed blob', t => {
  const f = fixture(t); writeFileSync(join(f.dir, f.file), 'current\r\n'); f.git('update-index', '--force-remove', f.file); assert.equal(f.run().status, 1);
});
test('does not normalize newlines inside binary content', t => {
  const f = fixture(t, 'binary.bin', Buffer.from('a\0b\n')); writeFileSync(join(f.dir, f.file), Buffer.from('a\0b\r\n'));
  f.git('update-index', '--force-remove', f.file); assert.equal(f.run().status, 0);
});
test('fails closed on an unreadable/corrupt selected index', t => {
  const f = fixture(t); writeFileSync(join(f.dir, '.git', 'index'), 'invalid index'); assert.equal(f.run().status, 2);
});
