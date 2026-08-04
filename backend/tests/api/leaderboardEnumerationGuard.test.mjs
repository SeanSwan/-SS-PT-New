/**
 * Leaderboard enumeration guard — security regression.
 * =====================================================
 *
 * `GET /api/v1/gamification/leaderboard` is open to any authenticated account
 * (`authenticate` + `requireProfileReader` = user|client|trainer|admin).
 * The handler bounded `limit` to 100 but left `page` UNBOUNDED, applied no
 * role filter, and selected `firstName` + `lastName`.
 *
 * Any member created through the public signup form could therefore walk
 * ?limit=100&page=1..N and harvest every user's full legal name and training
 * statistics — including trainers and admins. The member UI paints three rows.
 *
 * These tests capture the query the controller builds.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findAllMock, countMock } = vi.hoisted(() => ({
  findAllMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock('../../models/associations.mjs', () => ({
  default: async () => ({
    User: { findAll: findAllMock, count: countMock },
    ProgressData: null,
    Achievement: null,
  }),
}));

const loadController = async () => (await import('../../controllers/progressController.mjs')).default;

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const callLeaderboard = async ({ role = 'user', query = {} } = {}) => {
  const controller = await loadController();
  findAllMock.mockReset();
  countMock.mockReset();
  findAllMock.mockResolvedValue([]);
  countMock.mockResolvedValue(5000);

  const req = { query, user: { id: '42', role } };
  const res = makeRes();
  await controller.getLeaderboard(req, res);

  expect(findAllMock).toHaveBeenCalled();
  return findAllMock.mock.calls[0][0];
};

describe('GET /api/v1/gamification/leaderboard enumeration guard', () => {
  beforeEach(() => {
    findAllMock.mockReset();
    countMock.mockReset();
  });

  it('caps how deep a member can page, so the user table cannot be walked', async () => {
    const options = await callLeaderboard({ role: 'user', query: { limit: 100, page: 500 } });

    expect(options.offset).toBeLessThanOrEqual(1000);
  });

  it('does not rank trainers and admins on the member-facing board', async () => {
    const options = await callLeaderboard({ role: 'user' });

    // Op.in is a Symbol key, so JSON.stringify would drop it — read it directly.
    const roleClause = options.where?.role;
    expect(roleClause).toBeTruthy();
    const allowed = Object.getOwnPropertySymbols(roleClause)
      .map((symbol) => roleClause[symbol])
      .flat();
    expect(allowed).toContain('user');
    expect(allowed).toContain('client');
    expect(allowed).not.toContain('trainer');
    expect(allowed).not.toContain('admin');
  });

  it('withholds surnames from members', async () => {
    const options = await callLeaderboard({ role: 'user' });

    const flat = JSON.stringify(options.attributes);
    expect(flat).not.toContain('lastName');
    expect(flat).toContain('firstName');
  });

  it('still gives admins the full board they already rely on', async () => {
    const options = await callLeaderboard({ role: 'admin', query: { limit: 100, page: 500 } });

    expect(JSON.stringify(options.attributes)).toContain('lastName');
    expect(options.offset).toBe(49900);
  });
});
