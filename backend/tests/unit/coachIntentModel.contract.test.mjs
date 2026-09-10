import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationModule = (await import('../../migrations/20260904000000-create-coach-intents.cjs')).default;
const trustMigrationModule = (await import('../../migrations/20260906000000-add-coach-intent-trust-fields.cjs')).default;

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('CoachIntent model is a PII-free mutable receipt with an actor/request uniqueness boundary', () => {
  const model = read('models/CoachIntent.mjs');
  for (const field of ['actorId', 'requestKey', 'requestHash', 'commandType', 'targetClientId', 'status', 'operationId', 'proposalId', 'result', 'errorCode', 'expiresAt', 'completedAt', 'version', 'committedAt', 'verifiedAt', 'expectedHash', 'expectedFootprint', 'proofVersion']) {
    assert.match(model, new RegExp(`\\b${field}\\s*:`), `missing model field ${field}`);
  }
  assert.match(model, /unique:\s*true,\s*fields:\s*\['actorId',\s*'requestKey'\]/);
  assert.doesNotMatch(model, /prompt|firstName|lastName/i);
});

test('CoachIntent trust migration adds server-owned commit and verification columns idempotently', async () => {
  const columns = new Set(['id', 'actorId', 'requestKey', 'requestHash', 'commandType', 'targetClientId', 'status', 'operationId', 'proposalId', 'result', 'errorCode', 'expiresAt', 'completedAt']);
  const added = [];
  const indexes = [];
  const transaction = { synthetic: true };
  const queryInterface = {
    sequelize: {
      transaction: async run => run(transaction),
      query: async (_sql, options) => { assert.equal(options.transaction, transaction); return []; },
    },
    describeTable: async () => Object.fromEntries([...columns].map((column) => [column, {}])),
    addColumn: async (_table, column, definition, options) => {
      assert.equal(options.transaction, transaction);
      added.push([column, definition]); columns.add(column);
    },
    showIndex: async () => indexes,
    addIndex: async (_table, fields, options) => {
      assert.deepEqual(fields, ['proposalId']);
      assert.equal(options.transaction, transaction);
      assert.equal(options.unique, true);
      indexes.push({ name: options.name });
    },
  };
  const Sequelize = { INTEGER: 'INTEGER', STRING: () => 'STRING', DATE: 'DATE', JSONB: 'JSONB',
    QueryTypes: { SELECT: 'SELECT' }, Op: { ne: Symbol('ne') } };

  await trustMigrationModule.up(queryInterface, Sequelize);
  await trustMigrationModule.up(queryInterface, Sequelize);

  assert.deepEqual(added.map(([column]) => column), [
    'version', 'expectedHash', 'expectedFootprint', 'proofVersion', 'committedAt', 'verifiedAt',
  ]);
  assert.deepEqual(added[0][1], { type: 'INTEGER', allowNull: false, defaultValue: 0 });
  assert.equal(added[3][1].allowNull, true);
  assert.equal(indexes.length, 1);
});

test('CoachIntent migration is additive and creates the uniqueness/index contract', () => {
  const migration = read('migrations/20260904000000-create-coach-intents.cjs');
  assert.match(migration, /createTable\('coach_intents'/);
  assert.match(migration, /fields:\s*\['actorId',\s*'requestKey'\], options:\s*\{\s*unique:\s*true/);
  assert.match(migration, /Durable receipts are the reconciliation record/);
});

test('CoachIntent migration creates the table for Sequelize missing-table errors and preserves it on rollback', async () => {
  const createTable = async () => {};
  const addIndex = async () => {};
  const queryInterface = {
    describeTable: async () => { throw new Error('No description found for "coach_intents" table'); },
    createTable,
    showIndex: async () => [],
    addIndex,
    dropTable: async () => { throw new Error('dropTable must not run for durable receipts'); },
  };
  await migrationModule.up(queryInterface, { UUID: 'UUID', INTEGER: 'INTEGER', STRING: () => 'STRING', JSONB: 'JSONB', DATE: 'DATE', fn: () => 'NOW' });

  let rollbackDescribeCalls = 0;
  await migrationModule.down({
    describeTable: async () => { rollbackDescribeCalls += 1; return { id: {} }; },
    dropTable: async () => { throw new Error('dropTable must not run for durable receipts'); },
  });
  assert.equal(rollbackDescribeCalls, 0);
});

test('CoachIntent migration retries every index after table creation is interrupted', async () => {
  let tableExists = false;
  let failUniqueIndex = true;
  const indexes = [];
  const queryInterface = {
    describeTable: async () => {
      if (!tableExists) throw Object.assign(new Error('relation "coach_intents" does not exist'), { code: '42P01' });
      return { id: {} };
    },
    createTable: async () => { tableExists = true; },
    showIndex: async () => indexes.map((name) => ({ name })),
    addIndex: async (_table, _fields, options) => {
      if (options.name === 'coach_intents_actor_request_key' && failUniqueIndex) {
        failUniqueIndex = false;
        throw new Error('temporary index outage');
      }
      indexes.push(options.name);
    },
  };
  const Sequelize = { UUID: 'UUID', INTEGER: 'INTEGER', STRING: () => 'STRING', JSONB: 'JSONB', DATE: 'DATE', fn: () => 'NOW' };

  await assert.rejects(() => migrationModule.up(queryInterface, Sequelize), /temporary index outage/);
  assert.equal(tableExists, true);
  assert.deepEqual(indexes, []);

  await migrationModule.up(queryInterface, Sequelize);
  assert.deepEqual(indexes, [
    'coach_intents_actor_request_key',
    'coach_intents_status_created_at',
    'coach_intents_operation_id',
  ]);
});

test('CoachIntent is registered in the central Sequelize model associations', () => {
  const associations = read('models/associations.mjs');
  assert.match(associations, /import\('\.\/CoachIntent\.mjs'\)/);
  assert.match(associations, /const CoachIntent = CoachIntentModule\.default/);
  assert.match(associations, /User\.hasMany\(CoachIntent/);
  assert.match(associations, /CoachIntent\.belongsTo\(User/);
});
