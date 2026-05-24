/**
 * Phase 18 P1-O sibling-sweep — OverviewTabContent client overview unwrap
 * ========================================================================
 * Locks the canonical unwrap depth at OverviewTabContent.tsx:181 against
 * the real getClientDetails response shape (adminClientController.mjs:570-576):
 *
 *   { success: true, data: { client: {...}, mcpStats: {} } }
 *
 * Pre-fix: `const c = json.client || json.data || json;` resolved `c` to
 * `{ client, mcpStats }`, so `c.totalWorkouts`, `c.points`, `c.level`,
 * `c.tier`, `c.streakDays`, etc. were ALL undefined → bento cards rendered
 * default values (0, 1, 'Bronze Forge') for every viewed client.
 *
 * Synthetic fixtures only (rule 44).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
  },
}));

import OverviewTabContent from './OverviewTabContent';

const synthStats = {
  // The unwrap target: a single object whose fields the consumer reads.
  // Keep both Sequelize-shape user fields (id/firstName/lastName) and the
  // bento consumer fields together so the same fixture works for both
  // canonical and legacy shapes.
  id: 424242,
  firstName: 'Fixture',
  lastName: 'Client',
  totalWorkouts: 42,
  points: 1234,
  level: 7,
  tier: 'Silver Edge',
  streakDays: 5,
  sessionsRemaining: 8,
  totalRevenue: 5600,
  lastWorkoutDate: '2026-04-20T15:00:00Z',
  nextSessionDate: '2026-04-30T10:00:00Z',
  achievementCount: 3,
  optPhase: 2,
};

describe('OverviewTabContent — Phase 18 P1-O sibling-sweep unwrap', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders consumer fields from the canonical { data: { client } } shape', async () => {
    apiGetMock.mockResolvedValue({
      data: { success: true, data: { client: synthStats, mcpStats: {} } },
    });

    render(<OverviewTabContent clientId={424242} clientName="Fixture Client" />);

    // Pre-fix: bento card rendered "0" (default). Post-fix: 42 from unwrap.
    // "42" appears twice (hero workouts + bento Total Workouts card),
    // so use findAllByText. Other assertions pin uniquely-rendered fields.
    const totalWorkoutMatches = await screen.findAllByText('42');
    expect(totalWorkoutMatches.length).toBeGreaterThan(0);
    expect(screen.getByText('1,234 XP')).toBeInTheDocument();
    expect(screen.getByText('5-day streak')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith('/api/admin/clients/424242');
  });

  it('still renders consumer fields from the legacy { client } shape (regression)', async () => {
    apiGetMock.mockResolvedValue({
      data: { client: synthStats },
    });

    render(<OverviewTabContent clientId={424242} clientName="Fixture Client" />);

    const totalWorkoutMatches = await screen.findAllByText('42');
    expect(totalWorkoutMatches.length).toBeGreaterThan(0);
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });
});
