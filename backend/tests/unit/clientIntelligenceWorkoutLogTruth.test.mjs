import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

import {
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
          { exerciseName: 'Bench Press', formRating: 7 },
          { exerciseName: 'Goblet Squat', formRating: 8 },
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
            { exerciseName: 'Bench Press', formRating: 7 },
            { exerciseName: 'Goblet Squat', formRating: 8 },
          ],
        },
      },
    ]);
  });
});
