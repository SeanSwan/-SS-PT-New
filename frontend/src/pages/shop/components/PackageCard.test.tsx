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
    displayPrice: 1650,
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
    isAdding: false,
    onAddToCart: vi.fn()
  };

  it('renders package without special badge when no special', () => {
    render(<PackageCard {...baseProps} />);

    expect(screen.getByText('10-Pack Bundle')).toBeInTheDocument();
    expect(screen.queryByTestId('special-badge')).not.toBeInTheDocument();
  });

  it('shows total investment first without requiring a price reveal click', () => {
    render(<PackageCard {...baseProps} />);

    expect(screen.getByText('Total Investment')).toBeInTheDocument();
    expect(screen.getByText('$1,650')).toBeInTheDocument();
    expect(screen.getByText('10 sessions included')).toBeInTheDocument();
    expect(screen.getByText('$165/session')).toBeInTheDocument();
    expect(screen.queryByText(/click to reveal price/i)).not.toBeInTheDocument();
  });

  it('keeps long-term program math secondary to the total investment', () => {
    render(
      <PackageCard
        {...baseProps}
        package={{
          ...basePackage,
          id: 2,
          name: '6-Month Program',
          packageType: 'monthly',
          months: 6,
          sessions: undefined,
          sessionsPerWeek: 4,
          totalSessions: 96,
          pricePerSession: 175,
          displayPrice: 16800,
        }}
      />
    );

    expect(screen.getByText('$16,800')).toBeInTheDocument();
    expect(screen.getByText('6 months - 4 sessions/week - 96 total sessions')).toBeInTheDocument();
    expect(screen.getByText('$175/session')).toBeInTheDocument();
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
