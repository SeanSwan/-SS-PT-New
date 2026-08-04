/**
 * nutritionLogAchievementEvaluator contract (nutrition blueprint Phase 3, S3.1).
 * Locks the properties that make it safe to fire on every macro write:
 * it awards exactly at the encoded thresholds (by NAME, immune to tier-row
 * maxProgress scaling), it is idempotent (owned rows excluded; concurrent
 * unique-violations swallowed WITHOUT re-paying XP), XP goes through the
 * ledger with the `nutrition:{userId}:{achievementId}` idempotency key and
 * source 'nutrition_log', and it NEVER throws — the macro write path fires it
 * un-awaited, so a throw here would be an unhandled rejection in production.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { evaluateNutritionLogAchievements } =
  await import('../../services/gamification/nutritionLogAchievementEvaluator.mjs');

const ACH = (id, name, extra = {}) => ({ id, name, title: name, xpReward: 40, ...extra });

const makeHarness = ({ distinctDays = 0, streak = 0, owned = [], catalog = [], createImpl } = {}) => {
  const created = [];
  const pointsService = { recordLedgerEntry: vi.fn(async () => ({ success: true })) };
  return {
    created,
    pointsService,
    getStreak: vi.fn(async () => streak),
    models: {
      DailyMacroLog: { count: vi.fn(async () => distinctDays) },
      UserAchievement: {
        findAll: vi.fn(async () => owned.map((id) => ({ achievementId: id }))),
        create: vi.fn(async (row) => {
          if (createImpl) return createImpl(row);
          created.push(row);
          return row;
        }),
      },
      // The real query filters by name/isActive/owned in SQL; the stub returns what
      // SQL would have, so tests exercise the JS threshold gate, not the WHERE clause.
      Achievement: { findAll: vi.fn(async () => catalog) },
    },
  };
};

const run = (h, userId = 42) => evaluateNutritionLogAchievements({
  userId, models: h.models, getStreak: h.getStreak, pointsService: h.pointsService,
});

describe('evaluateNutritionLogAchievements', () => {
  it('awards log-count achievements at their thresholds and pays XP through the ledger', async () => {
    const h = makeHarness({
      distinctDays: 7,
      catalog: [ACH(1, 'log_nutrition_1'), ACH(2, 'log_nutrition_7', { xpReward: 40 }), ACH(3, 'log_nutrition_30')],
    });
    const result = await run(h);

    expect(result.awarded.map((a) => a.name)).toEqual(['log_nutrition_1', 'log_nutrition_7']);
    expect(h.created).toHaveLength(2);
    expect(h.created[0]).toMatchObject({ userId: 42, achievementId: 1, isCompleted: true, progress: 100, pointsAwarded: 40 });
    expect(h.pointsService.recordLedgerEntry).toHaveBeenCalledTimes(2);
    expect(h.pointsService.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      points: 40,
      source: 'nutrition_log',
      idempotencyKey: 'nutrition:42:2',
    }), null);
  });

  it('awards streak achievements from the user-local streak, not the day count', async () => {
    const h = makeHarness({
      distinctDays: 50, // plenty of scattered days...
      streak: 3,        // ...but only a 3-day consecutive run
      catalog: [ACH(10, 'nutrition_streak_3'), ACH(11, 'nutrition_streak_7'), ACH(12, 'nutrition_streak_30')],
    });
    const result = await run(h);

    expect(result.awarded.map((a) => a.name)).toEqual(['nutrition_streak_3']);
    expect(result.streak).toBe(3);
  });

  it('refuses achievements below threshold even when the catalog returns them', async () => {
    const h = makeHarness({ distinctDays: 5, catalog: [ACH(2, 'log_nutrition_7')] });
    const result = await run(h);
    expect(result.awarded).toHaveLength(0);
    expect(h.created).toHaveLength(0);
    expect(h.pointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('excludes already-owned achievements from the catalog query (idempotency)', async () => {
    const h = makeHarness({ distinctDays: 10, owned: [1, 2], catalog: [] });
    await run(h);
    const where = h.models.Achievement.findAll.mock.calls[0][0].where;
    expect(where.id).toBeDefined();   // notIn owned
    expect(where.name).toBeDefined(); // only the seven evaluated names
  });

  it('swallows a concurrent unique-violation; double-pay is blocked by the ledger key', async () => {
    const dup = Object.assign(new Error('duplicate key'), { parent: { code: '23505' } });
    const h = makeHarness({
      distinctDays: 1,
      catalog: [ACH(1, 'log_nutrition_1')],
      createImpl: () => { throw dup; },
    });
    const result = await run(h);
    expect(result.awarded).toHaveLength(0);
    // XP-first ordering: the ledger IS called, but the per-achievement
    // idempotency key means a concurrent winner's payment dedupes this one.
    expect(h.pointsService.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'nutrition:42:1' }), null,
    );
  });

  it('NEVER throws — a real database error is logged and swallowed (fired un-awaited)', async () => {
    const boom = Object.assign(new Error('connection terminated'), { parent: { code: '57P01' } });
    const h = makeHarness({
      distinctDays: 1,
      catalog: [ACH(1, 'log_nutrition_1')],
      createImpl: () => { throw boom; },
    });
    await expect(run(h)).resolves.toMatchObject({ awarded: [], error: 'connection terminated' });

    const h2 = makeHarness();
    h2.models.DailyMacroLog.count.mockRejectedValue(new Error('db down'));
    await expect(run(h2)).resolves.toMatchObject({ awarded: [], error: 'db down' });
  });

  it('returns an empty result rather than throwing when models or userId are absent', async () => {
    await expect(evaluateNutritionLogAchievements({}))
      .resolves.toEqual({ awarded: [], distinctDays: 0, streak: 0 });
    await expect(evaluateNutritionLogAchievements({ userId: 1, models: {} }))
      .resolves.toEqual({ awarded: [], distinctDays: 0, streak: 0 });
  });

  it('awards nothing (and skips the catalog) when the user has never logged', async () => {
    const h = makeHarness({ distinctDays: 0, catalog: [ACH(1, 'log_nutrition_1')] });
    const result = await run(h);
    expect(result.awarded).toHaveLength(0);
    expect(h.models.Achievement.findAll).not.toHaveBeenCalled();
    expect(h.getStreak).not.toHaveBeenCalled();
  });

  it('tolerates a non-numeric xpReward: no NaN row, no zero-point ledger call', async () => {
    const h = makeHarness({ distinctDays: 1, catalog: [ACH(1, 'log_nutrition_1', { xpReward: null })] });
    const result = await run(h);
    expect(result.awarded).toEqual([{ achievementId: 1, name: 'log_nutrition_1', xpReward: 0 }]);
    expect(h.created[0].pointsAwarded).toBe(0);
    // recordLedgerEntry rejects points < 1 — the evaluator must not call it at all.
    expect(h.pointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });
});
