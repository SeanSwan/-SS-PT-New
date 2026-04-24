/**
 * Phase 18.C.1A — viewAs read-override API integration tests
 * ==========================================================
 * Covers E1 (/profile) and E2 (/dashboard) on both the canonical
 * (/api/v1/gamification/*) and legacy (/api/gamification/*) mounts.
 *
 * Scope (planning §10.1 + pre-code receipts §3.3):
 *   - L1 global viewAsWriteBlocker mounted on the test app.
 *   - viewAsGuard mounted per-route inside gamificationV1Routes.
 *   - Controllers + services + User model mocked; these tests only
 *     verify route-level wiring: parameter parsing, admin-only actor
 *     gate, eligible-target lookup, effective userId resolution via
 *     getEffectiveReadUserId, and write-block contract on both mount
 *     paths.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { userFindOneMock, getUserProfileMock, getDashboardDataMock } = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  getUserProfileMock: vi.fn(),
  getDashboardDataMock: vi.fn(),
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findOne: userFindOneMock,
    findByPk: vi.fn(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Controllers + service layer are not under test here — stub them so we
// can assert the userId they receive.
vi.mock('../../controllers/gamificationController.mjs', () => ({
  default: {
    getUserProfile: (req, res) => {
      getUserProfileMock(req.params.userId);
      return res.status(200).json({ success: true, userId: req.params.userId });
    },
    getAllAchievements: vi.fn(),
    getAchievement: vi.fn(),
    createAchievement: vi.fn(),
    updateAchievement: vi.fn(),
    deleteAchievement: vi.fn(),
    awardAchievement: vi.fn(),
    updateAchievementProgress: vi.fn(),
    awardPoints: vi.fn(),
    getUserTransactions: vi.fn(),
    getAllRewards: vi.fn(),
    getReward: vi.fn(),
    createReward: vi.fn(),
    updateReward: vi.fn(),
    deleteReward: vi.fn(),
    redeemReward: vi.fn(),
    getAllMilestones: vi.fn(),
    getMilestone: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    checkAndAwardMilestones: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    recordWorkoutCompletion: vi.fn(),
    markNotificationAsRead: vi.fn(),
    debugSeedAchievements: vi.fn(),
    getStreakFreezeStatus: vi.fn(),
    useStreakFreeze: vi.fn(),
    getComebackChallenge: vi.fn(),
    acceptComebackChallenge: vi.fn(),
    getActivityFeed: vi.fn(),
    getWeeklyRecap: vi.fn(),
    getPetConfig: vi.fn(),
    getPet: vi.fn(),
    adoptPet: vi.fn(),
    interactWithPet: vi.fn(),
    recordPetActivity: vi.fn(),
    renamePet: vi.fn(),
    releasePet: vi.fn(),
  },
}));

// Non-test controllers — any method returns a noop 200 handler so route
// registration doesn't crash on missing refs. Only E1/E2 handlers are
// under test. Inline factories to satisfy vi.mock's hoisting constraint.
vi.mock('../../controllers/challengeController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/progressController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/goalController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));
vi.mock('../../controllers/socialController.mjs', () => ({
  default: new Proxy({}, { get: () => (_req, res) => res.status(200).json({ success: true }) }),
}));

vi.mock('../../services/gamificationDashboardService.mjs', () => ({
  getDashboardData: (userId) => {
    getDashboardDataMock(userId);
    return Promise.resolve({ userId });
  },
  getFeaturedData: vi.fn(),
  searchGamification: vi.fn(),
}));

// Auth middleware: map Bearer header to req.user shape. No real JWT.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const header = req.headers.authorization;
    if (header === 'Bearer admin') {
      req.user = { id: 7, role: 'admin' };
      return next();
    }
    if (header === 'Bearer client') {
      req.user = { id: 99, role: 'client' };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  },
  adminOnly: (req, _res, next) => next(),
  trainerOnly: (req, _res, next) => next(),
  trainerOrAdminOnly: (req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  requireAnyRole: () => (_req, _res, next) => next(),
}));

import gamificationV1Routes from '../../routes/gamificationV1Routes.mjs';
import { viewAsWriteBlocker } from '../../middleware/viewAsGuard.mjs';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(viewAsWriteBlocker); // L1 global mount, mirrors backend/core/app.mjs
  app.use('/api/v1/gamification', gamificationV1Routes);
  app.use('/api/gamification', gamificationV1Routes); // legacy alias
  return app;
};

const validClient = {
  id: 42,
  role: 'client',
  isActive: true,
  accountStatus: 'active',
};

describe('viewAs read-override — E1 /profile + E2 /dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindOneMock.mockResolvedValue(validClient);
  });

  describe.each([
    ['canonical', '/api/v1/gamification'],
    ['legacy', '/api/gamification'],
  ])('%s mount (%s)', (_label, base) => {
    it('E1 /profile — admin with valid viewAs resolves effective userId to target', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile?viewAs=42`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, userId: 42 });
      expect(getUserProfileMock).toHaveBeenCalledWith(42);
      expect(userFindOneMock).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it('E1 /profile — admin with no viewAs falls back to self (actor id)', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, userId: 7 });
      expect(userFindOneMock).not.toHaveBeenCalled();
    });

    it('E2 /dashboard — admin with valid viewAs resolves effective userId to target', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/dashboard?viewAs=42`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, dashboard: { userId: 42 } });
      expect(getDashboardDataMock).toHaveBeenCalledWith(42);
    });

    it('E2 /dashboard — admin with no viewAs falls back to self', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/dashboard`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(200);
      expect(getDashboardDataMock).toHaveBeenCalledWith(7);
    });

    it('rejects non-admin actor with viewAs (403 IMPERSONATION_ADMIN_ONLY)', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile?viewAs=42`)
        .set('Authorization', 'Bearer client');

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_ADMIN_ONLY',
      });
      expect(userFindOneMock).not.toHaveBeenCalled();
      expect(getUserProfileMock).not.toHaveBeenCalled();
    });

    it('rejects invalid viewAs (non-positive-integer → 400 IMPERSONATION_INVALID_PARAM)', async () => {
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile?viewAs=abc`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_INVALID_PARAM',
      });
    });

    it('rejects missing target (404 IMPERSONATION_TARGET_NOT_FOUND)', async () => {
      userFindOneMock.mockResolvedValue(null);
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile?viewAs=42`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_TARGET_NOT_FOUND',
      });
    });

    it('rejects stub accountStatus target as NOT_FOUND', async () => {
      userFindOneMock.mockResolvedValue({ ...validClient, accountStatus: 'stub' });
      const app = createApp();
      const res = await request(app)
        .get(`${base}/dashboard?viewAs=42`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_TARGET_NOT_FOUND',
      });
      expect(getDashboardDataMock).not.toHaveBeenCalled();
    });

    it('rejects trainer target role (400 IMPERSONATION_TARGET_INVALID_ROLE)', async () => {
      userFindOneMock.mockResolvedValue({ ...validClient, role: 'trainer' });
      const app = createApp();
      const res = await request(app)
        .get(`${base}/profile?viewAs=42`)
        .set('Authorization', 'Bearer admin');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_TARGET_INVALID_ROLE',
      });
    });

    it('L1 blocks POST with viewAs at any write-capable route (403 IMPERSONATION_READ_ONLY)', async () => {
      const app = createApp();
      // record-workout is a POST route on the same router — any mutation
      // verb with ?viewAs must be blocked at L1 before hitting the handler.
      const res = await request(app)
        .post(`${base}/record-workout?viewAs=42`)
        .set('Authorization', 'Bearer admin')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        success: false,
        code: 'IMPERSONATION_READ_ONLY',
      });
    });
  });
});
