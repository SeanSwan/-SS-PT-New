import React from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import type { TierDefinition } from '../../../hooks/useSubscription';

export type MembershipBillingInterval = 'month' | 'year';

const finiteMoney = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

// Shared by the storefront and Ascension card; this file is not a Fast Refresh entrypoint.
// eslint-disable-next-line react-refresh/only-export-components
export const deriveAnnualSavings = (tier: TierDefinition): number | null => {
  const monthly = finiteMoney(tier.price);
  const annual = finiteMoney(tier.annualPrice);
  if (monthly === null || annual === null || monthly <= 0 || annual <= 0 || annual >= monthly * 12) return null;
  return Number((monthly * 12 - annual).toFixed(2));
};

const formatMoney = (amount: number): string => `$${amount.toFixed(2)}`;

export interface MembershipSummaryProps {
  tier: TierDefinition;
  billingInterval?: MembershipBillingInterval;
  donationAmount?: number;
  compact?: boolean;
}

const MembershipSummary: React.FC<MembershipSummaryProps> = ({
  tier,
  billingInterval = 'month',
  donationAmount,
  compact = false,
}) => {
  const isDonation = tier.donationBased === true || tier.payWhatYouWant === true;
  const donation = finiteMoney(donationAmount ?? tier.suggestedPrice);
  const selectedDonation = donationAmount !== undefined && donation !== null;
  const annual = finiteMoney(tier.annualPrice);
  const monthly = finiteMoney(tier.price);
  const hasAnnualPrice = billingInterval === 'year' && annual !== null && annual > 0;
  const price = isDonation && selectedDonation
    ? formatMoney(donation)
    : isDonation
      ? (tier.priceDisplay || 'Pay what you can')
    : hasAnnualPrice
      ? formatMoney(annual)
      : monthly === 0
        ? (tier.priceDisplay || 'Free')
        : monthly !== null
          ? formatMoney(monthly)
          : (tier.priceDisplay || 'Price unavailable');
  const period = isDonation
    ? 'one-time - pay what you can'
    : monthly === 0
      ? 'forever'
      : hasAnnualPrice
        ? 'per year'
        : 'per month';
  const savings = billingInterval === 'year' ? deriveAnnualSavings(tier) : null;

  return (
    <Summary $compact={compact}>
      <TierName>{tier.name}</TierName>
      <Tagline>{tier.tagline}</Tagline>
      <PriceRow>
        <Price aria-label={`${price} ${period}`}>{price}</Price>
        <Period>{period}</Period>
        {savings !== null && <Savings>Save {formatMoney(savings)} annually</Savings>}
      </PriceRow>
      <FeatureList>
        {tier.features.map((feature, index) => (
          <Feature key={`${feature}-${index}`}>
            <Check size={14} aria-hidden="true" />
            <span>{feature}</span>
          </Feature>
        ))}
      </FeatureList>
    </Summary>
  );
};

export default MembershipSummary;

const Summary = styled.div<{ $compact: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '0.45rem' : '0.7rem')};
`;

const TierName = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.45rem, 3vw, 2rem);
  font-style: italic;
  line-height: 1.1;
`;

const Tagline = styled.p`
  margin: 0;
  color: var(--text-secondary, #a9bfd0);
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.45;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const Price = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
`;

const Period = styled.span`
  color: var(--text-muted, #7f96a8);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

const Savings = styled.span`
  flex-basis: 100%;
  color: var(--gilded-fern, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
`;

const FeatureList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0.3rem 0 0;
  padding: 0;
  list-style: none;
`;

const Feature = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--text-secondary, #a9bfd0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  line-height: 1.4;

  svg {
    flex: 0 0 auto;
    margin-top: 0.16rem;
    color: var(--accent-primary, #60C0F0);
  }
`;
