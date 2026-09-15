import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PackageCard from './PackageCard';
import type { StoreItem } from './storeCatalog.types';

vi.mock('./SpecialBadge', () => ({ SpecialBadge: () => null }));

const packageItem: StoreItem = {
  id: 81,
  name: 'Unpriced coaching plan',
  description: 'A package awaiting an authorized price.',
  packageType: 'fixed',
  displayPrice: null,
  price: null,
  totalCost: null,
  pricePerSession: null,
  sessions: 4,
  months: null,
  sessionsPerWeek: null,
  totalSessions: 4,
  isActive: true,
  imageUrl: null,
  itemKind: 'training_package',
  isTaxable: false,
  fulfillmentType: 'none',
  stockQuantity: null,
  variants: [],
};

describe('PackageCard pricing truth', () => {
  it('renders unavailable pricing without a fabricated value badge or sale action', () => {
    render(
      <PackageCard
        package={packageItem}
        canViewPrices
        canPurchase
        isAdding={false}
        onAddToCart={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /price unavailable/i })).toBeInTheDocument();
    expect(screen.queryByText(/best value|great value|good value/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /price unavailable for unpriced coaching plan/i })).toBeDisabled();
  });
});
