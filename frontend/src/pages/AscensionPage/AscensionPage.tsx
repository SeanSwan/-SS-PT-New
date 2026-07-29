/**
 * COMPONENT: AscensionPage
 * PURPOSE: Present SwanStudios membership tiers and route users into trial or checkout.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [optional guardian upgrade banner]
 * [membership hero]
 * [tier cards: starter, guardian, crystalline]
 * [mission note]
 *
 * DATA FLOW:
 * Props In: none.
 * State: donation amount, annual billing, mobile layout, subscription tier data.
 * API Calls: useSubscription.fetchTiers, startTrial, checkout.
 * Events: tier checkout, annual toggle, starter signup, trial start.
 * Children: VaultCard, TierCarousel, page-shell visual primitives.
 *
 * ARCHITECTURE: AscensionPage -> AscensionPage.styles + VaultCard/TierCarousel.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSubscription } from '../../hooks/useSubscription';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import VaultCard from './components/VaultCard';
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

const AscensionPage: React.FC = () => {
  const { tiers, subscription, checkout, startTrial, fetchTiers, loading } = useSubscription();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [donationAmount, setDonationAmount] = useState(5);
  const [isAnnual, setIsAnnual] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    void fetchTiers();
  }, [fetchTiers]);

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

  // null (not 'free') when no subscription record exists — a signed-out visitor
  // has no plan, so no card may claim "Current Plan" (2026-07-28 launch audit).
  const currentTier = subscription?.tier ?? null;
  const showTrial = !subscription;
  const showCrystallinePromo = subscription?.crystallinePromoEligible === true;

  const handleCheckout = (tier: 'pro' | 'elite') => {
    if (tier === 'pro') {
      void checkout('pro', donationAmount);
      return;
    }

    void checkout('elite', undefined, isAnnual ? 'year' : 'month');
  };

  const handleStartTrial = async () => {
    const result = await startTrial();
    if (result?.success) navigate('/dashboard');
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

  const renderCards = () => cards.map((card, i) => (
    <VaultCard
      key={card.variant}
      tier={card.tier!}
      variant={card.variant}
      index={i}
      donationAmount={card.variant === 'guardian' ? donationAmount : undefined}
      onDonationChange={card.variant === 'guardian' ? setDonationAmount : undefined}
      isAnnual={card.variant === 'crystalline' ? isAnnual : undefined}
      onToggleBilling={card.variant === 'crystalline' ? () => setIsAnnual(v => !v) : undefined}
      onCheckout={() => {
        if (card.variant === 'starter') navigate('/signup');
        else handleCheckout(card.variant === 'guardian' ? 'pro' : 'elite');
      }}
      onStartTrial={showTrial ? handleStartTrial : undefined}
      showTrialButton={showTrial && card.variant === 'starter'}
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
            onClick={() => void checkout('elite', undefined, isAnnual ? 'year' : 'month')}
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
