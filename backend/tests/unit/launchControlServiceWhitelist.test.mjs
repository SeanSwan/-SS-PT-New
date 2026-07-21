/**
 * Runtime contract for Sean's Launch Control law.
 *
 * The pure registry test catches additions; this test proves the database-backed
 * board and mutation path actually consume that registry.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    query: mocks.query,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    warn: vi.fn(),
  },
}));

import { getBoard, upsertOverride } from '../../services/launchControlService.mjs';

const APPROVED = ['dashboardV2Finance', 'postSaveHandoff', 'prismCapture'];
const DESIGN_SURFACE_LAW = "Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.";

describe('Launch Control service whitelist', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    delete process.env.DASHBOARD_V2_FINANCE;
    delete process.env.PRISM_CAPTURE_ENABLED;
    delete process.env.ENABLE_POST_SAVE_HANDOFF;
  });

  it('limits the admin board query to the exact approved registry', async () => {
    mocks.query.mockResolvedValueOnce([[
      {
        flag: 'dashboardV2Finance',
        label: 'Dashboard finance data',
        grp: 'feature',
        parent_flag: null,
        health_threshold: null,
        value: null,
        mode: null,
        roles: null,
        pct: null,
        starts_at: null,
        updated_by: null,
        updated_at: null,
        fail24h: '0',
        fail7d: '0',
      },
    ]]);

    const board = await getBoard();

    expect(mocks.query, DESIGN_SURFACE_LAW).toHaveBeenCalledWith(
      expect.stringContaining('WHERE f.flag IN (:approvedFlags)'),
      { replacements: { approvedFlags: APPROVED } },
    );
    expect(board.map((item) => item.flag)).toEqual(['dashboardV2Finance']);
  });

  it('rejects a retired design key before any database mutation lookup', async () => {
    await expect(upsertOverride('homeVNext', { value: true }, 'admin#test'))
      .resolves.toEqual({ error: 'unknown_flag', status: 404 });
    expect(mocks.query, DESIGN_SURFACE_LAW).not.toHaveBeenCalled();
  });
});
