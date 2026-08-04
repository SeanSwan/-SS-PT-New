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
    User: { findAll: findAllMock, count: countMock, findByPk: (...args) => findByPkMock(...args) },
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

const findByPkMock = vi.fn();

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
  return {
    options: findAllMock.mock.calls[0][0],
    body: res.json.mock.calls[0]?.[0],
  };
};

describe('GET /api/v1/gamification/leaderboard enumeration guard', () => {
  beforeEach(() => {
    findAllMock.mockReset();
    countMock.mockReset();
  });

  it('caps TOTAL reachable rows for a member, not just page depth', async () => {
    const { options } = await callLeaderboard({ role: 'user', query: { limit: 100, page: 500 } });

    expect(options.offset + options.limit).toBeLessThanOrEqual(100);
  });

  it('cannot be slice-walked by filtering tier and reversing the sort', async () => {
    // An offset-only cap let a member page each tier separately, and flip
    // `metric` to read the other end of each slice.
    for (const tier of ['bronze', 'silver', 'gold']) {
      for (const metric of ['points', 'workouts']) {
        const { options } = await callLeaderboard({
          role: 'user',
          query: { tier, metric, limit: 100, page: 99 },
        });
        expect(options.offset + options.limit).toBeLessThanOrEqual(100);
      }
    }
  });

  it('does not rank trainers and admins on the member-facing board', async () => {
    const { options } = await callLeaderboard({ role: 'user' });

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
    const { options } = await callLeaderboard({ role: 'user' });

    const flat = JSON.stringify(options.attributes);
    expect(flat).not.toContain('lastName');
    expect(flat).toContain('firstName');
  });

  it('still gives admins the full board they already rely on', async () => {
    const { options } = await callLeaderboard({ role: 'admin', query: { limit: 100, page: 500 } });

    expect(JSON.stringify(options.attributes)).toContain('lastName');
    expect(options.offset).toBe(49900);
  });

  it('never probes an arbitrary account — the includeUser oracle is gone', async () => {
    findByPkMock.mockReset();

    await callLeaderboard({ role: 'user', query: { includeUser: 9999, metric: 'streak' } });

    // findByPk fed an attacker-controlled id with no ownership check, and it
    // bypassed the role filter, so a member could rank (and binary-read) any
    // account's stats including staff. The parameter had zero callers.
    expect(findByPkMock).not.toHaveBeenCalled();
  });

  it('ignores an unrecognised tier instead of querying and echoing it', async () => {
    const { options, body } = await callLeaderboard({ role: 'user', query: { tier: 'diamond' } });

    expect(options.where.tier).toBeUndefined();
    expect(body?.filters?.tier).toBeNull();
  });

  it('does not hand a member the member population or a false page number', async () => {
    const { body } = await callLeaderboard({ role: 'user', query: { limit: 100, page: 7 } });

    expect(body?.pagination?.total).toBeLessThanOrEqual(100);
    expect(body?.pagination?.page).toBe(1);
  });

  it('still reports the true total and page to staff', async () => {
    const { body } = await callLeaderboard({ role: 'admin', query: { limit: 100, page: 7 } });

    expect(body?.pagination?.total).toBe(5000);
    expect(body?.pagination?.page).toBe(7);
  });
});
