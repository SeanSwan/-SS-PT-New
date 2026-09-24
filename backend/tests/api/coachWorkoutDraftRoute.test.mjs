/**
 * SCU G03 / S3 — RED (S3a). The staff workout-draft endpoint must exist on the
 * EXISTING proposal router (protect + admin/trainer route-shadow): before G03,
 * POST /api/coach/proposals/workout-drafts is a 404 on an unrelated resource.
 * Role shadow: non-staff (client) is refused before the service runs.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let actingUser = { id: 7, role: 'trainer' };
const mockCreate = vi.fn(async () => ({ status: 200, intentId: 'i-1', proposalId: 'p-1', idempotent: false, recovered: false }));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...actingUser }; next(); },
  authorize: (roles) => (req, res, next) => {
    if (req.user?.role === 'admin' || roles.includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, code: 'INSUFFICIENT_PRIVILEGES' });
  },
}));
vi.mock('../../services/ai/coachActionProposalErrorPresenter.mjs', () => ({
  buildCoachProposalRouteErrorBody: (code) => ({ success: false, code, error: `${code} presentation` }),
}));
vi.mock('../../services/ai/coachActionProposalApprovalService.mjs', () => ({
  getCoachActionProposal: vi.fn(), approveCoachActionProposal: vi.fn(),
  rejectCoachActionProposal: vi.fn(), answerCoachActionProposalClarification: vi.fn(),
}));
vi.mock('../../services/ai/coachWorkoutDraftRequestService.mjs', () => ({
  createWorkoutDraftRequest: (args) => mockCreate(args),
}));

const body = { schemaVersion: 1,
  taskId: '11111111-2222-4333-8444-555555555555',
  requestKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  draftRevision: 0, targetUserId: 42,
  workout: { date: '2026-05-05', title: 'G03', exercises: [{ exerciseId: '99999999-8888-4777-8666-555555555555', unit: 'lb', sets: [{ setNumber: 1, reps: 8, weight: 40 }] }] } };

async function appWith() {
  const routes = await import('../../routes/coachProposalRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/coach/proposals', routes.default);
  return app;
}

describe('G03 S3 workout-draft endpoint (route shadow)', () => {
  beforeEach(() => { actingUser = { id: 7, role: 'trainer' }; mockCreate.mockClear(); });

  it('POST /workout-drafts is handled on the existing proposal router and returns the prepared refs', async () => {
    const app = await appWith();
    const res = await request(app).post('/api/coach/proposals/workout-drafts').send(body);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, intentId: 'i-1', proposalId: 'p-1' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].user).toMatchObject({ id: 7, role: 'trainer' });
  });

  it('the route-shadow role gate refuses non-staff before the service runs', async () => {
    actingUser = { id: 42, role: 'client' };
    const app = await appWith();
    const res = await request(app).post('/api/coach/proposals/workout-drafts').send(body);
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('service validation errors surface with their status/code via the shared presenter', async () => {
    mockCreate.mockRejectedValueOnce(Object.assign(new Error('WORKOUT_DRAFT_SCHEMA_VERSION'), { code: 'WORKOUT_DRAFT_SCHEMA_VERSION', statusCode: 400 }));
    const app = await appWith();
    const res = await request(app).post('/api/coach/proposals/workout-drafts').send({ ...body, schemaVersion: 2 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WORKOUT_DRAFT_SCHEMA_VERSION');
  });

  it('uncaught service failures map to a stable route error, not a 500 stack', async () => {
    mockCreate.mockRejectedValueOnce(new Error('boom'));
    const app = await appWith();
    const res = await request(app).post('/api/coach/proposals/workout-drafts').send(body);
    expect(res.status).toBe(500);
    expect(res.body.code).toBeTruthy();
  });
});
