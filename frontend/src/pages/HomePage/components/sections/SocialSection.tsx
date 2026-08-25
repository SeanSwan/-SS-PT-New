/**
 * SocialSection -- "Beyond the Gym" social community showcase
 * Tier-aware: full (parallax + blur stagger), balanced (stagger), essential (static)
 */
import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Container, SectionHeader, SectionTitle, SectionSubtitle,
  IconWrapper, FeatureTitle, FeatureDesc,
} from '../shared/HomeStyles';
import { getReveal, staggerContainer } from '../shared/HomeAnimations';
import { SOCIAL_CATEGORIES } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import { StyledBox } from '@/components/ui/StyledBox';
import { motionStyleProps } from '@/components/ui/motionStyleProps';

interface SocialSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* -- Local styled components ---------------------------------------- */

const BeyondSection = styled.section`
  position: relative;
  overflow: hidden;
  padding: 6rem 0;
  background-color: var(--bg-base, #0A0A0F);
`;

const BeyondImageBg = styled(motion.div)`
  position: absolute;
  inset: 0;
  top: -10%;
  height: 120%;
  background: url('/images/parallax/beyond-the-gym-bg.png') center / cover no-repeat;
  opacity: 0.45;
  z-index: 1;
  will-change: transform;
`;

const BeyondOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(
    180deg,
    var(--bg-base, #0A0A0F) 0%,
    transparent 30%,
    transparent 70%,
    var(--bg-base, #0A0A0F) 100%
  );
`;

const SocialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  position: relative;
  z-index: 3;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

/* -- Component ------------------------------------------------------ */

const SocialSection: React.FC<SocialSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const isFull = tier === 'full';
  const isEssential = tier === 'essential';

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  getReveal(isEssential);

  return (
    <BeyondSection ref={sectionRef}>
      {isFull && <BeyondImageBg {...motionStyleProps({ y: parallaxY })} />}
      {!isEssential && <BeyondOverlay />}
      <StyledBox as={Container} $style={{ position: 'relative', zIndex: 3 }}>
        <ScrollReveal disabled={isEssential} blur={isFull} once>
          <SectionHeader>
            <SectionTitle>Beyond the Gym</SectionTitle>
            <SectionSubtitle>
              SwanStudios is where fitness meets everything else that makes life
              worth living.
            </SectionSubtitle>
          </SectionHeader>
        </ScrollReveal>

        <SocialGrid
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.15 }}
        >
          {SOCIAL_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <ScrollReveal
                key={i}
                delay={isEssential ? 0 : i * 0.08}
                disabled={isEssential}
                blur={isFull}
                once
              >
                <StyledBox as={GlassCard} interactive $style={{ height: '100%' }}>
                  <IconWrapper><Icon size={28} /></IconWrapper>
                  <FeatureTitle>{cat.title}</FeatureTitle>
                  <FeatureDesc>{cat.desc}</FeatureDesc>
                </StyledBox>
              </ScrollReveal>
            );
          })}
        </SocialGrid>

        <ScrollReveal disabled={isEssential} blur={isFull} once>
          <StyledBox as="div" $style={{ textAlign: 'center', marginTop: '3rem', position: 'relative', zIndex: 3 }}>
            <ForgeButton
              text="Join the Community"
              variant="cosmic"
              onClick={() => navigate('/user-dashboard')}
              style={{ minWidth: 220 }}
            />
          </StyledBox>
        </ScrollReveal>
      </StyledBox>
    </BeyondSection>
  );
};

export default SocialSection;
