import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapStorefrontItem } from '../../services/store/storefrontDisplayService.mjs';

const mocks = vi.hoisted(() => ({
  probe: vi.fn(),
  item: { rawAttributes: { id: {}, displayOrder: {}, price: {}, totalCost: {} }, findAll: vi.fn(), findOne: vi.fn(), count: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getStorefrontItem: () => mocks.item,
  getProductVariant: () => ({
    sequelize: { getQueryInterface: () => ({ describeTable: mocks.probe }) },
    getTableName: () => 'product_variants',
  }),
}));
vi.mock('../../services/store/priceVisibilityService.mjs', async (original) => ({
  ...await original(), resolvePriceVisibility: vi.fn(async () => true),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const item = { id: 81, packageType: 'monthly', itemKind: 'training_package', months: 12, sessionsPerWeek: 2, totalCost: '400.00', price: '100.00', isActive: true, variants: [] };
let app;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.probe.mockReset().mockResolvedValue({});
  mocks.item.findAll.mockResolvedValue([item]);
  mocks.item.count.mockResolvedValue(1);
  app = express();
  app.use('/api/storefront', (await import('../../routes/storeFrontRoutes.mjs')).default);
});
afterEach(() => vi.restoreAllMocks());

describe('storefront recovery and sorting contracts', () => {
  it('recovers variant inclusion after the bounded negative-cache interval', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100000);
    mocks.probe.mockRejectedValueOnce(new Error('temporary connection failure'));
    expect((await request(app).get('/api/storefront')).status).toBe(200);
    expect(mocks.item.findAll.mock.calls[0][0].include).toEqual([]);
    now.mockReturnValue(111000);
    expect((await request(app).get('/api/storefront')).status).toBe(200);
    expect(mocks.probe).toHaveBeenCalledTimes(2);
    expect(mocks.item.findAll.mock.calls[1][0].include).toEqual([
      expect.objectContaining({ as: 'variants', required: false, where: { isActive: true } }),
    ]);
  });

  it.each(['price', 'totalCost', 'displayPrice', 'pricePerSession'])('rejects unsupported %s ordering before pagination or model reads', async (sortBy) => {
    const response = await request(app).get('/api/storefront').query({ sortBy, limit: 1, offset: 1 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNSUPPORTED_PRICE_SORT');
    expect(mocks.item.findAll).not.toHaveBeenCalled();
    expect(mocks.probe).not.toHaveBeenCalled();
  });

  it('preserves supported display ordering and pagination', async () => {
    const response = await request(app).get('/api/storefront').query({ sortBy: 'displayOrder', limit: 2, offset: 3 });
    expect(response.status).toBe(200);
    expect(mocks.item.findAll).toHaveBeenCalledWith(expect.objectContaining({ order: [['displayOrder', 'ASC']], limit: 2, offset: 3 }));
  });

  it.each([[null, 2], [12, null], [undefined, undefined], [0, 2], [12, 0]])('does not invent a monthly schedule for %s months / %s weekly sessions', (months, sessionsPerWeek) => {
    expect(mapStorefrontItem({ ...item, months, sessionsPerWeek }).priceDetails).toBeNull();
  });
  it('preserves a complete monthly schedule', () => {
    expect(mapStorefrontItem(item).priceDetails).toBe('12 months, 2 sessions/week');
  });
});
