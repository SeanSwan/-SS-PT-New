/** SCU strict payload contract tests; synthetic data, no application boot. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiExercises } from '../../../../../backend/services/workout/aiWorkoutDailyFormPayloadService.mjs';
const options = { policy: 'coach_verified_v1' };
const row = () => ({ exerciseId: 'exercise-1', exerciseKey: 'bench',
  exerciseInstanceId: 'slot-1', exerciseName: 'Synthetic bench', unit: 'lb',
  sets: [{ setNumber: 1, reps: 8, weight: 135 }] });
const cases = [
  ['missing canonical identity', (e) => { delete e.exerciseId; delete e.exerciseKey; }, 'WORKOUT_EXERCISE_ID_REQUIRED'],
  ['missing unit', (e) => { delete e.unit; }, 'WORKOUT_UNIT_REQUIRED'],
  ['unrecognized unit', (e) => { e.unit = 'stone'; }, 'WORKOUT_UNIT_REQUIRED'],
  ['missing load', (e) => { delete e.sets[0].weight; }, 'WORKOUT_LOAD_INVALID'],
  ['null load', (e) => { e.sets[0].weight = null; }, 'WORKOUT_LOAD_INVALID'],
  ['boolean load', (e) => { e.sets[0].weight = false; }, 'WORKOUT_LOAD_INVALID'],
  ['infinite load', (e) => { e.sets[0].weight = Infinity; }, 'WORKOUT_LOAD_INVALID'],
  ['conflicting load aliases', (e) => { e.sets[0].load = 60; }, 'WORKOUT_LOAD_INVALID'],
  ['missing reps', (e) => { delete e.sets[0].reps; }, 'WORKOUT_REPS_INVALID'],
  ['range reps', (e) => { e.sets[0].reps = '8-12'; }, 'WORKOUT_REPS_INVALID'],
  ['duplicate set ordinal', (e) => { e.sets.push({ ...e.sets[0] }); }, 'WORKOUT_SET_ORDER_INVALID'],
];
for (const [label, mutate, code] of cases) test('strict rejects ' + label, () => {
  const data = row(); mutate(data);
  assert.throws(() => normalizeAiExercises([data], options), (error) => error.code === code);
});
test('strict accepts explicit bodyweight zero and does not mutate source', () => {
  const data = row(); data.unit = 'bodyweight'; data.sets[0].weight = 0;
  const copy = structuredClone(data);
  const [out] = normalizeAiExercises([data], options);
  assert.equal(out.unit, 'bodyweight'); assert.equal(out.sets[0].weight, 0);
  assert.deepEqual(data, copy);
});
test('legacy mode retains existing range and missing-load behavior', () => {
  const data = row(); data.sets[0] = { reps: '8-12' };
  const [out] = normalizeAiExercises([data]);
  assert.equal(out.sets[0].reps, 8); assert.equal(out.sets[0].weight, 0);
});
