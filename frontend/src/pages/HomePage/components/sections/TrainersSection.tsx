/**
 * TrainersSection — "This Platform Is Yours" trainer recruitment CTA
 * Tier-adaptive: full (gold glass + blur), balanced (glass + stagger), essential (static)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

import {
  SectionEl,
  Container,
  SectionHeader,
  SectionTitle,
  SectionSubtitle,
} from '../shared/HomeStyles';
import { getReveal, staggerContainer } from '../shared/HomeAnimations';
import { TRAINER_FEATURES } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import GlowButton from '../../../../components/ui/buttons/GlowButton';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';

/* ── Props ─────────────────────────────────────────────── */
interface TrainersSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* ── Styled ────────────────────────────────────────────── */
const Wrap = styled(SectionEl)`
  background: var(--bg-surface, #141419);
`;

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  margin-bottom: clamp(2rem, 4vw, 3rem);
`;

const IconBox = styled.div`
  margin-bottom: 1rem;
  color: var(--accent-cyan, #60C0F0);
  svg { width: 32px; height: 32px; }
`;

const CardTitle = styled.h3`
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.5rem;
  font-weight: 600;
`;

const CardDesc = styled.p`
  font-size: clamp(0.8125rem, 1.2vw, 0.9375rem);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  line-height: 1.55;
  margin: 0;
`;

const CTARow = styled.div`
  display: flex;
  justify-content: center;
`;

/* ── Component ─────────────────────────────────────────── */
const TrainersSection: React.FC<TrainersSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const isFull = tier === 'full';
  const isEssential = tier === 'essential';
  const prefersReduced = isEssential;
  const reveal = getReveal(prefersReduced);

  const cardVariant = isFull ? 'gold' : 'neutral';

  const renderCard = (f: (typeof TRAINER_FEATURES)[number], i: number) => {
    const Icon = f.icon;
    const inner = (
      <GlassCard
        variant={cardVariant}
        disableBlur={isEssential}
        style={{ border: '1px solid rgba(198, 168, 75, 0.2)' }}
      >
        <IconBox><Icon /></IconBox>
        <CardTitle>{f.title}</CardTitle>
        <CardDesc>{f.desc}</CardDesc>
      </GlassCard>
    );

    if (isFull) {
      return (
        <ScrollReveal key={i} blur delay={i * 0.1}>
          {inner}
        </ScrollReveal>
      );
    }
    if (!isEssential) {
      return <motion.div key={i} variants={reveal}>{inner}</motion.div>;
    }
    return <div key={i}>{inner}</div>;
  };

  const gridProps = isEssential
    ? {}
    : { variants: staggerContainer, initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.2 } };

  return (
    <Wrap>
      <Container>
        <SectionHeader variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <SectionTitle>Trainers: This Platform Is Yours</SectionTitle>
          <SectionSubtitle>
            Whether you're in Anaheim or Amsterdam, Lagos or London — bring your
            clients to SwanStudios.
          </SectionSubtitle>
        </SectionHeader>

        <Grid {...gridProps}>
          {TRAINER_FEATURES.map(renderCard)}
        </Grid>

        <CTARow>
          <GlowButton
            variant="cosmic"
            size="large"
            onClick={() => navigate('/signup?role=trainer')}
          >
            Trainer Sign Up
          </GlowButton>
        </CTARow>
      </Container>
    </Wrap>
  );
};

export default TrainersSection;
