/**
 * equipmentInsightsRoutes GET /profile/:profileId/gap-report — authz regression.
 * ============================================================================
 * Locks the ownership contract (same rule as equipmentRoutes.getOwnedProfile):
 *   owner trainer → 200, non-owner trainer → 403, admin → 200,
 *   unknown profile → 404, junk id → 400. The route uses protect + explicit
 *   ownership (NO authorize role list) so it composes with the S4 role work.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  equipmentProfile: { findByPk: vi.fn() },
  buildReport: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
}));

vi.mock('../../services/equipmentGapReport.mjs', () => ({
  buildEquipmentGapReport: mocks.buildReport,
}));

const equipmentInsightsRoutes = (await import('../../routes/equipmentInsightsRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/equipment-insights', equipmentInsightsRoutes);
  return app;
}

const getGapReport = (profileId) =>
  request(makeApp()).get(`/api/equipment-insights/profile/${profileId}/gap-report`);

const FAKE_REPORT = {
  profileId: 5,
  patterns: [{ pattern: 'push', coverage: 0.5, itemCount: 1, exampleItems: ['Bench'] }],
  overallCoverage: 0.06,
  weakestPattern: 'pull',
  suggestions: [{ addition: 'Kettlebell', unlocksPatterns: ['pull'], reason: 'Raises pull coverage (current weakest: pull)' }],
};

describe('equipmentInsightsRoutes gap-report ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 10, role: 'trainer' };
    // Trainer 10 owns profile 5.
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 10, isActive: true });
    mocks.buildReport.mockResolvedValue(FAKE_REPORT);
  });

  it('owner trainer → 200 with the report', async () => {
    const res = await getGapReport(5);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, report: FAKE_REPORT });
    expect(mocks.buildReport).toHaveBeenCalledWith(5);
  });

  it('non-owner trainer → 403, report never built', async () => {
    mocks.currentUser = { id: 99, role: 'trainer' };

    const res = await getGapReport(5);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(mocks.buildReport).not.toHaveBeenCalled();
  });

  it('admin (non-owner) → 200', async () => {
    mocks.currentUser = { id: 1, role: 'admin' };

    const res = await getGapReport(5);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mocks.buildReport).toHaveBeenCalledWith(5);
  });

  it('unknown profile → 404', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(null);

    const res = await getGapReport(123);

    expect(res.status).toBe(404);
    expect(mocks.buildReport).not.toHaveBeenCalled();
  });

  it('junk profile id → 400 before any DB read', async () => {
    const res = await getGapReport('not-a-number');

    expect(res.status).toBe(400);
    expect(mocks.equipmentProfile.findByPk).not.toHaveBeenCalled();
    expect(mocks.buildReport).not.toHaveBeenCalled();
  });

  it('service failure → 500 error envelope, never a crash', async () => {
    mocks.buildReport.mockRejectedValue(new Error('boom'));

    const res = await getGapReport(5);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Failed to build gap report' });
  });
});
