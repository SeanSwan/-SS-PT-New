import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

import {
  buildClientWorkoutSummary,
  fetchRecentWorkoutLogSummaries,
} from '../../services/clientIntelligenceService.mjs';

describe('clientIntelligenceService recent workout truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('builds recent workout summaries from workout_logs joined to workout_sessions', async () => {
    querySpy.mockResolvedValueOnce([
      {
        id: 'session-1',
        date: '2026-05-20T12:00:00.000Z',
        overallIntensity: 8,
        exercises: [
          { exerciseName: 'Bench Press', rpe: 7 },
          { exerciseName: 'Goblet Squat', rpe: 8 },
        ],
      },
    ]);

    const result = await fetchRecentWorkoutLogSummaries(42, new Date('2026-05-01T00:00:00.000Z'));

    expect(querySpy).toHaveBeenCalledTimes(1);
    const [sql, options] = querySpy.mock.calls[0];
    expect(sql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(sql).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(sql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/i);
    expect(sql).toMatch(/ws\."userId"\s*=\s*:clientId/i);
    expect(sql).toMatch(/ws\.status\s*=\s*'completed'/i);
    expect(sql).toMatch(/'rpe',\s*wl\.rpe/i);
    expect(sql).not.toMatch(/'formRating',\s*wl\.rpe/i);
    expect(sql).not.toMatch(/daily_workout_forms/i);
    expect(sql).not.toMatch(/formData/i);
    expect(options.replacements).toMatchObject({ clientId: 42, limit: 14 });
    expect(result).toEqual([
      {
        id: 'session-1',
        date: '2026-05-20T12:00:00.000Z',
        formData: {
          overallIntensity: 8,
          exercises: [
            { exerciseName: 'Bench Press', formRating: null, rpe: 7 },
            { exerciseName: 'Goblet Squat', formRating: null, rpe: 8 },
          ],
        },
      },
    ]);
  });

  it('keeps unrated workout logs null-honest for AI context', async () => {
    querySpy.mockResolvedValueOnce([
      {
        id: 'session-2',
        date: '2026-05-21T12:00:00.000Z',
        overallIntensity: null,
        exercises: [
          { exerciseName: 'Deadlift', rpe: null },
          { exerciseName: 'Carry', rpe: undefined },
        ],
      },
    ]);

    const result = await fetchRecentWorkoutLogSummaries(42, new Date('2026-05-01T00:00:00.000Z'));

    expect(result).toEqual([
      {
        id: 'session-2',
        date: '2026-05-21T12:00:00.000Z',
        formData: {
          overallIntensity: null,
          exercises: [
            { exerciseName: 'Deadlift', formRating: null, rpe: null },
            { exerciseName: 'Carry', formRating: null, rpe: null },
          ],
        },
      },
    ]);
  });

  it('summarizes recent workouts without inventing form or intensity averages', () => {
    const summary = buildClientWorkoutSummary([
      {
        formData: {
          overallIntensity: null,
          exercises: [
            { exerciseName: 'Deadlift', formRating: null },
            { exerciseName: 'Carry' },
          ],
        },
      },
    ]);

    expect(summary).toMatchObject({
      sessionsLast2Weeks: 1,
      recentExercises: ['Deadlift', 'Carry'],
      avgFormRating: null,
      avgIntensity: null,
    });
  });
});
