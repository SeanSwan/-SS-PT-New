/**
 * PLAN ACCEPTANCE: R-P01 / T-P01 and T-P02. Intentional RED, separately invoked.
 * Calls the real current-main request builder with synthetic inputs. No I/O.
 * These assertions freeze desired behavior; they are not application implementation.
 */
import { expect, it } from 'vitest';
import { buildWorkoutGenerationRequest } from '../../../../frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerGenerationActions.helpers';
const fixture = {
  selectedClientId: 424242, category: 'full_body', goal: 'general_fitness',
  phaseNumber: 2, selectedEquipmentProfileId: null,
  trainingIntensityMode: 'base', hardcoreMethod: 'standard',
} as const;
it('T-P01 preserves a chosen exercise count in the real generation request', () => {
  const selected = { ...fixture, exerciseCount: 8 };
  expect(buildWorkoutGenerationRequest(selected).exerciseCount).toBe(8);
});
it('T-P02 preserves a chosen rotation policy in the real generation request', () => {
  const selected = { ...fixture, rotationPattern: 'conservative' };
  expect(buildWorkoutGenerationRequest(selected).rotationPattern).toBe('conservative');
});
