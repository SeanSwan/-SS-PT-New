import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { SectionTitle, SectionSubtitle } from '../shared/HomeStyles';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';

interface CTASectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const CTASectionEl = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 1.5rem;
`;

const CTAContainer = styled(motion.div)`
  background: linear-gradient(180deg, rgba(139,92,246,0.08), rgba(139,92,246,0.04));
  backdrop-filter: blur(24px);
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 32px;
  box-shadow: 0 0 80px rgba(139,92,246,0.04);
  max-width: 900px;
  width: 100%;
  text-align: center;
  padding: 4rem 2.5rem;
  overflow: hidden;
`;

const CTAButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-top: 2rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
  }
`;

const TITLE = 'Ready to Be Part of Something Real?';
const SUBTITLE =
  'Your health journey deserves a permanent home. Your trainer deserves a fair platform. ' +
  'Your community deserves to own itself. SwanStudios is where all of it lives.';

const CTASection: React.FC<CTASectionProps> = ({ tier }) => {
  const navigate = useNavigate();

  const title = tier === 'full'
    ? <SectionTitle><TextSplitter text={TITLE} mode="words" staggerDelay={0.08} /></SectionTitle>
    : <SectionTitle>{TITLE}</SectionTitle>;

  const buttons = (
    <CTAButtons>
      <ForgeButton onClick={() => navigate('/store')} variant="primary">
        Join SwanStudios
      </ForgeButton>
      <ForgeButton onClick={() => navigate('/contact')} variant="ghost">
        Contact Us
      </ForgeButton>
    </CTAButtons>
  );

  const inner = (
    <CTAContainer>
      {title}
      <SectionSubtitle>{SUBTITLE}</SectionSubtitle>
      {buttons}
    </CTAContainer>
  );

  if (tier === 'full') {
    return (
      <CTASectionEl>
        <ScrollReveal blur scale once>{inner}</ScrollReveal>
      </CTASectionEl>
    );
  }

  if (tier === 'balanced') {
    return (
      <CTASectionEl>
        <ScrollReveal once>{inner}</ScrollReveal>
      </CTASectionEl>
    );
  }

  return <CTASectionEl>{inner}</CTASectionEl>;
};

export default CTASection;
