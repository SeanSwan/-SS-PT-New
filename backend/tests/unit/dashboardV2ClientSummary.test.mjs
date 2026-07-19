/**
 * Regression coverage for client dashboard weekly adherence.
 *
 * The percentage and seven-cell plan strip describe the same calendar week;
 * sessions in later weeks must not dilute the current week's adherence.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import Session from '../../models/Session.mjs';
import WorkoutSession from '../../models/WorkoutSession.mjs';
import UserAchievement from '../../models/UserAchievement.mjs';
import { getDashboardSummary } from '../../services/dashboardV2Service.mjs';

describe('dashboard v2 client summary', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('bounds weekly adherence to the same seven-day calendar week as planWeek', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T16:00:00.000Z'));

    vi.spyOn(Session, 'count').mockResolvedValue(2);
    vi.spyOn(WorkoutSession, 'findAll').mockResolvedValue([]);
    vi.spyOn(WorkoutSession, 'count').mockResolvedValue(0);
    vi.spyOn(UserAchievement, 'findAll').mockResolvedValue([]);

    await getDashboardSummary({
      role: 'client',
      userId: 12,
      finance: false,
    });

    const scheduledWhere = Session.count.mock.calls[0][0].where;
    const lower = scheduledWhere.sessionDate[Op.gte];
    const upper = scheduledWhere.sessionDate[Op.lt];

    expect(scheduledWhere.status[Op.in]).toEqual([
      'scheduled', 'confirmed', 'completed',
    ]);
    expect(lower).toBeInstanceOf(Date);
    expect(upper).toBeInstanceOf(Date);
    expect(upper.getTime() - lower.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(lower.getTime()).toBeLessThanOrEqual(Date.now());
    expect(upper.getTime()).toBeGreaterThan(Date.now());
  });
});
