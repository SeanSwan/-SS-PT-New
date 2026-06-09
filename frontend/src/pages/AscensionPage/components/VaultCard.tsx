/**
 * FILE: VaultCard.tsx
 * PURPOSE: Render one canonical Ascension subscription tier card.
 * LAST VALIDATED: 2026-06-09 via VaultCard theme contract and Ascension visual smoke.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { TierDefinition } from '../../../hooks/useSubscription';
import DonationSlider from './DonationSlider';
import {
  BillingOption,
  BillingToggle,
  Card,
  CheckIcon,
  CrystallineBorder,
  CTAButton,
  CTAArea,
  CurrentPlanBadge,
  FeatureItem,
  FeatureList,
  Period,
  Price,
  PriceRow,
  SaveBadge,
  Tagline,
  TierName,
  TrialButton,
  type VaultCardVariant,
} from './VaultCard.styles';

interface VaultCardProps {
  tier: TierDefinition;
  variant: VaultCardVariant;
  donationAmount?: number;
  onDonationChange?: (amount: number) => void;
  isAnnual?: boolean;
  onToggleBilling?: () => void;
  onCheckout: () => void;
  onStartTrial?: () => void;
  showTrialButton?: boolean;
  isCurrentTier?: boolean;
  index: number;
}

const cardVariant = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15, delay: i * 0.15 },
  }),
};

const VaultCard: React.FC<VaultCardProps> = ({
  tier,
  variant,
  donationAmount = 5,
  onDonationChange,
  isAnnual = false,
  onToggleBilling,
  onCheckout,
  onStartTrial,
  showTrialButton,
  isCurrentTier,
  index,
}) => {
  const crystallinePrice = isAnnual && tier.annualPrice ? tier.annualPrice : tier.price;

  const priceLabel = variant === 'starter'
    ? 'Free'
    : variant === 'guardian'
      ? `$${donationAmount}`
      : `$${crystallinePrice.toFixed(2)}`;

  const periodLabel = variant === 'starter'
    ? 'forever'
    : variant === 'guardian'
      ? 'one-time - pay what you can'
      : isAnnual ? '/yr' : '/mo';

  const ctaLabel = variant === 'starter'
    ? 'Get Started - Free'
    : variant === 'guardian'
      ? 'Support SwanStudios'
      : 'Upgrade to Crystalline';

  return (
    <Card
      as={motion.div}
      custom={index}
      variants={cardVariant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      $variant={variant}
    >
      {variant === 'crystalline' && <CrystallineBorder aria-hidden="true" />}

      <TierName $variant={variant}>{tier.name}</TierName>
      <Tagline>{tier.tagline}</Tagline>

      <PriceRow>
        <Price>{priceLabel}</Price>
        <Period>{periodLabel}</Period>
      </PriceRow>

      {variant === 'guardian' && onDonationChange && (
        <DonationSlider
          min={tier.minimumPrice || 1}
          max={tier.maximumPrice || 50}
          value={donationAmount}
          suggested={tier.suggestedPrice || 5}
          donationTiers={tier.donationTiers}
          onChange={onDonationChange}
        />
      )}

      {variant === 'crystalline' && onToggleBilling && (
        <BillingToggle aria-label="Billing interval">
          <BillingOption
            $active={!isAnnual}
            aria-pressed={!isAnnual}
            onClick={() => isAnnual && onToggleBilling()}
            type="button"
          >
            Monthly
          </BillingOption>
          <BillingOption
            $active={isAnnual}
            aria-pressed={isAnnual}
            onClick={() => !isAnnual && onToggleBilling()}
            type="button"
          >
            Annual <SaveBadge>Save $50</SaveBadge>
          </BillingOption>
        </BillingToggle>
      )}

      <FeatureList>
        {tier.features.map((feature, i) => (
          <FeatureItem key={`${feature}-${i}`} $variant={variant}>
            <CheckIcon $variant={variant}>
              <Check size={14} aria-hidden="true" focusable="false" />
            </CheckIcon>
            <span>{feature}</span>
          </FeatureItem>
        ))}
      </FeatureList>

      <CTAArea>
        {isCurrentTier ? (
          <CurrentPlanBadge>Current Plan</CurrentPlanBadge>
        ) : (
          <>
            {showTrialButton && onStartTrial && (
              <TrialButton onClick={onStartTrial} type="button">
                Start 30-Day Free Trial
              </TrialButton>
            )}
            <CTAButton $variant={variant} onClick={onCheckout} type="button">
              {ctaLabel}
            </CTAButton>
          </>
        )}
      </CTAArea>
    </Card>
  );
};

export default VaultCard;
