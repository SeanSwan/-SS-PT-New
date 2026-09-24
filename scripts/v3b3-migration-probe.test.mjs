import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const legacy = process.env.V3B3_LEGACY_SOURCE;
const source = fs.readFileSync(legacy || path.join(here, 'v3b3-deploy-and-smoke.mjs'), 'utf8');
const migrationName = '20260504000000-add-nasm-corrective-fields.cjs';
const backendDir = path.join(here, 'fake-backend');
const fakeCli = path.join(backendDir, 'node_modules', 'sequelize-cli', 'lib', 'sequelize');
const terminalCode = 'MIGRATION_PROBE_UNVERIFIABLE';
const { createMigrationAppliedProbe } = legacy ? {} : await import('./v3b3-migration-probe.mjs');

// Legacy RED executes only the extracted function with fake spawnSync. The
// deployment module is never imported and no real CLI/config/database is read.
function fixtureProbe({ stdout = '', stderr = '', error = null, status = 0 } = {}) {
  const calls = [];
  if (legacy) {
    const functionSource = source.slice(source.indexOf('function probeMigrationApplied()'), source.indexOf('\nfunction runShell'));
    const probe = vm.runInNewContext(`(${functionSource})`, {
      MIGRATION_NAME: migrationName, BACKEND_DIR: backendDir, process,
      spawnSync: (...args) => { calls.push(args); return { stdout, stderr, error, status }; },
    });
    return { probe: async () => probe(), calls };
  }
  const probe = createMigrationAppliedProbe({
    backendDir, migrationName, resolveCli: () => fakeCli,
    execFileImpl: (...args) => {
      calls.push(args.slice(0, 3));
      args[3](error || (status ? { code: status } : null), stdout, stderr);
    },
  });
  return { probe, calls };
}

test('M01 exact applied target is true among realistic CLI chatter', async () => {
  const { probe } = fixtureProbe({ stdout: `Sequelize CLI [Node: 24, CLI: 6.6.2]\nLoaded configuration file "config/config.cjs".\nup  earlier.cjs\nup ${migrationName}\ndown later.cjs\n` });
  assert.equal(await probe(), true);
});

test('M02 exact pending target is false', async () => {
  assert.equal(await fixtureProbe({ stdout: `up earlier.cjs\ndown ${migrationName}\n` }).probe(), false);
});

for (const [label, result] of [
  ['spawn EBUSY/null status', { status: null, error: { code: 'EBUSY' } }],
  ['nonzero even with up stdout', { status: 1, stdout: `up ${migrationName}\n` }],
  ['timeout even with up stdout', { error: { killed: true, signal: 'SIGKILL' }, stdout: `up ${migrationName}\n` }],
  ['missing target', { stdout: 'up another.cjs\n' }],
  ['empty capture', {}],
  ['target filename suffix', { stdout: `up ${migrationName}.backup\n` }],
  ['target line trailing data', { stdout: `up ${migrationName} ignored\n` }],
  ['unknown target status', { stdout: `applied ${migrationName}\n` }],
  ['conflicting target statuses', { stdout: `up ${migrationName}\ndown ${migrationName}\n` }],
  ['duplicate target status', { stdout: `up ${migrationName}\nup ${migrationName}\n` }],
  ['target appears only in stderr', { stderr: `up ${migrationName}\n` }],
  ['maxBuffer failure', { error: { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' } }],
]) {
  test(`M03 ${label}: terminal UNVERIFIABLE`, async () => {
    await assert.rejects(fixtureProbe(result).probe, (error) => {
      assert.equal(error.code, terminalCode);
      assert.match(error.message, /UNVERIFIABLE.*local/i);
      return true;
    });
  });
}

test('M04 invocation uses installed CLI through Node without shell or npx', async () => {
  const { probe, calls } = fixtureProbe({ stdout: `up ${migrationName}\n` });
  await probe();
  assert.equal(calls.length, 1);
  const [executable, args, options] = calls[0];
  assert.equal(executable, process.execPath);
  assert.deepEqual([...args], [fakeCli, 'db:migrate:status', '--config', 'config/config.cjs', '--migrations-path', 'migrations', '--models-path', 'models', '--env', 'production']);
  assert.equal(options.cwd, backendDir);
  assert.equal(options.shell, false);
  assert.equal(options.timeout, 15000);
  assert.equal(options.killSignal, 'SIGKILL');
});

test('M05 terminal observation error aborts actual polling helper after one attempt', async () => {
  let ticks = 0;
  let calls = 0;
  let sleeps = 0;
  const pollSource = source.slice(source.indexOf('async function pollUntil('), source.indexOf('\nasync function probeBackendUp'));
  const poll = vm.runInNewContext(`(${pollSource})`, {
    Date: { now: () => ticks++ }, logSub: () => {}, C: { green: (s) => s, dim: (s) => s },
    setTimeout: (fn) => { sleeps++; fn(); },
  });
  await assert.rejects(() => poll(async () => {
    calls++;
    throw Object.assign(new Error('UNVERIFIABLE local probe'), { code: terminalCode });
  }, { intervalMs: 1, timeoutMs: 20, label: 'fixture' }), (error) => error.code === terminalCode);
  assert.equal(calls, 1);
  assert.equal(sleeps, 0);
});

test('M06 nonterminal backend polling semantics are retained', async () => {
  let ticks = 0;
  let calls = 0;
  const pollSource = source.slice(source.indexOf('async function pollUntil('), source.indexOf('\nasync function probeBackendUp'));
  const poll = vm.runInNewContext(`(${pollSource})`, {
    Date: { now: () => ticks++ }, logSub: () => {}, C: { green: (s) => s, dim: (s) => s }, setTimeout: (fn) => fn(),
  });
  assert.equal(await poll(async () => {
    if (++calls === 1) throw new Error('temporary backend failure');
    return true;
  }, { intervalMs: 1, timeoutMs: 20, label: 'fixture' }), true);
  assert.equal(calls, 2);
});

test('M07 orchestrator wait block reports local observation failure and stops before seed', async () => {
  const start = source.indexOf('if (!SKIP_WAIT) {');
  const end = source.indexOf('// ─── Step 2:');
  const step = source.slice(start, end);
  const failures = [];
  let migrationCalls = 0;
  const result = vm.runInNewContext(`(async () => { ${step}\nreturn 'reached seed'; })()`, {
    SKIP_WAIT: false, stepN: 0, TOTAL_STEPS: 3, MIGRATION_NAME: migrationName,
    C: { yellow: (s) => s }, logStep: () => {}, logSub: () => {},
    probeBackendUp: async () => true,
    pollUntil: async (probe) => probe(),
    probeMigrationApplied: async () => {
      migrationCalls++;
      throw Object.assign(new Error('Migration status UNVERIFIABLE: local command failed (EBUSY)'), { code: terminalCode });
    },
    fail: (message) => { failures.push(message); throw new Error('STOP_BEFORE_SEED'); },
  });
  await assert.rejects(result, /STOP_BEFORE_SEED/);
  assert.equal(migrationCalls, 1);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /UNVERIFIABLE.*local/);
  assert.doesNotMatch(failures[0], /did not land|check Render deploy logs/);
});
