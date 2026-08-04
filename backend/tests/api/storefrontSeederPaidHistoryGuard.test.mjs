/**
 * Storefront seeder — paid-history guard (Lane 4 launch audit, 2026-08-03)
 * =======================================================================
 * FORCE_RESEED clears the catalog with `TRUNCATE storefront_items RESTART
 * IDENTITY CASCADE`. cart_items and order_items both carry FKs to that table,
 * and TRUNCATE CASCADE truncates dependents outright — it does not honour the
 * order_items ON DELETE SET NULL tombstone relax. Run against production that
 * erases the line items of already-paid orders.
 *
 * These tests pin the guard: refuse when paid order_items exist, allow when the
 * database is genuinely empty of them, and allow only with an explicit
 * acknowledgement override.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const storefrontItem = { count: vi.fn(), bulkCreate: vi.fn(), destroy: vi.fn() };
const orderItem = { count: vi.fn(), destroy: vi.fn() };
const sequelize = { query: vi.fn() };

vi.mock('../../models/StorefrontItem.mjs', () => ({ default: storefrontItem }));
vi.mock('../../models/OrderItem.mjs', () => ({ default: orderItem }));
vi.mock('../../models/CartItem.mjs', () => ({ default: { destroy: vi.fn() } }));
vi.mock('../../database.mjs', () => ({ default: sequelize }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const loadSeeder = async () => (await import('../../seeders/20260407-seed-storefront-packages.mjs')).default;

describe('storefront seeder — paid-history guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    storefrontItem.count.mockResolvedValue(7);
    storefrontItem.bulkCreate.mockResolvedValue([]);
    sequelize.query.mockResolvedValue([]);
    process.env.FORCE_RESEED = 'true';
    delete process.env.I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('REFUSES to truncate when paid order line items reference the catalog', async () => {
    orderItem.count.mockResolvedValue(3);
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).rejects.toThrow(/REFUSING TO RESEED/);

    expect(sequelize.query).not.toHaveBeenCalled();
    expect(storefrontItem.destroy).not.toHaveBeenCalled();
    expect(storefrontItem.bulkCreate).not.toHaveBeenCalled();
  });

  it('names the row count and the safe alternative so the operator can act', async () => {
    orderItem.count.mockResolvedValue(42);
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).rejects.toThrow(/42 order_items row/);
    await expect(seedPackages()).rejects.toThrow(/admin\s+storefront UI/);
  });

  it('proceeds when no paid order line items exist', async () => {
    orderItem.count.mockResolvedValue(0);
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).resolves.toBeDefined();
    expect(sequelize.query).toHaveBeenCalledWith(expect.stringMatching(/TRUNCATE TABLE storefront_items/));
  });

  it('proceeds when the operator explicitly accepts the destruction', async () => {
    orderItem.count.mockResolvedValue(9);
    process.env.I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY = 'true';
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).resolves.toBeDefined();
    expect(sequelize.query).toHaveBeenCalled();
  });

  it('refuses when the safety count itself fails — unverifiable is not safe', async () => {
    orderItem.count.mockRejectedValue(new Error('relation "order_items" does not exist'));
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).rejects.toThrow(/could not verify paid order history/);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('the explicit override still wins when the safety count fails', async () => {
    orderItem.count.mockRejectedValue(new Error('relation "order_items" does not exist'));
    process.env.I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY = 'true';
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).resolves.toBeDefined();
  });

  it('never reaches the guard when FORCE_RESEED is absent (skip path preserved)', async () => {
    delete process.env.FORCE_RESEED;
    orderItem.count.mockResolvedValue(3);
    const seedPackages = await loadSeeder();

    await expect(seedPackages()).resolves.toEqual([]);
    expect(orderItem.count).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
