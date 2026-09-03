/**
 * ArsenalSection — "The Arsenal" features grid (8 pillars)
 * =========================================================
 * Tier-aware: full=parallax+blur+stagger+icon pulse,
 * balanced=stagger no blur, essential=static render.
 */

import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';

import {
  SectionEl, Container, SectionHeader, SectionTitle,
  SectionSubtitle, IconWrapper, FeatureTitle, FeatureDesc,
} from '../shared/HomeStyles';
import { getReveal, staggerContainer } from '../shared/HomeAnimations';
import { FEATURES } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { motionStyleProps } from '@/components/ui/motionStyleProps';

/* ── Props ────────────────────────────────────────────── */
interface ArsenalSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* ── Local styled grid ────────────────────────────────── */
/**
 * The substrate an optics asset will sit on: layered caustic light over the
 * deep-sapphire base. No figure, no silhouette — dispersion behaviour only.
 */
const CausticSubstrate = styled(motion.div)<{ $opacity?: number }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: ${({ $opacity = 0.35 }) => $opacity};
  background:
    radial-gradient(120% 80% at 22% 18%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent) 0%,
      transparent 58%),
    radial-gradient(90% 70% at 78% 72%,
      color-mix(in srgb, var(--primary, #002060) 55%, transparent) 0%,
      transparent 62%),
    linear-gradient(168deg,
      color-mix(in srgb, var(--primary, #002060) 42%, transparent) 0%,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent) 100%),
    var(--bg-base, #0A0A0F);
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1rem, 2.5vw, 1.5rem);

  @media (min-width: 430px)  { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 2560px) { gap: 2rem; }
`;

const PulseIcon = styled(IconWrapper)<{ $pulse: boolean }>`
  ${({ $pulse }) => $pulse && `
    &:hover {
      transform: scale(1.15);
      box-shadow: 0 0 18px var(--accent-primary, #60C0F0);
    }
  `}
`;

/* ── Component ────────────────────────────────────────── */
const ArsenalSection: React.FC<ArsenalSectionProps> = ({ tier }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isFull = tier === 'full';
  const isEssential = tier === 'essential';
  const prefersReduced = isEssential;
  const reveal = getReveal(prefersReduced);

  // Parallax scroll (full tier only)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);

  return (
    <SectionEl id="features" ref={sectionRef}>
      {/*
        LAW 4 — optics, not creatures. This section rendered a literal winged
        swan illustration (features-swan-bg.png): the exact figure the law
        forbids, on the highest-traffic surface in the product. The swan is
        bent light, never a drawn silhouette.

        Until the caustic-refraction asset is generated (Blueprint v2 S6 —
        STYLE RECEIPT + Seedance brief in the slice), this renders the
        substrate alone: a deep-sapphire caustic gradient with no figure in
        it. That is the honest interim — an empty substrate is on-law; a
        creature is not.

        It also renders on EVERY tier now. The old gate was `isFull &&`, so
        balanced and essential visitors saw no backdrop at all; the parallax
        drift stays full-tier-only (motion is what the tier governs, not
        whether the section has a floor).
      */}
      <CausticSubstrate
        $opacity={0.35}
        {...motionStyleProps(isFull ? { y: parallaxY } : undefined)}
      />

      <Container>
        <SectionHeader variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <SectionTitle>
            {isFull ? (
              <TextSplitter text="The Arsenal" mode="chars" />
            ) : (
              'The Arsenal'
            )}
          </SectionTitle>
          <SectionSubtitle>
            Eight pillars of elite performance, engineered for your transformation.
          </SectionSubtitle>
        </SectionHeader>

        <FeaturesGrid
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.15 }}
        >
          {FEATURES.map((feat, i) => (
            <ScrollReveal
              key={feat.title}
              delay={isEssential ? 0 : i * 0.08}
              blur={isFull}
              disabled={isEssential}
              once
            >
              <GlassCard
                variant="cyan"
                padding="clamp(1.25rem, 3vw, 2rem)"
                interactive={!isEssential}
                disableBlur={isEssential}
              >
                <PulseIcon $pulse={isFull}>
                  <feat.icon size={24} />
                </PulseIcon>
                <FeatureTitle>{feat.title}</FeatureTitle>
                <FeatureDesc>{feat.desc}</FeatureDesc>
              </GlassCard>
            </ScrollReveal>
          ))}
        </FeaturesGrid>
      </Container>
    </SectionEl>
  );
};

export default ArsenalSection;
