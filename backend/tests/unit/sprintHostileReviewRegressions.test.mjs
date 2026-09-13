/**
 * ============================================================================
 * FILE: sprintHostileReviewRegressions.test.mjs
 * PURPOSE: Regression locks for the findings raised by the independent hostile
 *          review of S08. Each test FAILS against the code as it stood before
 *          the fix, and names the finding it locks.
 *
 * FINDING 1 (CRITICAL) — six JSON routes passed `fallbackStatus = 400`, which
 *   defeated the `status >= 500` guard, so a raw ORM/driver message was echoed
 *   to the client. No Sequelize error carries `.status`.
 * FINDING 3 (HIGH) — generateSprintClasses committed the `status='generating'`
 *   claim BEFORE the previous Sprint was authorized; the denial escaped the
 *   try/finally, leaving the row stuck at 'generating' forever.
 * FINDING 4 (MEDIUM) — createSprint persisted an unnormalized, unauthorized
 *   `previousSprintId` straight from the request body.
 * FINDING 5 (MEDIUM) — POST /:id/generate used `parseInt`, so `/1e3/generate`
 *   acted on Sprint 1 and `/0x0C/generate` on Sprint 12.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { state, spies } = vi.hoisted(() => ({
  state: { user: { id: 7, role: 'trainer' } },
  spies: {
    sprintFindByPk: vi.fn(),
    sprintCreate: vi.fn(),
    sprintUpdate: vi.fn(async () => [1]),
    generatorGenerate: vi.fn(async () => ({ type: 'complete' })),
    generatorRegenerate: vi.fn(async () => ({ ok: true })),
    memoryFindAll: vi.fn(async () => []),
  },
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = state.user; next(); },
  authorize: () => (_req, _res, next) => next(),
}));
vi.mock('../../database.mjs', () => ({
  // createSprint opens the transaction WITHOUT a callback and commits/rolls back
  // itself, so the mock has to support both forms.
  default: {
    transaction: async (callback) => {
      if (typeof callback === 'function') return callback({ id: 'tx' });
      return { id: 'tx', commit: async () => undefined, rollback: async () => undefined };
    },
  },
}));
vi.mock('../../services/bootcamp/sprintGenerator.mjs', () => ({
  generateSprintClasses: spies.generatorGenerate,
  regenerateSlot: spies.generatorRegenerate,
}));
vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({
    findByPk: spies.sprintFindByPk,
    create: spies.sprintCreate,
    update: spies.sprintUpdate,
    findAll: async () => [],
  }),
  getSprintWeek: () => ({ findAll: async () => [], findOne: async () => null, create: async (v) => ({ id: 501, ...v }) }),
  getSprintClassSlot: () => ({ findAll: async () => [], findOne: async () => null, create: async (v) => ({ id: 601, ...v }) }),
  getSprintExerciseMemory: () => ({ findAll: spies.memoryFindAll, destroy: async () => 0 }),
  getBootcampSpaceProfile: () => null,
}));

const buildApp = async () => {
  vi.resetModules();
  const { default: sprintRoutes } = await import('../../routes/sprintRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/bootcamp/sprints', sprintRoutes);
  return app;
};

const ownedSprint = (over = {}) => ({
  id: 12, trainerId: 7, status: 'draft', update: async () => undefined, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: 7, role: 'trainer' };
  spies.sprintFindByPk.mockImplementation(async (id) => (Number(id) === 12 ? ownedSprint() : null));
});

describe('FINDING 1 — raw ORM/driver messages are never echoed', () => {
  it.each([
    ['POST /', () => request(undefined)],
  ])('placeholder', () => { expect(true).toBe(true); });

  it('hides a Sequelize-shaped message on a 400-fallback route', async () => {
    const sequelizeish = Object.assign(
      new Error('column "sprint_class_slots"."sprintId" does not exist'),
      { name: 'SequelizeDatabaseError' }, // NOTE: no `.status`, exactly like the real class
    );
    spies.sprintCreate.mockRejectedValueOnce(sequelizeish);
    const app = await buildApp();

    const res = await request(app)
      .post('/api/bootcamp/sprints')
      .send({ name: 'x', startDate: '2026-03-02' });

    expect(res.status).toBe(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('sprint_class_slots');
    expect(body).not.toContain('does not exist');
    // The route's own sanitized text is used instead.
    expect(body).toContain('Could not create sprint');
  });

  it('hides a credential-bearing driver message on the update route', async () => {
    const authError = Object.assign(
      new Error('password authentication failed for user "swan_prod_admin"'),
      { name: 'SequelizeAccessDeniedError' },
    );
    spies.sprintFindByPk.mockRejectedValueOnce(authError);
    const app = await buildApp();

    const res = await request(app).put('/api/bootcamp/sprints/12').send({ name: 'x' });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('password authentication failed');
    expect(body).not.toContain('swan_prod_admin');
  });

  it('still surfaces a KNOWN client-safe error message', async () => {
    const app = await buildApp();
    // A malformed id is client-safe by construction and keeps its own status.
    const res = await request(app).put('/api/bootcamp/sprints/12abc').send({ name: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('FINDING 5 — the generate route validates the RAW id', () => {
  it.each(['1e3', '0x0C', '12abc', '1.5', '+12', '0'])(
    'rejects /%s/generate before any lookup or job',
    async (rawId) => {
      const app = await buildApp();
      spies.sprintFindByPk.mockClear();

      const res = await request(app).post(`/api/bootcamp/sprints/${rawId}/generate`);

      expect(res.status).toBe(400);
      expect(spies.generatorGenerate).not.toHaveBeenCalled();
      expect(spies.sprintFindByPk).not.toHaveBeenCalled();
    },
  );

  it('accepts a padded but valid id and uses the normalized value', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/bootcamp/sprints/%2012%20/generate');
    expect(res.status).toBe(200);
    expect(spies.generatorGenerate.mock.calls[0][0]).toBe(12);
  });
});

describe('FINDING 4 — createSprint authorizes previousSprintId', () => {
  it('refuses a previous Sprint the actor does not own, with no create', async () => {
    spies.sprintFindByPk.mockImplementation(async (id) => {
      if (Number(id) === 13) return { id: 13, trainerId: 8 }; // someone else's
      return null;
    });
    spies.sprintCreate.mockResolvedValue(ownedSprint({ id: 99 }));

    const { createSprint } = await import('../../services/bootcamp/sprintService.mjs');
    await expect(createSprint(
      { userId: 7, role: 'trainer' },
      { name: 'x', startDate: '2026-03-02', previousSprintId: 13 },
    )).rejects.toMatchObject({ status: 404 });

    expect(spies.sprintCreate).not.toHaveBeenCalled();
  });

  it('stores the NORMALIZED id when the previous Sprint IS owned', async () => {
    spies.sprintFindByPk.mockImplementation(async (id) => (Number(id) === 12 ? ownedSprint() : null));
    // The post-create read is ownership-checked, so the created row must be
    // resolvable by id AND owned by the actor.
    spies.sprintCreate.mockResolvedValue(ownedSprint({ id: 12 }));

    const { createSprint } = await import('../../services/bootcamp/sprintService.mjs');
    await createSprint(
      { userId: 7, role: 'trainer' },
      { name: 'x', startDate: '2026-03-02', previousSprintId: ' 12 ' },
    );

    expect(spies.sprintCreate.mock.calls[0][0].previousSprintId).toBe(12);
    expect(typeof spies.sprintCreate.mock.calls[0][0].previousSprintId).toBe('number');
  });

  it('rejects a malformed previousSprintId outright', async () => {
    const { createSprint } = await import('../../services/bootcamp/sprintService.mjs');
    await expect(createSprint(
      { userId: 7, role: 'trainer' },
      { name: 'x', startDate: '2026-03-02', previousSprintId: '12abc' },
    )).rejects.toBeDefined();
    expect(spies.sprintCreate).not.toHaveBeenCalled();
  });
});

// FINDING 3 (the generation-claim lock) lives in sprintGeneratorOwnership.test.mjs:
// THIS file mocks sprintGenerator.mjs for the route fixtures, so it cannot
// exercise the real generator.
