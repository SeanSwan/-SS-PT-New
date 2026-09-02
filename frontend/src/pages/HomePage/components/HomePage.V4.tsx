/**
 * HomePage V5 — Orchestrator
 * ============================
 * Thin composition layer that wires together all homepage sections
 * with performance-tiered animations (full/balanced/essential).
 *
 * Sections are lazy-loadable, each under 200 lines.
 * Animation tier detected once here and passed to all children.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import SeoHead from '../../../components/seo/SeoHead';
import { useAnimationTier, useTierFlags } from '../../../hooks/useAnimationTier';
import { ScrollProgress } from '../../../components/ui/animations';
import { SectionTransition } from '../../../components/ui/animations';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { PrismCapture } from '../../../components/marketing/PrismCapture'; // self-gates → null when flag off
import { EvidenceLensBand } from './EvidenceLensBand'; // SWA-25 ratified proof device — direct mount, no flag

// Section components
import HeroSection from './sections/HeroSection';
import QuickLinksStrip from './sections/QuickLinksStrip';
import MissionSection from './sections/MissionSection';
import TrainersSection from './sections/TrainersSection';
import ArsenalSection from './sections/ArsenalSection';
import ProgramsSection from './sections/ProgramsSection';
import GolfSection from './sections/GolfSection';
import AboutSection from './sections/AboutSection';
import TestimonialsSection from './sections/TestimonialsSection';
import StatsSection from './sections/StatsSection';
import SocialSection from './sections/SocialSection';
import CTASection from './sections/CTASection';
import NewsletterSection from './sections/NewsletterSection';

const MainWrapper = styled.div`
  position: relative;
  background: var(--bg-base, #002060);
`;

const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

const HomePageV4: React.FC = () => {
  const tier = useAnimationTier();
  const { isFull, showGlow } = useTierFlags(tier);
  const [showOrientation, setShowOrientation] = useState(false);

  return (
    <>
      <SeoHead
        title="SwanStudios | Personal Training, Progress, and Community"
        description="Personal training, practical progress tracking, and a health-first community built by SwanStudios in Anaheim Hills."
        path="/"
      />

      <ScrollProgress enabled={isFull} />

      <MainWrapper>
        {isFull && <NoiseOverlay />}

        <HeroSection
          tier={tier}
          prefersReduced={tier === 'essential'}
          onOpenOrientation={() => setShowOrientation(true)}
        />
        {/* Quick-nav pills relocated from the hero (H5, five-surface review): hero keeps two CTAs */}
        <QuickLinksStrip />
        {/* PRISM speed-to-lead capture — self-gates to null when PRISM_CAPTURE_ENABLED/flag is off (zero impact) */}
        <PrismCapture />
        {/* SWA-25: ratified gold Evidence Lens — circles the ONE real-proof number (marketingStats
            truth module only). Mounted DIRECTLY per Sean 2026-07-21: no toggles, no flags. */}
        <EvidenceLensBand />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <MissionSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <TrainersSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <ArsenalSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <ProgramsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <GolfSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <AboutSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <TestimonialsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <StatsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <SocialSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <NewsletterSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <CTASection tier={tier} />
      </MainWrapper>

      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </>
  );
};

export default HomePageV4;
