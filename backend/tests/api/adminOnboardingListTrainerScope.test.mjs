/**
 * adminOnboardingListTrainerScope.test.mjs
 * ========================================
 * IDOR regression (hostile review round 2, 2026-07-11).
 *
 * GET /api/admin/onboarding is mounted behind authorize(['admin','trainer']), but
 * getAdminOnboardingList built its WHERE clause from the `search` query param ONLY.
 * A trainer could therefore read EVERY client's onboarding row — including the
 * onboarding questionnaire and baseline body measurements (health PII) — not just
 * their assigned clients. Every sibling handler in this controller already scopes via
 * ensureClientAccess; the list endpoint was the one that forgot.
 *
 * These tests lock the fix behaviorally (not by source-string matching):
 *   - trainer  -> WHERE is narrowed to their actively-assigned clientIds
 *   - admin    -> no id narrowing (full roster, as intended)
 *   - trainer with zero assignments -> FAILS CLOSED (empty list, DB never queried
 *     for the full roster)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';

const models = vi.hoisted(() => ({
  User: { findAndCountAll: vi.fn() },
  ClientOnboardingQuestionnaire: {},
  ClientBaselineMeasurements: {},
  ClientTrainerAssignment: { findAll: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: async () => models,
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { getAdminOnboardingList } = await import('../../controllers/clientOnboardingController.mjs');

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('GET /api/admin/onboarding — trainer assignment scoping (IDOR)', () => {
  beforeEach(() => {
    models.User.findAndCountAll.mockReset();
    models.ClientTrainerAssignment.findAll.mockReset();
    models.User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('narrows the query to a trainer\'s actively-assigned clients only', async () => {
    models.ClientTrainerAssignment.findAll.mockResolvedValue([
      { clientId: 11 }, { clientId: 12 }, { clientId: 11 },
    ]);
    const res = makeRes();
    await getAdminOnboardingList({ user: { id: 7, role: 'trainer' }, query: {} }, res);

    // Only ACTIVE assignments for THIS trainer are consulted.
    expect(models.ClientTrainerAssignment.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: 7, status: 'active' } }),
    );
    // ...and the user query is narrowed to exactly those client ids (deduped).
    const where = models.User.findAndCountAll.mock.calls[0][0].where;
    expect(where.id).toEqual({ [Op.in]: [11, 12] });
  });

  it('does NOT narrow for an admin (full roster is intended)', async () => {
    const res = makeRes();
    await getAdminOnboardingList({ user: { id: 1, role: 'admin' }, query: {} }, res);

    expect(models.ClientTrainerAssignment.findAll).not.toHaveBeenCalled();
    const where = models.User.findAndCountAll.mock.calls[0][0].where;
    expect(where.id).toBeUndefined();
  });

  it('FAILS CLOSED for a trainer with no assignments — empty list, never the full roster', async () => {
    models.ClientTrainerAssignment.findAll.mockResolvedValue([]);
    const res = makeRes();
    await getAdminOnboardingList({ user: { id: 9, role: 'trainer' }, query: {} }, res);

    // The critical assertion: we must NOT fall through to an unscoped roster query.
    expect(models.User.findAndCountAll).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, clients: [] }),
    );
  });
});
