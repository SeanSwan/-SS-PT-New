import { describe, expect, it } from 'vitest';

import {
  buildWorkoutPlanCopyPayload,
  parseCopyDurationWeeks,
} from '../../services/workoutPlanRouteHelpers.mjs';

const sourcePlan = {
  id: 'source-plan-1',
  userId: 101,
  trainerId: 201,
  title: 'Runner Strength Block',
  description: 'Build durable legs and trunk strength.',
  nasmPhase: 2,
  durationWeeks: 4,
  planData: {
    weeks: [
      { week: 1, days: [{ day: 1, title: 'Lower Strength' }] },
      { week: 2, days: [{ day: 1, title: 'Upper Pull' }] },
      { week: 3, days: [{ day: 1, title: 'Power Endurance' }] },
      { week: 4, days: [{ day: 1, title: 'Deload' }] },
    ],
  },
  metadata: {
    isPrimaryPlan: true,
    primary: true,
    planPdf: { url: '/private/source.pdf' },
    sourceTag: 'coach-library',
  },
};

describe('workoutPlanRouteHelpers plan copy payload', () => {
  it('copies a source plan into another client with a draft status and source metadata', () => {
    const payload = buildWorkoutPlanCopyPayload({
      original: sourcePlan,
      trainerId: 301,
      targetClientId: 202,
      title: 'Swan Sean Bot - Runner Strength',
      durationWeeks: 4,
    });

    expect(payload).toMatchObject({
      userId: 202,
      trainerId: 301,
      title: 'Swan Sean Bot - Runner Strength',
      description: sourcePlan.description,
      nasmPhase: 2,
      durationWeeks: 4,
      status: 'draft',
      currentWeek: 1,
      currentDay: 1,
      progressNotes: [],
      createdBy: 'trainer',
    });
    expect(payload.planData).toEqual(sourcePlan.planData);
    expect(payload.planData).not.toBe(sourcePlan.planData);
    expect(payload.metadata).toMatchObject({
      sourceTag: 'coach-library',
      isPrimaryPlan: false,
      primary: false,
      duplicatedFrom: 'source-plan-1',
      copiedFromClientId: 101,
      targetClientId: 202,
      copyHorizonWeeks: 4,
    });
    expect(payload.metadata.planPdf).toBeUndefined();
  });

  it('uses same-client copy behavior when no target client is supplied', () => {
    const payload = buildWorkoutPlanCopyPayload({
      original: sourcePlan,
      trainerId: 301,
    });

    expect(payload.userId).toBe(101);
    expect(payload.title).toBe('Runner Strength Block (copy)');
    expect(payload.durationWeeks).toBe(4);
    expect(payload.metadata.targetClientId).toBe(101);
  });

  it('truncates copied week data when a shorter horizon is requested', () => {
    const payload = buildWorkoutPlanCopyPayload({
      original: sourcePlan,
      trainerId: 301,
      targetClientId: 202,
      durationWeeks: 2,
    });

    expect(payload.durationWeeks).toBe(2);
    expect(payload.planData.weeks).toHaveLength(2);
    expect(payload.planData.weeks.map((week) => week.week)).toEqual([1, 2]);
  });

  it('rejects copy horizons outside the one-year cap', () => {
    expect(parseCopyDurationWeeks(0)).toBeNull();
    expect(parseCopyDurationWeeks(53)).toBeNull();
    expect(parseCopyDurationWeeks('12')).toBe(12);
    expect(parseCopyDurationWeeks(52)).toBe(52);
  });
});
