import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductByBarcode: vi.fn(),
  findProductByPk: vi.fn(),
  processAIDataUpdates: vi.fn(),
  currentUser: { id: 42, role: 'client' },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = mocks.currentUser;
    next();
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../services/foodScannerService.mjs', () => ({
  default: {
    getProductByBarcode: mocks.getProductByBarcode,
    analyzeIngredients: vi.fn(),
    searchProducts: vi.fn(),
    getUserScanHistory: vi.fn(),
    updateScanHistory: vi.fn(),
  },
}));

vi.mock('../../services/aiDataWriteService.mjs', () => ({
  processAIDataUpdates: mocks.processAIDataUpdates,
}));

vi.mock('../../database.mjs', () => ({
  default: { QueryTypes: { INSERT: 'INSERT' }, query: vi.fn() },
}));

vi.mock('../../models/FoodIngredient.mjs', () => ({
  default: { findByPk: vi.fn(), create: vi.fn(), count: vi.fn() },
}));

vi.mock('../../models/FoodProduct.mjs', () => ({
  default: { findByPk: mocks.findProductByPk, count: vi.fn(), findAll: vi.fn() },
}));

vi.mock('../../models/FoodScanHistory.mjs', () => ({
  default: { count: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const foodScannerRoutes = (await import('../../routes/foodScannerRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/food-scanner', foodScannerRoutes);
  return app;
}

beforeEach(() => {
  mocks.currentUser = { id: 42, role: 'client' };
  mocks.findProductByPk.mockReset();
});

describe('POST /api/food-scanner/log-scan date fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));
    mocks.getProductByBarcode.mockReset();
    mocks.processAIDataUpdates.mockReset();
    mocks.processAIDataUpdates.mockResolvedValue({ successful: 1, errors: [] });
    mocks.getProductByBarcode.mockResolvedValue({
      id: 1001,
      name: 'Greek Yogurt',
      brand: 'Acme',
      overallRating: 'okay',
      isOrganic: false,
      isNonGMO: false,
      healthConcerns: [],
      ingredients: [],
      nutritionalInfo: {
        energy_kcal_100g: 110,
        proteins_100g: 11,
        carbohydrates_100g: 8,
        fat_100g: 3,
        sodium_100g: 55,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs omitted scanner dates against the studio display date', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: 150 });

    expect(response.status).toBe(200);
    expect(mocks.processAIDataUpdates).toHaveBeenCalledTimes(1);
    const update = mocks.processAIDataUpdates.mock.calls[0][1][0];
    expect(update.type).toBe('macro_log');
    expect(update.data.date).toBe('2026-06-21');
    expect(update.data.source).toBe('barcode');
    expect(response.body.macroLog.source).toBe('barcode');
    expect(mocks.processAIDataUpdates.mock.calls[0][4]).toEqual({ macroSource: 'barcode' });
  });

  it('rejects future scanner log dates before product lookup or macro write', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: 150, date: '2026-06-24' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Date cannot be in the future',
    });
    expect(mocks.getProductByBarcode).not.toHaveBeenCalled();
    expect(mocks.processAIDataUpdates).not.toHaveBeenCalled();
  });

  it('rejects nonnumeric serving sizes before product lookup or macro write', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: 'one scoop' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Serving size must be between 1g and 10,000g',
    });
    expect(mocks.getProductByBarcode).not.toHaveBeenCalled();
    expect(mocks.processAIDataUpdates).not.toHaveBeenCalled();
  });

  it('accepts plain decimal string serving sizes and scales macro values', async () => {
    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: '150.5' });

    expect(response.status).toBe(200);
    expect(mocks.processAIDataUpdates).toHaveBeenCalledTimes(1);
    const update = mocks.processAIDataUpdates.mock.calls[0][1][0];
    expect(update.data.description).toContain('(150.5g)');
    expect(update.data.calories).toBeCloseTo(165.55);
    expect(update.data.protein).toBeCloseTo(16.555);
  });

  it('does not partially parse malformed product nutrition values before the macro writer', async () => {
    mocks.getProductByBarcode.mockResolvedValueOnce({
      id: 1002,
      name: 'Odd Yogurt',
      brand: 'Acme',
      overallRating: 'okay',
      isOrganic: false,
      isNonGMO: false,
      healthConcerns: [],
      ingredients: [],
      nutritionalInfo: {
        energy_kcal_100g: '110kcal',
        proteins_100g: ['11'],
        carbohydrates_100g: '1e2',
        fat_100g: '0x3',
        fiber_100g: { grams: 2 },
        sugars_100g: '8g',
        sodium_100g: '55mg',
        cholesterol_100g: '10mg',
        'saturated-fat_100g': '1.5g',
        'trans-fat_100g': '0.1g',
        nova_group: '5',
      },
    });

    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: 150 });

    expect(response.status).toBe(200);
    const update = mocks.processAIDataUpdates.mock.calls[0][1][0];
    expect(update.data).toMatchObject({
      calories: '110kcal',
      protein: ['11'],
      carbs: '1e2',
      fat: '0x3',
      fiber: { grams: 2 },
      sugar: '8g',
      sodium: '55mg',
      cholesterol: '10mg',
      saturatedFat: '1.5g',
      transFat: '0.1g',
      novaGroup: '5',
    });
    expect(update.data.calories).not.toBeCloseTo(165);
    expect(update.data.protein).not.toBeCloseTo(16.5);
    expect(response.body.macroLog).toMatchObject({
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null,
      cholesterol: null,
      saturatedFat: null,
      transFat: null,
      novaGroup: null,
    });
    expect(JSON.stringify(response.body.macroLog)).not.toContain('110kcal');
  });

  it.each([
    { label: 'boolean true', value: true },
    { label: 'boolean false', value: false },
    { label: 'hex string', value: '0x10' },
    { label: 'exponent string', value: '1e3' },
    { label: 'array value', value: [150] },
    { label: 'object value', value: { grams: 150 } },
  ])('rejects coercive serving sizes before product lookup or macro write: $label', async ({ value }) => {
    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: value });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Serving size must be between 1g and 10,000g',
    });
    expect(mocks.getProductByBarcode).not.toHaveBeenCalled();
    expect(mocks.processAIDataUpdates).not.toHaveBeenCalled();
  });

  it('does not claim a scan was logged when the macro writer saved zero rows', async () => {
    mocks.processAIDataUpdates.mockResolvedValueOnce({
      successful: 0,
      errors: [{
        type: 'macro_log',
        code: 'AI_DATA_WRITE_FAILED',
        message: 'Swan Coach could not apply that update. No data was changed.',
      }],
    });

    const response = await request(makeApp())
      .post('/api/food-scanner/log-scan')
      .send({ barcode: '12345678', servingSizeGrams: 150 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Could not log scanned product. No diary entry was saved.',
    });
    expect(JSON.stringify(response.body)).not.toContain('Swan Coach could not apply');
  });

  it('does not partially parse malformed sodium or sugar into AI-analysis flags', async () => {
    mocks.getProductByBarcode.mockResolvedValueOnce({
      id: 1003,
      name: 'Odd Snack',
      brand: 'Acme',
      overallRating: 'okay',
      isOrganic: true,
      isNonGMO: true,
      healthConcerns: [],
      ingredients: [],
      nutritionalInfo: {
        sodium_100g: ['900'],
        sugars_100g: '13g',
      },
    });

    const response = await request(makeApp())
      .post('/api/food-scanner/ai-analyze')
      .send({ barcode: '12345678' });

    expect(response.status).toBe(200);
    expect(response.body.analysis.flags).not.toContain('HIGH_SODIUM');
    expect(response.body.analysis.flags).not.toContain('HIGH_SUGAR');
  });
});

describe('PUT /api/food-scanner/admin/product/:id model mapping', () => {
  it('maps legacy nutrition aliases to real FoodProduct columns', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.findProductByPk.mockResolvedValue({ id: 55, update });

    const response = await request(makeApp())
      .put('/api/food-scanner/admin/product/55')
      .send({
        name: 'Greek Yogurt',
        brand: 'Swan Dairy',
        barcode: '123456789012',
        ingredients: [1, 2],
        nutritionFacts: { calories: 110, protein: 11 },
        healthScore: 'good',
        category: 'Dairy',
      });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      name: 'Greek Yogurt',
      brand: 'Swan Dairy',
      barcode: '123456789012',
      ingredients: [1, 2],
      nutritionalInfo: { calories: 110, protein: 11 },
      overallRating: 'good',
      category: 'Dairy',
    });
    expect(update.mock.calls[0][0]).not.toHaveProperty('nutritionFacts');
    expect(update.mock.calls[0][0]).not.toHaveProperty('healthScore');
    expect(update.mock.calls[0][0]).not.toHaveProperty('allergens');
  });

  it('maps legacy product allergens to healthConcerns instead of writing phantom columns', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.findProductByPk.mockResolvedValue({ id: 55, update });

    const response = await request(makeApp())
      .put('/api/food-scanner/admin/product/55')
      .send({ allergens: ['milk'] });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ healthConcerns: ['milk'] });
    expect(update.mock.calls[0][0]).not.toHaveProperty('allergens');
  });
});
