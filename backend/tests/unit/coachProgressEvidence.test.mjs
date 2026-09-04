/**
 * SCU S8a — verified progress evidence tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachProgressEvidence } from '../../services/ai/coachProgressEvidence.mjs';

const SESSIONS = [
  {
    id: 'session-1', date: '2026-08-01', status: 'completed', verified: true,
    exercises: [{ exerciseKey: 'squat', unit: 'lb', sets: [{ reps: 5, load: 100 }, { reps: 5, load: 110 }] }],
  },
  {
    id: 'session-2', date: '2026-08-08', status: 'completed', verified: true,
    exercises: [{ exerciseKey: 'squat', unit: 'lb', sets: [{ reps: 5, load: 120 }] }],
  },
  {
    id: 'session-void', date: '2026-08-09', status: 'completed', verified: true, voided: true,
    exercises: [{ exerciseKey: 'squat', unit: 'lb', sets: [{ reps: 20, load: 999 }] }],
  },
  {
    id: 'session-unverified', date: '2026-08-10', status: 'completed', verified: false,
    exercises: [{ exerciseKey: 'squat', unit: 'lb', sets: [{ reps: 20, load: 999 }] }],
  },
];

test('counts only verified, completed, non-voided sessions and returns record refs', () => {
  const result = buildCoachProgressEvidence({ sessions: SESSIONS, scheduledCount: 3 });
  assert.equal(result.status, 'verified');
  assert.equal(result.completedSessionCount, 2);
  assert.equal(result.volumeByExercise.squat.lb, 1650);
  assert.deepEqual(result.recordRefs, ['session-1', 'session-2']);
  assert.deepEqual(result.adherence, { scheduledCount: 3, completedCount: 2, rate: 2 / 3 });
});

test('keeps incompatible units in separate evidence buckets', () => {
  const result = buildCoachProgressEvidence({
    sessions: [{
      id: 'session-3', date: '2026-08-15', status: 'completed', verified: true,
      exercises: [{ exerciseKey: 'squat', unit: 'kg', sets: [{ reps: 5, load: 50 }] }],
    }, ...SESSIONS],
  });
  assert.equal(result.volumeByExercise.squat.lb, 1650);
  assert.equal(result.volumeByExercise.squat.kg, 250);
  assert.equal(result.comparability.squat, 'mixed_units');
});

test('returns unavailable instead of an invented zero when no verified source exists', () => {
  const result = buildCoachProgressEvidence({
    sessions: [{ id: 'pending', status: 'completed', verified: false, exercises: [] }],
  });
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.missingInputs, ['verified_workout_records']);
  assert.equal(result.completedSessionCount, 0);
});
