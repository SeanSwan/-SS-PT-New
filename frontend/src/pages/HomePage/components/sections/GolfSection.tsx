/**
 * GolfSection -- "Master The Fairway" golf performance section
 * Tier-aware: full (parallax + slide animations), balanced (fade), essential (static)
 */
import React from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crosshair } from 'lucide-react';
import { SectionEl, Container, SectionHeader, SectionTitle, SectionSubtitle } from '../shared/HomeStyles';
import { slideInLeft, reducedReveal, staggerContainer } from '../shared/HomeAnimations';
import { GOLF_FEATURES } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler PR #1 (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import { motionStyleProps } from '@/components/ui/motionStyleProps';

interface GolfSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* ── Local styled components ───────────────────────────── */

const GolfBg = styled(SectionEl)`
  position: relative;
  background-color: var(--bg-base, #0A0A0F);
`;

const ParallaxLayer = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: url('/images/parallax/golf-section-bg.png') center / cover no-repeat;
  opacity: 0.4;
  z-index: 1;
  will-change: transform;
`;

const GolfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  align-items: start;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
`;

const GolfFeatureList = styled(motion.ul)`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const GolfFeatureItem = styled(motion.li)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;

  svg {
    flex-shrink: 0;
    color: var(--accent-primary, #60C0F0);
    margin-top: 2px;
  }
`;

const FeatureText = styled.div`
  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    font-size: 1.05rem;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    color: var(--text-secondary, #B0C4D8);
    font-size: 0.925rem;
    line-height: 1.6;
  }
`;

const GolfSummaryCard = styled(GlassCard)`
  text-align: center;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
`;

const SummaryIcon = styled.div`
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 0.5rem;
`;

const SummaryHeading = styled.h3`
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  margin: 0;
`;

const SummaryDesc = styled.p`
  color: var(--text-secondary, #B0C4D8);
  font-size: 0.95rem;
  line-height: 1.65;
  max-width: 360px;
  margin: 0;
`;

/* ── Component ─────────────────────────────────────────── */

const GolfSection: React.FC<GolfSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const sectionRef = React.useRef<HTMLElement>(null);
  const isFull = tier === 'full';
  const isEssential = tier === 'essential';

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  const leftVariants = isFull ? slideInLeft : reducedReveal;


  const featureList = (
    <GolfFeatureList
      variants={isEssential ? undefined : staggerContainer}
      initial={isEssential ? undefined : 'hidden'}
      whileInView={isEssential ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.2 }}
    >
      {GOLF_FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <GolfFeatureItem key={i} variants={isEssential ? undefined : leftVariants}>
            <Icon size={22} />
            <FeatureText>
              <strong>{f.title}</strong>
              <p>{f.desc}</p>
            </FeatureText>
          </GolfFeatureItem>
        );
      })}
    </GolfFeatureList>
  );

  const summaryCard = (
    <ScrollReveal direction={isFull ? 'right' : 'none'} disabled={isEssential} once blur={isFull}>
      <GolfSummaryCard variant="gold" interactive>
        <SummaryIcon><Crosshair size={40} /></SummaryIcon>
        <SummaryHeading>Golf Performance Program</SummaryHeading>
        <SummaryDesc>
          Sport-specific training built on NASM principles — rotational power,
          core stability, and mobility protocols that translate directly to the course.
        </SummaryDesc>
        <ForgeButton
          text="Improve Your Game"
          variant="gilded"
          onClick={() => navigate('/contact')}
          style={{ minWidth: 200 }}
        />
      </GolfSummaryCard>
    </ScrollReveal>
  );

  return (
    <GolfBg ref={sectionRef}>
      {isFull && <ParallaxLayer {...motionStyleProps({ y: parallaxY })} />}
      <Container>
        <ScrollReveal disabled={isEssential} blur={isFull} once>
          <SectionHeader>
            <SectionTitle>Master The Fairway</SectionTitle>
            <SectionSubtitle>
              Unlock your full potential on the course with sport-specific training
              designed for golfers of every level.
            </SectionSubtitle>
          </SectionHeader>
        </ScrollReveal>
        <GolfGrid>
          {featureList}
          {summaryCard}
        </GolfGrid>
      </Container>
    </GolfBg>
  );
};

export default GolfSection;
