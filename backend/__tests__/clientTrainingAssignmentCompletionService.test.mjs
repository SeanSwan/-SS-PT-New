import { describe, expect, it, vi } from 'vitest';
import {
  applyAssignmentCompletion,
  findPlannedAssignmentCompletionsForDate,
  readAssignmentCompletionContext,
} from '../services/clientTrainingAssignmentCompletionService.mjs';

describe('clientTrainingAssignmentCompletionService', () => {
  it('finds completion rows for the requested client and date', async () => {
    const findAll = vi.fn(async () => [
      {
        id: 'form-2',
        formData: JSON.stringify({
          plannedAssignment: { assignmentId: 'plan-2:w1:d1:planned_workout' },
        }),
        updatedAt: '2026-06-07T09:00:00.000Z',
      },
      {
        id: 'form-3',
        formData: {
          plannedAssignment: { assignmentKey: 'plan-2:w1:d2:planned_workout' },
        },
        submittedAt: '2026-06-07T10:00:00.000Z',
      },
    ]);

    const completions = await findPlannedAssignmentCompletionsForDate(
      { findAll },
      { clientId: 42, date: '2026-06-07' },
    );

    expect(findAll).toHaveBeenCalledWith({
      where: { clientId: 42, date: '2026-06-07' },
      attributes: ['id', 'formData', 'submittedAt', 'updatedAt'],
      order: [['submittedAt', 'DESC'], ['updatedAt', 'DESC']],
      limit: 20,
    });
    expect(completions).toMatchObject([
      {
        assignmentKey: 'plan-2:w1:d1:planned_workout',
        formId: 'form-2',
        completedAt: '2026-06-07T09:00:00.000Z',
      },
      {
        assignmentKey: 'plan-2:w1:d2:planned_workout',
        formId: 'form-3',
        completedAt: '2026-06-07T10:00:00.000Z',
      },
    ]);
  });

  it('falls back to ordered findOne when only the minimal model reader exists', async () => {
    const findOne = vi.fn(async () => ({
      id: 'form-4',
      formData: { plannedAssignment: { assignmentKey: 'plan-4:w1:d1:planned_workout' } },
      submittedAt: '2026-06-07T11:00:00.000Z',
    }));

    await expect(findPlannedAssignmentCompletionsForDate(
      { findOne },
      { clientId: 42, date: '2026-06-07' },
    )).resolves.toHaveLength(1);
    expect(findOne).toHaveBeenCalledWith({
      where: { clientId: 42, date: '2026-06-07' },
      attributes: ['id', 'formData', 'submittedAt', 'updatedAt'],
      order: [['submittedAt', 'DESC'], ['updatedAt', 'DESC']],
    });
  });

  it('fails closed when DailyWorkoutForm lookup is unavailable or errors', async () => {
    const onLookupError = vi.fn();
    const throwingModel = {
      findOne: vi.fn(async () => {
        throw new Error('lookup failed');
      }),
    };

    await expect(findPlannedAssignmentCompletionsForDate(null, {
      clientId: 42,
      date: '2026-06-07',
    })).resolves.toEqual([]);
    await expect(findPlannedAssignmentCompletionsForDate(throwingModel, {
      clientId: 42,
      date: '2026-06-07',
      onLookupError,
    })).resolves.toEqual([]);
    expect(onLookupError).toHaveBeenCalledTimes(1);
  });

  it('overlays matching completion data and safely ignores missing assignments', () => {
    expect(applyAssignmentCompletion(null, [])).toBeNull();
    const assignment = {
      assignmentKey: 'plan-9:w2:d3:homework',
      status: 'available',
      isLoggable: true,
      ctaLabel: 'Log Workout',
    };

    expect(applyAssignmentCompletion(assignment, [])).toBe(assignment);
    expect(applyAssignmentCompletion(assignment, [{
      assignmentId: 'plan-9:w2:d3:homework',
      id: 'form-9',
      submittedAt: '2026-06-07T12:30:00.000Z',
    }])).toMatchObject({
      status: 'completed',
      isLoggable: false,
      ctaLabel: 'Review Workout',
      completion: {
        source: 'daily_workout_form',
        formId: 'form-9',
        completedAt: '2026-06-07T12:30:00.000Z',
      },
    });
  });

  it('builds shared route completion context with recent-history fallback', async () => {
    const findAll = vi.fn(async (query) => (
      query.where.date
        ? [{
          id: 'today-form',
          formData: {
            plannedAssignment: { assignmentKey: 'plan-9:w2:d3:homework' },
          },
          submittedAt: '2026-06-07T12:30:00.000Z',
        }]
        : []
    ));

    const context = await readAssignmentCompletionContext(
      { findAll },
      { clientId: 42, date: '2026-06-07' },
    );

    expect(findAll).toHaveBeenCalledTimes(2);
    expect(context.assignmentCompletions).toHaveLength(1);
    expect(context.recentAssignmentCompletions).toEqual(context.assignmentCompletions);
  });
});
