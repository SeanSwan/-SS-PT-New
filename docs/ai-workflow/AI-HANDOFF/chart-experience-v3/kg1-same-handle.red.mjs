/** Lead-owned SH01–SH10. Fake ORM connections only; no DB/env file or product imports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
assert.ok(root, 'explicit isolated build root required');
let subject;
try { subject = await import(pathToFileURL(resolve(root, 'backend/tests/helpers/chartUnitTestDatabase.mjs'))); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const invoke = (...args) => {
  assert.equal(typeof subject?.withChartUnitTestDatabase, 'function', 'Luna implementation missing');
  return subject.withChartUnitTestDatabase(...args);
};
const target = () => ({ host: '127.0.0.1', port: 55439, database: 'chart_weight_synthetic',
  user: 'chart_unit_test', dataDirectory: resolve(root, '../../qa/chart-weight-db-20260904') });
const identity = (overrides = {}) => ({ ...target(), listenAddresses: '127.0.0.1',
  timeZone: 'UTC', readOnly: 'on', ...overrides });
const connection = (events, overrides = {}, failures = {}) => ({
  async query(sql) {
    if (/SELECT\s+current_database/i.test(sql)) {
      events.push('identity');
      assert.match(sql, /host\(inet_server_addr\(\)\)/);
      if (failures.identity) throw failures.identity;
      return { rows: [identity(overrides)] };
    }
    assert.equal(sql, 'SET default_transaction_read_only = off');
    events.push('writable');
    if (failures.set) throw failures.set;
    return { rows: [] };
  },
  async end() { events.push('end'); if (failures.end) throw failures.end; },
});
const harness = ({ connections = [], authError, closeError, constructionError } = {}) => {
  const events = [], state = { constructed: 0, closed: 0, ran: 0 };
  const orm = {
    async authenticate() {
      events.push('authenticate');
      for (const conn of connections) await state.config.hooks.afterConnect(conn);
      if (authError) throw authError;
    },
    async close() { state.closed++; events.push('close'); if (closeError) throw closeError; },
  };
  const createSequelize = config => {
    state.constructed++; state.config = config;
    if (constructionError) throw constructionError;
    return orm;
  };
  return { state, events, orm, options: { environment: {}, createSequelize },
    run: async actual => { state.ran++; assert.equal(actual, orm); events.push('callback'); return 'done'; } };
};
const reject = (promise, code) => assert.rejects(promise, error => {
  assert.equal(error.message, code); assert.equal(error.cause, undefined); return true;
});

test('SH01 bad target rejects before construction', async () => {
  const h = harness();
  await reject(invoke({ ...target(), port: 5432 }, h.run, h.options), 'CHART_UNIT_DB_TARGET_REJECTED');
  assert.equal(h.state.constructed, 0); assert.equal(h.state.ran, 0);
});
test('SH02 ambient default rejects before construction', async () => {
  const h = harness();
  await reject(invoke(target(), h.run, { ...h.options, environment: { DATABASE_URL: 'synthetic-sentinel' } }),
    'CHART_UNIT_DB_AMBIENT_CONFIG');
  assert.equal(h.state.constructed, 0); assert.equal(h.state.ran, 0);
});
test('SH03 nonfunction callback rejects before construction', async () => {
  const h = harness();
  await reject(invoke(target(), null, h.options), 'CHART_UNIT_DB_CALLBACK_REJECTED');
  assert.equal(h.state.constructed, 0);
});
test('SH04 exact explicit config and one callback on same ORM', async () => {
  const h = harness();
  assert.equal(await invoke(target(), h.run, h.options), 'done');
  const c = h.state.config;
  for (const [key, value] of Object.entries({ dialect: 'postgres', database: target().database,
    username: target().user, password: '', host: '127.0.0.1', port: 55439, logging: false, timezone: 'UTC' })) {
    assert.equal(c[key], value, key);
  }
  assert.deepEqual(c.pool, { max: 1, min: 0, idle: 1000, acquire: 3000 });
  assert.deepEqual(c.retry, { max: 0 });
  assert.deepEqual(c.dialectOptions, { ssl: false, application_name: 'swan-chart-unit-orm',
    connectionTimeoutMillis: 2000, query_timeout: 2000, statement_timeout: 2000,
    options: '-c default_transaction_read_only=on -c timezone=UTC' });
  assert.equal(h.state.ran, 1); assert.equal(h.state.closed, 1);
  assert.deepEqual(h.events, ['authenticate', 'callback', 'close']);
});
test('SH05 same connection identity precedes writable; mismatch ends without writable', async () => {
  const e = [], h = harness({ connections: [connection(e)] });
  assert.equal(await invoke(target(), async s => {
    assert.deepEqual(e, ['identity', 'writable']); return h.run(s);
  }, h.options), 'done');
  const bad = [], b = harness({ connections: [connection(bad, { database: 'foreign' })] });
  await reject(invoke(target(), b.run, b.options), 'CHART_UNIT_DB_CONNECTION_REJECTED');
  assert.deepEqual(bad, ['identity', 'end']); assert.equal(b.state.ran, 0); assert.equal(b.state.closed, 1);
});
test('SH06 every distinct physical connection must pass, including replacement', async () => {
  const a = [], b = [], h = harness({ connections: [connection(a), connection(b)] });
  await invoke(target(), h.run, h.options);
  assert.deepEqual(a, ['identity', 'writable']); assert.deepEqual(b, ['identity', 'writable']);
  const x = [], y = [], bad = harness({ connections: [connection(x), connection(y, { readOnly: 'off' })] });
  await reject(invoke(target(), bad.run, bad.options), 'CHART_UNIT_DB_CONNECTION_REJECTED');
  assert.deepEqual(y, ['identity', 'end']); assert.equal(bad.state.ran, 0);
});
test('SH07 identity, writable and end errors never pass or leak', async () => {
  for (const failures of [{ identity: new Error('private-sentinel') },
    { set: new Error('private-sentinel') }, { identity: new Error('private-sentinel'), end: new Error('private-sentinel') }]) {
    const e = [], h = harness({ connections: [connection(e, {}, failures)] });
    await reject(invoke(target(), h.run, h.options), 'CHART_UNIT_DB_CONNECTION_REJECTED');
    assert.equal(e.at(-1), 'end'); assert.equal(h.state.ran, 0); assert.equal(h.state.closed, 1);
  }
});
test('SH08 constructor and authentication failures suppress callback and close owned ORM', async () => {
  const a = harness({ authError: new Error('private-sentinel') });
  await reject(invoke(target(), a.run, a.options), 'CHART_UNIT_DB_CONNECTION_REJECTED');
  assert.equal(a.state.closed, 1); assert.equal(a.state.ran, 0);
  const b = harness({ constructionError: new Error('private-sentinel') });
  await reject(invoke(target(), b.run, b.options), 'CHART_UNIT_DB_CONNECTION_REJECTED');
  assert.equal(b.state.closed, 0); assert.equal(b.state.ran, 0);
});
test('SH09 callback assertions propagate unchanged after close', async () => {
  const expected = new Error('test assertion'), h = harness();
  await assert.rejects(invoke(target(), async () => { throw expected; }, h.options), error => error === expected);
  assert.equal(h.state.closed, 1);
});
test('SH10 close failure rejects instead of returning success', async () => {
  const h = harness({ closeError: new Error('private-sentinel') });
  await reject(invoke(target(), h.run, h.options), 'CHART_UNIT_DB_CLOSE_FAILED');
  assert.equal(h.state.closed, 1);
});
