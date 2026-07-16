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
  SectionSubtitle, ParallaxBg, IconWrapper, FeatureTitle, FeatureDesc,
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
      {/* Parallax background — full tier only */}
      {isFull && (
        <ParallaxBg
          $bgImage="/images/parallax/features-swan-bg.png"
          $opacity={0.35}
          {...motionStyleProps({ y: parallaxY })}
        />
      )}

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
