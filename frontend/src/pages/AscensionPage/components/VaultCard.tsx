import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { TierDefinition } from '../../../hooks/useSubscription';
import DonationSlider from './DonationSlider';

type Variant = 'starter' | 'guardian' | 'crystalline';

interface VaultCardProps {
  tier: TierDefinition;
  variant: Variant;
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
  tier, variant, donationAmount = 5, onDonationChange, isAnnual = false,
  onToggleBilling, onCheckout, onStartTrial, showTrialButton, isCurrentTier, index,
}) => {
  const price = variant === 'crystalline' && isAnnual && tier.annualPrice
    ? tier.annualPrice
    : tier.price;

  const priceLabel = variant === 'starter'
    ? 'Free'
    : variant === 'guardian'
      ? `$${donationAmount}`
      : isAnnual && tier.annualPriceDisplay
        ? tier.annualPriceDisplay
        : tier.priceDisplay;

  const periodLabel = variant === 'starter'
    ? 'forever'
    : variant === 'guardian'
      ? '/mo · pay what you can'
      : isAnnual ? '/yr' : '/mo';

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
      {variant === 'crystalline' && <CrystallineBorder />}

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
        <BillingToggle>
          <BillingOption $active={!isAnnual} onClick={() => isAnnual && onToggleBilling()}>Monthly</BillingOption>
          <BillingOption $active={isAnnual} onClick={() => !isAnnual && onToggleBilling()}>
            Annual <SaveBadge>Save $50</SaveBadge>
          </BillingOption>
        </BillingToggle>
      )}

      <FeatureList>
        {tier.features.map((feature, i) => (
          <FeatureItem key={i} $variant={variant}>
            <CheckIcon $variant={variant}><Check size={14} /></CheckIcon>
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
              <TrialButton onClick={onStartTrial}>Start 30-Day Free Trial</TrialButton>
            )}
            <CTAButton $variant={variant} onClick={onCheckout}>
              {variant === 'starter' ? 'Get Started — Free' : variant === 'guardian' ? 'Support SwanStudios' : 'Upgrade to Crystalline'}
            </CTAButton>
          </>
        )}
      </CTAArea>
    </Card>
  );
};

export default VaultCard;

// ─── Animations ──────────────���─────────────────────────────────

const breathe = keyframes`
  0%, 100% { opacity: 0.5; box-shadow: 0 0 10px 0 rgba(139, 92, 246, 0.2); }
  50% { opacity: 1; box-shadow: 0 0 25px 0 rgba(96, 192, 240, 0.4); }
`;

// ─── Styled Components ─────────────────────────────────────────

const Card = styled.div<{ $variant: Variant }>`
  position: relative;
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  z-index: 1;

  ${({ $variant }) => $variant === 'starter' && css`
    background: #141419;
    border: 1px solid #2A2A33;
  `}

  ${({ $variant }) => $variant === 'guardian' && css`
    background: linear-gradient(180deg, #141419 0%, #002060 100%);
    border: 1px solid rgba(198, 168, 75, 0.4);
  `}

  ${({ $variant }) => $variant === 'crystalline' && css`
    background: #0A0A0F;
    border: none;
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.15);
  `}
`;

const CrystallineBorder = styled.div`
  position: absolute;
  inset: -2px;
  border-radius: calc(1.5rem + 2px);
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  z-index: -1;
  animation: ${breathe} 4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.8;
  }
`;

const TierName = styled.h2<{ $variant: Variant }>`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 2rem;
  margin: 0 0 0.25rem;
  color: ${({ $variant }) =>
    $variant === 'crystalline' ? '#60C0F0'
    : $variant === 'guardian' ? '#C6A84B'
    : '#E0ECF4'};
`;

const Tagline = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: rgba(224, 236, 244, 0.6);
  margin: 0 0 1.5rem;
  line-height: 1.4;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 1rem;
`;

const Price = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 3rem;
  letter-spacing: -1px;
  color: #E0ECF4;
`;

const Period = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: rgba(224, 236, 244, 0.5);
`;

const BillingToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: rgba(10, 10, 15, 0.5);
  border-radius: 0.75rem;
  padding: 0.25rem;
`;

const BillingOption = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 0.2s;
  background: ${({ $active }) => $active ? '#8B5CF6' : 'transparent'};
  color: ${({ $active }) => $active ? '#0A0A0F' : 'rgba(224, 236, 244, 0.5)'};
`;

const SaveBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  background: #C6A84B;
  color: #0A0A0F;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const FeatureItem = styled.li<{ $variant: Variant }>`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  color: rgba(224, 236, 244, 0.8);
  line-height: 1.4;
  min-height: 28px;
`;

const CheckIcon = styled.span<{ $variant: Variant }>`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ $variant }) =>
    $variant === 'crystalline' ? '#60C0F0'
    : $variant === 'guardian' ? '#C6A84B'
    : 'rgba(224, 236, 244, 0.4)'};
`;

const CTAArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1.5rem;
`;

const CTAButton = styled.button<{ $variant: Variant }>`
  width: 100%;
  border: none;
  border-radius: 0.75rem;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-height: 48px;

  ${({ $variant }) => $variant === 'starter' && css`
    background: #2A2A33;
    color: #E0ECF4;
    &:hover { background: #3A3A44; }
  `}

  ${({ $variant }) => $variant === 'guardian' && css`
    background: #002060;
    color: #E0ECF4;
    min-height: 48px;
    &:hover {
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
      transform: translateY(-2px);
    }
  `}

  ${({ $variant }) => $variant === 'crystalline' && css`
    background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
    color: #0A0A0F;
    min-height: 56px;
    font-size: 1.05rem;
    &:hover {
      box-shadow: 0 0 25px rgba(96, 192, 240, 0.5);
      transform: translateY(-2px);
    }
  `}

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

const TrialButton = styled.button`
  width: 100%;
  background: transparent;
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 0.75rem;
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  &:hover {
    border-color: #60C0F0;
    background: rgba(96, 192, 240, 0.05);
  }
`;

const CurrentPlanBadge = styled.div`
  width: 100%;
  text-align: center;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(96, 192, 240, 0.3);
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
`;
