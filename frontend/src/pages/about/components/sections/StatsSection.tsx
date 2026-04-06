/**
 * StatsSection — Animated counter stats for the About page
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import styled from 'styled-components';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import AnimatedCounter from '../../../../components/ui/animations/AnimatedCounter';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine, SectionSubtitle } from '../shared/AboutStyles';
import { statsData } from '../shared/AboutData';
import { staggerContainer, getReveal } from '../shared/AboutAnimations';

interface StatsSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
  @media (min-width: 2560px) { gap: 2.5rem; }
`;

const StatCard = styled(motion.div)<{ $accentColor?: string }>`
  text-align: center;
  padding: 2rem 1.5rem;
  border-radius: 16px;
  background: var(--bg-surface, rgba(26, 26, 36, 0.8));
  backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid ${({ $accentColor }) => `${$accentColor || '#8B5CF6'}20`};
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    border-color: ${({ $accentColor }) => `${$accentColor || '#8B5CF6'}50`};
    box-shadow: 0 0 24px ${({ $accentColor }) => `${$accentColor || '#8B5CF6'}25`},
                0 8px 32px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 320px) { padding: 1.5rem 1rem; border-radius: 12px; }
  @media (min-width: 2560px) { padding: 3rem 2rem; border-radius: 20px; }
`;

const StatNumber = styled.div<{ $accentColor?: string }>`
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--text-primary, #E0ECF4), ${({ $accentColor }) => $accentColor || '#8B5CF6'});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 320px) { font-size: 2rem; }
  @media (min-width: 2560px) { font-size: 3.5rem; }
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 320px) { font-size: 0.75rem; }
  @media (min-width: 2560px) { font-size: 1.15rem; }
`;

const StatsSection: React.FC<StatsSectionProps> = ({ tier }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';
  const reveal = getReveal(isEssential);

  return (
    <SectionEl $alt>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionTitle>
            {isFull ? <TextSplitter text="By The Numbers" as="span" mode="words" /> : 'By The Numbers'}
          </SectionTitle>
          <AccentLine />
          <SectionSubtitle>Decades of dedication, thousands of lives changed.</SectionSubtitle>
        </ScrollReveal>

        <StatsGrid
          ref={ref}
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true }}
        >
          {statsData.map((stat) => (
            <StatCard key={stat.label} $accentColor={stat.color} variants={isEssential ? undefined : reveal}>
              <StatNumber $accentColor={stat.color}>
                <AnimatedCounter
                  target={stat.numericValue}
                  suffix={stat.suffix}
                  skipAnimation={isEssential || !isInView}
                />
              </StatNumber>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
      </Container>
    </SectionEl>
  );
};

export default StatsSection;
