/**
 * PromiseSection — Three gold-bordered promise cards (Fair, Data, Community)
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Shield, Heart, Users } from 'lucide-react';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine } from '../shared/AboutStyles';
import { promiseCards } from '../shared/AboutData';
import { staggerContainer, getReveal } from '../shared/AboutAnimations';

interface PromiseSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const ICONS = [Shield, Heart, Users];

const PromiseGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const CardInner = styled.div`
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const IconWrap = styled.div`
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;
`;

const CardBody = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  line-height: 1.7;
  margin: 0;
`;

const PromiseSection: React.FC<PromiseSectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';
  const reveal = getReveal(isEssential);

  return (
    <SectionEl>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionTitle>
            {isFull ? <TextSplitter text="The SwanStudios Promise" as="span" mode="words" /> : 'The SwanStudios Promise'}
          </SectionTitle>
          <AccentLine />
        </ScrollReveal>

        <PromiseGrid
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true }}
        >
          {promiseCards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div key={card.title} variants={isEssential ? undefined : reveal}>
                <GlassCard variant="gold" disableBlur={isEssential}>
                  <CardInner>
                    <IconWrap><Icon size={28} /></IconWrap>
                    <CardTitle>{card.title}</CardTitle>
                    <CardBody>{card.body}</CardBody>
                  </CardInner>
                </GlassCard>
              </motion.div>
            );
          })}
        </PromiseGrid>
      </Container>
    </SectionEl>
  );
};

export default PromiseSection;
