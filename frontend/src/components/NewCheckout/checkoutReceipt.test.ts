import { describe, expect, it } from 'vitest';
import {
  buildCheckoutReceiptFilename,
  buildCheckoutReceiptText,
  type CheckoutReceiptOrderData,
} from './checkoutReceipt';

const orderData: CheckoutReceiptOrderData = {
  sessionId: 'cs_test_receipt_123',
  amount: 1188,
  sessionsAdded: 10,
  customerName: 'Test Client',
  customerEmail: 'client@example.com',
  orderDate: '2026-05-22T13:30:00.000Z',
  items: [],
};

describe('checkout receipt generation', () => {
  it('builds a downloadable receipt with payment, customer, and session details', () => {
    const receipt = buildCheckoutReceiptText(orderData);

    expect(receipt).toContain('SwanStudios Receipt');
    expect(receipt).toContain('Checkout session: cs_test_receipt_123');
    expect(receipt).toContain('Amount paid: $1,188.00');
    expect(receipt).toContain('Training sessions added: 10');
    expect(receipt).toContain('Customer: Test Client');
    expect(receipt).toContain('Email: client@example.com');
  });

  it('uses a stable filename from the checkout session id', () => {
    expect(buildCheckoutReceiptFilename(orderData)).toBe('swanstudios-receipt-cs_test_receipt_123.txt');
  });
});
