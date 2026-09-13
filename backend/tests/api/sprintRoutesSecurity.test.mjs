import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/sprintRoutes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('sprint routes security hardening', () => {
  it('locks the mounted Sprint Planner API and active frontend consumer', () => {
    const dashboardRoutesSource = readFrontend('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const hookSource = readFrontend('src/hooks/useSprintAPI.ts');
    // R-H04 (slice D): the SSE transport is the one legitimate raw `fetch`, and it
    // was extracted into its own module to keep the hook inside the rule-4 cap.
    // The hook must DELEGATE; the endpoint literal must live in the transport.
    const transportSource = readFrontend('src/hooks/sprintGenerationStream.ts');

    expect(coreRoutesSource).toContain("app.use('/api/bootcamp/sprints', sprintRoutes)");
    expect(dashboardRoutesSource).toContain("{ path: '/sprint-planner', component: SprintPlannerPage");
    expect(hookSource).toContain("apiService.post('/api/bootcamp/sprints'");
    expect(hookSource).toContain('streamSprintGeneration');
    expect(transportSource).toContain('fetch(`/api/bootcamp/sprints/${sprintId}/generate`');
    expect(routeSource).toContain("router.post('/:id/generate'");
    expect(routeSource).toContain("router.post('/:sprintId/slots/:slotId/regenerate'");
  });

  it('does not echo service or generator exception details to sprint clients', () => {
    expect(routeSource).toContain("const SPRINT_INTERNAL_ERROR = 'internal_error';");
    expect(routeSource).toContain('const sendSprintRouteError =');
    expect(routeSource).toContain("sendSprintEventError(sendEvent, 'Sprint generation failed')");
    expect(routeSource).not.toContain('json({ success: false, error: err.message })');
    expect(routeSource).not.toContain("sendEvent({ type: 'error', error: err.message })");
  });
});

// ── S08/R-H03 — EXECUTABLE router fixtures ──────────────────────────────────
// The source-string checks above cannot prove authorization ORDER. These mount
// the REAL router on a real Express app and execute requests.
//
// DECLARED SPLIT (s08-architecture.md allows it, and it is disclosed here):
//   mocked  — the auth middleware (to control req.user) and the generator (to
//             spy on dispatch). These prove ROUTE ORDER.
//   REAL    — sprintRoutes, sprintService and sprintAccess run for real; the
//             ownership denial itself is produced by the real access code
//             against mocked models, never by mocking the authorization helper.

const { state, modelSpies, generatorSpies } = vi.hoisted(() => {
  const state = { user: { id: 7, role: 'trainer' } };
  const modelSpies = {
    sprintFindByPk: vi.fn(),
    sprintUpdate: vi.fn(async () => undefined),
    weeksFindAll: vi.fn(async () => []),
    slotsFindAll: vi.fn(async () => []),
    slotFindOne: vi.fn(async () => null),
    weekFindOne: vi.fn(async () => null),
    memoryFindAll: vi.fn(async () => []),
    sprintCreate: vi.fn(),
  };
  const generatorSpies = {
    generate: vi.fn(async () => ({ type: 'complete' })),
    regenerate: vi.fn(async () => ({ ok: true })),
  };
  return { state, modelSpies, generatorSpies };
});

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = state.user; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../services/bootcamp/sprintGenerator.mjs', () => ({
  generateSprintClasses: generatorSpies.generate,
  regenerateSlot: generatorSpies.regenerate,
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: async (callback) => callback({ id: 'tx' }) },
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({
    findByPk: modelSpies.sprintFindByPk,
    create: modelSpies.sprintCreate,
    findAll: async () => [],
  }),
  getSprintWeek: () => ({ findAll: modelSpies.weeksFindAll, findOne: modelSpies.weekFindOne }),
  getSprintClassSlot: () => ({ findAll: modelSpies.slotsFindAll, findOne: modelSpies.slotFindOne }),
  getSprintExerciseMemory: () => ({ findAll: modelSpies.memoryFindAll }),
  getBootcampSpaceProfile: () => null,
}));

const OWNER_SPRINT = { id: 12, trainerId: 7, status: 'draft', update: modelSpies.sprintUpdate };
const FOREIGN_SPRINT = { id: 13, trainerId: 8, status: 'draft', update: modelSpies.sprintUpdate };

const buildApp = async () => {
  // Fresh module registry per test: the generation rate limiter and the SSE job
  // map are module-scoped in sprintRoutes, so without this the second POST in a
  // file is throttled (which incidentally proves the limiter is still wired).
  vi.resetModules();
  const { default: sprintRoutes } = await import('../../routes/sprintRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/bootcamp/sprints', sprintRoutes);
  return app;
};

const asTrainer = (id) => { state.user = { id, role: 'trainer' }; };
const asAdmin = (id) => { state.user = { id, role: 'admin' }; };

describe('S08 — Sprint object authorization, executed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asTrainer(7);
    modelSpies.sprintFindByPk.mockImplementation(async (id) => {
      if (String(id) === '12') return OWNER_SPRINT;
      if (String(id) === '13') return FOREIGN_SPRINT;
      return null;
    });
  });

  it('answers a foreign Sprint exactly like a missing one, and reads no children', async () => {
    const app = await buildApp();
    asTrainer(8); // not the owner of #12, and #13 is not his either

    const foreign = await request(app).get('/api/bootcamp/sprints/12');
    const missing = await request(app).get('/api/bootcamp/sprints/999');

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    // Non-disclosing: identical envelope, nothing that reveals ownership.
    expect(foreign.body).toEqual(missing.body);
    expect(JSON.stringify(foreign.body)).not.toMatch(/own|belong|another|permission|not authorized/i);
    // HOSTILE-REVIEW FIX (vacuous assertion): getSprintById loads weeks/slots via
    // findByPk({include}), NEVER via SprintWeek.findAll — so those spies stay
    // uncalled even on the authorized 200 path and could not distinguish allowed
    // from foreign. Assert on the INCLUDE, which only the detail read sends.
    const includeCalls = modelSpies.sprintFindByPk.mock.calls.filter(([, options]) => options?.include);
    expect(includeCalls).toHaveLength(0);
  });

  it('lets the owner read their own Sprint', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/bootcamp/sprints/12');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it('refuses a foreign generation POST before any job, header or generator work', async () => {
    const app = await buildApp();
    asTrainer(8);

    const res = await request(app).post('/api/bootcamp/sprints/12/generate');

    expect(res.status).toBe(404);
    // JSON error, NOT a flushed event-stream.
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-type']).not.toMatch(/event-stream/);
    expect(generatorSpies.generate).not.toHaveBeenCalled();
  });

  it('refuses a foreign reconnect BEFORE reading the job cache or flushing headers', async () => {
    const app = await buildApp();

    // The owner starts generation, so a job IS cached for Sprint 12.
    asTrainer(7);
    await request(app).post('/api/bootcamp/sprints/12/generate');
    expect(generatorSpies.generate).toHaveBeenCalledTimes(1);

    // A foreign trainer reconnects: must not see that job, must not get SSE.
    asTrainer(8);
    const res = await request(app).get('/api/bootcamp/sprints/12/generate/stream');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-type']).not.toMatch(/event-stream/);
  });

  it('refuses a foreign update without touching the model', async () => {
    const app = await buildApp();
    asTrainer(8);

    const res = await request(app).put('/api/bootcamp/sprints/12').send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(modelSpies.sprintUpdate).not.toHaveBeenCalled();
    expect(modelSpies.sprintUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hijacked' }),
    );
  });

  it('lets an explicit admin act on an owned Sprint, passing the admin actor through', async () => {
    const app = await buildApp();
    asAdmin(99);

    const res = await request(app).post('/api/bootcamp/sprints/12/generate');

    expect(res.status).toBe(200);
    expect(generatorSpies.generate).toHaveBeenCalledTimes(1);
    expect(generatorSpies.generate.mock.calls[0][0]).toBe(12);
    expect(generatorSpies.generate.mock.calls[0][1]).toEqual({ userId: 99, role: 'admin' });
  });

  it('passes the normalized actor on the owner path too', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/bootcamp/sprints/12/generate');

    expect(res.status).toBe(200);
    expect(generatorSpies.generate.mock.calls[0][1]).toEqual({ userId: 7, role: 'trainer' });
  });

  it('rejects a malformed id with the sanitized envelope and no model lookup', async () => {
    const app = await buildApp();

    const res = await request(app).get('/api/bootcamp/sprints/not-a-number');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(modelSpies.sprintFindByPk).not.toHaveBeenCalled();
  });

  it('does not echo a downstream exception message to the client', async () => {
    const app = await buildApp();
    generatorSpies.generate.mockRejectedValueOnce(new Error('SEQUELIZE_LEAK_42'));

    const res = await request(app).post('/api/bootcamp/sprints/12/generate');

    expect(JSON.stringify(res.body)).not.toContain('SEQUELIZE_LEAK_42');
  });
});
