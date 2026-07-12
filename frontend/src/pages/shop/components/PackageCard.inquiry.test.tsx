import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PackageCard from './PackageCard';

vi.mock('./SpecialBadge', () => ({
  SpecialBadge: () => <div data-testid="special-badge" />,
}));

const pkg: any = {
  id: 7,
  name: 'Gold Swan Package',
  description: 'Test package',
  price: 3300,
  displayPrice: 3300,
  sessions: 20,
  pricePerSession: 165,
  packageType: 'fixed',
  months: null,
  imageUrl: null,
  theme: 'cosmic',
};

const baseProps = {
  package: pkg,
  canPurchase: false,
  isAdding: false,
  onAddToCart: vi.fn(),
};

describe('PackageCard — pricing inquiry CTA', () => {
  it('shows "Ask About Pricing" (not Add to Cart) when prices are hidden and onInquire is wired', () => {
    const onInquire = vi.fn();
    render(<PackageCard {...baseProps} canViewPrices={false} onInquire={onInquire} />);

    expect(
      screen.getByRole('button', { name: /ask about pricing for gold swan package/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add gold swan package to cart/i })
    ).not.toBeInTheDocument();
  });

  it('calls onInquire with the package when the inquiry button is clicked', () => {
    const onInquire = vi.fn();
    render(<PackageCard {...baseProps} canViewPrices={false} onInquire={onInquire} />);

    fireEvent.click(
      screen.getByRole('button', { name: /ask about pricing for gold swan package/i })
    );
    expect(onInquire).toHaveBeenCalledTimes(1);
    expect(onInquire).toHaveBeenCalledWith(pkg);
  });

  it('shows Add to Cart (not the inquiry CTA) when prices are visible', () => {
    render(
      <PackageCard
        {...baseProps}
        canViewPrices={true}
        canPurchase={true}
        onInquire={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /add gold swan package to cart/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask about pricing/i })
    ).not.toBeInTheDocument();
  });

  it('falls back to the disabled cart button when prices are hidden but no onInquire is provided', () => {
    render(<PackageCard {...baseProps} canViewPrices={false} />);
    expect(
      screen.getByRole('button', { name: /add gold swan package to cart/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask about pricing/i })
    ).not.toBeInTheDocument();
  });
});
