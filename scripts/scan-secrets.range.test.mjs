/**
 * @file scan-secrets.range.test.mjs
 * @description Regression coverage for committed-range secret scans in linked worktrees.
 * @purpose Proves the release scanner evaluates candidate blobs without leaking matches.
 * @safety Generates synthetic credentials only inside a disposable temporary repository.
 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCANNER = join(SCRIPT_DIR, 'scan-secrets.sh').replaceAll('\\', '/');
const WINDOWS_GIT_BASH = 'C:/Program Files/Git/bin/bash.exe';
const BASH = process.env.SWAN_GIT_BASH
  || (process.platform === 'win32' && existsSync(WINDOWS_GIT_BASH) ? WINDOWS_GIT_BASH : 'bash');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  return result;
}

function git(cwd, ...args) {
  const result = run('git', args, cwd);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function commitAll(cwd, message) {
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', message);
}

test('--range scans committed candidate blobs and never prints secret content', () => {
  const repo = mkdtempSync(join(tmpdir(), 'swan-secret-range-'));
  try {
    git(repo, 'init');
    git(repo, 'config', 'user.email', 'scanner-test@example.invalid');
    git(repo, 'config', 'user.name', 'Scanner Test');

    writeFileSync(join(repo, 'baseline.txt'), 'baseline\n', 'utf8');
    commitAll(repo, 'baseline');

    writeFileSync(join(repo, 'candidate.txt'), 'safe candidate\n', 'utf8');
    commitAll(repo, 'safe candidate');

    const clean = run(BASH, [SCANNER, '--range', 'HEAD~1'], repo);
    const cleanOutput = `${clean.stdout}\n${clean.stderr}`;
    assert.equal(clean.status, 0, cleanOutput);
    assert.match(cleanOutput, /Secret scan: COMMITTED RANGE HEAD~1\.\.HEAD/);
    assert.match(cleanOutput, /Scanned:\s+1 files/);
    assert.match(cleanOutput, /Hits:\s+0/);

    const syntheticSecret = ['sk', 'proj', 'A'.repeat(24)].join('-');
    writeFileSync(join(repo, 'candidate.txt'), `${syntheticSecret}\n`, 'utf8');
    commitAll(repo, 'synthetic secret');

    const blocked = run(BASH, [SCANNER, '--range', 'HEAD~1'], repo);
    const blockedOutput = `${blocked.stdout}\n${blocked.stderr}`;
    assert.equal(blocked.status, 1, blockedOutput);
    assert.match(blockedOutput, /openai-project-key in candidate\.txt/);
    assert.match(blockedOutput, /Hits:\s+1/);
    assert.equal(blockedOutput.includes(syntheticSecret), false, 'scanner output exposed matched content');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('--range honors exact allowlist entries from a CRLF .secretignore', () => {
  const repo = mkdtempSync(join(tmpdir(), 'swan-secret-allowlist-'));
  try {
    git(repo, 'init');
    git(repo, 'config', 'user.email', 'scanner-test@example.invalid');
    git(repo, 'config', 'user.name', 'Scanner Test');

    const fixtureScriptDir = join(repo, 'scripts');
    mkdirSync(fixtureScriptDir);
    const fixtureScanner = join(fixtureScriptDir, 'scan-secrets.sh');
    copyFileSync(SCANNER, fixtureScanner);
    writeFileSync(join(repo, 'baseline.txt'), 'baseline\n', 'utf8');
    commitAll(repo, 'baseline');

    const syntheticSecret = ['sk', 'proj', 'B'.repeat(24)].join('-');
    writeFileSync(join(repo, '.secretignore'), 'fixture.txt::openai-project-key\r\n', 'utf8');
    writeFileSync(join(repo, 'fixture.txt'), `${syntheticSecret}\n`, 'utf8');
    commitAll(repo, 'allowlisted fixture');

    const allowed = run(BASH, [fixtureScanner.replaceAll('\\', '/'), '--range', 'HEAD~1'], repo);
    const allowedOutput = `${allowed.stdout}\n${allowed.stderr}`;
    assert.equal(allowed.status, 0, allowedOutput);
    assert.match(allowedOutput, /allowlisted: openai-project-key in fixture\.txt/);
    assert.match(allowedOutput, /Hits:\s+0/);
    assert.equal(allowedOutput.includes(syntheticSecret), false, 'scanner output exposed allowlisted content');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
