import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductByBarcode: vi.fn(),
  processAIDataUpdates: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
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
  default: { findByPk: vi.fn(), count: vi.fn(), findAll: vi.fn() },
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
});
