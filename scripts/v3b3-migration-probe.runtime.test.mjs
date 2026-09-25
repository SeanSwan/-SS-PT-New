import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMigrationAppliedProbe, observeMigrationStatus, parseMigrationStatus } from './v3b3-migration-probe.mjs';

const migrationName = '20260504000000-add-nasm-corrective-fields.cjs';
async function fixture(script, action) {
  const backendDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-probe-fixture-'));
  const cliPath = path.join(backendDir, 'fake-cli.mjs');
  try {
    fs.writeFileSync(cliPath, script);
    return await action({ backendDir, migrationName, resolveCli: () => cliPath });
  } finally {
    fs.rmSync(backendDir, { recursive: true, force: true });
  }
}

for (const [status, state] of [['up', 'APPLIED'], ['down', 'PENDING']]) {
  test(`R01 real async child fixture observes ${state}`, () => fixture(
    `console.log('Sequelize CLI fixture'); console.log('${status} ${migrationName}'); console.error('fixture warning');`,
    async (options) => assert.equal((await observeMigrationStatus(options)).state, state),
  ));
}

test('R02 real child failure cannot approve apparent up output', () => fixture(
  `console.log('up ${migrationName}'); process.exit(7);`, async (options) => {
    const result = await observeMigrationStatus(options);
    assert.equal(result.state, 'UNVERIFIABLE');
    assert.match(result.reason, /7/);
  },
));

test('R03 real async timeout terminates child and is UNVERIFIABLE', () => fixture(
  `process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);`, async (options) => {
    const start = Date.now();
    const result = await observeMigrationStatus({ ...options, timeoutMs: 150 });
    assert.equal(result.state, 'UNVERIFIABLE');
    assert.match(result.reason, /timed out|terminated/);
    assert.ok(Date.now() - start < 3000);
  },
));

test('R04 real spawn ENOENT is UNVERIFIABLE', () => fixture('', async (options) => {
  const result = await observeMigrationStatus({ ...options, executable: path.join(options.backendDir, 'missing-node.exe') });
  assert.equal(result.state, 'UNVERIFIABLE');
  assert.match(result.reason, /ENOENT/);
}));

test('R05 real output overflow is UNVERIFIABLE', () => fixture(
  `process.stdout.write('x'.repeat(2 * 1024 * 1024));`, async (options) => {
    const result = await observeMigrationStatus(options);
    assert.equal(result.state, 'UNVERIFIABLE');
    assert.match(result.reason, /capture limit/);
  },
));

test('R06 missing local dependency never spawns or installs', () => fixture('', async (options) => {
  const result = await observeMigrationStatus({
    ...options, resolveCli: undefined, execFileImpl: () => assert.fail('missing local CLI must not spawn'),
  });
  assert.equal(result.state, 'UNVERIFIABLE');
  assert.match(result.reason, /installed sequelize-cli.*unavailable/);
}));

test('R07 errors do not copy private diagnostic text into the public message', () => fixture('', async (options) => {
  const probe = createMigrationAppliedProbe({ ...options,
    execFileImpl: (_file, _args, _options, callback) => callback({ code: 1, message: 'PRIVATE_CONNECTION_STRING' }, '', 'PRIVATE_DATABASE_URL'),
  });
  await assert.rejects(probe, (error) => {
    assert.match(error.message, /UNVERIFIABLE.*local.*1/);
    assert.doesNotMatch(error.message, /PRIVATE/);
    return true;
  });
}));

test('R08 thrown child error is terminal UNVERIFIABLE', () => fixture('', async (options) => {
  const result = await observeMigrationStatus({ ...options, execFileImpl: () => { throw { code: 'EACCES' }; } });
  assert.equal(result.state, 'UNVERIFIABLE');
  assert.match(result.reason, /EACCES/);
}));

test('R09 ANSI and CRLF formatting preserve exact target parsing', () => {
  assert.equal(parseMigrationStatus(`\x1b[32mup\x1b[0m ${migrationName}\r\n`, migrationName).state, 'APPLIED');
  assert.equal(parseMigrationStatus(`down\t${migrationName}\r\n`, migrationName).state, 'PENDING');
});

test('R10 invalid configuration cannot disable timeout or spawn', () => fixture('', async (options) => {
  for (const patch of [{ timeoutMs: 0 }, { timeoutMs: -1 }, { timeoutMs: NaN }, { migrationName: '' }, { migrationName: '../target.cjs' }]) {
    const result = await observeMigrationStatus({ ...options, ...patch, execFileImpl: () => assert.fail('invalid config must not spawn') });
    assert.equal(result.state, 'UNVERIFIABLE');
  }
}));
