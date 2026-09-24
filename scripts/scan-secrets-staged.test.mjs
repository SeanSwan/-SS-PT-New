import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const scanner = resolve('scripts/scan-secrets.sh');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const fake = 'ghp_' + 'A'.repeat(36);
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'staged-secrets-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'scripts')); copyFileSync(scanner, join(dir, 'scripts/scan-secrets.sh'));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  for (const k of ['GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']) delete env[k];
  const git = (...args) => { const r = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'core.hooksPath', '.no-hooks');
  const run = (extra = {}) => spawnSync(bash, ['scripts/scan-secrets.sh', '--staged'], { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8', timeout: 15000 });
  return { dir, git, run, env };
}
test('clean staged blob requires no rm command or temporary secret file', t => {
  const f = fixture(t); writeFileSync(join(f.dir, 'clean.txt'), 'clean\n'); f.git('add', 'clean.txt');
  mkdirSync(join(f.dir, 'bin')); writeFileSync(join(f.dir, 'bin/rm'), '#!/usr/bin/env bash\nexit 97\n'); chmodSync(join(f.dir, 'bin/rm'), 0o755);
  const r = f.run({ PATH: `${join(f.dir, 'bin')}${process.platform === 'win32' ? ';' : ':'}${f.env.PATH}` });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /CLEAN/);
});
test('blocks a staged secret even when disk was cleaned, without echoing the value', t => {
  const f = fixture(t); writeFileSync(join(f.dir, 'token.txt'), fake); f.git('add', 'token.txt'); writeFileSync(join(f.dir, 'token.txt'), 'clean');
  const r = f.run(); assert.equal(r.status, 1); assert.match(r.stderr, /github-pat/); assert.ok(!(r.stdout + r.stderr).includes(fake));
});
test('rename to an unallowlisted filename cannot bypass the staged scan', t => {
  const f = fixture(t); writeFileSync(join(f.dir, '.secretignore'), 'allowed.txt::github-pat\n'); writeFileSync(join(f.dir, 'allowed.txt'), fake);
  f.git('add', '.secretignore', 'allowed.txt'); f.git('commit', '-qm', 'fixture'); f.git('mv', 'allowed.txt', 'renamed.txt');
  const r = f.run(); assert.equal(r.status, 1, r.stderr); assert.match(r.stderr, /renamed.txt/);
});
test('Git index read failure cannot report a clean empty staged set', t => {
  const f = fixture(t); writeFileSync(join(f.dir, '.git/index'), 'corrupt'); const r = f.run(); assert.equal(r.status, 2, r.stderr); assert.doesNotMatch(r.stdout, /CLEAN/);
});
test('Unicode and spaces in staged paths are scanned exactly', t => {
  const f = fixture(t); writeFileSync(join(f.dir, 'résumé file.txt'), fake); f.git('add', '--', 'résumé file.txt'); const r = f.run(); assert.equal(r.status, 1, r.stderr);
});
