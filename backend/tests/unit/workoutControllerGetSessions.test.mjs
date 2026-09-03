/**
 * workoutController.getWorkoutSessions — unit tests
 * ==================================================
 * Locks the pagination contract for GET /api/workout/sessions.
 *
 * Regression intent (from canonical-surface audit 2026-04-12):
 *   Frontend canonical hook (useDashboardQueries.useWorkoutSessions) sends
 *   { limit, page }. Controller previously read { limit, offset } from
 *   req.query and silently dropped `page`, so pagination beyond page 1
 *   returned the same first window. Fix: controller translates `page` into
 *   `offset` when `offset` is not explicitly provided.
 *
 * Mocking strategy: workoutService is mocked so the test exercises only
 * the controller's query-parameter translation logic. No DB, no real service.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWorkoutSessionsServiceMock } = vi.hoisted(() => ({
  getWorkoutSessionsServiceMock: vi.fn(),
}));

vi.mock('../../services/workoutService.mjs', () => ({
  default: {
    getWorkoutSessions: getWorkoutSessionsServiceMock,
  },
}));

vi.mock('../../utils/responseUtils.mjs', () => ({
  successResponse: vi.fn((res, data) => {
    res.body = data;
    res.statusCode = 200;
    return res;
  }),
  errorResponse: vi.fn((res, status, message) => {
    res.statusCode = status;
    res.body = { success: false, message };
    return res;
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { getWorkoutSessions } from '../../controllers/workoutController.mjs';

const makeReqRes = (query = {}) => {
  const req = {
    user: { id: 7, role: 'client' },
    params: {},
    query,
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res };
};

describe('workoutController.getWorkoutSessions', () => {
  beforeEach(() => {
    getWorkoutSessionsServiceMock.mockReset();
    getWorkoutSessionsServiceMock.mockResolvedValue([]);
  });

  /*
   * RE-ANCHORED 2026-09-03 (Blueprint v2 S8). The controller now asks the
   * service for limit+1 rows and slices the extra one off, so it can report
   * `hasMore` without a COUNT over a table that grows for the life of every
   * membership. These tests are about OFFSET TRANSLATION — page N with a given
   * page size lands at the right offset — and that intent is unchanged; the
   * probe row is an implementation detail of the same request, so the limit
   * assertion follows it rather than being deleted.
   */
  it('translates page=1 + limit=10 into offset=0', async () => {
    const { req, res } = makeReqRes({ page: '1', limit: '10' });
    await getWorkoutSessions(req, res);
    expect(getWorkoutSessionsServiceMock).toHaveBeenCalledTimes(1);
    const [userIdArg, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(userIdArg).toBe(7);
    // limit+1: the requested page size plus the hasMore probe row.
    expect(optsArg.limit).toBe(11);
    expect(optsArg.offset).toBe(0);
  });

  it('translates page=2 + limit=10 into offset=10', async () => {
    const { req, res } = makeReqRes({ page: '2', limit: '10' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.offset).toBe(10);
  });

  it('translates page=3 + limit=50 into offset=100', async () => {
    const { req, res } = makeReqRes({ page: '3', limit: '50' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.limit).toBe(51);
    expect(optsArg.offset).toBe(100);
  });

  it('honors an explicit offset param even when page is also provided (explicit wins)', async () => {
    const { req, res } = makeReqRes({ page: '5', limit: '10', offset: '42' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.offset).toBe(42);
  });

  it('clamps page<1 to offset=0 (no negative offsets)', async () => {
    const { req, res } = makeReqRes({ page: '0', limit: '10' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.offset).toBe(0);
  });

  it('when neither page nor offset is provided, leaves offset undefined so the service default applies', async () => {
    const { req, res } = makeReqRes({ limit: '10' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.offset).toBeUndefined();
  });

  it('uses page with the default service limit assumption when limit is omitted (page=2 → offset=10)', async () => {
    // When limit is omitted from the query, the page→offset translation must
    // still produce a sensible offset using a documented default (service
    // default limit is 10). This keeps the contract predictable rather than
    // silently returning offset=0 for page>1.
    const { req, res } = makeReqRes({ page: '2' });
    await getWorkoutSessions(req, res);
    const [, optsArg] = getWorkoutSessionsServiceMock.mock.calls[0];
    expect(optsArg.offset).toBe(10);
  });

  // =========================================================================
  // Silent failure mask removal — rule 34 (no silent swallowing of unexpected
  // errors). The original controller caught SequelizeDatabaseError containing
  // "does not exist" and returned successResponse(res, { sessions: [], total: 0 }).
  // That mask hid the pre-existing `column "exercise.category" does not exist`
  // schema drift for years. This pass removes the mask so real schema drift
  // surfaces as a 500 and gets logged.
  // =========================================================================
  describe('silent failure mask removal', () => {
    it('propagates SequelizeDatabaseError("does not exist") as a 500 — no silent empty payload', async () => {
      const dbError = new Error('column "exercise.category" does not exist');
      dbError.name = 'SequelizeDatabaseError';
      getWorkoutSessionsServiceMock.mockRejectedValue(dbError);

      const { req, res } = makeReqRes({});
      await getWorkoutSessions(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toMatchObject({ success: false });
      // Must NOT return a successful empty sessions payload
      expect(res.body).not.toMatchObject({ sessions: [] });
    });

    it('propagates SequelizeDatabaseError("relation ... does not exist") as a 500', async () => {
      const dbError = new Error('relation "workout_sessions" does not exist');
      dbError.name = 'SequelizeDatabaseError';
      getWorkoutSessionsServiceMock.mockRejectedValue(dbError);

      const { req, res } = makeReqRes({});
      await getWorkoutSessions(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('propagates unrelated errors as 500 (unchanged behavior for non-DB errors)', async () => {
      const err = new Error('unexpected service failure');
      getWorkoutSessionsServiceMock.mockRejectedValue(err);

      const { req, res } = makeReqRes({});
      await getWorkoutSessions(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
