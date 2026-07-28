import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  productFindByPk: vi.fn(),
  productUpdate: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../services/foodScannerService.mjs', () => ({
  default: {
    getProductByBarcode: vi.fn(),
    analyzeIngredients: vi.fn(),
    searchProducts: vi.fn(),
    getUserScanHistory: vi.fn(),
    updateScanHistory: vi.fn(),
  },
}));

vi.mock('../../models/FoodIngredient.mjs', () => ({
  default: { findByPk: vi.fn(), create: vi.fn(), count: vi.fn() },
}));

vi.mock('../../models/FoodProduct.mjs', () => ({
  default: { findByPk: mocks.productFindByPk, count: vi.fn(), findAll: vi.fn() },
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

describe('PUT /api/food-scanner/admin/product/:id', () => {
  beforeEach(() => {
    mocks.productFindByPk.mockReset();
    mocks.productUpdate.mockReset();
    mocks.productUpdate.mockResolvedValue({});
    mocks.productFindByPk.mockResolvedValue({ id: 7, update: mocks.productUpdate });
  });

  it('maps legacy scanner aliases onto real FoodProduct columns instead of silent-drop fields', async () => {
    const response = await request(makeApp())
      .put('/api/food-scanner/admin/product/7')
      .send({
        name: 'Protein Bar',
        brand: 'Swan Fuel',
        barcode: '12345678',
        ingredients: [{ name: 'almonds' }],
        nutritionFacts: { calories: 220, protein: 20 },
        healthScore: 'good',
        category: 'snack',
        allergens: ['tree nuts'],
      });

    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mocks.productUpdate.mock.calls[0][0];
    expect(updatePayload).toEqual({
      name: 'Protein Bar',
      brand: 'Swan Fuel',
      barcode: '12345678',
      ingredients: [{ name: 'almonds' }],
      nutritionalInfo: { calories: 220, protein: 20 },
      overallRating: 'good',
      category: 'snack',
      healthConcerns: ['tree nuts'],
    });
    expect(updatePayload).not.toHaveProperty('nutritionFacts');
    expect(updatePayload).not.toHaveProperty('healthScore');
    expect(updatePayload).not.toHaveProperty('allergens');
  });

  it('preserves explicit real model fields when callers send the canonical contract', async () => {
    const response = await request(makeApp())
      .put('/api/food-scanner/admin/product/7')
      .send({
        nutritionalInfo: { calories: 90 },
        overallRating: 'okay',
        healthConcerns: ['high sodium'],
      });

    expect(response.status).toBe(200);
    expect(mocks.productUpdate.mock.calls[0][0]).toEqual({
      nutritionalInfo: { calories: 90 },
      overallRating: 'okay',
      healthConcerns: ['high sodium'],
    });
  });
});
