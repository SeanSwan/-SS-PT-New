import { describe, expect, it } from 'vitest';
import {
  normalizeCheckoutFulfillmentIntent,
  validateCheckoutFulfillmentIntent,
} from '../../services/checkoutFulfillmentIntentService.mjs';

const physicalLine = {
  storefrontItem: {
    itemKind: 'physical_product',
    fulfillmentType: 'local_delivery',
  },
};

const trainingLine = {
  storefrontItem: {
    itemKind: 'training_package',
    fulfillmentType: 'none',
  },
};

describe('v2 checkout fulfillment intent guard', () => {
  it('does not require fulfillment details for training-only carts', async () => {
    const intent = normalizeCheckoutFulfillmentIntent(null, [trainingLine]);

    expect(intent.required).toBe(false);
    expect(validateCheckoutFulfillmentIntent(intent)).toBeNull();
  });

  it('rejects physical-product checkout when fulfillment intent is missing', async () => {
    const intent = normalizeCheckoutFulfillmentIntent(null, [physicalLine]);

    expect(intent.required).toBe(true);
    expect(validateCheckoutFulfillmentIntent(intent)).toBe(
      'Delivery address or pickup mode is required for physical product checkout.'
    );
  });

  it('accepts physical-product checkout with a complete delivery address', async () => {
    const intent = normalizeCheckoutFulfillmentIntent({
      mode: 'local_delivery',
      details: {
        mode: 'local_delivery',
        streetAddress: '123 Recovery Lane',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
      },
    }, [physicalLine]);

    expect(validateCheckoutFulfillmentIntent(intent)).toBeNull();
  });

  it('accepts physical-product checkout with explicit pickup mode', async () => {
    const intent = normalizeCheckoutFulfillmentIntent({
      mode: 'pickup',
      details: { mode: 'pickup' },
    }, [physicalLine]);

    expect(validateCheckoutFulfillmentIntent(intent)).toBeNull();
  });
});
