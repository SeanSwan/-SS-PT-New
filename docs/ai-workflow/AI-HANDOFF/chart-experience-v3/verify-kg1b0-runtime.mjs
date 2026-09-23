/** Lead-owned SH11–SH13. Explicit synthetic target, actual ORM, temporary transactional DDL only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const [root, dataDirectory] = process.argv.slice(2);
assert.ok(root && dataDirectory, 'explicit build root and owned synthetic data directory required');
const { withChartUnitTestDatabase: withDb } = await import(pathToFileURL(
  resolve(root, 'backend/tests/helpers/chartUnitTestDatabase.mjs')));
const requireFromBuild = createRequire(resolve(root, 'backend/package.json'));
const { Sequelize } = requireFromBuild('sequelize');
const target = { host: '127.0.0.1', port: 55439, database: 'chart_weight_synthetic',
  user: 'chart_unit_test', dataDirectory: resolve(dataDirectory) };
const first = async (orm, sql, options = {}) => (await orm.query(sql, options))[0][0];

test('SH11 actual same ORM writes synthetic TEMP data and transaction rollback removes it', async () => {
  await withDb(target, async orm => {
    const identity = await first(orm, `SELECT current_database() AS db, current_user AS usr,
      host(inet_server_addr()) AS host, inet_server_port() AS port,
      current_setting('default_transaction_read_only') AS ro`);
    assert.deepEqual(identity, { db: target.database, usr: target.user, host: target.host, port: target.port, ro: 'off' });
    const transaction = await orm.transaction();
    try {
      await orm.query('CREATE TEMP TABLE swan_chart_unit_probe (value integer NOT NULL)', { transaction });
      await orm.query('INSERT INTO swan_chart_unit_probe (value) VALUES (42)', { transaction });
      assert.equal((await first(orm, 'SELECT value FROM swan_chart_unit_probe', { transaction })).value, 42);
    } finally { await transaction.rollback(); }
    assert.equal((await first(orm, "SELECT to_regclass('pg_temp.swan_chart_unit_probe') AS name")).name, null);
    assert.equal(Number((await first(orm, "SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).n), 0);
  });
});

test('SH12 replacement physical connection must be verified again before writable', async () => {
  const verifiedPids = [];
  await withDb(target, async orm => {
    const manager = orm.connectionManager;
    const a = await manager.getConnection({ type: 'WRITE' });
    const before = (await a.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    await manager.destroyConnection(a);
    const b = await manager.getConnection({ type: 'WRITE' });
    try {
      const row = (await b.query("SELECT pg_backend_pid() AS pid, current_setting('default_transaction_read_only') AS ro")).rows[0];
      assert.notEqual(row.pid, before); assert.equal(row.ro, 'off');
      assert.ok(verifiedPids.includes(before)); assert.ok(verifiedPids.includes(row.pid));
    } finally { manager.releaseConnection(b); }
    const transaction = await orm.transaction();
    try {
      await orm.query('CREATE TEMP TABLE swan_chart_unit_reconnect (value integer)', { transaction });
      await orm.query('INSERT INTO swan_chart_unit_reconnect VALUES (7)', { transaction });
      assert.equal((await first(orm, 'SELECT value FROM swan_chart_unit_reconnect', { transaction })).value, 7);
    } finally { await transaction.rollback(); }
  }, { createSequelize: config => {
    const original = config.hooks.afterConnect;
    config.hooks.afterConnect = async connection => {
      await original(connection);
      verifiedPids.push((await connection.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
    };
    return new Sequelize(config);
  } });
});

test('SH13 mismatched actual directory prevents callback and leaves no rejected ORM session', async () => {
  let called = false;
  const wrong = { ...target, dataDirectory: resolve(dirname(dataDirectory), 'not-owned', 'chart-weight-db-20260904') };
  await assert.rejects(withDb(wrong, async () => { called = true; }),
    error => error.message === 'CHART_UNIT_DB_CONNECTION_REJECTED' && error.cause === undefined);
  assert.equal(called, false);
  await withDb(target, async orm => {
    const row = await first(orm, `SELECT count(*) AS n FROM pg_stat_activity
      WHERE application_name='swan-chart-unit-orm' AND pid <> pg_backend_pid()`);
    assert.equal(Number(row.n), 0);
    assert.equal(Number((await first(orm, "SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).n), 0);
  });
});
