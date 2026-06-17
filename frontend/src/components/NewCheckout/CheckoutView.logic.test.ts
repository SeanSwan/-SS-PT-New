import { describe, expect, it } from 'vitest';
import {
  buildCheckoutFulfillmentIntent,
  calculateCheckoutTotals,
  createDefaultFulfillmentDetails,
  mergeCheckoutFulfillmentDetails,
  validateCheckoutFulfillment,
} from './CheckoutView.logic';

const trainingItem = {
  id: 1,
  price: 175,
  quantity: 2,
  storefrontItemId: 10,
  storefrontItem: {
    name: 'Training Pack',
    itemKind: 'training_package',
    isTaxable: false,
    sessions: 1,
    fulfillmentType: 'none',
  },
};

const productItem = {
  id: 2,
  price: 24,
  quantity: 3,
  storefrontItemId: 42,
  productVariantId: 8,
  productVariant: {
    id: 8,
    label: 'Organic 1.5L Day Bottle',
  },
  storefrontItem: {
    name: 'Buddy Fat Skin Recovery Drink',
    itemKind: 'physical_product',
    isTaxable: true,
    fulfillmentType: 'local_delivery',
  },
};

describe('CheckoutView logic', () => {
  it('marks taxable physical products for Stripe Tax without client-side flat-rate tax', () => {
    const totals = calculateCheckoutTotals([trainingItem, productItem]);

    expect(totals.subtotal).toBe(422);
    expect(totals.taxableProductSubtotal).toBe(72);
    expect(totals.tax).toBeNull();
    expect(totals.taxMode).toBe('stripe_automatic_tax');
    expect(totals.taxLabel).toBe('Calculated by Stripe at payment');
    expect(totals.total).toBe(422);
    expect(totals.sessionCount).toBe(2);
  });

  it('keeps training-only packages untaxed in the checkout estimate', () => {
    const totals = calculateCheckoutTotals([trainingItem]);

    expect(totals.subtotal).toBe(350);
    expect(totals.taxableProductSubtotal).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.taxMode).toBe('not_applicable');
    expect(totals.total).toBe(350);
    expect(totals.sessionCount).toBe(2);
  });

  it('builds a safe fulfillment intent only when physical products are present', () => {
    expect(buildCheckoutFulfillmentIntent([trainingItem])).toEqual({
      required: false,
      mode: 'none',
      itemCount: 0,
      fulfillmentTypes: [],
      summary: 'No product fulfillment required.',
    });

    expect(buildCheckoutFulfillmentIntent([trainingItem, productItem])).toEqual({
      required: true,
      mode: 'local_delivery',
      itemCount: 1,
      fulfillmentTypes: ['local_delivery'],
      summary: 'Local delivery / pickup coordination required for 1 product.',
    });
  });

  it('requires real delivery detail before physical-product checkout redirects to Stripe', () => {
    const intent = buildCheckoutFulfillmentIntent([productItem]);
    const emptyDetails = createDefaultFulfillmentDetails({
      mode: intent.mode,
      recipientName: 'Buyer One',
      phone: '555-0100',
    });
    const missingAddress = mergeCheckoutFulfillmentDetails(intent, emptyDetails);

    expect(validateCheckoutFulfillment(missingAddress)).toBe('Delivery address is required before checkout.');

    const complete = mergeCheckoutFulfillmentDetails(intent, {
      ...emptyDetails,
      streetAddress: '100 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
    });

    expect(validateCheckoutFulfillment(complete)).toBeNull();
    expect(complete.details).toMatchObject({
      mode: 'local_delivery',
      recipientName: 'Buyer One',
      phone: '555-0100',
      streetAddress: '100 Main St',
    });
  });
});
