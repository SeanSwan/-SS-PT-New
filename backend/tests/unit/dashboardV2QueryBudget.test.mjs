/**
 * Regression coverage for Dashboard V2 query budgets.
 *
 * KIMI-DASHBOARDS-CORRECTED §6.2 caps each role summary at six queries.
 * Seven per-day count calls turn one chart into an N+1 and violate that contract.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import Session from '../../models/Session.mjs';
import User from '../../models/User.mjs';
import WorkoutSession from '../../models/WorkoutSession.mjs';
import UserAchievement from '../../models/UserAchievement.mjs';
import { getDashboardSummary } from '../../services/dashboardV2Service.mjs';

describe('dashboard v2 query budgets', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the admin session projections from one bounded session read', async () => {
    vi.spyOn(User, 'count').mockResolvedValue(0);
    vi.spyOn(Session, 'count').mockResolvedValue(0);
    vi.spyOn(Session, 'findAll').mockResolvedValue([]);
    vi.spyOn(WorkoutSession, 'count').mockResolvedValue(0);

    await getDashboardSummary({ role: 'admin', finance: false });

    expect(Session.findAll).toHaveBeenCalledTimes(1);
    expect(Session.count).not.toHaveBeenCalled();
    expect(Session.findAll.mock.calls[0][0].where.status[Op.in]).toEqual([
      'scheduled',
      'confirmed',
      'completed',
    ]);
  });

  it('does not issue one trainer session count per chart day', async () => {
    vi.spyOn(Session, 'findAll').mockResolvedValue([]);
    vi.spyOn(Session, 'count').mockResolvedValue(0);

    await getDashboardSummary({ role: 'trainer', userId: 7, finance: false });

    expect(Session.findAll).toHaveBeenCalledTimes(2);
    expect(Session.count).not.toHaveBeenCalled();
  });

  it('reuses one bounded workout read for the client plan and progress chart', async () => {
    vi.spyOn(Session, 'count').mockResolvedValue(0);
    vi.spyOn(WorkoutSession, 'findAll').mockResolvedValue([]);
    vi.spyOn(WorkoutSession, 'count').mockResolvedValue(0);
    vi.spyOn(UserAchievement, 'findAll').mockResolvedValue([]);

    await getDashboardSummary({ role: 'client', userId: 12, finance: false });

    expect(WorkoutSession.findAll).toHaveBeenCalledTimes(1);
    expect(WorkoutSession.count).not.toHaveBeenCalled();
  });

  it('keeps user workout stats plus progress to three workout queries', async () => {
    vi.spyOn(WorkoutSession, 'count').mockResolvedValue(0);
    vi.spyOn(WorkoutSession, 'findAll').mockResolvedValue([]);
    vi.spyOn(UserAchievement, 'findAll').mockResolvedValue([]);

    await getDashboardSummary({ role: 'user', userId: 12, finance: false });

    expect(WorkoutSession.count).toHaveBeenCalledTimes(2);
    expect(WorkoutSession.findAll).toHaveBeenCalledTimes(1);
  });

  it('projects real booked-session adherence for each trainer roster row', async () => {
    const sessionDate = new Date();
    vi.spyOn(Session, 'findAll')
      .mockResolvedValueOnce([
        {
          id: 1,
          userId: 42,
          trainerId: 7,
          sessionDate,
          duration: 60,
          status: 'completed',
          attendanceStatus: 'present',
        },
        {
          id: 2,
          userId: 42,
          trainerId: 7,
          sessionDate,
          duration: 60,
          status: 'scheduled',
          attendanceStatus: null,
        },
      ])
      .mockResolvedValueOnce([{ userId: 42, last: sessionDate }]);

    const result = await getDashboardSummary({
      role: 'trainer',
      userId: 7,
      finance: false,
    });

    expect(result.roster[0].adherencePct).toBe(50);
    expect(Session.findAll.mock.calls[1][0].where.status).toBe('completed');
  });
});
