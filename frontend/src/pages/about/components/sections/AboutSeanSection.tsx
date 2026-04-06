/**
 * AboutSeanSection — Bio, feature list, floating logo, certification badges
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Award, CheckCircle } from 'lucide-react';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine, SectionSubtitle } from '../shared/AboutStyles';
import { certifications, featureList } from '../shared/AboutData';
import logoImg from '../../../../assets/Logo.png';

interface AboutSeanSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const pulseGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.15)); }
  50% { filter: drop-shadow(0 0 35px rgba(139, 92, 246, 0.3)); }
`;

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;

  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 2rem; }
  @media (max-width: 320px) { gap: 1.5rem; }
  @media (min-width: 2560px) { gap: 5rem; }
`;

const AboutText = styled.div`
  p {
    font-size: 1.05rem;
    color: var(--text-body, rgba(224, 236, 244, 0.85));
    line-height: 1.8;
    margin-bottom: 1.25rem;
  }
  p:first-child::first-letter {
    font-size: 3rem;
    font-weight: 700;
    float: left;
    line-height: 1;
    margin-right: 0.5rem;
    margin-top: 0.1rem;
    color: var(--accent-primary, #60C0F0);
    font-family: 'Cormorant Garamond', serif;
  }
  strong { color: var(--accent-primary, #60C0F0); }

  @media (max-width: 320px) {
    p { font-size: 0.9rem; }
    p:first-child::first-letter { font-size: 2.4rem; }
  }
  @media (min-width: 2560px) {
    p { font-size: 1.3rem; }
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  color: var(--text-body, rgba(224, 236, 244, 0.85));
  line-height: 1.4;
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; }

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
`;

const ImageWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LogoImage = styled.img`
  max-width: 260px;
  width: 100%;
  border-radius: 16px;
  animation: ${pulseGlow} 4s ease-in-out infinite;
  transition: transform 0.4s ease;
  &:hover { transform: scale(1.04); }

  @media (min-width: 2560px) { max-width: 360px; }
  @media (min-width: 3840px) { max-width: 460px; }
`;

const BadgesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 2.5rem;

  @media (max-width: 320px) { gap: 0.75rem; }
  @media (min-width: 2560px) { gap: 1.5rem; }
`;

const BadgeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: var(--bg-surface, rgba(26, 26, 36, 0.8));
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(96, 192, 240, 0.1);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(96, 192, 240, 0.4);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.12), 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; }
`;

const BadgeName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const BadgeFull = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: block;
`;

const AboutSeanSection: React.FC<AboutSeanSectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';

  return (
    <SectionEl id="about">
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionTitle>
            {isFull ? <TextSplitter text="About Sean Swan" as="span" mode="words" /> : 'About Sean Swan'}
          </SectionTitle>
          <AccentLine />
          <SectionSubtitle>
            A legacy of transforming lives through science-backed fitness and Swan Coach-enhanced coaching.
          </SectionSubtitle>
        </ScrollReveal>

        <AboutGrid>
          <ScrollReveal direction="left" disabled={isEssential}>
            <AboutText>
              <p>
                Sean Swan is an NCEP-certified personal trainer (National College of
                Exercise Professionals, 2000) with <strong>26 years of experience</strong> helping
                clients transform their lives. Trained in NASM protocols and workshops, Sean applies
                the NASM Optimum Performance Training (OPT) model to every program he builds.
              </p>
              <p>
                His career spans elite fitness brands including LA Fitness, Gold's Gym,
                24 Hour Fitness, and Bodies in Motion. His time as a physical therapy aid
                at Kerlan Jobe Health South deepened his expertise in injury prevention,
                corrective exercise, and rehabilitation — principles he applies daily.
              </p>
              <p>
                In 2013, Sean and his wife <strong>Jasmine</strong> founded SwanStudios
                with a vision to blend elite coaching with technology. Today, SwanStudios
                combines <strong>personal training with Swan Coach as a powerful tool</strong> —
                enabling deep research on each client's goals for truly optimized programming.
              </p>
              <p>
                In 2017, Sean graduated from Redwood Code Academy and completed MIT computer science
                courses online, followed by Zero To Mastery Academy's React and Data Structures programs —
                not to become a developer, but because he had a vision that couldn't wait for someone
                else to build it. Now a full-stack React engineer transitioning into AI development,
                Sean built SwanStudios from the ground up: a health-first community platform that gives
                trainers, creators, and everyday people a place where their data, their relationships,
                and their progress stay theirs forever.
              </p>
            </AboutText>
            <FeatureList>
              {featureList.map((feat) => (
                <FeatureItem key={feat}>
                  <CheckCircle size={18} />
                  <span>{feat}</span>
                </FeatureItem>
              ))}
            </FeatureList>
          </ScrollReveal>

          <ScrollReveal direction="right" disabled={isEssential}>
            <ImageWrapper
              animate={isEssential ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LogoImage src={logoImg} alt="SwanStudios brand" />
            </ImageWrapper>
          </ScrollReveal>
        </AboutGrid>

        <BadgesGrid>
          {certifications.map((cert, i) => (
            <ScrollReveal key={cert.name} delay={isEssential ? 0 : i * 0.05} disabled={isEssential}>
              <BadgeCard>
                <Award size={20} />
                <div>
                  <BadgeName>{cert.name}</BadgeName>
                  <BadgeFull>{cert.full}</BadgeFull>
                </div>
              </BadgeCard>
            </ScrollReveal>
          ))}
        </BadgesGrid>
      </Container>
    </SectionEl>
  );
};

export default AboutSeanSection;
