/**
 * Regression: the public food-scanner surface must be bounded (S0.1, nutrition
 * blueprint 2026-08-04).
 *
 * Before this slice:
 *   - GET /scan/:barcode, /search, /product/:id, /ingredient/:id and the three
 *     explain POSTs were public with NO rate limiter, while a scan cache-miss
 *     performs outbound Open Food Facts / FatSecret calls and CREATES rows
 *     (FoodProduct.create + scanCount increment). Anonymous barcode enumeration
 *     = unbounded outbound traffic + unbounded row creation.
 *   - GET /stats was public and leaked aggregate counts + the top-5 most-scanned
 *     product rows to anyone.
 *   - /search forwarded limit/offset unvalidated into parseInt → NaN, and an
 *     arbitrary limit became an unbounded table read.
 *
 * This test locks in: limiter attached to every public scanner read (both
 * routers), /stats behind protect + admin, and clamped pagination.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  limiterHits: vi.fn(),
  searchProducts: vi.fn(),
  getProductByBarcode: vi.fn(),
  foodProduct: { count: vi.fn(), findAll: vi.fn(), findByPk: vi.fn() },
  foodIngredient: { count: vi.fn(), findByPk: vi.fn() },
  foodScanHistory: { count: vi.fn() },
  currentUser: { id: 7, role: 'client' },
}));

vi.mock('../../middleware/rateLimiter.mjs', () => ({
  foodScannerLimiter: (req, _res, next) => {
    mocks.limiterHits(req.path);
    next();
  },
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
    searchProducts: mocks.searchProducts,
    getProductByBarcode: mocks.getProductByBarcode,
  },
}));

vi.mock('../../models/FoodProduct.mjs', () => ({ default: mocks.foodProduct }));
vi.mock('../../models/FoodIngredient.mjs', () => ({ default: mocks.foodIngredient }));
vi.mock('../../models/FoodScanHistory.mjs', () => ({ default: mocks.foodScanHistory }));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const foodScannerRoutes = (await import('../../routes/foodScannerRoutes.mjs')).default;
const foodScannerExplainRoutes = (await import('../../routes/foodScannerExplainRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  // Mirror core/routes.mjs mount order: explain router first, scanner second.
  app.use('/api/food-scanner', foodScannerExplainRoutes);
  app.use('/api/food-scanner', foodScannerRoutes);
  return app;
}

describe('food-scanner surface lockdown (S0.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 7, role: 'client' };
    mocks.searchProducts.mockResolvedValue({ products: [], total: 0 });
    mocks.getProductByBarcode.mockResolvedValue({ id: 1, name: 'x' });
  });

  it('routes every public scanner read through the rate limiter', async () => {
    const app = makeApp();
    mocks.foodProduct.findByPk.mockResolvedValue(null);
    mocks.foodIngredient.findByPk.mockResolvedValue(null);

    await request(app).get('/api/food-scanner/scan/12345678');
    await request(app).get('/api/food-scanner/search?query=oats');
    await request(app).get('/api/food-scanner/product/1');
    await request(app).get('/api/food-scanner/ingredient/1');
    await request(app).post('/api/food-scanner/explain-product').send({ product: { name: 'x' } });

    // 4 scanner reads + 1 explain call, each passing through the shared limiter.
    expect(mocks.limiterHits.mock.calls.length).toBe(5);
  });

  it('rejects /stats for non-admin users', async () => {
    const res = await request(makeApp()).get('/api/food-scanner/stats');
    expect(res.status).toBe(403);
    expect(mocks.foodProduct.count).not.toHaveBeenCalled();
  });

  it('serves /stats to admins only', async () => {
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.foodProduct.count.mockResolvedValue(3);
    mocks.foodIngredient.count.mockResolvedValue(2);
    mocks.foodScanHistory.count.mockResolvedValue(1);
    mocks.foodProduct.findAll.mockResolvedValue([]);

    const res = await request(makeApp()).get('/api/food-scanner/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats.productCount).toBe(3);
  });

  it('clamps search pagination: garbage becomes defaults, huge limits cap at 50', async () => {
    const app = makeApp();

    await request(app).get('/api/food-scanner/search?query=a&limit=banana&offset=-9');
    expect(mocks.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    );

    await request(app).get('/api/food-scanner/search?query=a&limit=5000&offset=10');
    expect(mocks.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 50, offset: 10 })
    );
  });
});
