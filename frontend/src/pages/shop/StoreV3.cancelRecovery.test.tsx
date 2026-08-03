/**
 * Checkout-cancel recovery deep link (Lane 4 launch audit, 2026-08-03)
 * ====================================================================
 * /checkout/cancel sends a buyer who backed out of Stripe to
 * `/store?openCart=true` ("Return to cart") or `?openCart=true&retryCheckout=true`
 * ("Try again"). Nothing read those params, so both CTAs dropped the buyer on a
 * plain /store with the cart closed — right after an abandoned payment, the
 * worst moment to make someone hunt for the cart dock on mobile.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const mockApiGet = vi.hoisted(() => vi.fn());
const mockCheckoutView = vi.hoisted(() => vi.fn(() => null));
const authState = vi.hoisted(() => ({ isAuthenticated: true, user: { id: 1, role: 'client' } as any }));

vi.mock('../../services/api.service', () => ({ default: { get: mockApiGet } }));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: authState.isAuthenticated }),
}));
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({ cart: { itemCount: 1 }, addToCart: vi.fn(), refreshCart: vi.fn() }),
}));
vi.mock('../../context/ThemeContext/UniversalThemeContext', () => ({
  useUniversalTheme: () => ({ currentTheme: 'crystalline-dark' }),
}));
vi.mock('../../components/ui-kit/cinematic/ScrollReveal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/ui-kit/cinematic/TypewriterText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));
vi.mock('../../components/ui-kit/cinematic/ParallaxHero', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/ui-kit/cinematic/SectionDivider', () => ({ default: () => null }));
vi.mock('../../components/ui/backgrounds/SectionVideoBackground', () => ({ default: () => null }));
vi.mock('../../components/OrientationForm/orientationForm', () => ({ default: () => null }));
vi.mock('./components/MembershipsSection', () => ({ default: () => null }));
vi.mock('./components/FloatingCart', () => ({ default: () => null }));
vi.mock('./components/PackagesGrid', () => ({ default: () => null }));
vi.mock('./components/YourSpecialCard', () => ({ default: () => null }));
vi.mock('../../components/NewCheckout', () => ({
  CheckoutView: (props: any) => {
    mockCheckoutView(props);
    return <div data-testid="checkout-view" />;
  },
}));

import StoreV3 from './StoreV3';

const setUrl = (search: string) => {
  window.history.replaceState({}, '', `/store${search}`);
};

describe('StoreV3 — checkout-cancel recovery deep link', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockCheckoutView.mockClear();
    authState.isAuthenticated = true;
    authState.user = { id: 1, role: 'client' };
    mockApiGet.mockResolvedValue({
      data: {
        pricesVisible: false,
        items: [{
          id: 15699,
          name: 'Single Session',
          description: 'One premium 1-hour personal training session',
          packageType: 'fixed',
          sessions: 1,
          itemKind: 'training_package',
          isTaxable: false,
          fulfillmentType: 'none',
          variants: [],
        }],
      },
    });
    setUrl('');
  });

  it('opens the cart when returning from a cancelled checkout', async () => {
    setUrl('?openCart=true');

    render(<StoreV3 />);

    await waitFor(() => expect(screen.getByTestId('checkout-view')).toBeInTheDocument());
  });

  it('opens the cart for the "Try again" variant too', async () => {
    setUrl('?openCart=true&retryCheckout=true');

    render(<StoreV3 />);

    await waitFor(() => expect(screen.getByTestId('checkout-view')).toBeInTheDocument());
  });

  it('strips the recovery params so a refresh does not re-open the cart', async () => {
    setUrl('?openCart=true&retryCheckout=true');

    render(<StoreV3 />);

    await waitFor(() => expect(screen.getByTestId('checkout-view')).toBeInTheDocument());
    expect(window.location.search).not.toContain('openCart');
    expect(window.location.search).not.toContain('retryCheckout');
  });

  it('preserves unrelated query params while stripping the recovery ones', async () => {
    setUrl('?utm_source=youtube&openCart=true');

    render(<StoreV3 />);

    await waitFor(() => expect(screen.getByTestId('checkout-view')).toBeInTheDocument());
    expect(window.location.search).toContain('utm_source=youtube');
    expect(window.location.search).not.toContain('openCart');
  });

  it('does NOT open the cart for a guest — they would only meet the auth wall', async () => {
    authState.isAuthenticated = false;
    authState.user = null;
    setUrl('?openCart=true');

    render(<StoreV3 />);

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    expect(screen.queryByTestId('checkout-view')).not.toBeInTheDocument();
  });

  it('leaves the cart closed on a normal /store visit', async () => {
    setUrl('');

    render(<StoreV3 />);

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    expect(screen.queryByTestId('checkout-view')).not.toBeInTheDocument();
  });
});
