// @vitest-environment node
/**
 * Pure-logic tests for the UserDashboard V3 workout transformer.
 * Node environment (no jsdom) — these exercise data derivation only.
 */
import { describe, it, expect } from 'vitest';
import { transformWorkoutLogs } from './WorkoutsTabTransformers';

describe('transformWorkoutLogs — honest "Other" bucket (Δ1 data-truth)', () => {
  it('preserves uncategorized exercises under "Other" instead of mislabeling them Core', () => {
    const result = transformWorkoutLogs([
      { logs: [{ exerciseName: 'Mystery Movement' }, { exerciseName: 'Plank' }] },
    ]);

    const other = result.find((category) => category.key === 'Other');
    const core = result.find((category) => category.key === 'Core');

    // The uncategorized movement lands in an honest Other bucket, not Core.
    expect(other?.exercises).toContainEqual({ name: 'Mystery Movement', count: 1 });
    expect(core?.exercises ?? []).not.toContainEqual({ name: 'Mystery Movement', count: 1 });

    // Regression: a genuinely-core movement still lands in Core.
    expect(core?.exercises).toContainEqual({ name: 'Plank', count: 1 });
  });

  it('keeps recognized movements in their real muscle group', () => {
    const result = transformWorkoutLogs([
      { logs: [{ exerciseName: 'Barbell Squat' }, { exerciseName: 'Barbell Bench Press' }] },
    ]);

    expect(result.find((category) => category.key === 'Legs')?.exercises).toContainEqual({
      name: 'Barbell Squat',
      count: 1,
    });
    expect(result.find((category) => category.key === 'Chest')?.exercises).toContainEqual({
      name: 'Barbell Bench Press',
      count: 1,
    });
  });
});
