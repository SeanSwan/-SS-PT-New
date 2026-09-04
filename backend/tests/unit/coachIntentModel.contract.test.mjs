import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  assert.match(migration, /dropTable\('coach_intents'\)/);
});

test('CoachIntent is registered in the central Sequelize model associations', () => {
  const associations = read('models/associations.mjs');
  assert.match(associations, /import\('\.\/CoachIntent\.mjs'\)/);
  assert.match(associations, /const CoachIntent = CoachIntentModule\.default/);
  assert.match(associations, /User\.hasMany\(CoachIntent/);
  assert.match(associations, /CoachIntent\.belongsTo\(User/);
});
