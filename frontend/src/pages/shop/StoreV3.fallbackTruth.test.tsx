import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import StoreV3 from './StoreV3';
import StoreV2 from './StoreV2';

const mockApiGet = vi.hoisted(() => vi.fn());
const mockPackagesGrid = vi.hoisted(() => vi.fn(() => null));

vi.mock('../../services/api.service', () => ({
  default: {
    get: mockApiGet,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    cart: { itemCount: 0 },
    addToCart: vi.fn(),
    refreshCart: vi.fn(),
  }),
}));

vi.mock('../../context/ThemeContext/UniversalThemeContext', () => ({
  useUniversalTheme: () => ({
    currentTheme: 'crystalline-dark',
  }),
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

vi.mock('../../components/ui-kit/cinematic/SectionDivider', () => ({
  default: () => null,
}));

vi.mock('../../components/ui/backgrounds/SectionVideoBackground', () => ({
  default: () => null,
}));

vi.mock('../../components/OrientationForm/orientationForm', () => ({
  default: () => null,
}));

vi.mock('../../components/NewCheckout', () => ({
  CheckoutView: () => null,
}));

vi.mock('./components/MembershipsSection', () => ({
  default: () => null,
}));

vi.mock('./components/FloatingCart', () => ({
  default: () => null,
}));

vi.mock('./components/PackagesGrid', () => ({
  default: mockPackagesGrid,
}));

describe.each([
  ['StoreV3 primary store', StoreV3],
  ['StoreV2 lazy fallback store', StoreV2],
] as const)('%s live catalog truth', (_label, StoreSurface) => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockPackagesGrid.mockClear();
  });

  it('pauses package sales instead of rendering fallback packages when the live catalog fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('storefront unavailable'));

    render(<StoreSurface />);

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/api/storefront'));

    expect(await screen.findByText(/failed to load packages/i)).toBeInTheDocument();
    expect(screen.getByText(/we couldn't load the training packages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry loading/i })).toBeInTheDocument();
    expect(mockPackagesGrid).not.toHaveBeenCalled();
  });

  it('passes physical product variants from API data into the shared grid', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        items: [{
          id: 42,
          name: 'Buddy Fat Skin Recovery Drink',
          description: 'Fresh local recovery drink',
          packageType: 'custom',
          price: '17.00',
          itemKind: 'physical_product',
          isTaxable: true,
          fulfillmentType: 'local_delivery',
          variants: [
            { id: 7, storefrontItemId: 42, label: 'Everyday 16oz', price: '6.50', displayOrder: 1 },
          ],
        }],
      },
    });

    render(<StoreSurface />);

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/api/storefront'));
    await waitFor(() => expect(mockPackagesGrid).toHaveBeenCalled());

    const props = mockPackagesGrid.mock.calls[0][0];
    expect(props.packages[0]).toMatchObject({
      itemKind: 'physical_product',
      isTaxable: true,
      fulfillmentType: 'local_delivery',
    });
    expect(props.packages[0].variants[0]).toMatchObject({
      id: 7,
      label: 'Everyday 16oz',
      price: 6.5,
    });
  });
});
