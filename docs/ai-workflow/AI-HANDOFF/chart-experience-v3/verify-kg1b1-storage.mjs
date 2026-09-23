/** Lead-owned actual storage probes. Explicit synthetic DB; no app singleton/model import. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const [root, dataDirectory] = process.argv.slice(2);
assert.ok(root && dataDirectory, 'explicit build root and owned synthetic data directory required');
const require = createRequire(resolve(root, 'backend/package.json'));
const { Sequelize } = require('sequelize');
let migration, fixture;
try {
  migration = require(resolve(root, 'backend/migrations/20260904000001-add-workout-log-entered-weight.cjs'));
  fixture = await import(pathToFileURL(resolve(root, 'backend/tests/helpers/chartUnitStorageFixture.mjs')));
} catch (error) { if (!['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code)) throw error; }
const { withChartUnitTestDatabase: withDb } = await import(pathToFileURL(
  resolve(root, 'backend/tests/helpers/chartUnitTestDatabase.mjs')));
const target = { host: '127.0.0.1', port: 55439, database: 'chart_weight_synthetic',
  user: 'chart_unit_test', dataDirectory: resolve(dataDirectory) };
const SID = '00000000-0000-4000-8000-000000000001';
const withFixture = run => {
  assert.equal(typeof migration?.up, 'function', 'storage migration missing');
  assert.equal(typeof fixture?.withChartUnitStorageFixture, 'function', 'storage fixture missing');
  return fixture.withChartUnitStorageFixture(target, run);
};
const rows = async (orm, sql, options = {}) => (await orm.query(sql, options))[0];
const seed = async orm => {
  await orm.query('INSERT INTO public.workout_sessions(id) VALUES (:sid)', { replacements: { sid: SID } });
  await orm.query(`INSERT INTO public.workout_logs
    ("sessionId","exerciseName","setNumber",reps,weight,"createdAt","updatedAt")
    VALUES (:sid,'Synthetic lead probe',1,8,100,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
  { replacements: { sid: SID } });
};
const up = orm => migration.up(orm.getQueryInterface(), Sequelize);
const cols = orm => rows(orm, `SELECT column_name,data_type,is_nullable,column_default,numeric_precision,numeric_scale
  FROM information_schema.columns WHERE table_schema='public' AND table_name='workout_logs'
  AND column_name IN ('enteredWeight','enteredWeightUnit') ORDER BY column_name`);
const checks = orm => rows(orm, `SELECT conname FROM pg_constraint
  WHERE conrelid='public.workout_logs'::regclass AND conname='workout_logs_entered_weight_pair_check'`);
const old = orm => rows(orm, 'SELECT * FROM public.workout_logs ORDER BY id');
const add = (orm, value, unit) => orm.query(`INSERT INTO public.workout_logs
  ("sessionId","exerciseName","setNumber",reps,weight,"enteredWeight","enteredWeightUnit","createdAt","updatedAt")
  VALUES (:sid,'Synthetic pair probe',2,1,0,:value,:unit,NOW(),NOW())`,
{ replacements: { sid: SID, value, unit } });
const pgReject = (promise, codes) => assert.rejects(promise, error => {
  const code = error.original?.code ?? error.parent?.code;
  assert.ok(codes.includes(code), `unexpected PostgreSQL error class ${code}`); return true;
});
const collisionReject = promise => assert.rejects(promise, error =>
  error.message === 'CHART_UNIT_STORAGE_MIGRATION_COLLISION'
  || ['42701','42710'].includes(error.original?.code ?? error.parent?.code));

test('SV01 real migration preserves full old rows, adds nullable exact columns and CHECK', async () => {
  await withFixture(async orm => {
    assert.deepEqual(await cols(orm), []); await seed(orm);
    const before = await old(orm); await up(orm);
    const after = await old(orm);
    assert.equal(after.length, before.length);
    for (let i = 0; i < before.length; i++) {
      const { enteredWeight, enteredWeightUnit, ...legacy } = after[i];
      assert.equal(enteredWeight, null); assert.equal(enteredWeightUnit, null); assert.deepEqual(legacy, before[i]);
    }
    const c = await cols(orm);
    assert.equal(c.length, 2);
    assert.deepEqual(c.map(x => [x.column_name,x.data_type,x.is_nullable,x.column_default]),
      [['enteredWeight','numeric','YES',null],['enteredWeightUnit','text','YES',null]]);
    assert.equal(c[0].numeric_precision, 12); assert.equal(c[0].numeric_scale, 6);
    assert.equal((await checks(orm)).length, 1);
  });
});
test('SV02 raw PostgreSQL accepts explicit valid boundaries and NULL pair', async () => {
  await withFixture(async orm => {
    await seed(orm); await up(orm);
    for (const pair of [[null,null],[0,'lb'],[0,'kg'],[100,'kg'],[999999.999999,'lb']]) await add(orm, ...pair);
    assert.equal((await old(orm)).length, 6);
    const explicit = await rows(orm, 'SELECT "enteredWeight","enteredWeightUnit" FROM public.workout_logs WHERE "enteredWeightUnit" IS NOT NULL ORDER BY id');
    assert.deepEqual(explicit.map(x => x.enteredWeight), ['0.000000','0.000000','100.000000','999999.999999']);
  });
});
test('SV03 half-pairs, special numerics, range and vocabulary reject in raw PostgreSQL', async () => {
  await withFixture(async orm => {
    await seed(orm); await up(orm);
    for (const pair of [[null,'kg'],[100,null],[-1,'lb'],['NaN','kg'],['Infinity','kg'],['-Infinity','lb'],
      [1000000,'kg'],[1,'KG'],[1,' kg'],[1,'lbs'],[1,'stone']]) {
      await pgReject(add(orm, ...pair), ['23514','22003']);
    }
    assert.equal((await old(orm)).length, 1);
  });
});
test('SV04 failure after actual DDL rolls back both columns and constraint', async () => {
  await withFixture(async orm => {
    await seed(orm); const before = await old(orm), expected = new Error('lead forced transaction failure');
    let altered = 0;
    const proxy = Object.create(orm.getQueryInterface());
    proxy.sequelize = {
      getDialect: () => orm.getDialect(), transaction: (...args) => orm.transaction(...args),
      query: async (sql, ...args) => {
        const result = await orm.query(sql, ...args);
        if (/ALTER\s+TABLE/i.test(sql)) { altered++; throw expected; }
        return result;
      },
    };
    await assert.rejects(migration.up(proxy, Sequelize), error => error === expected);
    assert.equal(altered, 1); assert.deepEqual(await cols(orm), []); assert.deepEqual(await checks(orm), []);
    assert.deepEqual(await old(orm), before);
  });
});
test('SV05 rerun and partial-schema collision reject without rewriting evidence; down does no SQL', async () => {
  await withFixture(async orm => {
    await seed(orm); await up(orm); await add(orm, 100, 'kg'); const before = await old(orm);
    await collisionReject(up(orm)); assert.deepEqual(await old(orm), before);
    let calls = 0;
    const blocked = new Proxy({}, { get: () => { calls++; throw new Error('down must not inspect or mutate DB'); } });
    await assert.rejects(migration.down(blocked), { message: 'CHART_UNIT_STORAGE_ROLLBACK_REQUIRES_REVIEW' });
    assert.equal(calls, 0); assert.deepEqual(await old(orm), before);
  });
  await withFixture(async orm => {
    await orm.query('ALTER TABLE public.workout_logs ADD COLUMN "enteredWeight" TEXT');
    await collisionReject(up(orm));
    const c = await cols(orm); assert.equal(c.length, 1); assert.equal(c[0].data_type, 'text');
    assert.deepEqual(await checks(orm), []);
  });
});
test('SV06 fixture refuses unrelated public table and never removes its data', async () => {
  assert.equal(typeof fixture?.withChartUnitStorageFixture, 'function', 'storage fixture missing');
  await withDb(target, async orm => {
    await orm.query('CREATE TABLE public.swan_chart_storage_foreign (value integer NOT NULL)');
    try {
      await orm.query('INSERT INTO public.swan_chart_storage_foreign VALUES (7)');
      let called = false;
      await assert.rejects(fixture.withChartUnitStorageFixture(target, async () => { called = true; }));
      assert.equal(called, false);
      assert.deepEqual(await rows(orm, 'SELECT value FROM public.swan_chart_storage_foreign'), [{ value: 7 }]);
      assert.equal((await rows(orm, "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'"))[0].n, 1);
    } finally { await orm.query('DROP TABLE public.swan_chart_storage_foreign'); }
  });
});
test('SV07 all synthetic fixture objects and owned ORM sessions are cleaned', async () => {
  await withDb(target, async orm => {
    assert.equal((await rows(orm, "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'"))[0].n, 0);
    assert.equal((await rows(orm, `SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE application_name='swan-chart-unit-orm' AND pid<>pg_backend_pid()`))[0].n, 0);
  });
});
