/**
 * PhilosophySection — Four pillar cards (Science, Personalized, Sustainable, Collective)
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine, SectionSubtitle } from '../shared/AboutStyles';
import { philosophies } from '../shared/AboutData';
import { staggerContainer, getReveal } from '../shared/AboutAnimations';

interface PhilosophySectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

const PhilosophyGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
  @media (max-width: 320px) { gap: 1rem; }
  @media (min-width: 2560px) { gap: 2.5rem; }
`;

const PhilosophyCard = styled(motion.div)`
  padding: 2rem;
  border-radius: 16px;
  background: var(--bg-surface, rgba(26, 26, 36, 0.8));
  backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid rgba(96, 192, 240, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.12), 0 8px 32px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 320px) { padding: 1.25rem; border-radius: 12px; }
  @media (min-width: 2560px) { padding: 3rem; border-radius: 20px; }
`;

const IconWrapper = styled.div<{ $animate: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  background: rgba(96, 192, 240, 0.08);
  border: 1px dashed rgba(96, 192, 240, 0.2);
  color: var(--accent-primary, #60C0F0);
  animation: ${({ $animate }) => $animate ? breathe : 'none'} 4s ease-in-out infinite;

  @media (min-width: 2560px) { width: 64px; height: 64px; }
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;

  @media (max-width: 320px) { font-size: 1.05rem; }
  @media (min-width: 2560px) { font-size: 1.5rem; }
`;

const CardBody = styled.p`
  font-size: 0.95rem;
  color: var(--text-body, rgba(224, 236, 244, 0.85));
  line-height: 1.7;
  margin: 0;

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
`;

const PhilosophySection: React.FC<PhilosophySectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';
  const reveal = getReveal(isEssential);

  return (
    <SectionEl $alt>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionTitle>
            {isFull ? <TextSplitter text="Our Philosophy" as="span" mode="words" /> : 'Our Philosophy'}
          </SectionTitle>
          <AccentLine />
          <SectionSubtitle>The four pillars that drive every program we create.</SectionSubtitle>
        </ScrollReveal>

        <PhilosophyGrid
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true }}
        >
          {philosophies.map((p) => {
            const Icon = p.icon;
            return (
              <PhilosophyCard key={p.title} variants={isEssential ? undefined : reveal}>
                <IconWrapper $animate={isFull}><Icon size={24} /></IconWrapper>
                <CardTitle>{p.title}</CardTitle>
                <CardBody>{p.body}</CardBody>
              </PhilosophyCard>
            );
          })}
        </PhilosophyGrid>
      </Container>
    </SectionEl>
  );
};

export default PhilosophySection;
