/**
 * orderItemPricingParity.test.mjs
 * ================================
 * Fix #4 gave every rail ONE price resolver, but only for the CHARGE amount.
 * The durable OrderItem rows on the ACH and offline rails kept the pre-fix
 * expression:
 *
 *     const dbPrice = new Decimal(storefrontItem.price || 0);
 *
 * `StorefrontItem.price` is nullable and an explicit 0 is persistable (the
 * model hook only backfills from totalCost when price is null/undefined). So a
 * `price: 0, totalCost: 8400` package is CHARGED at $8,400 and RECORDED at
 * $0.00 per line — and the admin confirmation flow allocates sessions from
 * these rows, while any per-line refund proration or revenue-by-item view
 * reads $0. Order-level truth and line-level truth disagree permanently, on
 * two of the four rails.
 *
 * Found independently by GLM-5.3 (H3) and Kimi K3 (M1), 2026-08-19.
 *
 * Kimi additionally flagged the unguarded map lookup: `storefrontMap.get(...)`
 * is dereferenced without a miss check, and the backfill path is deliberately
 * unfiltered by isActive, so a catalog row deleted after the order was placed
 * turns an idempotency replay of a REAL order into a TypeError -> 500.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/OrderItem.mjs', () => ({
  default: { count: vi.fn(), bulkCreate: vi.fn() },
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
import Decimal from 'decimal.js';
import {
  buildPaymentOrderItemRows,
  createPaymentOrderItems,
  backfillMissingPaymentOrderItems,
} from '../../services/offlinePaymentOrderItems.mjs';
import OrderItem from '../../models/OrderItem.mjs';
import { resolveUnitPrice } from '../../services/store/itemPricing.mjs';

// A real Rhodium-shaped package: money lives in totalCost, price is an
// explicit 0. This is persistable today — see itemPricing.mjs's header.
const totalCostOnlyPackage = {
  id: 11,
  name: 'Rhodium Swan Package',
  description: '48 sessions',
  price: 0,
  totalCost: 8400,
  sessions: 48,
  packageType: 'fixed',
  imageUrl: null,
};

const nullPricePackage = { ...totalCostOnlyPackage, id: 12, price: null };

describe('OrderItem rows price from the shared resolver, not `price || 0`', () => {
  it('records the resolved unit price for a totalCost-only package', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 1 }],
      [totalCostOnlyPackage],
      'check',
    );

    expect(row.price).toBe('8400.00');
    expect(row.subtotal).toBe('8400.00');
  });

  it('multiplies the resolved price by quantity, not zero by quantity', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 3 }],
      [totalCostOnlyPackage],
      'zelle',
    );

    expect(row.subtotal).toBe('25200.00');
  });

  it('handles a null price the same way — the hook does not always backfill', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 12, quantity: 1 }],
      [nullPricePackage],
      'venmo',
    );

    expect(row.price).toBe('8400.00');
  });

  it('agrees line-for-line with the amount the rail actually charges', () => {
    // The charge side calls resolveUnitPrice. If these two ever disagree, the
    // order total and the sum of its lines disagree — which is the defect.
    const charged = resolveUnitPrice(totalCostOnlyPackage);
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 2 }],
      [totalCostOnlyPackage],
      'check',
    );

    expect(new Decimal(row.price).equals(charged)).toBe(true);
    expect(new Decimal(row.subtotal).equals(charged.mul(2))).toBe(true);
  });

  it('still prices a normal `price`-bearing item correctly (no regression)', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 13, quantity: 2 }],
      [{ id: 13, name: 'Single Session', price: 175, totalCost: null, sessions: 1 }],
      'check',
    );

    expect(row.price).toBe('175.00');
    expect(row.subtotal).toBe('350.00');
  });

  it('refuses an unpriceable item instead of writing a $0.00 line', () => {
    expect(() =>
      buildPaymentOrderItemRows(
        500,
        [{ storefrontItemId: 14, quantity: 1 }],
        [{ id: 14, name: 'Broken Catalog Row', price: 0, totalCost: 0 }],
        'check',
      ),
    ).toThrow(/no usable price/i);
  });

  it('raises a NAMED error when the catalog row is gone, not a TypeError', () => {
    // Kimi M1: the backfill path is intentionally unfiltered by isActive, so a
    // row deleted after purchase reaches here as `undefined`. Dereferencing it
    // 500s an idempotency replay of a real, already-paid order.
    let caught;
    try {
      buildPaymentOrderItemRows(
        500,
        [{ storefrontItemId: 999, quantity: 1 }],
        [totalCostOnlyPackage],
        'check',
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(caught).not.toBeInstanceOf(TypeError);
    expect(caught.message).toMatch(/999/);
  });
});

describe('backfill is best-effort; creation is strict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    OrderItem.count.mockResolvedValue(0);
    OrderItem.bulkCreate.mockResolvedValue([]);
  });

  const deletedRowRequest = {
    order: { id: 500, orderNumber: 'SS-REPLAY' },
    requestItems: [{ storefrontItemId: 999, quantity: 1 }],
    storefrontItems: [totalCostOnlyPackage],
    paymentMethod: 'ach',
  };

  it('backfill does NOT throw when a catalog row was deleted after purchase', async () => {
    // The replay path runs BEFORE price validation, on an order already paid.
    // Throwing here 500s a real customer's idempotency replay and withholds the
    // clientSecret they are waiting for.
    const result = await backfillMissingPaymentOrderItems(deletedRowRequest);

    expect(result).toMatchObject({ backfilled: false });
    expect(OrderItem.bulkCreate).not.toHaveBeenCalled();
  });

  it('backfill reports WHY it could not reconcile — the failure is not silent', async () => {
    const result = await backfillMissingPaymentOrderItems(deletedRowRequest);
    expect(result.reason).toBe('STOREFRONT_ITEM_MISSING');
  });

  it('backfill does not throw on an unpriceable row either', async () => {
    const result = await backfillMissingPaymentOrderItems({
      ...deletedRowRequest,
      requestItems: [{ storefrontItemId: 14, quantity: 1 }],
      storefrontItems: [{ id: 14, name: 'Broken', price: 0, totalCost: 0 }],
    });
    expect(result).toMatchObject({ backfilled: false, reason: 'ITEM_NOT_PRICEABLE' });
  });

  it('backfill still writes rows on the happy path', async () => {
    const result = await backfillMissingPaymentOrderItems({
      ...deletedRowRequest,
      requestItems: [{ storefrontItemId: 11, quantity: 1 }],
    });

    expect(result).toMatchObject({ backfilled: true });
    expect(OrderItem.bulkCreate).toHaveBeenCalledTimes(1);
    expect(OrderItem.bulkCreate.mock.calls[0][0][0]).toMatchObject({ price: '8400.00' });
  });

  it('backfill skips when rows already exist', async () => {
    OrderItem.count.mockResolvedValue(3);
    const result = await backfillMissingPaymentOrderItems({
      ...deletedRowRequest,
      requestItems: [{ storefrontItemId: 11, quantity: 1 }],
    });

    expect(result).toMatchObject({ backfilled: false, reason: 'ALREADY_PRESENT' });
    expect(OrderItem.bulkCreate).not.toHaveBeenCalled();
  });

  it('CREATION still throws — a bad row there means charging for the unrecordable', async () => {
    await expect(
      createPaymentOrderItems({
        order: { id: 500 },
        requestItems: [{ storefrontItemId: 999, quantity: 1 }],
        storefrontItems: [totalCostOnlyPackage],
        paymentMethod: 'ach',
      }),
    ).rejects.toThrow(/999/);

    expect(OrderItem.bulkCreate).not.toHaveBeenCalled();
  });
});
