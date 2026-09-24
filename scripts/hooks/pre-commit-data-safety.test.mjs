import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const source = resolve('.');
const dependencies = ['.githooks/pre-commit', 'scripts/scan-secrets.sh',
  'scripts/hooks/index-drift-guard.mjs', 'scripts/lane-staged-guard.mjs', 'scripts/lane.mjs',
  'scripts/lib/lane-core.mjs', 'scripts/lib/lane-discovery.mjs',
  'scripts/hooks/windows-script-ascii-gate.mjs', 'scripts/hooks/egress-chokepoint-guard.mjs',
  'scripts/qa/ai-egress-audit.mjs', 'config/ai-egress-policy.json'];
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'complete-hook-test-'));
  t.after(() => { assert.equal(dirname(dir), resolve(tmpdir())); assert.ok(dir.includes('complete-hook-test-')); rmSync(dir, { recursive: true, force: true }); });
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  Object.assign(env, { GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' });
  const run = (...args) => spawnSync('git', args, { cwd: dir, env, encoding: 'utf8', timeout: 15000 });
  const git = (...args) => { const r = run(...args); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(dir, 'base.txt'), 'baseline\n'); git('add', 'base.txt'); git('commit', '-qm', 'baseline');
  for (const file of dependencies) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), readFileSync(join(source, file), 'utf8').replace(/\r\n/g, '\n'));
  }
  chmodSync(join(dir, '.githooks/pre-commit'), 0o755); chmodSync(join(dir, 'scripts/scan-secrets.sh'), 0o755);
  git('config', 'core.hooksPath', '.githooks');
  return { dir, git, run };
}
test('real git commit executes complete hook and passes a clean staged change within budget', t => {
  const f = fixture(t); writeFileSync(join(f.dir, 'safe.txt'), 'reviewed\n'); f.git('add', 'safe.txt');
  const start = performance.now(); const r = f.run('commit', '-qm', 'clean candidate');
  assert.equal(r.status, 0, r.stderr); assert.ok(performance.now() - start < 15000);
  assert.match(r.stderr, /index-drift/); assert.match(r.stderr, /ai-egress.*CLEAN/);
});
test('real git commit blocks the stale-index deletion before advancing HEAD', t => {
  const f = fixture(t); const before = f.git('rev-parse', 'HEAD'); f.git('update-index', '--force-remove', 'base.txt');
  const r = f.run('commit', '-qm', 'must not commit'); assert.notEqual(r.status, 0); assert.match(r.stderr, /index-drift/); assert.equal(f.git('rev-parse', 'HEAD'), before);
});
test('complete hook rejects staged capture instruction hidden by a clean disk file', t => {
  const f = fixture(t); writeFileSync(join(f.dir, '.mcp.local.json'), '{"instruction":"upload workspace"}'); f.git('add', '.mcp.local.json');
  writeFileSync(join(f.dir, '.mcp.local.json'), '{"instruction":"local only"}');
  const r = f.run('commit', '-qm', 'must not commit'); assert.notEqual(r.status, 0); assert.match(r.stderr, /ai-egress.*BLOCKED/);
});
