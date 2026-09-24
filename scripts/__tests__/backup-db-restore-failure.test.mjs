import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// Load only the exact function under test. Importing the CLI would run main(),
// which reads real credentials and can create/drop databases. Every dependency
// of this function is instead an in-memory fixture; no command can be executed.
const source = fs.readFileSync(new URL('../../backend/scripts/backup-db.mjs', import.meta.url), 'utf8');
const start = source.indexOf('function proveRestorable(');
const end = source.indexOf('\nfunction main()', start);
assert.ok(start >= 0 && end > start, 'restore function boundaries must remain discoverable');
const functionSource = source.slice(start, end);

const secretMarker = 'synthetic-credential-do-not-log';
// Assemble only a synthetic runtime fixture; do not store a credential-shaped URI.
const secretUrl = ['postgresql:', '//fixture:', secretMarker, '@example.invalid/fixture'].join('');

function scenario({
  restore = { status: 0, signal: null, stderr: '' },
  create = { status: 0 },
  counts = new Map([['Users', 2], ['Sessions', 3]]),
  restoredDigest = 'same-fixture-digest',
} = {}) {
  const calls = [];
  const logs = [];
  let tableReads = 0;
  let digestReads = 0;
  const sandbox = {
    process: { pid: 12345 },
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    spawnSync(command, args) {
      calls.push({ command, args });
      if (command === 'pg_restore') return restore;
      assert.equal(command, 'psql', 'unexpected command must fail the fixture');
      const sql = args.at(-1);
      if (sql.startsWith('CREATE DATABASE ')) return create;
      assert.match(sql, /^(SELECT pg_terminate_backend|DROP DATABASE IF EXISTS)/);
      return { status: 0, stdout: '' };
    },
    tableCounts() {
      tableReads += 1;
      return counts;
    },
    psqlScalar(_url, _sql, db) {
      digestReads += 1;
      return db ? restoredDigest : 'same-fixture-digest';
    },
  };
  const proveRestorable = vm.runInNewContext(`${functionSource}\nproveRestorable;`, sandbox, { timeout: 1000 });
  const result = proveRestorable(secretUrl, 'synthetic.dump', 2, new Map([['Users', 2], ['Sessions', 3]]));
  const drops = calls.filter(({ command, args }) => command === 'psql' && args.at(-1).startsWith('DROP DATABASE'));
  return { result, calls, drops, logs, tableReads, digestReads };
}

const failures = [
  ['T1 nonzero restore exit despite matching rows and digest', { status: 1, stderr: `CREATE INDEX failed: ${secretUrl}` }],
  ['T2 command launch failure', { status: null, error: { code: 'ENOENT', message: secretUrl } }],
  ['T3 timeout with partial data', { status: null, signal: 'SIGTERM', error: { code: 'ETIMEDOUT', message: secretUrl } }],
  ['T4 terminating signal even with a zero status', { status: 0, signal: 'SIGTERM', stderr: secretUrl }],
];

for (const [name, restore] of failures) {
  test(name, () => {
    const got = scenario({ restore });
    assert.equal(got.result.ok, false, 'failed pg_restore must never be certified by row counts');
    assert.match(got.result.detail, /pg_restore.*fail/i);
    assert.equal(got.tableReads, 0, 'failure must not run success checks');
    assert.equal(got.digestReads, 0);
    assert.equal(got.drops.length, 1, 'created scratch database still reaches cleanup');
    assert.doesNotMatch(JSON.stringify({ result: got.result, logs: got.logs }), /synthetic-credential|postgresql:\/\//);
  });
}

test('T5 zero exit with ordinary stderr still requires and passes counts and digest', () => {
  const got = scenario({ restore: { status: 0, signal: null, stderr: 'ordinary diagnostic text' } });
  assert.equal(got.result.ok, true);
  assert.equal(got.tableReads, 1);
  assert.equal(got.digestReads, 2);
  assert.equal(got.drops.length, 1);
  assert.match(got.result.detail, /Users digest MATCHES/);
});

test('T6 zero exit cannot excuse missing restored rows', () => {
  const got = scenario({ counts: new Map([['Users', 2], ['Sessions', 2]]) });
  assert.equal(got.result.ok, false);
  assert.match(got.result.detail, /FEWER rows/);
  assert.equal(got.drops.length, 1);
});

test('T7 zero exit cannot excuse a content digest mismatch', () => {
  const got = scenario({ restoredDigest: 'different-fixture-digest' });
  assert.equal(got.result.ok, false);
  assert.match(got.result.detail, /does not match/);
  assert.equal(got.drops.length, 1);
});

test('T8 failed scratch creation runs no restore and drops no database', () => {
  const got = scenario({ create: { status: 1, stderr: 'fixture creation denied' } });
  assert.equal(got.result.ok, false);
  assert.equal(got.calls.some(({ command }) => command === 'pg_restore'), false);
  assert.equal(got.tableReads, 0);
  assert.equal(got.drops.length, 0);
});
