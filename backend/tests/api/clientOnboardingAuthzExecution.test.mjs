/**
 * ============================================================================
 * FILE: clientOnboardingAuthzExecution.test.mjs
 * PURPOSE: Drive the REAL /api/client-onboarding routes across roles and prove
 *          the per-handler access tier is the one the route comment claims.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14 (executed-authz coverage slice)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `audit-idor-surface.mjs` clears all three of these handlers INDIRECTLY, by
 * following createQuestionnaire / getQuestionnaire / createMovementScreen out of
 * clientOnboardingRoutes.mjs into clientOnboardingController.mjs. Nothing executes
 * them. The router itself carries only `protect` — every authorization decision
 * lives inside the controller, exactly where a middleware-chain scan cannot see it.
 *
 * THE ASYMMETRY THIS PROTECTS
 * Two of the three run `ensureClientAccess` (allowSelf: true) and the third runs
 * `ensureTrainerAccess` (allowSelf: FALSE). They are one boolean apart in the same
 * helper. So a client may read and write their OWN questionnaire, but may NOT file
 * a movement screen on themselves — a NASM assessment is a clinical record a
 * trainer signs, and a client authoring their own would corrupt the training data
 * the whole planning chain reads. That distinction is invisible in the route file
 * (`// NASM movement screen endpoint (admin/trainer enforced in controller)`) and
 * survives only as long as something executes it. This is that something.
 *
 * SUBJECT vs SCAFFOLD
 * `ensureScopedClientAccess` and its two wrappers ARE the subject — not mocked.
 * Only the model layer, the movement-screen writer, and `protect` are stubbed.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CLIENT_A = { id: 801, role: 'client' };
const CLIENT_B_ID = 802;
const PLAIN_USER = { id: 803, role: 'user' };
const TRAINER = { id: 700, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };

const mocks = vi.hoisted(() => ({
  user: { findByPk: vi.fn() },
  assignment: { findOne: vi.fn(), findAll: vi.fn() },
  questionnaire: { findOne: vi.fn(), create: vi.fn() },
  createMovementScreenRecord: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: mocks.user,
    ClientTrainerAssignment: mocks.assignment,
    ClientOnboardingQuestionnaire: mocks.questionnaire,
    ClientBaselineMeasurements: {},
  }),
  getUser: () => mocks.user,
  getModel: () => ({}),
}));

vi.mock('../../services/clientMovementScreenService.mjs', () => ({
  createMovementScreenRecord: mocks.createMovementScreenRecord,
}));

let currentUser = CLIENT_A;
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

const onboardingRoutes = (await import('../../routes/clientOnboardingRoutes.mjs')).default;

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/client-onboarding', onboardingRoutes);
  return a;
}

/**
 * Every id resolves to a REAL user. Making client B absent would hide a genuine
 * leak behind a 404 — the target must exist for a denial to mean anything.
 */
function seedUsers() {
  mocks.user.findByPk.mockImplementation(async (id) => {
    const n = Number(id);
    if ([CLIENT_A.id, CLIENT_B_ID, PLAIN_USER.id, TRAINER.id].includes(n)) return { id: n, role: 'client' };
    return null;
  });
}

const VALID_RESPONSES = { responses: { goal: 'strength', experience: 'intermediate' } };

const post = (userId, path, body) =>
  request(app()).post(`/api/client-onboarding/${userId}${path}`).send(body);
const get = (userId, path) =>
  request(app()).get(`/api/client-onboarding/${userId}${path}`);

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = CLIENT_A;
  seedUsers();
  mocks.assignment.findOne.mockResolvedValue(null);
  mocks.questionnaire.findOne.mockResolvedValue({
    id: 11, userId: CLIENT_B_ID, status: 'complete', responsesJson: {}, questionnaireVersion: 1,
  });
  mocks.questionnaire.create.mockImplementation(async (p) => ({ id: 12, ...p }));
  mocks.createMovementScreenRecord.mockResolvedValue({ ok: true, movementScreen: { id: 33 } });
});

describe('questionnaire — self-or-assigned-trainer-or-admin', () => {
  it('client A cannot READ client B\'s questionnaire', async () => {
    currentUser = CLIENT_A;
    const res = await get(CLIENT_B_ID, '/questionnaire');
    expect(res.status).toBe(403);
    // A denial must not carry B's record along with it.
    expect(JSON.stringify(res.body)).not.toContain('responsesJson');
    expect(mocks.questionnaire.findOne).not.toHaveBeenCalled();
  });

  it('client A cannot WRITE to client B\'s questionnaire', async () => {
    currentUser = CLIENT_A;
    const res = await post(CLIENT_B_ID, '/questionnaire', VALID_RESPONSES);
    expect(res.status).toBe(403);
    expect(mocks.questionnaire.create).not.toHaveBeenCalled();
  });

  it('a plain `user` role is scoped the same way as `client`', async () => {
    // SELF_ROLES contains both. If one were dropped, that role would fall through
    // to the closing 403 — a lockout, not a leak — so this pins the ALLOW side too.
    currentUser = PLAIN_USER;
    const denied = await get(CLIENT_B_ID, '/questionnaire');
    expect(denied.status).toBe(403);

    const own = await get(PLAIN_USER.id, '/questionnaire');
    expect(own.status).toBeLessThan(400);
  });

  it('an UNASSIGNED trainer is denied', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await get(CLIENT_B_ID, '/questionnaire');
    expect(res.status).toBe(403);
    expect(mocks.questionnaire.findOne).not.toHaveBeenCalled();
  });

  it('an unknown role is denied even against its own id (fails closed)', async () => {
    currentUser = { id: CLIENT_B_ID, role: 'affiliate' };
    const res = await get(CLIENT_B_ID, '/questionnaire');
    expect(res.status).toBe(403);
  });

  it('CONTROL — client A reads their OWN questionnaire', async () => {
    currentUser = CLIENT_A;
    const res = await get(CLIENT_A.id, '/questionnaire');
    expect(res.status).toBeLessThan(400);
  });

  it('CONTROL — an ASSIGNED trainer reads client B', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: CLIENT_B_ID, trainerId: TRAINER.id, status: 'active' });
    const res = await get(CLIENT_B_ID, '/questionnaire');
    expect(res.status).toBeLessThan(400);
  });

  it('CONTROL — admin reads client B', async () => {
    currentUser = ADMIN;
    const res = await get(CLIENT_B_ID, '/questionnaire');
    expect(res.status).toBeLessThan(400);
  });

  it('the trainer assignment lookup is scoped to BOTH ids and an active status', async () => {
    // A gate that queried only trainerId would clear an assigned trainer against
    // every client in the system.
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, status: 'active' });
    await get(CLIENT_B_ID, '/questionnaire');
    expect(mocks.assignment.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: CLIENT_B_ID, trainerId: TRAINER.id, status: 'active',
        }),
      }),
    );
  });
});

describe('movement screen — staff ONLY, self-access deliberately withheld', () => {
  const MOVEMENT_BODY = { parq: { q1: false }, ohsa: { overheadSquat: {} } };

  it('a client cannot file a movement screen on ANOTHER client', async () => {
    currentUser = CLIENT_A;
    const res = await post(CLIENT_B_ID, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBe(403);
    expect(mocks.createMovementScreenRecord).not.toHaveBeenCalled();
  });

  it('a client cannot file a movement screen on THEMSELVES either', async () => {
    // The whole point of ensureTrainerAccess: allowSelf is false. If this ever
    // returns 2xx, clients can author their own NASM assessment and every plan
    // generated downstream from it is built on self-reported clinical data.
    currentUser = CLIENT_A;
    const res = await post(CLIENT_A.id, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBe(403);
    expect(mocks.createMovementScreenRecord).not.toHaveBeenCalled();
  });

  it('a plain `user` cannot file one on themselves either', async () => {
    currentUser = PLAIN_USER;
    const res = await post(PLAIN_USER.id, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBe(403);
    expect(mocks.createMovementScreenRecord).not.toHaveBeenCalled();
  });

  it('an UNASSIGNED trainer cannot file one on client B', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await post(CLIENT_B_ID, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBe(403);
    expect(mocks.createMovementScreenRecord).not.toHaveBeenCalled();
  });

  it('CONTROL — an ASSIGNED trainer CAN file one', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: CLIENT_B_ID, trainerId: TRAINER.id, status: 'active' });
    const res = await post(CLIENT_B_ID, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBeLessThan(400);
    expect(mocks.createMovementScreenRecord).toHaveBeenCalledWith(
      expect.objectContaining({ targetUserId: CLIENT_B_ID, recordedBy: TRAINER.id }),
    );
  });

  it('CONTROL — admin CAN file one', async () => {
    currentUser = ADMIN;
    const res = await post(CLIENT_B_ID, '/movement-screen', MOVEMENT_BODY);
    expect(res.status).toBeLessThan(400);
  });
});

describe('crafted ids cannot smuggle another user past the guard', () => {
  // Each normalises to 802 under a loose parser. parseUserId uses Number() +
  // Number.isInteger, so ' 802' and '802.0' DO coerce — they must still be denied
  // by the ownership comparison, not by the parser. Either outcome is a 4xx; a
  // 2xx here would mean client A reached client B's record.
  const CRAFTED = ['0802', ' 802', '802 ', '+802', '802abc', '802.0', '8e2', '0x322'];

  it.each(CRAFTED)('questionnaire — id %j is never served to client A', async (raw) => {
    currentUser = CLIENT_A;
    const res = await request(app())
      .get(`/api/client-onboarding/${encodeURIComponent(raw)}/questionnaire`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
