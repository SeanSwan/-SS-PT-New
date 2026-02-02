import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PackageCard from './PackageCard';

vi.mock('./SpecialBadge', () => ({
  SpecialBadge: ({ bonusSessions }: { bonusSessions: number }) => (
    <div data-testid="special-badge">+{bonusSessions} BONUS</div>
  )
}));

describe('PackageCard with Specials', () => {
  const basePackage = {
    id: 1,
    name: '10-Pack Bundle',
    description: 'Test package',
    price: 1650,
    sessions: 10,
    pricePerSession: 165,
    packageType: 'fixed' as const,
    months: null,
    imageUrl: null,
    theme: 'cyan'
  };

  const baseProps = {
    package: basePackage,
    canViewPrices: true,
    canPurchase: true,
    isPriceRevealed: false,
    isAdding: false,
    onTogglePrice: vi.fn(),
    onAddToCart: vi.fn()
  };

  it('renders package without special badge when no special', () => {
    render(<PackageCard {...baseProps} />);

    expect(screen.getByText('10-Pack Bundle')).toBeInTheDocument();
    expect(screen.queryByTestId('special-badge')).not.toBeInTheDocument();
  });

  it('renders special badge when activeSpecial is provided', () => {
    render(
      <PackageCard
        {...baseProps}
        activeSpecial={{
          id: 1,
          name: 'Test Special',
          bonusSessions: 2,
          endsAt: '2026-01-31T23:59:59Z'
        }}
      />
    );

    expect(screen.getByTestId('special-badge')).toBeInTheDocument();
    expect(screen.getByText('+2 BONUS')).toBeInTheDocument();
  });

  it('shows bonus sessions in session count text', () => {
    render(
      <PackageCard
        {...baseProps}
        activeSpecial={{
          id: 1,
          name: 'Test Special',
          bonusSessions: 2,
          endsAt: '2026-01-31T23:59:59Z'
        }}
      />
    );

    expect(screen.getByText(/Bonus training sessions/i)).toBeInTheDocument();
  });
});
