/**
 * orderItemClientVariantPricing.test.mjs
 * ======================================
 * Kimi K3 F4, 2026-08-20 — a defect I introduced in the commit that was
 * supposed to fix pricing truth (3f061ec71).
 *
 * That commit routed durable OrderItem rows through the shared resolver:
 *
 *     const dbPrice = resolveUnitPrice(storefrontItem, item.productVariant ?? null);
 *
 * `item` is an element of `requestItems`, which on both the ACH and offline
 * rails is `req.body.items` — the RAW CLIENT BODY (achPaymentRoutes:64).
 * `resolveUnitPrice`'s precedence is variant price FIRST. So a request carrying
 *
 *     { storefrontItemId: 11, quantity: 1, productVariant: { price: 99999 } }
 *
 * writes 99999 into the durable OrderItem.price/subtotal rows.
 *
 * The charge side of the same rails prices with `resolveUnitPrice(dbItem)` —
 * catalog only, no variant (achPaymentRoutes:187, offlinePaymentRoutes:116).
 * So the amount charged and the amounts recorded diverge, in either direction,
 * under client control.
 *
 * Those rows are what the file's own header says they feed: the admin
 * confirmation flow, per-line refund proration, and revenue-by-item. An
 * inflated variant price inflates a future prorated refund — real money out. A
 * deflated one understates revenue.
 *
 * The commit that introduced this states the invariant it broke:
 * "If the charge side and this line ever disagree, that IS the bug."
 *
 * FIX: the row builder prices from the CATALOG only, exactly like the charge
 * side. These rails do not support variants at charge time, so their durable
 * rows must not either. If they ever do, the variant must be loaded from the DB
 * by id and validated against storefrontItemId — never trusted off the wire.
 */
import { describe, it, expect } from 'vitest';
import { buildPaymentOrderItemRows } from '../../services/offlinePaymentOrderItems.mjs';
import { resolveUnitPrice } from '../../services/store/itemPricing.mjs';

const catalogItem = {
  id: 11,
  name: 'Rhodium Swan Package',
  description: '48 sessions',
  price: 0,
  totalCost: 8400,
  sessions: 48,
  packageType: 'fixed',
  imageUrl: null,
};

describe('durable OrderItem rows never price from client input', () => {
  it('ignores an INFLATED client variant price', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 1, productVariant: { price: 99999 } }],
      [catalogItem],
      'check',
    );

    expect(row.price).toBe('8400.00');
    expect(row.subtotal).toBe('8400.00');
  });

  it('ignores a DEFLATED client variant price', () => {
    // Understating a line hides revenue and shrinks any future proration.
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 1, productVariant: { price: '0.01' } }],
      [catalogItem],
      'check',
    );

    expect(row.price).toBe('8400.00');
  });

  it('ignores a client variant price on the subtotal too', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 3, productVariant: { price: 1 } }],
      [catalogItem],
      'zelle',
    );

    expect(row.subtotal).toBe('25200.00');
  });

  it('records exactly what the CHARGE side computes — the file\'s own invariant', () => {
    // achPaymentRoutes:187 and offlinePaymentRoutes:116 both call
    // resolveUnitPrice(dbItem) with NO variant. If these disagree, that is the bug.
    const charged = resolveUnitPrice(catalogItem);
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 1, productVariant: { price: 42 } }],
      [catalogItem],
      'ach',
    );

    expect(row.price).toBe(charged.toFixed(2));
  });

  it('is unaffected by any other client-supplied price field', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 11, quantity: 1, price: 5, productVariantId: 7 }],
      [catalogItem],
      'venmo',
    );

    expect(row.price).toBe('8400.00');
  });

  it('still prices a normal catalog item correctly (no regression)', () => {
    const [row] = buildPaymentOrderItemRows(
      500,
      [{ storefrontItemId: 13, quantity: 2 }],
      [{ id: 13, name: 'Single Session', price: 175, totalCost: null, sessions: 1 }],
      'check',
    );

    expect(row.price).toBe('175.00');
    expect(row.subtotal).toBe('350.00');
  });

  it('still refuses an item the CATALOG cannot price, regardless of client input', () => {
    // A client variant price must not rescue an unsellable catalog row either.
    expect(() =>
      buildPaymentOrderItemRows(
        500,
        [{ storefrontItemId: 14, quantity: 1, productVariant: { price: 500 } }],
        [{ id: 14, name: 'Broken Catalog Row', price: 0, totalCost: 0 }],
        'check',
      ),
    ).toThrow(/no usable price/i);
  });
});
