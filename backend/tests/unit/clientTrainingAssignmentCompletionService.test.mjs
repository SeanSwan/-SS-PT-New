import { describe, expect, it, vi } from 'vitest';

import { findRecentPlannedAssignmentCompletions } from '../../services/clientTrainingAssignmentCompletionService.mjs';

const hasNeedle = (value, needle) => {
  if (value == null) return false;
  if (typeof value === 'string') return value.includes(needle);
  if (typeof value !== 'object') return false;

  const entries = [
    ...Object.getOwnPropertyNames(value).map((key) => value[key]),
    ...Object.getOwnPropertySymbols(value).map((key) => value[key]),
  ];
  return entries.some((entry) => hasNeedle(entry, needle));
};

const plannedForm = {
  id: 'planned-hidden',
  date: '2026-06-08',
  formData: {
    plannedAssignment: {
      assignmentKey: 'plan-12m:w6:d2:homework',
      assignmentType: 'homework',
      title: 'Week 6 Day 2',
      weekNumber: 6,
      dayNumber: 2,
      exerciseCount: 5,
      firstExerciseName: 'Goblet Squat',
    },
  },
  submittedAt: '2026-06-08T12:00:00.000Z',
};

const ordinaryForm = {
  id: 'ordinary-latest',
  date: '2026-06-09',
  formData: {
    exercises: [{ name: 'Push Up' }],
  },
  submittedAt: '2026-06-09T12:00:00.000Z',
};

describe('clientTrainingAssignmentCompletionService', () => {
  it('filters recent workout forms to planned assignments before applying the recent limit', async () => {
    const findAll = vi.fn(async (query) => (
      hasNeedle(query?.where, 'plannedAssignment')
        ? [plannedForm]
        : [ordinaryForm]
    ));

    const completions = await findRecentPlannedAssignmentCompletions(
      { findAll },
      { clientId: 42, limit: 1 },
    );

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.any(Object),
      limit: 1,
    }));
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({
      assignmentKey: 'plan-12m:w6:d2:homework',
      formId: 'planned-hidden',
      weekNumber: 6,
      dayNumber: 2,
    });
  });
});
