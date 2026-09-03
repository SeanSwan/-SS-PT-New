/**
 * Contract: a paginated session list says whether it is complete.
 *
 * The Progress tab fetched a hard `limit: 200` with no way to ask for more and
 * no signal that more existed, so an athlete with a longer history silently saw
 * a truncated one — and any trend drawn from it was confidently wrong
 * (Blueprint v2 S8 / D7).
 *
 * hasMore is derived from a limit+1 probe rather than a COUNT: the table grows
 * for the life of every membership, and a count on every list request is a cost
 * that buys nothing the probe does not already tell us.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWorkoutSessions = vi.fn();
vi.mock('../../services/workoutService.mjs', () => ({
  default: { getWorkoutSessions: (...a) => getWorkoutSessions(...a) },
  getWorkoutSessions: (...a) => getWorkoutSessions(...a),
}));

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};
const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

let getWorkoutSessionsController;
beforeEach(async () => {
  vi.resetModules();
  getWorkoutSessions.mockReset();
  ({ getWorkoutSessions: getWorkoutSessionsController } =
    await import('../../controllers/workoutController.mjs'));
});

const call = async (query, serviceRows) => {
  getWorkoutSessions.mockResolvedValue(serviceRows);
  const res = makeRes();
  await getWorkoutSessionsController(
    { query, user: { id: 7, role: 'client' }, params: {} },
    res,
  );
  return res;
};

describe('GET /api/workout/sessions pagination', () => {
  it('asks the service for one row beyond the requested limit', async () => {
    await call({ limit: '50' }, rows(20));
    expect(getWorkoutSessions).toHaveBeenCalledWith(7, expect.objectContaining({ limit: 51 }));
  });

  it('reports hasMore and trims the probe row when a further page exists', async () => {
    const res = await call({ limit: '50' }, rows(51));
    expect(res.body.data.hasMore).toBe(true);
    expect(res.body.data.sessions).toHaveLength(50);
  });

  it('reports hasMore false when the page is the end of the history', async () => {
    const res = await call({ limit: '50' }, rows(50));
    expect(res.body.data.hasMore).toBe(false);
    expect(res.body.data.sessions).toHaveLength(50);
  });

  it('keeps the sessions field shape unchanged (additive only)', async () => {
    const res = await call({ limit: '50' }, rows(3));
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sessions)).toBe(true);
    expect(res.body.data.sessions).toEqual(rows(3));
  });

  it('leaves an unlimited request unpaginated rather than inventing a window', async () => {
    const res = await call({}, rows(9));
    expect(getWorkoutSessions).toHaveBeenCalledWith(7, expect.objectContaining({ limit: undefined }));
    expect(res.body.data.hasMore).toBe(false);
    expect(res.body.data.limit).toBeNull();
  });
});
