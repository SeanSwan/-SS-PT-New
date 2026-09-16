import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductCard from './ProductCard';
import type { StoreItem } from './storeCatalog.types';

const product: StoreItem = {
  id: 40,
  name: 'Buddy Fat Skin Recovery Drink',
  description: 'Fresh ginger, lemon, honey, tea, and spices prepared for local recovery support.',
  packageType: 'custom',
  displayPrice: 17,
  price: 17,
  totalCost: 17,
  isActive: true,
  imageUrl: null,
  itemKind: 'physical_product',
  isTaxable: true,
  fulfillmentType: 'local_delivery',
  stockQuantity: null,
  variants: [
    {
      id: 100,
      storefrontItemId: 40,
      label: 'Everyday 16oz Trial',
      sku: 'BFS-EVERYDAY-16',
      price: 6.5,
      stockQuantity: null,
      attributes: { tier: 'Everyday', size: '16oz' },
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 101,
      storefrontItemId: 40,
      label: 'Organic 1.5L Day Bottle',
      sku: 'BFS-ORGANIC-15L',
      price: 24,
      stockQuantity: 0,
      attributes: { tier: 'Organic', size: '1.5L' },
      displayOrder: 2,
      isActive: true,
    },
  ],
};

describe('ProductCard', () => {
  it('does not offer a priced stocked physical item without required variants', () => {
    render(<ProductCard product={{ ...product, stockQuantity: 10, variants: [] }} canViewPrices canPurchase onAddToCart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /add product/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /options unavailable/i })).toBeDisabled();
    expect(screen.getByText(/options.*unavailable/i)).toBeInTheDocument();
  });
  it.each([0, -1, 1.5])('does not offer purchase for invalid item identity %s', id => {
    render(<ProductCard product={{ ...product, id }} canViewPrices canPurchase onAddToCart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add product/i })).toBeDisabled();
  });
  it('renders variant picker, local delivery, tax, and product add state', () => {
    render(<ProductCard product={product} canViewPrices canPurchase onAddToCart={vi.fn()} />);

    expect(screen.getByRole('article', { name: /buddy fat skin recovery drink product card/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /product variants/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /everyday 16oz trial/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /organic 1\.5l day bottle/i })).toBeDisabled();
    expect(screen.getByText('$6.50')).toBeInTheDocument();
    expect(screen.getByText(/local delivery or pickup/i)).toBeInTheDocument();
    expect(screen.getByText(/applicable tax is calculated at checkout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add product/i })).toBeEnabled();
  });

  it('updates selected price from keyboard-accessible variant buttons', async () => {
    const user = userEvent.setup();
    render(<ProductCard product={{ ...product, variants: product.variants.map((variant) => ({ ...variant, stockQuantity: null })) }} canViewPrices canPurchase onAddToCart={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: /organic 1\.5l day bottle/i }));

    expect(screen.getByRole('radio', { name: /organic 1\.5l day bottle/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('$24')).toBeInTheDocument();
  });

  it('adds the selected variant to cart', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    const stockedProduct = {
      ...product,
      variants: product.variants.map((variant) => ({ ...variant, stockQuantity: null })),
    };

    render(<ProductCard product={stockedProduct} canViewPrices canPurchase onAddToCart={onAddToCart} />);

    await user.click(screen.getByRole('radio', { name: /organic 1\.5l day bottle/i }));
    await user.click(screen.getByRole('button', { name: /add product/i }));

    expect(onAddToCart).toHaveBeenCalledWith(stockedProduct, stockedProduct.variants[1]);
  });

  it('uses a tracked variant stock value before the parent stock value', () => {
    render(
      <ProductCard
        product={{ ...product, stockQuantity: 0, variants: [{ ...product.variants[0], stockQuantity: 3 }] }}
        canViewPrices
        canPurchase
        onAddToCart={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /add product/i })).toBeEnabled();
    expect(screen.getByText(/ready for cart/i)).toBeInTheDocument();
  });

  it('keeps physical product prices public while reserving purchase for signed-in buyers', () => {
    render(<ProductCard product={product} canViewPrices={false} />);

    expect(screen.getByText('$6.50')).toBeInTheDocument();
    const signIn = screen.getByRole('link', { name: /sign in to purchase/i });
    expect(signIn).toHaveAttribute('href', expect.stringMatching(/^\/login\?returnUrl=/));
  });

  it('does not offer an unpriced product for purchase', () => {
    render(
      <ProductCard
        product={{ ...product, displayPrice: null, price: null, totalCost: null, variants: product.variants.map(variant => ({ ...variant, price: null })) }}
        canViewPrices={false}
        canPurchase
        onAddToCart={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /price unavailable/i })).toBeDisabled();
  });

  it('disables a malformed variant identity even when its price and stock look valid', () => {
    render(
      <ProductCard
        product={{ ...product, variants: [{ ...product.variants[0], id: 0 }] }}
        canViewPrices={false}
        canPurchase
        onAddToCart={vi.fn()}
      />
    );
    expect(screen.getByRole('radio', { name: /everyday 16oz trial/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /sold out|price unavailable|variant/i })).toBeDisabled();
  });
});
