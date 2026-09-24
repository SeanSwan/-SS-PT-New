/** Real PostgreSQL keyset/scan-budget proof using the actual CoachIntent model.
 * Synthetic rows only, disposable DB loader required. Assignment reader is
 * injected; the separate HTTP gate exercises actual assignment middleware.
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import Sequelize from 'sequelize';
import sequelize from '../helpers/coachTestDatabase.mjs';
import CoachIntent from '../../models/CoachIntent.mjs';
import v1 from '../../migrations/20260904000000-create-coach-intents.cjs';
import v2 from '../../migrations/20260906000000-coach-intent-lifecycle-v2.cjs';
import { listCoachIntents } from '../../services/ai/coachIntentListing.mjs';
process.env.OPERATION_SIGNING_KEY = 'synthetic-coach-list-postgres-key-0123456789';
before(async () => {
  await sequelize.authenticate();
  await v1.up(sequelize.getQueryInterface(), Sequelize);
  await v2.up(sequelize.getQueryInterface(), Sequelize);
});
after(async () => { await sequelize.close(); });
const seed = (actorId, targetClientId, createdAt) => ({
  actorId, targetClientId, createdAt, updatedAt: createdAt, requestKey: randomUUID(),
  requestHash: 'a'.repeat(64), commandType: 'log_workout', status: 'unknown',
});

test('500 denied rows return opaque continuation and the next page reaches older accessible rows', async () => {
  const actorId = randomInt(100000, 2000000000);
  const createdAt = new Date('2026-09-01T20:00:00Z');
  await CoachIntent.bulkCreate(Array.from({ length: 501 }, (_, index) =>
    seed(actorId, 9202, new Date(+createdAt - index * 1000))));
  const older = await CoachIntent.create(seed(actorId, 9201, new Date(+createdAt - 600000)));
  let queries = 0, assignmentBatches = 0;
  const model = { findAll: args => {
    queries += 1; assert.ok(args.limit <= 50);
    return CoachIntent.findAll(args);
  } };
  const input = { model, user: { id: actorId, role: 'trainer' }, limit: 2,
    readAssignedClientIds: async (id, candidates) => {
      assignmentBatches += 1;
      assert.equal(id, actorId); assert.ok(candidates.length <= 50);
      return candidates.filter(candidate => candidate === 9201);
    } };
  const first = await listCoachIntents(input);
  assert.deepEqual(first.intents, []);
  assert.ok(first.nextCursor);
  assert.equal(queries, 10);
  assert.equal(assignmentBatches, 10);
  queries = 0;
  const second = await listCoachIntents({ ...input, cursor: first.nextCursor });
  assert.deepEqual(second.intents.map(row => row.id), [older.id]);
  assert.equal(second.nextCursor, null);
  assert.equal(queries, 1);
  const revoked = await listCoachIntents({ ...input, cursor: first.nextCursor, readAssignedClientIds: async () => [] });
  assert.deepEqual(revoked.intents, []);
  assert.equal(revoked.nextCursor, null);
});

test('real UUID tie ordering preserves every readable lookahead without duplicates', async () => {
  const actorId = randomInt(100000, 2000000000);
  const date = new Date('2026-09-02T20:00:00Z');
  await CoachIntent.bulkCreate(Array.from({ length: 137 }, (_, index) =>
    seed(actorId, index % 3 === 0 ? 9202 : 9201, date)));
  const expected = await CoachIntent.findAll({ where: { actorId, targetClientId: 9201 },
    order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  let cursor, pages = 0;
  const seen = [];
  do {
    const page = await listCoachIntents({ model: CoachIntent, user: { id: actorId, role: 'trainer' },
      limit: 7, cursor, readAssignedClientIds: async () => [9201] });
    seen.push(...page.intents.map(row => row.id));
    cursor = page.nextCursor || undefined;
    assert.ok(++pages < 30, 'Pagination must terminate');
  } while (cursor);
  assert.deepEqual(seen, expected.map(row => row.id));
  assert.equal(new Set(seen).size, seen.length);
});
