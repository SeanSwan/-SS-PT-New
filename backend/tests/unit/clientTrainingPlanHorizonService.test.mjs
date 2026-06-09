/**
 * Client training plan horizon regressions.
 *
 * Locks the Plan Vault horizon vocabulary shared by workout-plan save paths,
 * client training read models, and trainer/admin reload surfaces.
 */

import { describe, expect, it } from 'vitest';
import { buildClientTrainingOverview } from '../../services/clientTrainingReadModelService.mjs';
import { normalizePlanHorizonKey } from '../../services/clientTrainingPlanHorizonService.mjs';

describe('client training plan horizon service', () => {
  it('keeps legacy single-workout presets in the 1 Day plan vault slot', () => {
    expect(normalizePlanHorizonKey('single')).toBe('one_day');

    const overview = buildClientTrainingOverview({
      plans: [{
        id: 'plan-1d',
        title: 'Single Session Reset',
        status: 'draft',
        durationWeeks: 1,
        metadata: {
          durationPreset: 'single',
        },
      }],
    });

    const oneDaySlot = overview.trainingPlanCatalog.slots.find(
      (slot) => slot.horizonKey === 'one_day',
    );
    const oneWeekSlot = overview.trainingPlanCatalog.slots.find(
      (slot) => slot.horizonKey === 'one_week',
    );

    expect(oneDaySlot).toMatchObject({
      isFilled: true,
      plan: { id: 'plan-1d' },
    });
    expect(oneWeekSlot).toMatchObject({ isFilled: false, plan: null });
  });
});
