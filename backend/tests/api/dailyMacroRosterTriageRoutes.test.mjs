import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeApp, mocks, resetRosterRouteMocks } from './dailyMacroRosterTriageRoutes.harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('GET /api/macros/roster-triage', () => {
  beforeEach(resetRosterRouteMocks);

  it('returns one assignment-guarded batch nutrition triage payload for requested clients', async () => {
    mocks.dailyMacroLogFindAll.mockResolvedValue([
      {
        userId: 101,
        date: '2026-06-20',
        mealType: 'breakfast',
        calories: 320,
        protein: 20,
        carbs: 35,
        fat: 11,
        fiber: 4,
        sugar: 30,
        sodium: 1000,
      },
      {
        userId: 101,
        date: '2026-06-20',
        mealType: 'lunch',
        calories: 480,
        protein: 35,
        carbs: 42,
        fat: 16,
        fiber: 6,
        sugar: 32,
        sodium: 1550,
      },
      {
        userId: 101,
        date: '2026-06-18',
        mealType: 'dinner',
        calories: 700,
        protein: 45,
        carbs: 70,
        fat: 22,
        fiber: 8,
        sugar: 18,
        sodium: 800,
      },
    ]);

    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101,202');

    expect(response.status).toBe(200);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(9001, 'admin', 101);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(9001, 'admin', 202);
    expect(mocks.dailyMacroLogFindAll).toHaveBeenCalledTimes(1);
    const query = mocks.dailyMacroLogFindAll.mock.calls[0][0];
    expect(query.attributes).toEqual(expect.arrayContaining([
      'userId', 'date', 'mealType', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'createdAt',
    ]));
    expect(query.attributes).not.toContain('addedSugar');
    expect(response.body.clients).toEqual([
      expect.objectContaining({
        userId: 101,
        mealCountToday: 2,
        weeklyLoggedDays: 2,
        latestMealType: 'lunch',
        totalCalories: 800,
        totalProtein: 55,
        totalFiber: 10,
        totalSugar: 62,
        totalSodium: 2550,
        flags: {
          noMealsToday: false,
          sodiumAttention: true,
          sugarAttention: true,
          sparseWeekly: true,
        },
      }),
      expect.objectContaining({
        userId: 202,
        mealCountToday: 0,
        weeklyLoggedDays: 0,
        flags: expect.objectContaining({
          noMealsToday: true,
          sparseWeekly: true,
        }),
      }),
    ]);
  });

  it('rejects malformed userIds before querying macro rows', async () => {
    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101,bad');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid userIds');
    expect(mocks.dailyMacroLogFindAll).not.toHaveBeenCalled();
  });

  it('rejects coercive macro values before returning roster totals', async () => {
    mocks.dailyMacroLogFindAll.mockResolvedValue([{
      userId: 101,
      date: '2026-06-20',
      mealType: 'lunch',
      calories: ['620'],
      protein: '1e2',
      carbs: { valueOf: () => 62 },
      fat: Number.POSITIVE_INFINITY,
      fiber: -9,
      sugar: '12',
      sodium: '800.5',
    }]);

    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101');

    expect(response.status).toBe(200);
    expect(response.body.clients[0]).toMatchObject({
      mealCountToday: 1,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 12,
      totalSodium: 800.5,
    });
  });

  it('rejects impossible calendar dates before assignment checks or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-02-31&userIds=101');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid date');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.dailyMacroLogFindAll).not.toHaveBeenCalled();
  });

  it('fails closed when assignment checks deny any requested client', async () => {
    mocks.assertAssignmentOrAdmin.mockImplementation((_userId, _role, clientId) => clientId === 101);

    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101,202');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Macro data not found');
    expect(mocks.dailyMacroLogFindAll).not.toHaveBeenCalled();
  });

  it('returns safe fixed copy on database failure', async () => {
    mocks.dailyMacroLogFindAll.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to get roster nutrition triage',
    });
    expect(JSON.stringify(response.body)).not.toMatch(/SQLSTATE|tenant trace/i);
  });

  it('mounts the roster triage router before the legacy daily macro router', () => {
    expect(coreRoutesSource).toContain(
      "import dailyMacroRosterTriageRoutes from '../routes/dailyMacroRosterTriageRoutes.mjs';"
    );
    expect(coreRoutesSource.indexOf("app.use('/api/macros', dailyMacroRosterTriageRoutes);"))
      .toBeLessThan(coreRoutesSource.indexOf("app.use('/api/macros', dailyMacroRoutes);"));
  });
});
