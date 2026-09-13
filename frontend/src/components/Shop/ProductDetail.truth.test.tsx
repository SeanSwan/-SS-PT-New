import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProduct = vi.hoisted(() => vi.fn());
const mockAddToCart = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: getProduct }));
const mockAuthState = vi.hoisted(() => ({ isAuthenticated: false, user: null as { id: number } | null }));

vi.mock('axios', () => ({ default: { get: getProduct } }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '42' }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, ...mockAuthState }),
}));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart: mockAddToCart }) }));
vi.mock('../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../services/api.service', () => ({ default: { post: vi.fn() } }));

import ProductDetail from './ProductDetail';
import ProductDetailContent from './ProductDetailContent';

const physicalFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 20, name: 'Recovery product', description: 'Recovery', packageType: 'custom',
  displayPrice: 17.5, price: 17.5, totalCost: 17.5, itemKind: 'physical_product',
  isTaxable: true, fulfillmentType: 'pickup', stockQuantity: 10, isActive: true,
  imageUrl: null, variants: [
    { id: 1, storefrontItemId: 20, label: 'Single', price: 17.5, stockQuantity: 5, isActive: true, displayOrder: 1 },
    { id: 2, storefrontItemId: 20, label: 'Pair', price: 29.75, stockQuantity: 2, isActive: true, displayOrder: 2 },
  ], ...overrides,
} as any);
const detailFixture = (product: ReturnType<typeof physicalFixture>, onAddToCart = vi.fn()) => (
  <ProductDetailContent product={product} isAuthenticated addingToCart={false} onAddToCart={onAddToCart} onRequestPricing={vi.fn()} />
);

describe('detail integration failure boundaries', () => {
  beforeEach(() => { mockAuthState.isAuthenticated = false; mockAuthState.user = null; });
  it('does not buy a priced stocked physical item without a required variant', () => {
    render(detailFixture(physicalFixture({ variants: [] })));
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument();
    expect(screen.getByText(/options.*unavailable/i)).toBeInTheDocument();
  });
  it.each([false, true])('explains invitation access and allows inquiry when authenticated=%s but price absent', isAuthenticated => {
    const inquire = vi.fn();
    render(<ProductDetailContent product={physicalFixture({ itemKind: 'training_package', packageType: 'fixed', displayPrice: null, price: null, totalCost: null, variants: [] })} isAuthenticated={isAuthenticated} addingToCart={false} onAddToCart={vi.fn()} onRequestPricing={inquire} />);
    expect(document.body.textContent).not.toMatch(/pricing is available after sign in|sign in to view.*pric/i);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about pricing' }));
    expect(inquire).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument();
  });
  it('never renders fabricated recommendation products or popularity claims', async () => {
    getProduct.mockReset();
    getProduct.mockResolvedValue({ data: { success: true, item: physicalFixture() } });
    render(<ProductDetail />);
    await screen.findByRole('heading', { name: 'Recovery product' });
    expect(screen.queryByText('Recommended Item 1')).not.toBeInTheDocument();
    expect(screen.queryByText(/Frequently bought together/)).not.toBeInTheDocument();
  });
  it('offers the server-supplied price to an authenticated buyer with access', () => {
    const add = vi.fn();
    render(detailFixture(physicalFixture({ itemKind: 'training_package', variants: [], displayPrice: 105 }), add));
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ price: 105 }));
  });
  it('does not buy a parent when all of its variants are inactive', () => {
    const product = physicalFixture();
    product.variants.forEach((variant: any) => { variant.isActive = false; });
    render(detailFixture(product));
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument();
  });
  it('clamps quantity when selecting a lower-stock variant', () => {
    const add = vi.fn();
    render(detailFixture(physicalFixture(), add));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Product variant' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ productVariantId: 2, quantity: 2 }));
  });
  it('uses tracked variant stock instead of the parent fallback, matching checkout', () => {
    render(detailFixture(physicalFixture({ stockQuantity: 0 })));
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  });
  it('provides retry after a failed detail request', async () => {
    getProduct.mockReset();
    getProduct.mockRejectedValueOnce(new Error('Synthetic transport failure'));
    getProduct.mockResolvedValueOnce({ data: { success: true, item: physicalFixture() } });
    render(<ProductDetail />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry product details' }));
    expect(await screen.findByRole('heading', { name: 'Recovery product' })).toBeInTheDocument();
  });
});

describe('ProductDetail truth contract', () => {
  beforeEach(() => {
    getProduct.mockReset();
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
    getProduct.mockResolvedValue({
      data: {
        success: true,
        item: {
          id: 42,
          name: 'Private training package',
          description: 'Access controlled package',
          price: null,
          totalCost: null,
          displayPrice: null,
          pricePerSession: null,
          packageType: 'monthly',
          months: 3,
          sessionsPerWeek: 2,
          totalSessions: 24,
          itemKind: 'training_package',
          variants: [],
          includedFeatures: '[]',
          isActive: true,
        },
      },
    });
  });

  it('renders a guest hidden-price detail without throwing or exposing a zero price', async () => {
    render(<ProductDetail />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Private training package' })).toBeInTheDocument());

    expect(screen.getByText(/training pricing is by invitation/i)).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask about pricing/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ask about pricing/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog').parentElement?.parentElement).toBe(document.body);
  });

  it('uses the selected stocked physical variant in the cart payload', async () => {
    const onAddToCart = vi.fn();
    render(
      <ProductDetailContent
        product={{
          id: 20,
          name: 'Recovery drink',
          description: 'Physical item',
          packageType: 'custom',
          displayPrice: 17,
          price: 17,
          totalCost: 17,
          itemKind: 'physical_product',
          isTaxable: true,
          fulfillmentType: 'local_delivery',
          stockQuantity: null,
          variants: [
            { id: 1, storefrontItemId: 20, label: 'Small', price: 17, stockQuantity: 0, isActive: true, displayOrder: 1, sku: null, attributes: null },
            { id: 2, storefrontItemId: 20, label: 'Large', price: 24, stockQuantity: 3, isActive: true, displayOrder: 2, sku: null, attributes: null },
          ],
          isActive: true,
          imageUrl: null,
        } as any}
        isAuthenticated
        addingToCart={false}
        onAddToCart={onAddToCart}
        onRequestPricing={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: /product variant/i }), { target: { value: '2' } });
    const increase = screen.getByRole('button', { name: /increase quantity/i });
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({
      storefrontItemId: 20,
      productVariantId: 2,
      quantity: 3,
      price: 24,
    }));
    expect(screen.getByText(/3 available/i)).toBeInTheDocument();
  });

  it('does not fall back to a parent price when every active physical variant is unavailable', () => {
    const onAddToCart = vi.fn();
    render(
      <ProductDetailContent
        product={{
          id: 21,
          name: 'Sold out recovery kit',
          description: 'Physical item',
          packageType: 'fixed',
          displayPrice: 19,
          price: 19,
          totalCost: 19,
          itemKind: 'physical_product',
          isTaxable: true,
          fulfillmentType: 'self_ship',
          stockQuantity: 4,
          variants: [{ id: 4, storefrontItemId: 21, label: 'Only size', price: null, stockQuantity: 0, isActive: true, displayOrder: 1, sku: null, attributes: null }],
          isActive: true,
          imageUrl: null,
        } as any}
        isAuthenticated
        addingToCart={false}
        onAddToCart={onAddToCart}
        onRequestPricing={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent(/unavailable/i);
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/sessions/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask about availability/i })).toBeInTheDocument();
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('drops a guest response after an account switch before rendering privileged data', async () => {
    let resolveGuest!: (value: unknown) => void;
    let resolveAccount!: (value: unknown) => void;
    getProduct
      .mockImplementationOnce(() => new Promise((resolve) => { resolveGuest = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveAccount = resolve; }));

    const { rerender } = render(<ProductDetail />);
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 7 };
    rerender(<ProductDetail />);

    await act(async () => {
      resolveGuest({ data: { success: true, item: { id: 42, name: 'Old guest result', price: 1, displayPrice: 1, itemKind: 'training_package', packageType: 'fixed', variants: [] } } });
    });
    expect(screen.queryByText('Old guest result')).not.toBeInTheDocument();

    await act(async () => {
      resolveAccount({ data: { success: true, item: { id: 42, name: 'Account result', price: 99, displayPrice: 99, itemKind: 'training_package', packageType: 'fixed', variants: [] } } });
    });
    expect(await screen.findByRole('heading', { name: 'Account result' })).toBeInTheDocument();
  });
});
