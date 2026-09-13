/**
 * FILE: VaultCard.tsx
 * PURPOSE: Render one canonical Ascension subscription tier card.
 * LAST VALIDATED: 2026-06-09 via VaultCard theme contract and Ascension visual smoke.
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { TierDefinition } from '../../../hooks/useSubscription';
import MembershipSummary, { deriveAnnualSavings } from '../../shop/components/MembershipSummary';
import DonationSlider from './DonationSlider';
import {
  BillingOption,
  BillingToggle,
  Card,
  CrystallineBorder,
  CTAButton,
  CTAArea,
  CurrentPlanBadge,
  SaveBadge,
  TrialButton,
  type VaultCardVariant,
} from './VaultCard.styles';

export interface VaultCardProps {
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
  isActionPending?: boolean;
  actionError?: string | null;
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

const GUARDIAN_BILLING_MODE = 'one-time - pay what you can';

const VaultCard: React.FC<VaultCardProps> = ({
  tier,
  variant,
  donationAmount,
  onDonationChange,
  isAnnual = false,
  onToggleBilling,
  onCheckout,
  onStartTrial,
  showTrialButton,
  isCurrentTier,
  isActionPending = false,
  actionError = null,
  index,
}) => {
  const annualAvailable = typeof tier.annualPrice === 'number'
    && Number.isFinite(tier.annualPrice)
    && tier.annualPrice > 0;
  const activeDonation = Number.isFinite(donationAmount)
    ? donationAmount!
    : (tier.suggestedPrice || tier.minimumPrice || 1);
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
      data-billing-mode={variant === 'guardian' ? GUARDIAN_BILLING_MODE : undefined}
    >
      {variant === 'crystalline' && <CrystallineBorder aria-hidden="true" />}

      <MembershipSummary
        tier={tier}
        billingInterval={isAnnual && annualAvailable ? 'year' : 'month'}
        donationAmount={variant === 'guardian' ? activeDonation : undefined}
      />

      {variant === 'guardian' && onDonationChange && (
        <DonationSlider
          min={Number.isFinite(tier.minimumPrice) ? tier.minimumPrice! : 1}
          max={Number.isFinite(tier.maximumPrice) ? tier.maximumPrice! : 50}
          value={activeDonation}
          suggested={Number.isFinite(tier.suggestedPrice) ? tier.suggestedPrice! : (tier.minimumPrice || 1)}
          donationTiers={tier.donationTiers}
          onChange={onDonationChange}
        />
      )}

      {variant === 'crystalline' && annualAvailable && onToggleBilling && (
        <BillingToggle aria-label="Billing interval">
          <BillingOption
            $active={!isAnnual}
            aria-pressed={!isAnnual}
            onClick={() => isAnnual && onToggleBilling()}
            disabled={isActionPending}
            type="button"
          >
            Monthly
          </BillingOption>
          <BillingOption
            $active={isAnnual}
            aria-pressed={isAnnual}
            onClick={() => !isAnnual && onToggleBilling()}
            disabled={isActionPending}
            type="button"
          >
            Annual
            {deriveAnnualSavings(tier) !== null && (
              <SaveBadge>Save ${deriveAnnualSavings(tier)!.toFixed(2)}</SaveBadge>
            )}
          </BillingOption>
        </BillingToggle>
      )}

      <CTAArea>
        {isCurrentTier ? (
          <CurrentPlanBadge>Current Plan</CurrentPlanBadge>
        ) : (
          <>
            {showTrialButton && onStartTrial && (
              <TrialButton onClick={onStartTrial} type="button" disabled={isActionPending} aria-busy={isActionPending}>
                {isActionPending ? 'Starting trial…' : 'Start 30-Day Free Trial'}
              </TrialButton>
            )}
            <CTAButton $variant={variant} onClick={onCheckout} type="button" disabled={isActionPending} aria-busy={isActionPending}>
              {isActionPending ? 'Please wait…' : ctaLabel}
            </CTAButton>
          </>
        )}
        {actionError && <p role="alert">{actionError}</p>}
      </CTAArea>
    </Card>
  );
};

export default VaultCard;
