/**
 * AboutSection -- "About Sean Swan"
 * ====================================
 * Bio + credentials grid with 3 approach cards.
 * Tier-aware animations: full (slides+float+blur), balanced (fades), essential (none).
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Brain, Zap, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  SectionEl, Container, SectionHeader, SectionTitle, SectionSubtitle,
} from '../shared/HomeStyles';
import {
  getReveal, staggerContainer,
} from '../shared/HomeAnimations';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import logoImg from '../../../../assets/Logo.png';

/* ---------- types ---------- */
interface AboutSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* ---------- local styled ---------- */
const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  align-items: center;
  @media (min-width: 1024px) {
    grid-template-columns: 1.5fr 1fr;
  }
`;

const AboutText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  p {
    font-size: 1.05rem;
    line-height: 1.75;
    color: var(--text-secondary, #b0c4de);
  }
`;

const floatAnim = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
`;

const AboutLogoWrapper = styled.div<{ $float?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${({ $float }) => ($float ? floatAnim : 'none')} 4s ease-in-out infinite;
`;

const AboutLogo = styled.img`
  width: 180px;
  height: 180px;
  object-fit: contain;
  filter: drop-shadow(0 0 24px var(--accent-primary, #60C0F0));
  @media (min-width: 768px) {
    width: 260px;
    height: 260px;
  }
`;

const ApproachGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 3rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ApproachCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1.5rem;
  gap: 0.75rem;
  h4 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary, #E0ECF4);
  }
  p {
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--text-secondary, #b0c4de);
  }
  svg {
    color: var(--accent-primary, #60C0F0);
  }
`;

const LearnMoreWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
`;

/* ---------- data ---------- */
const APPROACH_CARDS = [
  { Icon: Brain, title: 'Deep Client Research', desc: 'Your trainer studies your goals, movement history, and athletic background to build a program that\'s truly yours.' },
  { Icon: Zap, title: 'AI-Optimized Programming', desc: 'AI helps analyze performance data and refine your training program for faster, safer results \u2014 guided by your coach.' },
  { Icon: Shield, title: 'Privacy & Rehabilitation', desc: 'Your data stays private through our programming protocol. Injury rehab programs built with precision and care.' },
];

/* ---------- component ---------- */
const AboutSection: React.FC<AboutSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const isFull = tier === 'full';
  const isEssential = tier === 'essential';
  const prefersReduced = isEssential;

  const reveal = getReveal(prefersReduced);



  return (
    <SectionEl>
      <Container>
        <SectionHeader variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <SectionTitle>About Sean Swan</SectionTitle>
          <SectionSubtitle>
            A legacy of transforming lives through science-backed fitness and AI-enhanced coaching.
          </SectionSubtitle>
        </SectionHeader>

        <AboutGrid>
          {/* Bio */}
          <ScrollReveal direction={isFull ? 'left' : 'up'} blur={isFull} disabled={isEssential}>
            <AboutText>
              <p>
                Sean Swan is an NCEP-certified personal trainer (National College of Exercise
                Professionals, 2000) with 26 years of experience helping clients transform their
                lives. Trained in NASM protocols and workshops, Sean applies the NASM Optimum
                Performance Training (OPT) model to every program he builds.
              </p>
              <p>
                His career spans elite fitness brands including LA Fitness, Gold&apos;s Gym, 24 Hour
                Fitness, and Bodies in Motion. His time as a physical therapy aid at Kerlan Jobe
                Health South deepened his expertise in injury prevention, corrective exercise, and
                rehabilitation.
              </p>
              <p>
                At SwanStudios, we blend elite personal training with AI as a powerful tool — not a
                replacement for the coach. Sean and his team conduct deep research on each client&apos;s
                goals, athletic background, and physical history to build truly optimized programs.
                The result: the fastest, safest progress possible with a real coach guiding every
                step.
              </p>
            </AboutText>
          </ScrollReveal>

          {/* Logo */}
          <ScrollReveal direction={isFull ? 'right' : 'up'} blur={isFull} disabled={isEssential}>
            <AboutLogoWrapper $float={isFull}>
              <AboutLogo src={logoImg} alt="SwanStudios logo" loading="lazy" />
            </AboutLogoWrapper>
          </ScrollReveal>
        </AboutGrid>

        {/* Approach cards */}
        <ApproachGrid
          variants={isFull ? staggerContainer : undefined}
          initial={isFull ? 'hidden' : undefined}
          whileInView={isFull ? 'visible' : undefined}
          viewport={{ once: true }}
        >
          {APPROACH_CARDS.map(({ Icon, title, desc }, i) => (
            <ScrollReveal
              key={title}
              delay={isFull ? i * 0.15 : 0}
              blur={isFull}
              disabled={isEssential}
            >
              <ApproachCard>
                <Icon size={36} />
                <h4>{title}</h4>
                <p>{desc}</p>
              </ApproachCard>
            </ScrollReveal>
          ))}
        </ApproachGrid>

        <LearnMoreWrapper>
          <ForgeButton variant="ghost" onClick={() => navigate('/about')}>
            Learn More
          </ForgeButton>
        </LearnMoreWrapper>
      </Container>
    </SectionEl>
  );
};

export default AboutSection;
