/**
 * WorkoutHeatmapCalendar — 4e real-data wiring locks
 * ==================================================
 * Locks: the session->grid builder maps MM/DD points onto Monday-first
 * rows walking back from a fixed "today" (no year collisions inside 84
 * days), the userId mount renders real cells instead of the dev demo,
 * and empty history keeps the honest empty state in prod.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api.service', () => ({
  default: { get: mockGet },
}));

import WorkoutHeatmapCalendar, { buildHeatmapGridFromSessions } from './WorkoutHeatmapCalendar';

describe('buildHeatmapGridFromSessions', () => {
  it('maps session labels onto Monday-first rows walking back from today', () => {
    // Fixed today: Tue 2026-07-07. 07/06 = Monday (row 0), 07/07 = Tuesday (row 1).
    const today = new Date(2026, 6, 7);
    const grid = buildHeatmapGridFromSessions(
      [{ x: '07/06' }, { x: '07/07' }, { x: '07/07' }],
      today,
    );

    expect(grid).not.toBeNull();
    expect(grid![0][11]).toBe(1); // Monday, newest week column
    expect(grid![1][11]).toBe(2); // Tuesday, two sessions that day
    expect(grid![2][11]).toBe(0);
  });

  it('keeps columns Monday-aligned: last Sunday lands one column left of this Monday', () => {
    // Fixed today: Tue 2026-07-07. Sunday 07/05 is the PREVIOUS calendar
    // week — a rolling 7-day window would wrongly put it in column 11.
    const today = new Date(2026, 6, 7);
    const grid = buildHeatmapGridFromSessions(
      [{ x: '07/05' }, { x: '07/06' }],
      today,
    );

    expect(grid![6][10]).toBe(1); // Sunday row, previous week column
    expect(grid![6][11]).toBe(0); // NOT in the current week column
    expect(grid![0][11]).toBe(1); // Monday stays in the current week
  });

  it('returns null for empty history so the honest empty state renders', () => {
    expect(buildHeatmapGridFromSessions([])).toBeNull();
  });

  it('buckets by the backend UTC day when iso is present (evening-workout tz drift guard)', () => {
    // A Sunday 7pm PT workout is stored as Monday 02:00 UTC; the backend's
    // TO_CHAR labels it Monday. The iso path must bucket it on the UTC
    // Monday row (agreeing with DATE_TRUNC('week') weekly charts) no
    // matter what timezone the browser runs in — this assertion is
    // tz-independent because the iso walk uses only UTC getters.
    const today = new Date(Date.UTC(2026, 6, 7, 12)); // Tue 2026-07-07 UTC
    const grid = buildHeatmapGridFromSessions(
      [
        { x: '07/06', iso: '2026-07-06' },
        { x: '07/07', iso: '2026-07-07' },
        { x: '07/07', iso: '2026-07-07' },
      ],
      today,
    );

    expect(grid).not.toBeNull();
    expect(grid![0][11]).toBe(1); // Monday UTC row, newest week column
    expect(grid![1][11]).toBe(2); // Tuesday UTC row
    expect(grid![6][10]).toBe(0); // NOT re-bucketed onto a local Sunday
  });

  it('falls back to legacy browser-local MM/DD matching when any point lacks iso', () => {
    const today = new Date(2026, 6, 7); // local Tue
    const grid = buildHeatmapGridFromSessions(
      [{ x: '07/07', iso: '2026-07-07' }, { x: '07/06' }],
      today,
    );

    expect(grid![0][11]).toBe(1); // Monday via legacy local labels
    expect(grid![1][11]).toBe(1); // Tuesday via legacy local labels
  });
});

describe('WorkoutHeatmapCalendar with userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the duration-trend sessions and renders real cells (no dev-preview tag)', async () => {
    const label = (daysBack: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysBack);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };
    mockGet.mockResolvedValue({
      data: { success: true, data: [{ x: label(1), y: 45 }, { x: label(3), y: 30 }] },
    });

    render(<WorkoutHeatmapCalendar userId={42} />);

    expect(await screen.findByText('Workout Calendar')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/analytics/42/chart-duration-trend', expect.anything());
    expect(screen.queryByText(/Dev Preview/)).not.toBeInTheDocument();
    expect(screen.getByText(/Last 12 weeks/)).toBeInTheDocument();
  });

  it('keeps the honest empty state when the client has no logged sessions', async () => {
    // Distinct userId: the analytics hook keeps a module-level cache keyed
    // by user+endpoint, so reusing 42 would replay the previous test's data.
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    render(<WorkoutHeatmapCalendar userId={43} />);
    expect(await screen.findByText('No workout calendar data yet')).toBeInTheDocument();
  });
});
