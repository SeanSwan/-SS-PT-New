/**
 * Cortex P0 Safety Truth — pain-context truth regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.1-§5.2
 * Eval-suite tests 1-2:
 *   1. An active unresolved pain entry OLDER than 7 days must remain in generation context.
 *   2. "No active pain" / "pain unknown" / "never collected" are distinct source states.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DAY_MS = 24 * 60 * 60 * 1000;

const mocks = vi.hoisted(() => {
  const emptyFindAll = vi.fn();
  const emptyFindOne = vi.fn();
  const userFindByPk = vi.fn();
  const painFindAll = vi.fn();
  const painCount = vi.fn();
  const query = vi.fn();
  const trainingVault = vi.fn();

  const emptyModel = { findAll: emptyFindAll, findOne: emptyFindOne, count: vi.fn() };
  const painModel = { findAll: painFindAll, count: painCount, findOne: emptyFindOne };

  return { emptyFindAll, emptyFindOne, userFindByPk, painFindAll, painCount, query, trainingVault, emptyModel, painModel };
});

vi.mock('../../database.mjs', () => ({
  default: { QueryTypes: { SELECT: 'SELECT' }, query: mocks.query },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../services/clientTrainingVaultContextService.mjs', () => ({
  buildClientTrainingVaultContext: mocks.trainingVault,
}));

vi.mock('../../models/index.mjs', () => ({
  getClientPainEntry: () => mocks.painModel,
  getFormAnalysis: () => mocks.emptyModel,
  getMovementProfile: () => mocks.emptyModel,
  getEquipmentProfile: () => mocks.emptyModel,
  getEquipmentItem: () => mocks.emptyModel,
  getVariationLog: () => mocks.emptyModel,
  getCustomExercise: () => mocks.emptyModel,
  getDailyWorkoutForm: () => mocks.emptyModel,
  getWorkoutSession: () => mocks.emptyModel,
  getUser: () => ({ findByPk: mocks.userFindByPk }),
  getOrder: () => mocks.emptyModel,
  getOrderItem: () => mocks.emptyModel,
  getStorefrontItem: () => mocks.emptyModel,
  getGoal: () => mocks.emptyModel,
  getClientProgress: () => mocks.emptyModel,
  getBodyMeasurement: () => mocks.emptyModel,
  getLongTermProgramPlan: () => ({ findOne: mocks.emptyFindOne }),
  getModel: () => null,
  Op: { gte: 'gte' },
}));

const { getClientContext } = await import('../../services/clientIntelligenceService.mjs');

function makePainEntry({ id, daysOld, painLevel, bodyRegion = 'shoulder', updatedDaysAgo = daysOld }) {
  const createdAt = new Date(Date.now() - daysOld * DAY_MS);
  const updatedAt = new Date(Date.now() - updatedDaysAgo * DAY_MS);
  return {
    id,
    bodyRegion,
    painLevel,
    painType: 'aching',
    isActive: true,
    createdAt,
    updatedAt,
  };
}

describe('clientIntelligenceService pain-context truth (Cortex P0 §5.1-§5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emptyFindAll.mockResolvedValue([]);
    mocks.emptyFindOne.mockResolvedValue(null);
    mocks.query.mockResolvedValue([]);
    mocks.trainingVault.mockResolvedValue(null);
    mocks.painFindAll.mockResolvedValue([]);
    mocks.painCount.mockResolvedValue(0);
    mocks.userFindByPk.mockResolvedValue({ id: 99, role: 'admin' });
  });

  it('test 1: loads ALL active pain — the query has no createdAt window and a 45-day-old active entry stays in context', async () => {
    mocks.painFindAll.mockResolvedValue([
      makePainEntry({ id: 11, daysOld: 45, painLevel: 8 }),
    ]);
    mocks.painCount.mockResolvedValue(3);

    const context = await getClientContext(42, 99);

    const painWhere = mocks.painFindAll.mock.calls[0][0].where;
    expect(painWhere).toEqual(expect.objectContaining({ userId: 42, isActive: true }));
    expect(painWhere).not.toHaveProperty('createdAt');
    expect(mocks.painFindAll.mock.calls[0][0].limit).toBe(100);

    expect(context.pain.status).toBe('loaded_active_issue');
    expect(context.pain.activeIssueCount).toBe(1);
    // Slice 0/1 (F1, 2026-08-04): ACTIVE severity 8 EXCLUDES regardless of
    // age — the old behavior (warning-only after 72h) let chronic severe
    // pain silently age out of protection. The stale >=7 additionally warns
    // for trainer re-confirmation.
    expect(context.pain.exclusions).toEqual([
      expect.objectContaining({
        bodyRegion: 'shoulder',
        painLevel: 8,
        entryId: 11,
        reason: expect.stringContaining('re-confirmation'),
      }),
    ]);
    expect(context.pain.warnings).toEqual([
      expect.objectContaining({ bodyRegion: 'shoulder', painLevel: 8, entryId: 11 }),
    ]);
  });

  it('flags chronic active issues older than 30 days as stale-for-reassessment instead of dropping them', async () => {
    mocks.painFindAll.mockResolvedValue([
      makePainEntry({ id: 21, daysOld: 45, painLevel: 5 }),
      makePainEntry({ id: 22, daysOld: 10, painLevel: 6, bodyRegion: 'neck', updatedDaysAgo: 2 }),
    ]);
    mocks.painCount.mockResolvedValue(2);

    const context = await getClientContext(42, 99);

    expect(context.pain.staleActiveIssues).toEqual([
      expect.objectContaining({ entryId: 21, bodyRegion: 'shoulder' }),
    ]);
    // lastPainReviewAt = newest touch across active entries (entry 22 updated 2 days ago)
    const lastReview = new Date(context.pain.lastPainReviewAt).getTime();
    expect(Date.now() - lastReview).toBeLessThan(3 * DAY_MS);
  });

  it('test 2a: loaded with zero active but prior history → loaded_no_active_issue (NOT never_collected)', async () => {
    mocks.painFindAll.mockResolvedValue([]);
    mocks.painCount.mockResolvedValue(4);

    const context = await getClientContext(42, 99);
    expect(context.pain.status).toBe('loaded_no_active_issue');
    expect(context.pain.activeIssueCount).toBe(0);
    expect(context.criticalDataUnavailable).toBe(false);
  });

  it('test 2b: no pain entry has EVER been collected → never_collected', async () => {
    mocks.painFindAll.mockResolvedValue([]);
    mocks.painCount.mockResolvedValue(0);

    const context = await getClientContext(42, 99);
    expect(context.pain.status).toBe('never_collected');
  });

  it('test 2c: pain fetch failure → unavailable + criticalFailures (never silently "no pain")', async () => {
    mocks.painFindAll.mockRejectedValue(new Error('connection reset'));
    mocks.painCount.mockResolvedValue(2);

    const context = await getClientContext(42, 99);
    expect(context.pain.status).toBe('unavailable');
    expect(context.criticalDataUnavailable).toBe(true);
    expect(context.criticalFailures).toContain('pain_entries');
  });

  it('72h auto-exclude still fires for recent severe pain (regression lock on existing behavior)', async () => {
    mocks.painFindAll.mockResolvedValue([
      makePainEntry({ id: 31, daysOld: 1, painLevel: 8 }),
    ]);
    mocks.painCount.mockResolvedValue(1);

    const context = await getClientContext(42, 99);
    expect(context.pain.exclusions).toEqual([
      expect.objectContaining({ entryId: 31, bodyRegion: 'shoulder' }),
    ]);
    expect(context.pain.excludedMuscles).toContain('rotator_cuff');
  });
});
