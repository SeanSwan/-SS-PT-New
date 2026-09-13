/** Ascension membership page: current tier data, trial and checkout actions. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSubscription } from '../../hooks/useSubscription';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAuth } from '../../context/AuthContext';
import VaultCard from './VaultCard';
import TierCarousel from './components/TierCarousel';
import {
  DesktopGrid,
  Eyebrow,
  Headline,
  HeroSection,
  HeroSub,
  LoadingState,
  MissionNote,
  PageWrapper,
  PromoBanner,
  PromoBtn,
  PromoContent,
  PromoIcon,
  PromoText,
  PromoTitle,
} from './AscensionPage.styles';
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};
const actionMessage = (error: unknown, fallback: string): string => (
  error instanceof Error && error.message ? error.message : fallback
);
type ActionTarget = 'starter' | 'guardian' | 'crystalline';
const AscensionPage: React.FC = () => {
  const { tiers, subscription, checkout, startTrial, fetchTiers, loading, error } = useSubscription();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorTarget, setActionErrorTarget] = useState<ActionTarget | null>(null);
  const actionRef = useRef(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const tierMap = useMemo(() => {
    const map: Record<string, typeof tiers[0]> = {};
    tiers.forEach(t => { map[t.id] = t; });
    return map;
  }, [tiers]);
  const annualPrice = tierMap.elite?.annualPrice;
  const annualAvailable = typeof annualPrice === 'number'
    && Number.isFinite(annualPrice)
    && annualPrice > 0;
  const resolvedDonationAmount = donationAmount ?? tierMap.pro?.suggestedPrice ?? tierMap.pro?.minimumPrice ?? 1;
  // null (not 'free') when no subscription record exists — a signed-out visitor
  // has no plan, so no card may claim "Current Plan" (2026-07-28 launch audit).
  const currentTier = subscription?.tier ?? null;
  const showTrial = !subscription;
  const showCrystallinePromo = subscription?.crystallinePromoEligible === true;
  const returnLocation = `${location.pathname}${location.search}`;
  const routeGuestToLogin = () => {
    navigate(`/login?returnUrl=${encodeURIComponent(returnLocation)}`);
  };
  const handleCheckout = async (tier: 'pro' | 'elite') => {
    const target: ActionTarget = tier === 'pro' ? 'guardian' : 'crystalline';
    if (!isAuthenticated) {
      routeGuestToLogin();
      return;
    }
    if (actionRef.current) return;
    actionRef.current = true;
    setActionPending(true);
    setActionError(null);
    setActionErrorTarget(null);
    let result;
    try {
      result = tier === 'pro'
        ? await checkout('pro', resolvedDonationAmount)
        : await checkout('elite', undefined, isAnnual && annualAvailable ? 'year' : 'month');
    } catch (requestError) {
      setActionError(actionMessage(requestError, 'Unable to start checkout. Please try again.'));
      setActionErrorTarget(target);
      actionRef.current = false;
      setActionPending(false);
      return;
    }
    if (!result?.success) {
      setActionError(result?.message || 'Unable to start checkout. Please try again.');
      setActionErrorTarget(target);
      actionRef.current = false;
      setActionPending(false);
    } else if (!result.checkoutUrl) {
      setActionError(result?.message || 'Checkout did not return a payment session. Please try again.');
      setActionErrorTarget(target);
      actionRef.current = false;
      setActionPending(false);
    }
  };
  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      routeGuestToLogin();
      return;
    }
    if (actionRef.current) return;
    actionRef.current = true;
    setActionPending(true);
    setActionError(null);
    setActionErrorTarget(null);
    let result;
    try {
      result = await startTrial();
    } catch (requestError) {
      setActionError(actionMessage(requestError, 'Unable to start your trial. Please try again.'));
      setActionErrorTarget('starter');
      actionRef.current = false;
      setActionPending(false);
      return;
    }
    if (result?.success) {
      navigate('/dashboard');
      return;
    }
    setActionError(result?.message || 'Unable to start your trial. Please try again.');
    setActionErrorTarget('starter');
    actionRef.current = false;
    setActionPending(false);
  };
  const cards = [
    { tier: tierMap.free, variant: 'starter' as const },
    { tier: tierMap.pro, variant: 'guardian' as const },
    { tier: tierMap.elite, variant: 'crystalline' as const },
  ].filter(c => c.tier);
  if (loading && tiers.length === 0) {
    return (
      <PageWrapper>
        <LoadingState>Loading tier information...</LoadingState>
      </PageWrapper>
    );
  }
  if (error && tiers.length === 0) {
    return (
      <PageWrapper>
        <LoadingState role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchTiers()}>Retry membership tiers</button>
        </LoadingState>
      </PageWrapper>
    );
  }
  if (tiers.length === 0) {
    return (
      <PageWrapper>
        <LoadingState role="status">Membership tiers are temporarily unavailable.</LoadingState>
      </PageWrapper>
    );
  }
  const renderCards = () => cards.map((card, i) => (
    <VaultCard
      key={card.variant}
      tier={card.tier!}
      variant={card.variant}
      index={i}
      donationAmount={card.variant === 'guardian' ? resolvedDonationAmount : undefined}
      onDonationChange={card.variant === 'guardian' ? value => setDonationAmount(value) : undefined}
      isAnnual={card.variant === 'crystalline' && annualAvailable ? isAnnual : undefined}
      onToggleBilling={card.variant === 'crystalline' && annualAvailable ? () => setIsAnnual(v => !v) : undefined}
      onCheckout={() => {
        if (card.variant === 'starter') navigate('/signup');
        else handleCheckout(card.variant === 'guardian' ? 'pro' : 'elite');
      }}
      onStartTrial={showTrial ? handleStartTrial : undefined}
          showTrialButton={showTrial && card.variant === 'starter'}
          isActionPending={actionPending}
          actionError={actionErrorTarget === card.variant ? actionError : null}
          isCurrentTier={
        (card.variant === 'starter' && currentTier === 'free') ||
        (card.variant === 'guardian' && currentTier === 'pro') ||
        (card.variant === 'crystalline' && currentTier === 'elite')
      }
    />
  ));
  return (
    <PageWrapper>
      <Helmet>
        <title>Ascend Your Training | SwanStudios</title>
        <meta name="description" content="Choose your SwanStudios tier: free Swan Coach for everyone, advanced analytics for Guardians, and human trainer access for Crystalline members." />
      </Helmet>
      {showCrystallinePromo && (
        <PromoBanner
          as={motion.div}
          initial={prefersReduced ? {} : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PromoIcon>
            <Sparkles size={24} aria-hidden="true" />
          </PromoIcon>
          <PromoContent>
            <PromoTitle>You Have Unlocked the Crystalline Upgrade</PromoTitle>
            <PromoText>
              Your Guardian donations have crossed $25. Crystalline Swan is available
              to you with direct trainer access, full analytics, and all premium tools.
            </PromoText>
          </PromoContent>
          <PromoBtn
            type="button"
            onClick={() => void handleCheckout('elite')}
            disabled={actionPending}
          >
            Upgrade Now
          </PromoBtn>
        </PromoBanner>
      )}
      <HeroSection>
        <Eyebrow
          as={motion.span}
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          SwanStudios Membership
        </Eyebrow>
        <Headline
          as={motion.h1}
          initial={prefersReduced ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Ascend Your Training
        </Headline>
        <HeroSub
          as={motion.p}
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          Swan Coach is free for everyone. Choose your level to unlock
          advanced tools, analytics, and human trainer access.
        </HeroSub>
      </HeroSection>
      {isMobile ? (
        <TierCarousel cardCount={cards.length}>
          {renderCards()}
        </TierCarousel>
      ) : (
        <DesktopGrid
          as={motion.div}
          variants={prefersReduced ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {renderCards()}
        </DesktopGrid>
      )}
      <MissionNote
        as={motion.p}
        initial={prefersReduced ? {} : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        viewport={{ once: true }}
      >
        SwanStudios exists to help people. Your donations keep the platform
        free and accessible for everyone, including those who cannot afford
        a gym membership. Health first. Community always.
      </MissionNote>
    </PageWrapper>
  );
};
export default AscensionPage;
