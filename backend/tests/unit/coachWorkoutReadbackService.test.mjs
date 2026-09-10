import test from 'node:test';
import assert from 'node:assert/strict';
import { readCoachWorkoutFootprint } from '../../services/workout/coachWorkoutReadbackService.mjs';

const footprint = {
  schemaVersion: 2,
  actorId: 7,
  targetClientId: 42,
  date: '2026-09-06',
  dailyFormId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  exercises: [{
    exerciseKey: 'bench_press',
    exerciseInstanceId: 'bench-1',
    unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, load: 135 }],
  }],
};

function modelsWith({ logs = [{ id: 1, sessionId: footprint.sessionId, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weight: 135 }] } = {}) {
  const sequelize = { transaction: async (options, callback) => callback({ id: 'snapshot' }), query: async () => [] };
  return {
    sequelize,
    DailyWorkoutForm: {
      sequelize,
      findByPk: async () => ({
        id: footprint.dailyFormId, sessionId: footprint.sessionId, clientId: 42, trainerId: 7, date: '2026-09-06',
        formData: { exercises: [{ exerciseName: 'Bench Press', exerciseKey: 'bench_press', exerciseInstanceId: 'bench-1', unit: 'lb', sets: [{ setNumber: 1, reps: 8, weight: 135 }] }] },
      }),
    },
    WorkoutSession: {
      sequelize,
      findByPk: async () => ({ id: footprint.sessionId, userId: 42, trainerId: 7, date: new Date('2026-09-06T00:00:00.000Z') }),
    },
    WorkoutLog: {
      sequelize,
      findAll: async () => logs,
    },
  };
}

test('readback constructs an observed footprint from persisted form/session/log rows', async () => {
  const result = await readCoachWorkoutFootprint({
    models: modelsWith(),
    footprint,
    intentId: 'intent-1',
    requestHash: 'request-hash',
    proposalId: 'proposal-1',
    committedAt: '2026-09-06T12:00:00.000Z',
  });

  assert.equal(result.found, true);
  assert.equal(result.intentId, 'intent-1');
  assert.equal(result.requestHash, 'request-hash');
  assert.equal(result.proposalId, 'proposal-1');
  assert.equal(Object.hasOwn(result, 'expected'), false);
  assert.equal(Object.hasOwn(result, 'committedAt'), false);
  assert.deepEqual(result.observed, footprint);
});

test('legacy adapter requests cannot bypass the v2 schema and snapshot boundary', async () => {
  const legacy = { ...footprint, dailyFormId: '101', sessionId: 'session-1', version: 1 };
  delete legacy.schemaVersion;
  const models = modelsWith();
  let reads = 0;
  models.DailyWorkoutForm.findByPk = async () => { reads++; return {}; };
  const result = await readCoachWorkoutFootprint({ models, footprint: legacy });
  assert.equal(result.found, false); assert.equal(reads, 0);
});

test('readback refuses missing or changed log rows instead of certifying form metadata alone', async () => {
  const result = await readCoachWorkoutFootprint({
    models: modelsWith({ logs: [] }),
    footprint,
    intentId: 'intent-1',
    requestHash: 'request-hash',
    proposalId: 'proposal-1',
  });

  assert.equal(result.found, true);
  assert.equal(result.observed, null);
});
