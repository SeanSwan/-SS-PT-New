/**
 * Shared setup for the CoachSignal contract suites.
 *
 * WHY: `coachSignalIntegrity.contract.test.mjs` was 312 lines against `06-bans.md` #50's 300-line
 * budget (hostile review R5-08), and ~100 of them were the mock rig. Two suites now need that rig,
 * so it lives here rather than being duplicated — a copy would drift.
 *
 * ── THE HOISTING RULE, AND WHY THIS FILE IS SHAPED THIS WAY ──────────────────────
 * `vi.mock(path, factory)` is hoisted ABOVE the imports of the file it appears in, so its factory
 * may only close over variables already initialised at that moment. Three arrangements were tried
 * and MEASURED here; two of them fail:
 *
 *   · Factories referencing a plain `const` in the same file — e.g. `mockCreateNotification` —
 *     fail with `ReferenceError: mockCreateNotification is not defined`. The call looks correctly
 *     ordered to a reader; it is not.
 *   · Factories living in a function that receives the mocks as a PARAMETER fail with
 *     `ReferenceError: m is not defined`, because the factory's own hoisting lifts it out of the
 *     function body entirely. "Declare them in the caller and re-export" fails a third way:
 *     `VitestError: Cannot export hoisted variable.`
 *
 * So the factories stay in this module, with no callable wrapper, and declare their own mocks with
 * a hoisted block HERE. `vi` is imported at the top of this file; that import is hoisted, so the
 * hoisted block below and the `vi.mock` calls after it both see it. Everything the factories
 * reference is then bound before they run.
 *
 * The consequence for a suite: importing this module performs the module replacements, and its
 * FIRST import of the router is the one that gets the mocked dependency graph.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, vi } from 'vitest';

// Hoisted, so it is initialised before the `vi.mock` factories below run. `vi` is reachable
// because this module's `import { vi } from 'vitest'` is itself hoisted ahead of everything.
const {
  mockSignalFindOne, mockSignalCount, mockSignalCreate,
  mockPostFindOne, mockAssignmentFindOne, mockUserFindByPk, mockCreateNotification,
  mockTransaction, mockQuery, session,
} = await vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    mockSignalFindOne: fn(), mockSignalCount: fn(), mockSignalCreate: fn(),
    mockPostFindOne: fn(), mockAssignmentFindOne: fn(), mockUserFindByPk: fn(),
    mockCreateNotification: fn(),
    // D2: quota admission runs inside `CoachSignal.sequelize.transaction(...)` and takes a
    // PostgreSQL advisory lock before counting. These two are the seam that lets a mocked model
    // exercise that path at all — without them the route throws before reaching the count.
    mockTransaction: fn(), mockQuery: fn(),
    // `id` is a STRING on purpose: authMiddleware attaches `req.user.id` via toStringId while
    // Sequelize INTEGER columns surface as numbers, so the route must normalise both.
    session: { user: { id: '7', role: 'trainer' } },
  };
});

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = session.user; next(); },
}));
vi.mock('../../models/social/CoachSignal.mjs', () => ({
  default: {
    findOne: mockSignalFindOne,
    count: mockSignalCount,
    create: mockSignalCreate,
    sequelize: { transaction: mockTransaction, query: mockQuery },
  },
}));
vi.mock('../../models/social/SocialPost.mjs', () => ({ default: { findOne: mockPostFindOne } }));
vi.mock('../../models/ClientTrainerAssignment.mjs', () => ({ default: { findOne: mockAssignmentFindOne } }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: mockUserFindByPk } }));
vi.mock('../../controllers/notificationController.mjs', () => ({ createNotification: mockCreateNotification }));

export const mocks = {
  mockSignalFindOne, mockSignalCount, mockSignalCreate, mockPostFindOne, mockAssignmentFindOne,
  mockUserFindByPk, mockCreateNotification, mockTransaction, mockQuery, session,
};

export const COACH = { id: '7', role: 'trainer' };
export const MEMBER_AUTHOR = 42;

export const app = express();
app.use(express.json());

/** POST a signal as the coach, defaulting `postId` so each test names only what it varies. */
export const post = (payload = {}) =>
  request(app).post('/api/social/coach-signals').send({ postId: 3, ...payload });

/**
 * Mount the router and install the per-test reset. Await at the top of a suite — the dynamic
 * import here is what binds the mocks registered above to the router graph.
 */
export const installCoachSignalHarness = async () => {
  const { default: coachSignalRoutes } = await import('../../routes/social/coachSignalRoutes.mjs');
  app.use('/api/social/coach-signals', coachSignalRoutes);

  beforeEach(() => {
    vi.useRealTimers();
    session.user = { ...COACH };
    mockPostFindOne.mockReset().mockResolvedValue({ id: 3, userId: MEMBER_AUTHOR });
    mockAssignmentFindOne.mockReset().mockResolvedValue({ id: 1 });
    mockSignalFindOne.mockReset().mockResolvedValue(null);
    mockSignalCount.mockReset().mockResolvedValue(0);
    mockSignalCreate.mockReset().mockResolvedValue({
      id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date(),
    });
    // Run the transaction body against a stub handle so the admission path actually executes.
    mockTransaction.mockReset().mockImplementation(async (work) => work({ id: 'test-transaction' }));
    mockQuery.mockReset().mockResolvedValue([[], 0]);
    mockUserFindByPk.mockReset().mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Coach', username: 'ada' });
    mockCreateNotification.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
};
