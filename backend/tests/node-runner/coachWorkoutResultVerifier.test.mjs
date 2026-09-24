import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachWorkoutFootprint, verifyCoachWorkoutReadback } from '../../services/ai/coachWorkoutResultVerifier.mjs';

const expected = {
  actorId: 7,
  targetClientId: 42,
  date: '2026-09-04',
  dailyFormId: 101,
  sessionId: 'session-1',
  version: 3,
  exercises: [{
    exerciseId: 9,
    unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, load: 135 }, { setNumber: 2, reps: 8, load: 135 }],
  }],
};

const observed = {
  actorId: 7,
  targetClientId: 42,
  date: '2026-09-04',
  dailyFormId: 101,
  sessionId: 'session-1',
  version: 3,
  exercises: [{
    exerciseId: 9,
    unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, load: 135 }, { setNumber: 2, reps: 8, load: 135 }],
  }],
};

test('verifies matching workout IDs, ownership, date, units, sets, and version', () => {
  const result = verifyCoachWorkoutReadback({ expected, observed });
  assert.equal(result.status, 'verified');
  assert.equal(result.reasonCode, null);
  assert.deepEqual(result.recordRefs, [
    { kind: 'daily_workout_form', id: '101', version: 3 },
    { kind: 'workout_session', id: 'session-1', version: 3 },
  ]);
  assert.equal(result.realAffectedCount, 2);
});

test('keeps a committed write unverified when read-back is unavailable', () => {
  const result = verifyCoachWorkoutReadback({ expected, observed: null });
  assert.deepEqual(result, {
    status: 'committed_unverified',
    reasonCode: 'READBACK_UNAVAILABLE',
    recordRefs: [],
    realAffectedCount: null,
  });
});

test('returns unknown when the read-back points at another client or date', () => {
  const result = verifyCoachWorkoutReadback({
    expected,
    observed: { ...observed, targetClientId: 43, date: '2026-09-05' },
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reasonCode, 'READBACK_MISMATCH');
  assert.equal(result.realAffectedCount, null);
});

test('returns unknown when an exercise identity, unit, or set value changes', () => {
  const result = verifyCoachWorkoutReadback({
    expected,
    observed: {
      ...observed,
      exercises: [{
        exerciseId: 10,
        unit: 'kg',
        sets: [{ setNumber: 1, reps: 8, load: 135 }, { setNumber: 2, reps: 7, load: 135 }],
      }],
    },
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reasonCode, 'READBACK_MISMATCH');
});

test('returns unknown when the read-back version differs from the expected write version', () => {
  const result = verifyCoachWorkoutReadback({
    expected,
    observed: { ...observed, version: 99 },
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reasonCode, 'READBACK_MISMATCH');
});

test('refuses a malformed expected footprint instead of treating missing data as zero', () => {
  const result = verifyCoachWorkoutReadback({ expected: { ...expected, exercises: [] }, observed });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reasonCode, 'EXPECTED_FOOTPRINT_INVALID');
});

test('builds a proof footprint from the server-normalized workout, never from display names', () => {
  const footprint = buildCoachWorkoutFootprint({
    actorId: 7,
    targetClientId: 42,
    date: '2026-09-04',
    dailyFormId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
    exercises: [{
      exerciseName: 'Display Name Must Not Be Hashed',
      exerciseKey: 'bench_press',
      exerciseInstanceId: 'instance-1',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 8, weight: 135, notes: 'free text excluded' }],
    }],
  });

  assert.deepEqual(footprint, {
    schemaVersion: 2,
    actorId: 7,
    targetClientId: 42,
    date: '2026-09-04',
    dailyFormId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
    exercises: [{
      exerciseKey: 'bench_press',
      exerciseInstanceId: 'instance-1',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 8, load: 135 }],
    }],
  });
});

test('every provided canonical identifier must be valid even with a valid alternate key', () => {
  for (const malformed of [true, false, null, undefined, NaN, 0, -1, {}, [], '']) {
    for (const field of ['exerciseId', 'exerciseKey']) {
      const exercise = { exerciseId: 29, exerciseKey: 'row', exerciseInstanceId: 'one', unit: 'lb',
        sets: [{ setNumber: 1, reps: 8, load: 40 }], [field]: malformed };
      assert.equal(buildCoachWorkoutFootprint({
        actorId: 7, targetClientId: 42, date: '2026-09-06',
        dailyFormId: '11111111-1111-4111-8111-111111111111',
        sessionId: '22222222-2222-4222-8222-222222222222', exercises: [exercise],
      }), null);
    }
  }
});
