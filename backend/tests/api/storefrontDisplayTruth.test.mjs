/**
 * S1 RED contract: storefront display money must come from the same canonical
 * resolver used by the cart, and unpriceable records must serialize as null.
 *
 * These tests exercise the real Express route with only models and visibility
 * mocked. No database, payment provider, email service, or client data is used.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
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

vi.mock('../../services/store/priceVisibilityService.mjs', () => ({
  resolvePriceVisibility: vi.fn(async () => true),
  isPriceGatedItem: vi.fn(() => false),
  stripItemPrices: vi.fn((item) => item),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { default: storefrontRoutes } = await import('../../routes/storeFrontRoutes.mjs');

function makeApp() {
  const app = express();
  app.use('/api/storefront', storefrontRoutes);
  return app;
}

const conflict = {
  id: 7,
  name: 'Gold Swan Elite',
  description: 'A real package',
  packageType: 'fixed',
  itemKind: 'training_package',
  price: '175.00',
  totalCost: '8400.00',
  pricePerSession: '175.00',
  sessions: 48,
  isActive: true,
  isSpecialOffer: false,
  variants: [
    { id: 71, storefrontItemId: 7, label: 'Base', price: '12.30', isActive: true },
    { id: 72, storefrontItemId: 7, label: 'Inherited', price: '17junk', isActive: true },
  ],
};

describe('storefront display money truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storefrontItem.count.mockResolvedValue(1);
    mocks.adminSpecial.getActiveSpecials.mockResolvedValue([
      { id: 99, name: 'Unsupported bonus', bonusSessions: 10, applicablePackageIds: [7] },
    ]);
  });

  it('list uses charged parent money and resolver precedence for each variant', async () => {
    mocks.storefrontItem.findAll.mockResolvedValue([conflict]);

    const response = await request(makeApp()).get('/api/storefront');

    expect(response.status).toBe(200);
    const item = response.body.items[0];
    expect(item.totalCost).toBe(8400);
    expect(item.displayPrice).toBe(8400);
    expect(item.price).toBe(8400);
    expect(item.pricePerSession).toBe(175);
    expect(item.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 71, price: 12.3 }),
      expect.objectContaining({ id: 72, price: 8400 }),
    ]));
  });

  it('detail uses the same canonical money DTO as list', async () => {
    mocks.storefrontItem.findOne.mockResolvedValue(conflict);

    const response = await request(makeApp()).get('/api/storefront/7');

    expect(response.status).toBe(200);
    expect(response.body.item).toMatchObject({
      totalCost: 8400,
      displayPrice: 8400,
      price: 8400,
      pricePerSession: 175,
    });
  });

  it('does not fabricate a free price when every parent candidate is unusable', async () => {
    mocks.storefrontItem.findAll.mockResolvedValue([{
      ...conflict,
      id: 8,
      price: 'free',
      totalCost: 0,
      pricePerSession: '17junk',
      variants: [{ id: 81, storefrontItemId: 8, label: 'Unpriced', price: 'free' }],
    }]);

    const response = await request(makeApp()).get('/api/storefront');

    expect(response.status).toBe(200);
    const item = response.body.items[0];
    expect(item.totalCost).toBeNull();
    expect(item.displayPrice).toBeNull();
    expect(item.price).toBeNull();
    expect(item.pricePerSession).toBeNull();
    expect(item.variants[0].price).toBeNull();
  });

  it('rejects parseFloat-style garbage while retaining a valid total fallback', async () => {
    mocks.storefrontItem.findAll.mockResolvedValue([{
      ...conflict,
      id: 9,
      price: '17junk',
      totalCost: '24.00',
      pricePerSession: '17junk',
      variants: [],
    }]);

    const response = await request(makeApp()).get('/api/storefront');

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toMatchObject({
      totalCost: 24,
      displayPrice: 24,
      price: 24,
      pricePerSession: null,
    });
  });
});
