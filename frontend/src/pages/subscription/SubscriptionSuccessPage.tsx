/**
 * COMPONENT: SubscriptionSuccessPage
 * PURPOSE: Confirm successful Guardian or Crystalline Swan subscription checkout.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [success card: icon, tier badge, headline, confirmation copy]
 * [conditional Crystalline upgrade offer]
 * [dashboard action + ascension link]
 *
 * DATA FLOW:
 * Props In: none; URL param session_id is presence-checked only.
 * State: subscription status from useSubscription.
 * API Calls: useSubscription.fetchStatus and useSubscription.checkout.
 * Events: delayed status refresh, dashboard navigation, ascension navigation, upgrade checkout.
 * Children: styled subscription success controls.
 *
 * ARCHITECTURE: SubscriptionSuccessPage -> SubscriptionSuccessPage.styles + useSubscription.
 */
import React, { useEffect } from 'react';
import { CheckCircle2, Crown, LayoutDashboard, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import {
  ActionButton,
  ButtonRow,
  IconRing,
  PageWrapper,
  PromoButton,
  PromoPanel,
  PromoText,
  PromoTitle,
  SecondaryLink,
  SuccessCard,
  Subtitle,
  TierBadge,
  Title,
} from './SubscriptionSuccessPage.styles';

type SuccessTier = 'pro' | 'elite';

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, fetchStatus, checkout } = useSubscription();
  const hasCheckoutSession = searchParams.has('session_id');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStatus();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [fetchStatus]);

  const tier: SuccessTier = subscription?.tier === 'elite' ? 'elite' : 'pro';
  const isElite = tier === 'elite';
  const promoEligible = subscription?.crystallinePromoEligible === true;
  const cumulative = subscription?.cumulativeDonationAmount || 0;

  const handleUpgrade = () => {
    void checkout('elite', undefined, 'month');
  };

  return (
    <PageWrapper data-checkout-session={hasCheckoutSession ? 'present' : 'missing'}>
      <SuccessCard>
        <IconRing $tier={tier}>
          {isElite ? <Crown size={34} aria-hidden="true" /> : <CheckCircle2 size={34} aria-hidden="true" />}
        </IconRing>

        <TierBadge $tier={tier}>
          {isElite ? 'Crystalline Swan' : 'Swan Guardian'}
        </TierBadge>

        <Title>
          {isElite ? 'You Have Ascended' : 'Thank You, Guardian'}
        </Title>

        <Subtitle>
          {isElite
            ? 'Crystalline Swan is active. You now have full platform access including direct trainer connections, advanced analytics, and all premium tools.'
            : 'Your donation powers the mission. Guardian tier is active, including NASM calculators, advanced analytics, and AI coaching context.'}
        </Subtitle>

        {promoEligible && !isElite && (
          <PromoPanel>
            <PromoTitle>Crystalline Upgrade Available</PromoTitle>
            <PromoText>
              You have donated ${cumulative.toFixed(2)}, enough to unlock a discounted
              Crystalline Swan subscription with direct trainer access for $24.99/mo.
            </PromoText>
            <PromoButton type="button" onClick={handleUpgrade}>
              <Sparkles size={16} aria-hidden="true" />
              Upgrade to Crystalline Swan
            </PromoButton>
          </PromoPanel>
        )}

        <ButtonRow>
          <ActionButton type="button" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={18} aria-hidden="true" />
            Go to Dashboard
          </ActionButton>
          <SecondaryLink type="button" onClick={() => navigate('/ascension')}>
            View all tiers
          </SecondaryLink>
        </ButtonRow>
      </SuccessCard>
    </PageWrapper>
  );
};

export default SubscriptionSuccessPage;
