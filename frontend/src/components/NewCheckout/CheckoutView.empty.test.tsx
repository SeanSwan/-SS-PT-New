import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../Checkout/PaymentMethodSelector', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="payment-selector">{children}</div>,
}));

import { CheckoutReadyView } from './CheckoutView.sections';

const baseProps = {
  checkoutReady: false,
  customerInfo: { name: 'Buyer', email: 'buyer@example.com', phone: '' },
  error: null,
  fulfillmentDetails: {},
  fulfillmentIntent: { required: false, mode: 'none', items: [] },
  isProcessing: false,
  onCheckout: vi.fn(),
  onFulfillmentDetailsChange: vi.fn(),
  sessionCount: 0,
  subtotal: 0,
  success: null,
  tax: 0,
  taxLabel: 'No tax',
  total: 0,
};

describe('Checkout empty state contract', () => {
  it('shows a useful store recovery state with no payment controls', () => {
    render(<CheckoutReadyView {...baseProps} cart={{ id: 1, items: [] }} />);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to store|browse the store/i })).toBeInTheDocument();
    expect(screen.queryByTestId('payment-selector')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proceed to secure payment/i })).not.toBeInTheDocument();
  });
});
