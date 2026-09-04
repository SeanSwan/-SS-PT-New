import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationModule = (await import('../../migrations/20260904000000-create-coach-intents.cjs')).default;

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('CoachIntent model is a PII-free mutable receipt with an actor/request uniqueness boundary', () => {
  const model = read('models/CoachIntent.mjs');
  for (const field of ['actorId', 'requestKey', 'requestHash', 'commandType', 'targetClientId', 'status', 'operationId', 'proposalId', 'result', 'errorCode', 'expiresAt', 'completedAt']) {
    assert.match(model, new RegExp(`\\b${field}\\s*:`), `missing model field ${field}`);
  }
  assert.match(model, /unique:\s*true,\s*fields:\s*\['actorId',\s*'requestKey'\]/);
  assert.doesNotMatch(model, /prompt|firstName|lastName/i);
});

test('CoachIntent migration is additive and creates the uniqueness/index contract', () => {
  const migration = read('migrations/20260904000000-create-coach-intents.cjs');
  assert.match(migration, /createTable\('coach_intents'/);
  assert.match(migration, /addIndex\('coach_intents', \['actorId', 'requestKey'\], \{ unique: true/);
  assert.match(migration, /Durable receipts are the reconciliation record/);
});

test('CoachIntent migration creates the table for Sequelize missing-table errors and preserves it on rollback', async () => {
  const createTable = async () => {};
  const addIndex = async () => {};
  const queryInterface = {
    describeTable: async () => { throw new Error('No description found for "coach_intents" table'); },
    createTable,
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

test('CoachIntent is registered in the central Sequelize model associations', () => {
  const associations = read('models/associations.mjs');
  assert.match(associations, /import\('\.\/CoachIntent\.mjs'\)/);
  assert.match(associations, /const CoachIntent = CoachIntentModule\.default/);
  assert.match(associations, /User\.hasMany\(CoachIntent/);
  assert.match(associations, /CoachIntent\.belongsTo\(User/);
});
