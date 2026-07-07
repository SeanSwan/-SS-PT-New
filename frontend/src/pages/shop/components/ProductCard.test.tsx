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
  it('renders variant picker, local delivery, tax, and product add state', () => {
    render(<ProductCard product={product} canViewPrices canPurchase onAddToCart={vi.fn()} />);

    expect(screen.getByRole('article', { name: /buddy fat skin recovery drink product card/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /product variants/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /everyday 16oz trial/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /organic 1\.5l day bottle/i })).toBeDisabled();
    expect(screen.getByText('$6.50')).toBeInTheDocument();
    expect(screen.getByText(/local delivery \/ pickup only/i)).toBeInTheDocument();
    expect(screen.getByText(/stripe tax checkout/i)).toBeInTheDocument();
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

  it('does not show product price to non-granted visitors (invitation model)', () => {
    render(<ProductCard product={product} canViewPrices={false} />);

    expect(screen.getAllByText(/by invitation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('$6.50')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /purchase by invitation/i })).toBeDisabled();
  });
});
