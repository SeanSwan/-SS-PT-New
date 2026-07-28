import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchFoodCatalog: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client' };
    next();
  },
}));

vi.mock('../../utils/clientAccess.mjs', () => ({
  ensureClientAccess: vi.fn(),
}));

vi.mock('../../services/nutrition/foodCatalogSearchService.mjs', () => ({
  searchFoodCatalog: mocks.searchFoodCatalog,
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const clientNutritionRoutes = (await import('../../routes/clientNutritionRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/nutrition', clientNutritionRoutes);
  return app;
}

describe('GET /api/nutrition/food-search', () => {
  beforeEach(() => {
    mocks.searchFoodCatalog.mockReset();
  });

  it('serves the protected food-search proxy before dynamic nutrition user routes', async () => {
    const foods = [{
      id: 'usda-1001',
      name: 'Chicken Breast',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 4,
      servingSize: '100g',
      source: 'USDA',
    }];
    mocks.searchFoodCatalog.mockResolvedValueOnce({ ok: true, foods });

    const response = await request(makeApp())
      .get('/api/nutrition/food-search')
      .query({ q: 'chicken' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, foods });
    expect(mocks.searchFoodCatalog).toHaveBeenCalledWith('chicken', 15);
  });

  it('rejects blank queries before provider calls', async () => {
    const response = await request(makeApp())
      .get('/api/nutrition/food-search')
      .query({ q: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Food search query is required' });
    expect(mocks.searchFoodCatalog).not.toHaveBeenCalled();
  });

  it('returns safe copy when provider lookup fails', async () => {
    mocks.searchFoodCatalog.mockResolvedValueOnce({ ok: false, error: 'Food lookup is temporarily unavailable.' });

    const response = await request(makeApp())
      .get('/api/nutrition/food-search')
      .query({ q: 'chicken' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ success: false, message: 'Food lookup is temporarily unavailable.' });
  });
});
