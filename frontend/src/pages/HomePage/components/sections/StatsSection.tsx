/**
 * StatsSection — Animated counter stats strip for the homepage
 * =============================================================
 * Displays 6 key metrics in a responsive grid with scroll-triggered
 * counter animations. Tier-aware: full gets stagger + TextSplitter,
 * balanced gets stagger + plain title, essential skips all animation.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import styled from 'styled-components';
import { SectionEl, Container, SectionHeader, SectionTitle } from '../shared/HomeStyles';
import { getReveal, staggerContainer } from '../shared/HomeAnimations';
import { STATS } from '../shared/HomeData';
import AnimatedCounter from '../../../../components/ui/animations/AnimatedCounter';
import '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';

interface StatsSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const BorderedSection = styled(SectionEl)`
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1.5rem, 3vw, 2.5rem);

  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(6, 1fr); }
`;

const StatItem = styled(motion.div)`
  text-align: center;
`;

const StatIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
  opacity: 0.6;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

const StatNumber = styled.div`
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 1) 0%,
    var(--accent-primary, #60C0F0) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary, rgba(240, 240, 255, 0.6));
  margin-top: 0.25rem;
`;

const StatsSection: React.FC<StatsSectionProps> = ({ tier }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';
  const reveal = getReveal(isEssential);

  return (
    <BorderedSection>
      <Container>
        <SectionHeader variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <SectionTitle>
            {isFull ? (
              <TextSplitter text="By the Numbers" as="span" />
            ) : (
              'By the Numbers'
            )}
          </SectionTitle>
        </SectionHeader>

        <StatsGrid
          ref={ref}
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true }}
        >
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <StatItem key={stat.label} variants={isEssential ? undefined : reveal}>
                <StatIcon><Icon size={24} /></StatIcon>
                <StatNumber>
                  {stat.display && isInView ? (
                    `${stat.display}${stat.suffix}`
                  ) : stat.display ? (
                    <AnimatedCounter
                      target={stat.target}
                      suffix={stat.suffix}
                      skipAnimation={isEssential}
                      seedFinal
                    />
                  ) : (
                    <AnimatedCounter
                      target={stat.target}
                      suffix={stat.suffix}
                      skipAnimation={isEssential}
                      seedFinal
                    />
                  )}
                </StatNumber>
                <StatLabel>{stat.label}</StatLabel>
              </StatItem>
            );
          })}
        </StatsGrid>
      </Container>
    </BorderedSection>
  );
};

export default StatsSection;
