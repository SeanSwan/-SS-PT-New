import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  subscription: {
    tiers: [] as Array<Record<string, unknown>>,
    loading: false,
    error: null as string | null,
    fetchTiers: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => mocks.subscription,
}));

import MembershipsSection from './MembershipsSection';
import MembershipSummary from './MembershipSummary';

const tier = (overrides: Record<string, unknown> = {}) => ({
  id: 'elite',
  name: 'Crystalline Swan',
  tagline: 'Current backend tagline',
  price: 31.5,
  priceDisplay: '$31.50/mo',
  annualPrice: 300,
  annualPriceDisplay: '$300/yr',
  features: ['Current feature from the tier API'],
  limits: { aiMessagesPerMonth: 10, aiGenerationsPerMonth: 2 },
  ...overrides,
});

describe('MembershipsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscription.tiers = [];
    mocks.subscription.loading = false;
    mocks.subscription.error = null;
  });

  it('renders current backend prices and features instead of static membership copy', () => {
    mocks.subscription.tiers = [
      tier({ id: 'free', name: 'Starter from API', price: 0, priceDisplay: 'Free now', features: ['Starter API feature'] }),
      tier({ id: 'pro', name: 'Guardian from API', price: 7, priceDisplay: 'Pay what you can (suggested $7)', donationBased: true, minimumPrice: 2, maximumPrice: 75, suggestedPrice: 7, features: ['Guardian API feature'] }),
      tier(),
    ];

    render(<MembershipsSection />);

    expect(screen.getByText('Starter from API')).toBeInTheDocument();
    expect(screen.getByText('Guardian from API')).toBeInTheDocument();
    expect(screen.getByText('Current feature from the tier API')).toBeInTheDocument();
    expect(screen.getByText('Pay what you can (suggested $7)')).toBeInTheDocument();
    expect(screen.getByText('one-time - pay what you can')).toBeInTheDocument();
    expect(screen.queryByText('From $1')).not.toBeInTheDocument();
    expect(screen.queryByText('$24.99/mo')).not.toBeInTheDocument();
  });

  it('derives supported annual savings from current prices', () => {
    render(<MembershipSummary tier={tier({ price: 31.5, annualPrice: 300 })} billingInterval="year" />);

    expect(screen.getByText('Save $78.00 annually')).toBeInTheDocument();
    expect(screen.queryByText(/Save \$50/)).not.toBeInTheDocument();
  });

  it('shows loading, retryable error, and explicit empty states', () => {
    mocks.subscription.loading = true;
    render(<MembershipsSection />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading membership/i);

    mocks.subscription.loading = false;
    mocks.subscription.error = 'Tier service unavailable';
    const { unmount } = render(<MembershipsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tier service unavailable');
    fireEvent.click(screen.getByRole('button', { name: /retry memberships/i }));
    expect(mocks.subscription.fetchTiers).toHaveBeenCalledTimes(1);
    unmount();

    mocks.subscription.error = null;
    render(<MembershipsSection />);
    expect(screen.getByText(/membership tiers are temporarily unavailable/i)).toBeInTheDocument();
  });
});
