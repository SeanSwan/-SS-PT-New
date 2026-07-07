/**
 * About V4 — Orchestrator
 * ========================
 * Thin composition layer wiring all About page sections with
 * performance-tiered animations (full/balanced/essential).
 *
 * Refactored from 1,260-line About.V3 into 9 section components,
 * each under 230 lines. CompetitiveEdge replaces the old comparison table.
 */

import React from 'react';
import styled from 'styled-components';
import SeoHead from '../../components/seo/SeoHead';
import { useAnimationTier, useTierFlags } from '../../hooks/useAnimationTier';
import { ScrollProgress, SectionTransition } from '../../components/ui/animations';

import HeroSection from './components/sections/HeroSection';
import FounderQuoteSection from './components/sections/FounderQuoteSection';
import AboutSeanSection from './components/sections/AboutSeanSection';
import PromiseSection from './components/sections/PromiseSection';
import StatsSection from './components/sections/StatsSection';
import TimelineSection from './components/sections/TimelineSection';
import PhilosophySection from './components/sections/PhilosophySection';
import CompetitiveEdgeSection from './components/sections/CompetitiveEdgeSection';
import CTASection from './components/sections/CTASection';
import { YEARS_EXPERIENCE_CLAIM } from '../../content/marketingStats';

const MainWrapper = styled.main`
  position: relative;
  background: var(--bg-base, #0A0A0F);
`;

const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

const AboutV4: React.FC = () => {
  const tier = useAnimationTier();
  const { isFull, showGlow } = useTierFlags(tier);

  return (
    <>
      <SeoHead
        title={`About SwanStudios | ${YEARS_EXPERIENCE_CLAIM} Years of Elite Personal Training + Swan Coach Technology`}
        description={`Meet Sean Swan — NCEP-certified, NASM-protocol trainer with ${YEARS_EXPERIENCE_CLAIM} years experience. SwanStudios combines elite personal training with Swan Coach technology for truly personalized fitness.`}
        path="/about"
        type="profile"
      />

      <ScrollProgress enabled={isFull} />

      <MainWrapper>
        {isFull && <NoiseOverlay />}

        <HeroSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <FounderQuoteSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <AboutSeanSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <PromiseSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <StatsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <TimelineSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <PhilosophySection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <CompetitiveEdgeSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <CTASection tier={tier} />
      </MainWrapper>
    </>
  );
};

export default AboutV4;
