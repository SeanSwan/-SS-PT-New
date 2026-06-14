import { describe, expect, it } from 'vitest';
import { buildCheckoutReceiptSummaryFromOrder } from '../../services/checkoutReceiptSummaryService.mjs';

const order = {
  id: 42,
  orderNumber: 'SWAN-42',
  shippingAddress: {
    fulfillmentIntent: {
      mode: 'local_delivery',
      details: {
        recipientName: 'Client Example',
        phone: '555-0100',
        streetAddress: '100 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        notes: 'Front desk',
      },
    },
  },
  orderItems: [
    {
      id: 71,
      productVariantId: 7,
      name: 'Recovery Drink - 16oz',
      quantity: 2,
      fulfillmentStatus: 'pending_fulfillment',
      metadata: {
        itemKind: 'physical_product',
        productVariantLabel: '16oz',
        productVariantSku: 'DRINK-16',
      },
      storefrontItem: { id: 20, itemKind: 'physical_product', name: 'Recovery Drink' },
      productVariant: { id: 7, label: '16oz', sku: 'DRINK-16' },
    },
    {
      id: 72,
      name: '10-Session Pack',
      quantity: 1,
      fulfillmentStatus: 'not_required',
      metadata: { itemKind: 'training_package' },
      storefrontItem: { id: 21, itemKind: 'training_package', name: '10-Session Pack' },
    },
  ],
};

describe('checkout receipt summary service', () => {
  it('summarizes only physical-product fulfillment details for checkout receipts', () => {
    const summary = buildCheckoutReceiptSummaryFromOrder(order);

    expect(summary.orderId).toBe(42);
    expect(summary.orderNumber).toBe('SWAN-42');
    expect(summary.fulfillment.required).toBe(true);
    expect(summary.fulfillment.mode).toBe('local_delivery');
    expect(summary.fulfillment.status).toBe('pending_fulfillment');
    expect(summary.fulfillment.details.streetAddress).toBe('100 Main St');
    expect(summary.fulfillment.items).toEqual([
      expect.objectContaining({
        orderItemId: 71,
        productName: 'Recovery Drink',
        variantLabel: '16oz',
        sku: 'DRINK-16',
        quantity: 2,
        fulfillmentStatus: 'pending_fulfillment',
      }),
    ]);
  });
});
