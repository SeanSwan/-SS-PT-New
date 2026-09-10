/** Hostile read-back value checks against the real pure verifier. No DB/provider.
 * Missing values must never equal explicit zero after JavaScript coercion.
 * Legacy record-reference compatibility remains separate from real DB integration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCoachWorkoutReadback } from '../../../../../backend/services/ai/coachWorkoutResultVerifier.mjs';
const fixture = () => ({ actorId: 1, targetClientId: 2, date: '2026-09-06',
  dailyFormId: '123e4567-e89b-42d3-a456-426614174000', sessionId: 'legacy-session', version: 1,
  exercises: [{ exerciseId: 'bench', unit: 'lb', sets: [{ setNumber: 1, reps: 0, load: 0 }] }],
});
for (const [name, mutate] of [
  ['null repetitions', f => { f.exercises[0].sets[0].reps = null; }],
  ['blank repetitions', f => { f.exercises[0].sets[0].reps = ''; }],
  ['boolean repetitions', f => { f.exercises[0].sets[0].reps = false; }],
  ['null weight', f => { delete f.exercises[0].sets[0].load; f.exercises[0].sets[0].weight = null; }],
  ['blank load', f => { f.exercises[0].sets[0].load = ''; }],
  ['boolean actor', f => { f.actorId = true; }],
]) test(`${name} cannot masquerade as a valid observed value`, () => {
  const expected = fixture(), observed = fixture(); mutate(observed);
  assert.equal(verifyCoachWorkoutReadback({ expected, observed }).status, 'unknown');
});
for (const [name, mutate] of [
  ['fractional repetitions', f => { f.exercises[0].sets[0].reps = 1.5; }],
  ['unsupported unit', f => { f.exercises[0].unit = 'unknown'; }],
  ['impossible date', f => { f.date = '2026-02-31'; }],
  ['object exercise identity', f => { f.exercises[0].exerciseId = {}; }],
  ['conflicting load aliases', f => { f.exercises[0].sets[0].weight = 5; }],
]) test(`matching ${name} is invalid even in both footprints`, () => {
  const expected = fixture(); mutate(expected);
  assert.equal(verifyCoachWorkoutReadback({ expected, observed: structuredClone(expected) }).status, 'unknown');
});
test('explicit numeric zero remains valid', () => {
  const expected = fixture();
  assert.equal(verifyCoachWorkoutReadback({ expected, observed: structuredClone(expected) }).status, 'verified');
});
