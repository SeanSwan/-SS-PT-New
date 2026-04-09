/**
 * ============================================================================
 * COMPONENT: SubscriptionSuccessPage
 * ============================================================================
 * PURPOSE: Post-checkout confirmation page for Guardian donations and
 *          Crystalline Swan subscriptions. Stripe redirects here after
 *          successful payment (success_url in subscriptionRoutes.mjs).
 *
 * WHAT THIS FILE DOES:
 *   - Reads `session_id` from URL params (Stripe passes it)
 *   - Fetches updated subscription status from /api/subscriptions/status
 *   - Renders tier-aware confirmation (Guardian vs Crystalline)
 *   - Shows Crystalline upgrade promo if Guardian cumulative >= $25
 *   - Links back to dashboard and ascension page
 *
 * HOW IT FITS IN THE APP:
 *   Route: /subscription/success?session_id=cs_live_...
 *   Registered in: frontend/src/routes/main-routes.tsx
 * ============================================================================
 */
import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(96,192,240,0.3); }
  50%       { box-shadow: 0 0 40px rgba(96,192,240,0.6), 0 0 80px rgba(96,192,240,0.2); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  min-height: 100vh;
  background: var(--bg-base, #0A0A0F);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
`;

const Card = styled.div`
  background: var(--card-dark, #141419);
  border: 1px solid rgba(96,192,240,0.2);
  border-radius: 20px;
  padding: 3rem 2.5rem;
  max-width: 540px;
  width: 100%;
  text-align: center;
  animation: ${fadeUp} 0.6s ease forwards, ${glow} 3s ease-in-out 0.6s infinite;
`;

const IconRing = styled.div<{ $tier: 'pro' | 'elite' }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: ${({ $tier }) =>
    $tier === 'elite'
      ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(96,192,240,0.3))'
      : 'rgba(198,168,75,0.15)'};
  border: 2px solid ${({ $tier }) =>
    $tier === 'elite' ? 'rgba(139,92,246,0.5)' : 'rgba(198,168,75,0.4)'};
`;

const TierBadge = styled.span<{ $tier: 'pro' | 'elite' }>`
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1rem;
  ${({ $tier }) =>
    $tier === 'elite'
      ? `background: linear-gradient(135deg, #8B5CF6, #60C0F0);
         background-size: 200% auto;
         animation: ${shimmer} 3s linear infinite;
         color: #030712;`
      : `background: rgba(198,168,75,0.15);
         color: #C6A84B;
         border: 1px solid rgba(198,168,75,0.4);`}
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
  color: var(--frost-white, #E0ECF4);
  margin: 0 0 0.75rem;
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(224,236,244,0.7);
  margin: 0 0 2rem;
`;

const PromoBanner = styled.div`
  background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(96,192,240,0.1));
  border: 1px solid rgba(139,92,246,0.4);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
`;

const PromoTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ice-wing, #60C0F0);
  margin: 0 0 0.4rem;
`;

const PromoText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224,236,244,0.7);
  margin: 0 0 0.75rem;
`;

const PromoBtn = styled.button`
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: #030712;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  min-height: 44px;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.88; }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PrimaryBtn = styled.button`
  background: var(--midnight-sapphire, #002060);
  color: var(--ice-wing, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  border: 1px solid rgba(96,192,240,0.3);
  border-radius: 10px;
  padding: 14px 24px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  &:hover {
    background: var(--royal-depth, #003080);
    border-color: rgba(96,192,240,0.6);
  }
`;

const SecondaryLink = styled.button`
  background: transparent;
  color: rgba(224,236,244,0.5);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  min-height: 44px;
  &:hover { color: rgba(224,236,244,0.8); }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, fetchStatus, checkout } = useSubscription();
  const [fetched, setFetched] = useState(false);

  // Refresh subscription status once on mount (Stripe webhook may have just fired)
  useEffect(() => {
    if (!fetched) {
      setFetched(true);
      // Brief delay to allow webhook processing
      const t = setTimeout(() => fetchStatus(), 1200);
      return () => clearTimeout(t);
    }
  }, [fetched, fetchStatus]);

  const tier = subscription?.tier === 'elite' ? 'elite' : 'pro';
  const isElite = tier === 'elite';
  const promoEligible = subscription?.crystallinePromoEligible === true;
  const cumulative = subscription?.cumulativeDonationAmount || 0;

  const handleUpgrade = () => {
    checkout('elite', undefined, 'month');
  };

  return (
    <PageWrapper>
      <Card>
        <IconRing $tier={tier}>
          {isElite ? '✦' : '♾'}
        </IconRing>

        <TierBadge $tier={tier}>
          {isElite ? 'Crystalline Swan' : 'Swan Guardian'}
        </TierBadge>

        <Title>
          {isElite ? 'You\'ve Ascended' : 'Thank You, Guardian'}
        </Title>

        <Subtitle>
          {isElite
            ? 'Crystalline Swan is active. You now have full platform access including direct trainer connections, advanced analytics, and all premium tools.'
            : 'Your donation powers the mission. Guardian tier is active — NASM calculators, advanced analytics, and AI coaching context are all unlocked.'}
        </Subtitle>

        {promoEligible && !isElite && (
          <PromoBanner>
            <PromoTitle>Crystalline Upgrade Available</PromoTitle>
            <PromoText>
              You've donated ${cumulative.toFixed(2)} — enough to unlock a discounted
              Crystalline Swan subscription. Get direct trainer access for just $24.99/mo.
            </PromoText>
            <PromoBtn onClick={handleUpgrade}>
              Upgrade to Crystalline Swan →
            </PromoBtn>
          </PromoBanner>
        )}

        <ButtonRow>
          <PrimaryBtn onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </PrimaryBtn>
          <SecondaryLink onClick={() => navigate('/ascension')}>
            View all tiers
          </SecondaryLink>
        </ButtonRow>
      </Card>
    </PageWrapper>
  );
};

export default SubscriptionSuccessPage;
