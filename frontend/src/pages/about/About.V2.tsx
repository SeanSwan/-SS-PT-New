/**
 * About.V2.tsx
 * ============
 * Cinematic, theme-aware V2 About Us page for SwanStudios.
 *
 * Architecture:
 *   ParallaxHero (video bg) -> About Section (2-col) -> Stats Grid
 *   -> Timeline (vertical) -> Philosophy Grid -> CTA Section
 *
 * Theme system: Every styled-component reads colors, backgrounds, borders,
 * fonts, effects, and shadows from the styled-components theme prop.
 * NO hardcoded color values anywhere.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../../components/ui-kit/cinematic/SectionDivider';

/* ═══════════════════════════════════════════════════════════════
   STYLED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

const PageWrapper = styled.div`
  width: 100%;
  overflow-x: hidden;
  background: ${({ theme }) => theme.background.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.body};
`;

/* ── Hero ─────────────────────────────────────────────────── */

const HeroLogo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: drop-shadow(${({ theme }) => theme.shadows.primary});
`;

const HeroHeadline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 3.5rem;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
  line-height: 1.15;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  @media (max-width: 430px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text.secondary};
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;

  @media (max-width: 430px) {
    font-size: 1rem;
  }
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const PrimaryButton = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  min-height: 44px;
  min-width: 44px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.text.heading};
  border: ${({ theme }) => theme.borders.glass};
  box-shadow: ${({ theme }) => theme.shadows.button};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }
`;

const SecondaryButton = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  min-height: 44px;
  min-width: 44px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  background: transparent;
  color: ${({ theme }) => theme.text.accent};
  border: ${({ theme }) => theme.borders.card};

  &:hover {
    transform: translateY(-2px);
    background: ${({ theme }) => theme.background.surface};
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }
`;

/* ── Section Shells ────────────────────────────────────────── */

const Section = styled.section<{ $alt?: boolean }>`
  padding: 5rem 2rem;
  background: ${({ theme, $alt }) =>
    $alt ? theme.background.secondary : theme.background.primary};

  @media (max-width: 768px) {
    padding: 3.5rem 1.25rem;
  }
  @media (max-width: 430px) {
    padding: 2.5rem 1rem;
  }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.5rem;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin: 0 0 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
  @media (max-width: 430px) {
    font-size: 1.75rem;
  }
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;
  line-height: 1.6;
`;

/* ── About (2-col) ─────────────────────────────────────────── */

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const AboutText = styled.div`
  p {
    font-size: 1.05rem;
    color: ${({ theme }) => theme.text.body};
    line-height: 1.8;
    margin-bottom: 1.25rem;
  }

  strong {
    color: ${({ theme }) => theme.text.accent};
  }
`;

const AboutImageWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AboutImage = styled.img`
  max-width: 280px;
  width: 100%;
  border-radius: 16px;
  filter: drop-shadow(${({ theme }) => theme.shadows.elevation});
  transition: transform 0.4s ease;

  &:hover {
    transform: scale(1.04);
  }
`;

/* ── Stats Grid ───────────────────────────────────────────── */

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  text-align: center;
  padding: 2rem 1.5rem;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? theme.background.surface
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  box-shadow: ${({ theme }) => theme.shadows.glass};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }
`;

const StatNumber = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text.accent};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 500;
`;

/* ── Timeline ─────────────────────────────────────────────── */

const TimelineWrapper = styled.div`
  position: relative;
  padding: 2rem 0;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.borders.elegant};
    transform: translateX(-50%);

    @media (max-width: 768px) {
      left: 1.5rem;
    }
  }
`;

const TimelineItem = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $align }) =>
    $align === 'left' ? 'flex-end' : 'flex-start'};
  padding: ${({ $align }) =>
    $align === 'left' ? '0 calc(50% + 2rem) 0 0' : '0 0 0 calc(50% + 2rem)'};
  margin-bottom: 2.5rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0.75rem;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    border: 3px solid ${({ theme }) => theme.background.primary};
    transform: translateX(-50%);
    z-index: 1;
    box-shadow: ${({ theme }) => theme.shadows.primary};

    @media (max-width: 768px) {
      left: 1.5rem;
    }
  }

  @media (max-width: 768px) {
    justify-content: flex-start;
    padding: 0 0 0 3.5rem;
  }
`;

const TimelineCard = styled.div`
  max-width: 460px;
  padding: 1.5rem;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? theme.background.surface
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  box-shadow: ${({ theme }) => theme.shadows.glass};
`;

const TimelineYear = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.accent};
  margin-bottom: 0.35rem;
`;

const TimelineDescription = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};
  margin: 0;
  line-height: 1.6;
`;

/* ── Philosophy Grid ──────────────────────────────────────── */

const PhilosophyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PhilosophyCard = styled.div`
  padding: 2rem;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? theme.background.surface
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  box-shadow: ${({ theme }) => theme.shadows.glass};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }
`;

const PhilosophyTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 0.75rem;
`;

const PhilosophyBody = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.7;
  margin: 0;
`;

/* ── CTA Section ──────────────────────────────────────────── */

const CTABlock = styled.div`
  text-align: center;
  max-width: 680px;
  margin: 0 auto;
`;

const CTAHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.75rem;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;

  @media (max-width: 768px) {
    font-size: 2.1rem;
  }
  @media (max-width: 430px) {
    font-size: 1.75rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin: 0 0 2rem;
  line-height: 1.7;
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const stats = [
  { value: '25+', label: 'Years Experience' },
  { value: '1000+', label: 'Clients Transformed' },
  { value: '97%', label: 'Client Satisfaction' },
  { value: '100%', label: 'Commitment' },
];

const milestones = [
  { year: '1998', text: 'Began personal training career' },
  { year: '2005', text: 'Completed advanced NASM workshops and protocols training' },
  { year: '2010', text: 'Launched specialized programs for athletes' },
  { year: '2015', text: 'Expanded to online training platform' },
  { year: '2020', text: 'Founded SwanStudios' },
  { year: '2025', text: 'Leading innovation in fitness technology' },
];

const philosophies = [
  {
    title: 'Science-Backed Training',
    body: 'Every program is grounded in peer-reviewed exercise science and periodization principles, ensuring you get measurable, predictable results.',
  },
  {
    title: 'Personalized Programs',
    body: 'No two bodies are the same. We build your plan around your unique biomechanics, goals, schedule, and recovery capacity.',
  },
  {
    title: 'Sustainable Results',
    body: 'Quick fixes fade. We focus on building habits, movement literacy, and progressive overload that keep you strong for decades.',
  },
  {
    title: 'Community Focus',
    body: 'Training is better together. Our community of like-minded individuals provides accountability, motivation, and lasting friendships.',
  },
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

const AboutV2: React.FC = () => {
  const { currentTheme } = useUniversalTheme();

  return (
    <PageWrapper>
      {/* ── 1. HERO ──────────────────────────────────────── */}
      <ParallaxHero videoSrc="/Waves.mp4" overlayOpacity={0.65} minHeight="100vh">
        <HeroLogo src="/Logo.png" alt="SwanStudios logo" />
        <HeroHeadline>
          <TypewriterText text="Achieve Your Best Self" as="span" speed={55} />
        </HeroHeadline>
        <HeroSubtitle>
          Discover a training experience built on 25 years of expertise,
          cutting-edge science, and an unwavering commitment to your success.
        </HeroSubtitle>
        <HeroButtons>
          <PrimaryButton
            href="/contact"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Book Consultation
          </PrimaryButton>
          <SecondaryButton
            href="#about"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Learn More
          </SecondaryButton>
        </HeroButtons>
      </ParallaxHero>

      <SectionDivider />

      {/* ── 2. ABOUT ─────────────────────────────────────── */}
      <Section id="about">
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>About Sean Swan</SectionTitle>
            <SectionSubtitle>
              A legacy of transforming lives through science-backed fitness.
            </SectionSubtitle>
          </ScrollReveal>

          <AboutGrid>
            <ScrollReveal direction="left">
              <AboutText>
                <p>
                  <strong>Sean Swan</strong> is an NCEP-certified personal trainer with{' '}
                  <strong>25+ years of experience</strong> helping clients transform their
                  lives through science-backed fitness protocols. His approach blends
                  biomechanics, nutrition science, and motivational psychology into a
                  holistic training system.
                </p>
                <p>
                  From professional athletes to first-time gym-goers, Sean has built
                  programs that adapt to every level. His philosophy centers on sustainable
                  progress over quick fixes, and every client receives a plan engineered
                  around their unique body, goals, and lifestyle.
                </p>
                <p>
                  In 2020 he founded <strong>SwanStudios</strong> to bring that same
                  premium, results-driven methodology to a wider audience through an
                  innovative online platform.
                </p>
              </AboutText>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <AboutImageWrapper whileHover={{ scale: 1.02 }}>
                <AboutImage src="/Logo.png" alt="SwanStudios brand" />
              </AboutImageWrapper>
            </ScrollReveal>
          </AboutGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 3. STATS ─────────────────────────────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>By The Numbers</SectionTitle>
            <SectionSubtitle>
              Decades of dedication, thousands of lives changed.
            </SectionSubtitle>
          </ScrollReveal>

          <StatsGrid>
            {stats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <StatCard>
                  <StatNumber>{stat.value}</StatNumber>
                  <StatLabel>{stat.label}</StatLabel>
                </StatCard>
              </ScrollReveal>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 4. TIMELINE ──────────────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Our Journey</SectionTitle>
            <SectionSubtitle>
              Key milestones in Sean Swan's career and the evolution of SwanStudios.
            </SectionSubtitle>
          </ScrollReveal>

          <TimelineWrapper>
            {milestones.map((m, i) => {
              const align = i % 2 === 0 ? 'left' : 'right';
              return (
                <ScrollReveal
                  key={m.year}
                  direction={align === 'left' ? 'left' : 'right'}
                  delay={i * 0.1}
                >
                  <TimelineItem $align={align as 'left' | 'right'}>
                    <TimelineCard>
                      <TimelineYear>{m.year}</TimelineYear>
                      <TimelineDescription>{m.text}</TimelineDescription>
                    </TimelineCard>
                  </TimelineItem>
                </ScrollReveal>
              );
            })}
          </TimelineWrapper>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 5. PHILOSOPHY ────────────────────────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Our Philosophy</SectionTitle>
            <SectionSubtitle>
              The four pillars that drive every program we create.
            </SectionSubtitle>
          </ScrollReveal>

          <PhilosophyGrid>
            {philosophies.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <PhilosophyCard>
                  <PhilosophyTitle>{p.title}</PhilosophyTitle>
                  <PhilosophyBody>{p.body}</PhilosophyBody>
                </PhilosophyCard>
              </ScrollReveal>
            ))}
          </PhilosophyGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 6. CTA ───────────────────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <CTABlock>
              <CTAHeading>Ready to Transform?</CTAHeading>
              <CTADescription>
                Whether you are just starting out or looking to break through a plateau,
                SwanStudios has the expertise and technology to get you there. Take the
                first step today.
              </CTADescription>
              <CTAButtons>
                <PrimaryButton
                  href="/contact"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Your Journey
                </PrimaryButton>
                <SecondaryButton
                  href="/contact"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Contact Us
                </SecondaryButton>
              </CTAButtons>
            </CTABlock>
          </ScrollReveal>
        </SectionInner>
      </Section>
    </PageWrapper>
  );
};

export default AboutV2;
