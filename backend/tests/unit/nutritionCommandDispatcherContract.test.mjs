import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher() {
  vi.resetModules();

  const barcodeProduct = {
    id: 501,
    name: 'Protein Bar',
    brand: 'Swan Fuel',
    overallRating: 'good',
    isOrganic: true,
    isNonGMO: false,
    healthConcerns: ['high_sugar'],
    nutritionalInfo: {
      energy_kcal_100g: '250',
      proteins_100g: '20',
      carbohydrates_100g: '24',
      fat_100g: '8',
    },
  };
  const searchProduct = {
    id: 601,
    name: 'Greek Yogurt',
    brand: 'Kitchen',
    overallRating: 'good',
    isOrganic: false,
    isNonGMO: true,
    healthConcerns: [],
    nutritionalInfo: {
      calories: 120,
      protein: 18,
      carbs: 8,
      fat: 2,
    },
  };
  const foodScannerService = {
    getProductByBarcode: vi.fn(async () => barcodeProduct),
    searchProducts: vi.fn(async () => ({
      products: [searchProduct],
      pagination: { total: 4, limit: 3, offset: 0, pages: 2 },
    })),
  };
  const sodiumRows = [
    { sodium: 600, flagSodium: false, mealType: 'breakfast', date: '2026-05-31' },
    { sodium: 1200, flagSodium: true, mealType: 'lunch', date: '2026-05-31' },
  ];
  const DailyMacroLog = {
    findAll: vi.fn(async () => sodiumRows),
  };
  const createMacroEntries = vi.fn(async (meals, opts) => ({
    mealsLogged: meals.length,
    date: opts.date,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  }));

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({}),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));
  vi.doMock('../../services/foodScannerService.mjs', () => ({
    default: foodScannerService,
  }));
  vi.doMock('../../models/DailyMacroLog.mjs', () => ({
    default: DailyMacroLog,
  }));
  vi.doMock('../../services/nutrition/macroLogService.mjs', () => ({
    createMacroEntries,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, foodScannerService, DailyMacroLog, createMacroEntries };
}

afterEach(() => {
  delete process.env.SWAN_DISPLAY_TZ;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('Swan Coach nutrition command dispatchers', () => {
  it('wires scan_food to the food scanner dispatcher', async () => {
    const { hasDispatcher } = await loadDispatcher();

    expect(hasDispatcher('scan_food')).toBe(true);
    expect(hasDispatcher('flag_sodium_intake')).toBe(true);
  });

  it('scans barcode nutrition for the authenticated user without leaking profile PII', async () => {
    const { dispatch, foodScannerService } = await loadDispatcher();

    const result = await dispatch('scan_food', {
      barcode: '0123456789012',
      limit: 5,
    }, {
      user: { id: 17, role: 'client', email: 'client@example.com' },
    });

    expect(foodScannerService.getProductByBarcode).toHaveBeenCalledWith('0123456789012', 17);
    expect(foodScannerService.searchProducts).not.toHaveBeenCalled();
    expect(result).toEqual({
      searchMode: 'barcode',
      found: true,
      resultCount: 1,
      totalMatches: 1,
      firstProductId: 501,
      firstProductName: 'Protein Bar',
      firstBrand: 'Swan Fuel',
      overallRating: 'good',
      isOrganic: true,
      isNonGMO: false,
      hasHealthConcerns: true,
      caloriesPer100g: 250,
      proteinPer100g: 20,
      carbsPer100g: 24,
      fatPer100g: 8,
    });
    expect(JSON.stringify(result)).not.toContain('client@example.com');
    expect(JSON.stringify(result)).not.toContain('high_sugar');
  });

  it('searches food names as a flat scalar summary without returning arrays', async () => {
    const { dispatch, foodScannerService } = await loadDispatcher();

    const result = await dispatch('scan_food', {
      query: 'Greek yogurt',
      limit: 3,
    }, {
      user: { id: 17, role: 'trainer', email: 'trainer@example.com' },
    });

    expect(foodScannerService.searchProducts).toHaveBeenCalledWith({
      query: 'Greek yogurt',
      limit: 3,
      offset: 0,
    });
    expect(foodScannerService.getProductByBarcode).not.toHaveBeenCalled();
    expect(result).toEqual({
      searchMode: 'query',
      found: true,
      resultCount: 1,
      totalMatches: 4,
      firstProductId: 601,
      firstProductName: 'Greek Yogurt',
      firstBrand: 'Kitchen',
      overallRating: 'good',
      isOrganic: false,
      isNonGMO: true,
      hasHealthConcerns: false,
      caloriesPer100g: 120,
      proteinPer100g: 18,
      carbsPer100g: 8,
      fatPer100g: 2,
    });
    expect(JSON.stringify(result)).not.toContain('trainer@example.com');
    expect(Array.isArray(result.products)).toBe(false);
  });

  it('summarizes sodium risk without echoing meal descriptions or profile PII', async () => {
    const { dispatch, DailyMacroLog } = await loadDispatcher();

    const result = await dispatch('flag_sodium_intake', {
      clientId: 42,
      date: '2026-05-31',
      sodiumLimit: 1500,
      mealSodiumLimit: 800,
    }, {
      user: { id: 7, role: 'trainer', email: 'trainer@example.com' },
      resolvedClient: { id: 42, firstName: 'Private' },
    });

    expect(DailyMacroLog.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, date: '2026-05-31' },
      attributes: ['sodium', 'flagSodium', 'mealType', 'date'],
    }));
    expect(result).toEqual({
      clientId: 42,
      date: '2026-05-31',
      mealCount: 2,
      totalSodium: 1800,
      sodiumLimit: 1500,
      mealSodiumLimit: 800,
      overDailyLimit: true,
      flaggedMealCount: 1,
      highSodiumMealCount: 1,
      highestMealSodium: 1200,
      highestMealType: 'lunch',
    });
    expect(JSON.stringify(result)).not.toContain('trainer@example.com');
    expect(JSON.stringify(result)).not.toContain('Private');
  });

  it('uses selected-client sodium scope when params contain stale client identity', async () => {
    const { dispatch, DailyMacroLog } = await loadDispatcher();

    const result = await dispatch('flag_sodium_intake', {
      clientId: 999,
      date: '2026-05-31',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(DailyMacroLog.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
    }));
    expect(result.clientId).toBe(42);
  });

  it('uses the studio display timezone for default nutrition read dates', async () => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const { dispatch, DailyMacroLog } = await loadDispatcher();

    const logResult = await dispatch('view_nutrition_log', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });
    expect(logResult.date).toBe('2026-06-21');
    expect(DailyMacroLog.findAll).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId: 42, date: '2026-06-21' },
    }));

    const trendResult = await dispatch('view_macro_trends', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });
    expect(trendResult).toMatchObject({
      startDate: '2026-06-15',
      endDate: '2026-06-21',
    });
    expect(DailyMacroLog.findAll).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
    }));

    const sodiumResult = await dispatch('flag_sodium_intake', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });
    expect(sodiumResult.date).toBe('2026-06-21');
    expect(DailyMacroLog.findAll).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId: 42, date: '2026-06-21' },
    }));
  });

  it('uses the studio display timezone for default nutrition write dates', async () => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const { dispatch, createMacroEntries } = await loadDispatcher();
    const meals = [{ description: 'protein shake', mealType: 'snack', calories: 220 }];

    await dispatch('log_meals', { clientId: 42, meals }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(createMacroEntries).toHaveBeenCalledWith(meals, {
      clientId: 42,
      date: '2026-06-21',
    });
  });
});
