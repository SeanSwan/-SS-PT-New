import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSubscription } from '../../hooks/useSubscription';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import VaultCard from './components/VaultCard';
import TierCarousel from './components/TierCarousel';

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

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

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

  const currentTier = subscription?.tier || 'free';
  const showTrial = !subscription;

  const handleCheckout = (tier: 'pro' | 'elite') => {
    if (tier === 'pro') {
      checkout('pro', donationAmount);
    } else {
      checkout('elite', undefined, isAnnual ? 'year' : 'month');
    }
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
        <meta name="description" content="Choose your SwanStudios tier — free Swan Coach for everyone, advanced analytics for Guardians, and human trainer access for Crystalline members." />
      </Helmet>

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
        free and accessible for everyone — including those who can't afford
        a gym membership. Health first. Community always.
      </MissionNote>
    </PageWrapper>
  );
};

export default AscensionPage;

// ─── Animations ─────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─── Styled Components ────────────────��────────────────────────

const PageWrapper = styled.main`
  min-height: 100vh;
  background: #0A0A0F;
  padding: 2rem 1rem 4rem;
  overflow-x: hidden;

  @media (min-width: 768px) { padding: 3rem 2rem 5rem; }
  @media (min-width: 1024px) { padding: 4rem 2rem 6rem; }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  font-family: 'Sora', sans-serif;
  color: rgba(224, 236, 244, 0.5);
  font-size: 1rem;
`;

const HeroSection = styled.header`
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;

  @media (min-width: 1024px) { margin-bottom: 4rem; }
`;

const Eyebrow = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #60C0F0;
  margin-bottom: 0.75rem;
`;

const Headline = styled.h1`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 700;
  font-size: clamp(2.5rem, 6vw, 4rem);
  color: #E0ECF4;
  margin: 0 0 1rem;
  line-height: 1.1;
  background: linear-gradient(90deg, #E0ECF4 0%, #60C0F0 50%, #8B5CF6 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 8s linear infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const HeroSub = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  line-height: 1.6;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
`;

const DesktopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  align-items: start;

  & > :nth-child(2) {
    margin-top: -1rem;
  }
`;

const MissionNote = styled.p`
  text-align: center;
  max-width: 600px;
  margin: 3rem auto 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(224, 236, 244, 0.35);

  @media (min-width: 1024px) { margin-top: 4rem; }
`;
