/**
 * ============================================================================
 * FILE: badgeConsentAuthzExecution.test.mjs
 * PURPOSE: Drive the two remaining controller-hop handlers that expose another
 *          user's identity — badge display and AI-consent status — and prove the
 *          ownership gate holds when the route is actually called.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14 (executed-authz coverage slice)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Both are cleared INDIRECTLY by `audit-idor-surface.mjs` — it must follow
 * `badgeController.mjs:setUserBadgeDisplay` and
 * `aiConsentController.mjs:getAiConsentStatus` out of their route files to see any
 * check at all. Neither had an executed test.
 *
 * WHAT MAKES THESE TWO WORTH PAIRING
 * They fail in opposite directions, so the same bug looks different in each:
 *
 *  - BADGE DISPLAY is a WRITE that flips a record public. A hole here does not leak
 *    data to the attacker; it publishes the VICTIM's data to everyone. The blast
 *    radius is the victim's audience, not the attacker's screen — which is why an
 *    IDOR review scanning for "did B's data come back in the response" would score
 *    a broken version of this endpoint as clean.
 *
 *  - CONSENT STATUS is a READ whose 403 branch is role-shaped, not id-shaped: the
 *    client check (`requesterRole === 'client' && target !== requester`) does not
 *    cover role `user`. That is intentional here — but it means the ONLY thing
 *    standing between a plain `user` and someone else's consent record is the
 *    trainer-assignment branch not applying to them. Pinning current behaviour is
 *    the point: if it ever changes, this test is the alarm.
 *
 * SUBJECT vs SCAFFOLD: the controllers' own gates are the subject. Auth middleware,
 * rate limiter, models and the badge service are scaffold.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER = { id: 901, role: 'client' };
const VICTIM_ID = 902;
const TRAINER = { id: 700, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };
const BADGE_ID = '3f1a9c88-0d2e-4a77-9b3c-51d0c6a2e4f0';

const mocks = vi.hoisted(() => ({
  setUserBadgeDisplay: vi.fn(),
  user: { findByPk: vi.fn() },
  assignment: { findOne: vi.fn() },
  privacyProfile: { findOne: vi.fn() },
}));

let currentUser = OWNER;

vi.mock('../../middleware/auth.mjs', () => ({
  authenticateToken: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

// aiRoutes drags in a wide slice of the AI subsystem, so this mock has to cover
// authMiddleware's whole export surface. Enumerated explicitly rather than via
// importOriginal: the real module opens a DB connection at import time.
const pass = (req, _res, next) => { req.user = { ...currentUser }; next(); };
const allow = (_req, _res, next) => next();
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: pass,
  adminOnly: allow,
  admin: allow,
  isAdmin: allow,
  trainerOnly: allow,
  clientOnly: allow,
  trainerOrAdminOnly: allow,
  authorize: () => allow,
  requireAnyRole: () => allow,
  ownerOrAdminOnly: () => allow,
  authorizeResourceAccess: () => allow,
  checkTrainerClientRelationship: allow,
  requireOwnershipOrTrainer: allow,
  rateLimiter: () => allow,
  AI_ACTION_PERMISSIONS: {},
  isAIActionAllowed: () => true,
  default: { protect: pass, adminOnly: allow },
}));

vi.mock('../../middleware/rateLimiter.mjs', () => ({
  apiLimiter: (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
  default: () => (_req, _res, next) => next(),
}));

vi.mock('../../services/badgeService.mjs', () => ({
  default: { setUserBadgeDisplay: mocks.setUserBadgeDisplay },
  badgeService: { setUserBadgeDisplay: mocks.setUserBadgeDisplay },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: mocks.user,
    ClientTrainerAssignment: mocks.assignment,
    AiPrivacyProfile: mocks.privacyProfile,
  }),
  getUser: () => mocks.user,
  getModel: () => ({}),
}));

const badgeRoutes = (await import('../../routes/badgeRoutes.mjs')).default;
const aiRoutes = (await import('../../routes/aiRoutes.mjs')).default;

function app(router, mount) {
  const a = express();
  a.use(express.json());
  a.use(mount, router);
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = OWNER;
  mocks.setUserBadgeDisplay.mockResolvedValue({ id: 1, isDisplayed: true });
  mocks.user.findByPk.mockImplementation(async (id) => ({ id: Number(id) }));
  mocks.assignment.findOne.mockResolvedValue(null);
  mocks.privacyProfile.findOne.mockResolvedValue({
    userId: VICTIM_ID, aiEnabled: true, consentVersion: 2, consentedAt: new Date(), withdrawnAt: null,
  });
});

describe('badge display — publishing someone else\'s badge', () => {
  const flip = (userId, isDisplayed = true) =>
    request(app(badgeRoutes, '/api/badges'))
      .put(`/api/badges/user/${userId}/${BADGE_ID}/display`)
      .send({ isDisplayed });

  it('a client cannot flip ANOTHER user\'s badge to public', async () => {
    currentUser = OWNER;
    const res = await flip(VICTIM_ID);
    expect(res.status).toBe(403);
    // The service must never be reached — a denial that still wrote would be worse
    // than a denial that leaked, because the write is what goes public.
    expect(mocks.setUserBadgeDisplay).not.toHaveBeenCalled();
  });

  it('a TRAINER cannot flip a client\'s badge — this gate is admin-or-self, not staff', async () => {
    // Deliberately distinct from every other surface in this slice: an ASSIGNED
    // trainer is allowed to read a client's questionnaire but is NOT allowed to
    // publish their badge. Coaching access is not publication consent.
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: VICTIM_ID, trainerId: TRAINER.id, status: 'active' });
    const res = await flip(VICTIM_ID);
    expect(res.status).toBe(403);
    expect(mocks.setUserBadgeDisplay).not.toHaveBeenCalled();
  });

  it('a client cannot HIDE another user\'s badge either (denial is not read-only)', async () => {
    currentUser = OWNER;
    const res = await flip(VICTIM_ID, false);
    expect(res.status).toBe(403);
    expect(mocks.setUserBadgeDisplay).not.toHaveBeenCalled();
  });

  it('CONTROL — a client CAN flip their OWN badge', async () => {
    currentUser = OWNER;
    const res = await flip(OWNER.id);
    expect(res.status).toBeLessThan(400);
    expect(mocks.setUserBadgeDisplay).toHaveBeenCalledWith(
      expect.objectContaining({ userId: OWNER.id, isDisplayed: true }),
    );
  });

  it('CONTROL — an admin CAN flip anyone\'s badge', async () => {
    currentUser = ADMIN;
    const res = await flip(VICTIM_ID);
    expect(res.status).toBeLessThan(400);
  });

  // parsePositiveInteger is strict, so each of these is rejected before the
  // comparison. A 2xx would mean a loose parser let '0902' become 902.
  const CRAFTED = ['0902', ' 902', '902 ', '+902', '902abc', '902.0', '9e2', '0x386'];
  it.each(CRAFTED)('id %j never reaches the badge write', async (raw) => {
    currentUser = OWNER;
    const res = await request(app(badgeRoutes, '/api/badges'))
      .put(`/api/badges/user/${encodeURIComponent(raw)}/${BADGE_ID}/display`)
      .send({ isDisplayed: true });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(mocks.setUserBadgeDisplay).not.toHaveBeenCalled();
  });
});

describe('AI consent status — reading whose data the AI may touch', () => {
  const status = (userId) =>
    request(app(aiRoutes, '/api/ai')).get(`/api/ai/consent/status/${userId}`);

  it('a client cannot read another user\'s consent status', async () => {
    currentUser = OWNER;
    const res = await status(VICTIM_ID);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('consentVersion');
    expect(mocks.privacyProfile.findOne).not.toHaveBeenCalled();
  });

  it('an UNASSIGNED trainer cannot read a client\'s consent status', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await status(VICTIM_ID);
    expect(res.status).toBe(403);
    expect(mocks.privacyProfile.findOne).not.toHaveBeenCalled();
  });

  it('the trainer gate queries BOTH ids and an active status', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, status: 'active' });
    await status(VICTIM_ID);
    expect(mocks.assignment.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: VICTIM_ID, trainerId: TRAINER.id, status: 'active',
        }),
      }),
    );
  });

  it('a target that does not exist is a 404, not a silent empty profile', async () => {
    currentUser = ADMIN;
    mocks.user.findByPk.mockResolvedValue(null);
    const res = await status(VICTIM_ID);
    expect(res.status).toBe(404);
    expect(mocks.privacyProfile.findOne).not.toHaveBeenCalled();
  });

  it('CONTROL — a client CAN read their own consent status', async () => {
    currentUser = OWNER;
    mocks.privacyProfile.findOne.mockResolvedValue({
      userId: OWNER.id, aiEnabled: true, consentVersion: 2, consentedAt: new Date(), withdrawnAt: null,
    });
    const res = await status(OWNER.id);
    expect(res.status).toBeLessThan(400);
  });

  it('CONTROL — an ASSIGNED trainer CAN read their client\'s consent status', async () => {
    currentUser = TRAINER;
    mocks.assignment.findOne.mockResolvedValue({ id: 5, clientId: VICTIM_ID, trainerId: TRAINER.id, status: 'active' });
    const res = await status(VICTIM_ID);
    expect(res.status).toBeLessThan(400);
  });

  it('CONTROL — an admin CAN read anyone\'s consent status', async () => {
    currentUser = ADMIN;
    const res = await status(VICTIM_ID);
    expect(res.status).toBeLessThan(400);
  });
});
