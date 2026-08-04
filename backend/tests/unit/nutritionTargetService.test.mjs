/**
 * Regression: nutrition target bounds + adherence math (S1.1/S1.2, nutrition
 * blueprint 2026-08-04). Locks in: clinical bounds validation (hallucinated
 * targets die before persistence), the 4/4/9 cross-field check, AI-draft
 * forcing (the model proposes, a human activates), user-local streak math,
 * and inferred-entry surfacing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(async (fn) => fn({})),
  targetCreate: vi.fn(),
  targetUpdate: vi.fn(),
  targetFindOne: vi.fn(),
  targetFindByPk: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: mocks.transaction },
}));

vi.mock('../../models/NutritionTarget.mjs', () => ({
  default: {
    create: mocks.targetCreate,
    update: mocks.targetUpdate,
    findOne: mocks.targetFindOne,
    findByPk: mocks.targetFindByPk,
  },
}));

vi.mock('../../models/DailyMacroLog.mjs', () => ({ default: { findAll: vi.fn() } }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn() } }));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { validateTargetBounds, setNutritionTarget } =
  await import('../../services/nutrition/nutritionTargetService.mjs');
const { computeLogStreak, summarizeAdherence } =
  await import('../../services/nutrition/nutritionAdherenceService.mjs');

describe('validateTargetBounds (S2.1 brought forward)', () => {
  it('accepts a sane trainer-authored target', () => {
    const result = validateTargetBounds({ dailyCalories: 2100, proteinGrams: 150, carbsGrams: 210, fatGrams: 60 });
    expect(result.ok).toBe(true);
    expect(result.fields.dailyCalories).toBe(2100);
  });

  it('kills hallucinated dangerous targets before persistence', () => {
    expect(validateTargetBounds({ dailyCalories: 600 }).ok).toBe(false);      // starvation
    expect(validateTargetBounds({ sodiumLimitMg: 40000 }).ok).toBe(false);    // absurd sodium
    expect(validateTargetBounds({ proteinGrams: 900 }).ok).toBe(false);
    expect(validateTargetBounds({ dailyCalories: 'lots' }).ok).toBe(false);
    expect(validateTargetBounds({}).ok).toBe(false);                          // empty target
  });

  it('rejects jointly-impossible macro combinations (4/4/9 check)', () => {
    const result = validateTargetBounds({ dailyCalories: 1200, proteinGrams: 300, carbsGrams: 300, fatGrams: 100 });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/4\/4\/9/);
  });
});

describe('setNutritionTarget activation law (S1.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn) => fn({}));
    mocks.targetCreate.mockImplementation(async (row) => ({ id: 1, ...row }));
  });

  it('AI-generated targets are FORCED to draft even when activate=true', async () => {
    const result = await setNutritionTarget({
      userId: 42, createdBy: 7, source: 'ai_generated', activate: true,
      fields: { dailyCalories: 2000 }, effectiveFrom: '2026-08-04',
    });
    expect(result.ok).toBe(true);
    expect(mocks.targetCreate.mock.calls[0][0]).toMatchObject({ status: 'draft', activatedBy: null });
    // Draft creation must NOT supersede the current active target.
    expect(mocks.targetUpdate).not.toHaveBeenCalled();
  });

  it('manual activation supersedes the previous active target in the same transaction', async () => {
    const result = await setNutritionTarget({
      userId: 42, createdBy: 7, source: 'manual', activate: true,
      fields: { dailyCalories: 2000 }, effectiveFrom: '2026-08-04',
    });
    expect(result.ok).toBe(true);
    expect(mocks.targetUpdate).toHaveBeenCalledWith(
      { status: 'superseded', effectiveTo: '2026-08-04' },
      expect.objectContaining({ where: { userId: 42, status: 'active' } })
    );
    expect(mocks.targetCreate.mock.calls[0][0]).toMatchObject({ status: 'active', activatedBy: 7 });
  });

  it('rejects invalid effectiveFrom and out-of-bounds fields without touching the DB', async () => {
    const bad = await setNutritionTarget({
      userId: 42, createdBy: 7, fields: { dailyCalories: 100 }, effectiveFrom: '2026-08-04',
    });
    expect(bad.ok).toBe(false);
    const badDate = await setNutritionTarget({
      userId: 42, createdBy: 7, fields: { dailyCalories: 2000 }, effectiveFrom: 'today',
    });
    expect(badDate.ok).toBe(false);
    expect(mocks.targetCreate).not.toHaveBeenCalled();
  });
});

describe('adherence math (S1.2)', () => {
  it('computes user-local streaks that do not punish an unlogged today', () => {
    expect(computeLogStreak(['2026-08-04', '2026-08-03', '2026-08-02'], '2026-08-04')).toBe(3);
    // Today not yet logged: streak counts from yesterday, unbroken.
    expect(computeLogStreak(['2026-08-03', '2026-08-02'], '2026-08-04')).toBe(2);
    // Gap two days ago: streak is over.
    expect(computeLogStreak(['2026-08-01'], '2026-08-04')).toBe(0);
    expect(computeLogStreak([], '2026-08-04')).toBe(0);
    // Month boundary walks correctly.
    expect(computeLogStreak(['2026-08-01', '2026-07-31', '2026-07-30'], '2026-08-01')).toBe(3);
  });

  it('summarizes adherence against a target and surfaces inferred entries', () => {
    const entries = [
      { date: '2026-08-03', calories: 1800, protein: 140, source: 'manual', reviewStatus: 'client_confirmed' },
      { date: '2026-08-03', calories: 300, protein: 20, source: 'coach_inferred', reviewStatus: 'needs_review' },
      { date: '2026-08-04', calories: 2000, protein: 100, source: 'manual' },
    ];
    const target = { dailyCalories: 2100, proteinGrams: 150 };
    const result = summarizeAdherence(entries, target, 7);

    expect(result.loggedDays).toBe(2);
    expect(result.consistencyScore).toBe(29); // 2/7
    expect(result.proteinTargetHitRate).toBe(50); // day1 160g >= 135g hit; day2 100g miss
    expect(result.inferredEntryCount).toBe(1);
    expect(result.needsReviewCount).toBe(1);
  });

  it('returns null rates when no target exists instead of fake zeros', () => {
    const result = summarizeAdherence([{ date: '2026-08-04', calories: 900, protein: 60 }], null, 7);
    expect(result.proteinTargetHitRate).toBeNull();
    expect(result.avgCaloriesPctOfTarget).toBeNull();
    expect(result.loggedDays).toBe(1);
  });
});
