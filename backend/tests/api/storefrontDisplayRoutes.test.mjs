/**
 * S1 RED contract: public catalog responses must not advertise the unsupported
 * AdminSpecial campaign rail. Compatibility keeps data.activeSpecials present,
 * but it is always an empty array and item.activeSpecial is absent.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  visibility: { pricesVisible: true },
  storefrontItem: {
    rawAttributes: { id: {}, displayOrder: {}, name: {} },
    findAll: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
  },
  productVariant: {
    sequelize: { getQueryInterface: () => ({ describeTable: vi.fn().mockResolvedValue({}) }) },
    getTableName: () => 'product_variants',
  },
  adminSpecial: { getActiveSpecials: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getStorefrontItem: () => mocks.storefrontItem,
  getProductVariant: () => mocks.productVariant,
  getAdminSpecial: () => mocks.adminSpecial,
}));

vi.mock('../../services/store/priceVisibilityService.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolvePriceVisibility: vi.fn(async () => mocks.visibility.pricesVisible),
  };
});

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { default: storefrontRoutes } = await import('../../routes/storeFrontRoutes.mjs');

function makeApp() {
  const app = express();
  app.use('/api/storefront', storefrontRoutes);
  return app;
}

const item = {
  id: 21,
  name: 'Training Package',
  description: 'Public description',
  packageType: 'fixed',
  itemKind: 'training_package',
  price: 175,
  totalCost: 1750,
  pricePerSession: 175,
  sessions: 10,
  isActive: true,
  isSpecialOffer: false,
  variants: [],
};

describe('public storefront route campaign boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.visibility.pricesVisible = true;
    mocks.storefrontItem.count.mockResolvedValue(1);
    mocks.storefrontItem.findAll.mockResolvedValue([item]);
    mocks.storefrontItem.findOne.mockResolvedValue(item);
    mocks.adminSpecial.getActiveSpecials.mockResolvedValue([
      {
        id: 44,
        name: 'Legacy bonus campaign',
        bonusSessions: 8,
        bonusDuration: 30,
        applicablePackageIds: [21],
        endDate: '2099-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('list keeps the compatibility array but omits all AdminSpecial item and summary data', async () => {
    const response = await request(makeApp()).get('/api/storefront');

    expect(response.status).toBe(200);
    expect(response.body.data.activeSpecials).toEqual([]);
    expect(response.body.items[0]).not.toHaveProperty('activeSpecial');
    expect(mocks.adminSpecial.getActiveSpecials).not.toHaveBeenCalled();
  });

  it('detail never includes an unsupported special summary', async () => {
    const response = await request(makeApp()).get('/api/storefront/21');

    expect(response.status).toBe(200);
    expect(response.body.item).not.toHaveProperty('activeSpecial');
  });

  it('applies existing training price stripping after canonical mapping', async () => {
    mocks.visibility.pricesVisible = false;

    const response = await request(makeApp()).get('/api/storefront');

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toMatchObject({
      totalCost: null,
      displayPrice: null,
      price: null,
      pricePerSession: null,
    });
  });
});
