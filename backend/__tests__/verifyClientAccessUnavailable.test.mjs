import { describe, expect, it, vi } from 'vitest';

const assignmentFindOne = vi.fn();

vi.mock('../models/index.mjs', () => ({
  getModel: () => ({ findOne: assignmentFindOne }),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { assertAssignmentOrAdmin } = await import('../middleware/verifyClientAccess.mjs');

describe('assignment access unavailable signal', () => {
  it('preserves legacy fail-closed false by default', async () => {
    assignmentFindOne.mockRejectedValueOnce(new Error('synthetic database outage'));

    await expect(assertAssignmentOrAdmin(101, 'trainer', 901)).resolves.toBe(false);
  });

  it('throws the typed unavailable error only for the explicit opt-in', async () => {
    assignmentFindOne.mockRejectedValueOnce(new Error('synthetic database outage'));

    await expect(assertAssignmentOrAdmin(101, 'trainer', 901, { throwOnUnavailable: true }))
      .rejects.toMatchObject({ code: 'ASSIGNMENT_LOOKUP_UNAVAILABLE' });
  });

  it('still returns true for an assigned trainer with the opt-in enabled', async () => {
    assignmentFindOne.mockResolvedValueOnce({ id: 7, status: 'active' });

    await expect(assertAssignmentOrAdmin(101, 'trainer', 901, { throwOnUnavailable: true }))
      .resolves.toBe(true);
  });
});
