/** Regression for externally supplied exercise keys in the pure progress helper.
 * Synthetic input only. Restore any pre-fix prototype side effect in finally.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachProgressEvidence } from '../../../../../backend/services/ai/coachProgressEvidence.mjs';
for (const key of ['__proto__', 'constructor']) test(`exercise key ${key} cannot mutate inherited objects`, () => {
  const target = key === '__proto__' ? Object.prototype : Object;
  const original = Object.getOwnPropertyDescriptor(target, 'kg');
  try {
    const result = buildCoachProgressEvidence({ sessions: [{ id: 'synthetic', status: 'completed', verified: true,
      exercises: [{ exerciseKey: key, unit: 'kg', sets: [{ reps: 2, load: 10 }] }],
    }] });
    assert.equal(Object.hasOwn(result.volumeByExercise, key), true);
    assert.equal(result.volumeByExercise[key].kg, 20);
    assert.equal(result.comparability[key], 'comparable');
    assert.deepEqual(Object.getOwnPropertyDescriptor(target, 'kg'), original);
  } finally {
    if (original) Object.defineProperty(target, 'kg', original);
    else delete target.kg;
  }
});
