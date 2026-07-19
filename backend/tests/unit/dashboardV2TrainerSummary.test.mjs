/**
 * Regression coverage for trainer dashboard session selection.
 *
 * A session whose scheduling status is still "scheduled" but whose authoritative
 * attendanceStatus is "no_show" must not drive the trainer's next-session timer.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import Session from '../../models/Session.mjs';
import { getDashboardSummary } from '../../services/dashboardV2Service.mjs';

describe('dashboard v2 trainer summary', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('skips scheduled no-shows when selecting the next session and timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T16:00:00.000Z'));

    const noShow = {
      id: 101,
      userId: 11,
      trainerId: 7,
      sessionDate: new Date('2026-07-19T16:30:00.000Z'),
      duration: 60,
      status: 'scheduled',
      attendanceStatus: 'no_show',
    };
    const upcoming = {
      id: 102,
      userId: 12,
      trainerId: 7,
      sessionDate: new Date('2026-07-19T17:00:00.000Z'),
      duration: 60,
      status: 'scheduled',
      attendanceStatus: null,
    };

    vi.spyOn(Session, 'findAll')
      .mockResolvedValueOnce([noShow, upcoming])
      .mockResolvedValueOnce([]);
    vi.spyOn(Session, 'count').mockResolvedValue(0);

    const result = await getDashboardSummary({
      role: 'trainer',
      userId: 7,
      finance: false,
    });

    expect(result.today.map((row) => row.status)).toEqual(['missed', 'upcoming']);
    expect(result.minutesUntilNext).toBe(60);

    const todayWhere = Session.findAll.mock.calls[0][0].where;
    expect(todayWhere.status[Op.in]).toEqual([
      'scheduled', 'confirmed', 'completed',
    ]);
  });
});
