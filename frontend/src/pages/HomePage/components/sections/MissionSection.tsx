/**
 * MissionSection — "Why We Built This" mission statement
 * Tier-aware: full (blur+text split), balanced (reveal), essential (static)
 */
import React from 'react';
import styled from 'styled-components';
import { SectionEl, Container, SectionHeader, SectionTitle } from '../shared/HomeStyles';
import { getReveal, cinematicReveal } from '../shared/HomeAnimations';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';

interface MissionSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const MissionBg = styled(SectionEl)`
  background-color: var(--bg-base, #0A0A0F);
  padding: 5rem 1.5rem;
`;

const GlassCard = styled.div`
  max-width: 900px;
  margin: 0 auto;
  background: rgba(20, 20, 25, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 236, 244, 0.05);
  border-radius: 16px;
  padding: 3rem 2.5rem;

  @media (max-width: 640px) {
    padding: 2rem 1.25rem;
  }
`;

const Paragraph = styled.p`
  color: var(--text-secondary, #B0C4D8);
  font-size: 1.05rem;
  line-height: 1.75;
  margin-bottom: 1.25rem;

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const GoldClosing = styled.p`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.2rem;
  line-height: 1.6;
  margin-top: 2rem;
  text-align: center;
`;

const PARAGRAPHS = [
  'The food industry profits from making you sick. Social media profits from your attention. Gaming companies fire the people who made their best games. Healthcare safety nets are disappearing.',
  'SwanStudios exists because we believe you deserve better. A platform that puts your health first, remembers your journey, supports your trainer, celebrates your creativity, and never sells you out.',
  "We're not here to extract value from you. We're here to help you build it — for yourself, and for the people around you.",
];

const CLOSING = 'Built by a trainer. Owned by the community. Powered by all of us.';

const MissionSection: React.FC<MissionSectionProps> = ({ tier }) => {
  const useBlur = tier === 'full';
  const animate = tier !== 'essential';
  const reveal = getReveal(false);

  const title = tier === 'full'
    ? <TextSplitter text="Why We Built This" />
    : <>Why We Built This</>;

  const content = (
    <GlassCard>
      <SectionHeader variants={animate ? cinematicReveal : undefined}>
        <SectionTitle>{title}</SectionTitle>
      </SectionHeader>
      {PARAGRAPHS.map((text, i) => (
        <Paragraph key={i}>{text}</Paragraph>
      ))}
      <GoldClosing>{CLOSING}</GoldClosing>
    </GlassCard>
  );

  return (
    <MissionBg>
      <Container>
        {animate ? (
          <ScrollReveal blur={useBlur} {...reveal}>
            {content}
          </ScrollReveal>
        ) : (
          content
        )}
      </Container>
    </MissionBg>
  );
};

export default MissionSection;
