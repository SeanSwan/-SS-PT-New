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
    User: {
      findAll: findAllMock,
      count: countMock,
      findByPk: (...args) => findByPkMock(...args),
      findOne: (...args) => findOneMock(...args),
    },
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
const findOneMock = vi.fn();

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

  it('never lets a caller-supplied id reach ANY user lookup, by any method', async () => {
    // Pinning `findByPk` alone was method-pinned, not behaviour-pinned: the
    // same oracle walks straight back in through findAll/findOne. Assert the
    // invariant instead — no query anywhere in this handler may be shaped by an
    // id the caller supplied.
    findByPkMock.mockReset();
    findOneMock.mockReset();

    const attackerId = 424242;
    const { options, body } = await callLeaderboard({
      role: 'user',
      query: { includeUser: attackerId, metric: 'streak' },
    });

    expect(findByPkMock).not.toHaveBeenCalled();
    expect(findOneMock).not.toHaveBeenCalled();

    const everyQuery = [
      ...findAllMock.mock.calls.map((call) => call[0]),
      ...countMock.mock.calls.map((call) => call[0]),
    ];
    for (const query of everyQuery) {
      expect(JSON.stringify(query ?? {})).not.toContain(String(attackerId));
    }
    expect(JSON.stringify(options ?? {})).not.toContain(String(attackerId));

    // And nothing about that account may come back.
    expect(body?.userRank ?? null).toBeNull();
    expect(JSON.stringify(body ?? {})).not.toContain(String(attackerId));
  });

  it('shows members only the TOP of a slice — offset is not merely capped', async () => {
    // A capped offset still bound each QUERY while the reachable set is the
    // UNION over tier x metric x timeframe. Pinning offset to 0 makes the top
    // the only thing reachable, whatever slice is requested.
    for (const tier of ['bronze_forge', 'titanium_core', 'crystalline_swan']) {
      for (const metric of ['points', 'workouts', 'streak', 'level']) {
        const { options } = await callLeaderboard({
          role: 'user',
          query: { tier, metric, limit: 100, page: 42 },
        });
        expect(options.offset).toBe(0);
        expect(options.limit).toBeLessThanOrEqual(100);
      }
    }
  });

  it('honours a REAL tier value — the allowlist matches the stored domain', async () => {
    // `['bronze','silver','gold','platinum']` matched nothing: the column
    // stores `bronze_forge`-style keys, so every legitimate filter was dropped
    // and the slice protection was accidental rather than designed.
    const { options, body } = await callLeaderboard({
      role: 'user',
      query: { tier: 'bronze_forge' },
    });

    expect(options.where.tier).toBe('bronze_forge');
    expect(body?.filters?.tier).toBe('bronze_forge');
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
