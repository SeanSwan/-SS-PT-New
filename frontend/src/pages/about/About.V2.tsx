/**
 * About.V2.tsx — Enhanced Cinematic About Page
 * ==============================================
 * Blends the original AboutContent.tsx design elements (badges, drop caps,
 * animated counters, checkmark features, pulsing glow) with V2's theme-aware
 * cinematic structure (ParallaxHero, ScrollReveal, TypewriterText, SectionDivider).
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, Brain, CheckCircle, Dumbbell,
  Heart, Shield, Sparkles, Target, Users, Zap,
} from 'lucide-react';

import GlowButton from '../../components/ui/buttons/GlowButton';
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../../components/ui-kit/cinematic/SectionDivider';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import logoImg from '../../assets/Logo.png';

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ═══════════════════════════════════════════════════════ */

const useCountUp = (
  target: number,
  isVisible: boolean,
  duration = 3,
  delay = 0,
  prefersReduced = false
) => {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    if (prefersReduced) {
      setValue(target);
      hasAnimated.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      hasAnimated.current = true;
      let startTime: number;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / (duration * 1000);
        const pct = Math.min(progress, 1);
        const eased = 1 - (1 - pct) * (1 - pct);
        setValue(Math.floor(eased * target));
        if (pct < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isVisible, target, duration, delay, prefersReduced]);

  return value;
};

/* ═══════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════ */

const certifications = [
  { name: 'NCEP Certified', full: 'National College of Exercise Professionals' },
  { name: 'ACE Professional', full: 'American Council on Exercise' },
  { name: 'Precision Nutrition', full: 'PN Level 1 Certification' },
  { name: 'TRX Certified', full: 'Suspension Training Specialist' },
];

const statsData = [
  { numericValue: 25, suffix: '+', label: 'Years Experience', delay: 0 },
  { numericValue: 1000, suffix: '+', label: 'Clients Transformed', delay: 0.2 },
  { numericValue: 97, suffix: '%', label: 'Client Satisfaction', delay: 0.4 },
  { numericValue: 312, suffix: '', label: 'Swimmers Taught', delay: 0.6 },
];

const featureList = [
  'Personalized biomechanical assessments for every client',
  'NASM OPT model-based progressive programming',
  'AI-enhanced workout optimization and injury prevention',
  'Evidence-based nutrition protocols and macro planning',
];

const milestones = [
  { year: '1998', text: 'Earned NCEP certification and began personal training career' },
  { year: '2002', text: 'Completed advanced NASM workshops and protocols training' },
  { year: '2005', text: 'Physical therapy aid at Kerlan Jobe Health South — deepened injury rehab expertise' },
  { year: '2010', text: 'Launched specialized programs for athletes at elite gyms across Los Angeles' },
  { year: '2013', text: 'Founded SwanStudios with wife Jasmine — blending coaching with technology' },
  { year: '2018', text: 'Completed full-stack development bootcamp to build AI-enhanced training platform' },
  { year: '2024', text: 'Leading innovation in fitness technology with the SwanStudios social ecosystem' },
];

const philosophies = [
  {
    title: 'Science-Backed Training',
    body: 'Every program is grounded in peer-reviewed exercise science and periodization principles, ensuring you get measurable, predictable results.',
    icon: <Brain size={24} />,
  },
  {
    title: 'Personalized Programs',
    body: 'No two bodies are the same. We build your plan around your unique biomechanics, goals, schedule, and recovery capacity.',
    icon: <Target size={24} />,
  },
  {
    title: 'Sustainable Results',
    body: 'Quick fixes fade. We focus on building habits, movement literacy, and progressive overload that keep you strong for decades.',
    icon: <Shield size={24} />,
  },
  {
    title: 'Community Focus',
    body: 'Training is better together. Our community of like-minded individuals provides accountability, motivation, and lasting friendships.',
    icon: <Heart size={24} />,
  },
];

/* ═══════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

const pulseGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 15px var(--glow-color, rgba(0,255,255,0.15))); }
  50% { filter: drop-shadow(0 0 35px var(--glow-color, rgba(0,255,255,0.3))); }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

/* ═══════════════════════════════════════════════════════
   STYLED COMPONENTS — All theme-aware
   ═══════════════════════════════════════════════════════ */

const PageWrapper = styled.div`
  width: 100%;
  overflow-x: hidden;
  background: ${({ theme }) => theme.background.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.body};
`;

/* Hero */
const HeroLogo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  --glow-color: ${({ theme }) => `${theme.colors.primary}40`};
  animation: ${pulseGlow} 3s ease-in-out infinite;
`;

const HeroHeadline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
  line-height: 1.15;
`;

const HeroSubtitle = styled.p`
  font-size: clamp(0.95rem, 2vw, 1.2rem);
  color: ${({ theme }) => theme.text.secondary};
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  text-align: center;
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

/* Section Shells */
const Section = styled.section<{ $alt?: boolean }>`
  padding: 5rem 2rem;
  background: ${({ theme, $alt }) =>
    $alt ? theme.background.secondary : theme.background.primary};

  @media (max-width: 768px) { padding: 3.5rem 1.25rem; }
  @media (max-width: 430px) { padding: 2.5rem 1rem; }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin: 0 0 0.75rem;
`;

const AccentLine = styled.div`
  width: 60px;
  height: 3px;
  margin: 0.5rem auto 1.5rem;
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent || theme.colors.primary})`};
  border-radius: 2px;
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;
  line-height: 1.6;
`;

/* About Grid (2-col) */
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

  p:first-child::first-letter {
    font-size: 3rem;
    font-weight: 700;
    float: left;
    line-height: 1;
    margin-right: 0.5rem;
    margin-top: 0.1rem;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.drama};
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
  max-width: 260px;
  width: 100%;
  border-radius: 16px;
  --glow-color: ${({ theme }) => `${theme.colors.primary}25`};
  animation: ${pulseGlow} 4s ease-in-out infinite;
  transition: transform 0.4s ease;

  &:hover {
    transform: scale(1.04);
  }
`;

/* Feature Checkmark List */
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
  color: ${({ theme }) => theme.text.body};
  line-height: 1.4;

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
`;

/* Certification Badges */
const BadgesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 2.5rem;
`;

const BadgeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(10px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
`;

const BadgeName = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
`;

const BadgeFull = styled.span`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.text.muted};
  display: block;
`;

/* Stats Grid — Animated Counters */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
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
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
  }
`;

const StatNumber = styled.div`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.text.heading}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

/* Timeline */
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
    background: ${({ theme }) => `${theme.colors.primary}30`};
    transform: translateX(-50%);

    @media (max-width: 768px) { left: 1.5rem; }
  }
`;

const TimelineItem = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $align }) =>
    $align === 'left' ? 'flex-end' : 'flex-start'};
  padding: ${({ $align }) =>
    $align === 'left' ? '0 calc(50% + 2rem) 0 0' : '0 0 0 calc(50% + 2rem)'};
  margin-bottom: 2rem;
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
    box-shadow: 0 0 10px ${({ theme }) => `${theme.colors.primary}40`};

    @media (max-width: 768px) { left: 1.5rem; }
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
`;

const TimelineYear = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.35rem;
`;

const TimelineDescription = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};
  margin: 0;
  line-height: 1.6;
`;

/* Philosophy Grid — Enhanced with icons */
const PhilosophyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
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
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
    border-color: ${({ theme }) => `${theme.colors.primary}40`};
  }
`;

const PhilosophyIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  background: ${({ theme }) => `${theme.colors.primary}12`};
  border: 1px dashed ${({ theme }) => `${theme.colors.primary}30`};
  color: ${({ theme }) => theme.colors.primary};
  animation: ${breathe} 4s ease-in-out infinite;
`;

const PhilosophyTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.2rem;
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

/* CTA */
const CTABlock = styled.div`
  text-align: center;
  max-width: 680px;
  margin: 0 auto;
`;

const CTAHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
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

/* ═══════════════════════════════════════════════════════
   STAT COUNTER COMPONENT
   ═══════════════════════════════════════════════════════ */

const AnimatedStatCard: React.FC<{
  numericValue: number;
  suffix: string;
  label: string;
  delay: number;
  isVisible: boolean;
  prefersReduced: boolean;
}> = ({ numericValue, suffix, label, delay, isVisible, prefersReduced }) => {
  const count = useCountUp(numericValue, isVisible, 3, delay, prefersReduced);
  return (
    <StatCard>
      <StatNumber>{count.toLocaleString()}{suffix}</StatNumber>
      <StatLabel>{label}</StatLabel>
    </StatCard>
  );
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

const AboutV2: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const statsRef = useRef<HTMLElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  return (
    <PageWrapper>
      {/* ── 1. HERO ──────────────────────────────────────── */}
      <ParallaxHero videoSrc="/Waves.mp4" overlayOpacity={0.6} minHeight="100vh">
        <HeroLogo src={logoImg} alt="SwanStudios logo" />
        <HeroHeadline>
          <TypewriterText text="Achieve Your Best Self" as="span" speed={55} />
        </HeroHeadline>
        <HeroSubtitle>
          Discover a training experience built on 25+ years of expertise,
          cutting-edge science, and an unwavering commitment to your success.
        </HeroSubtitle>
        <HeroButtons>
          <GlowButton
            text="Book Consultation"
            variant="primary"
            size="large"
            onClick={() => navigate('/contact')}
            animateOnRender
          />
          <GlowButton
            text="View Programs"
            variant="accent"
            size="large"
            onClick={() => navigate('/shop')}
            animateOnRender
          />
        </HeroButtons>
      </ParallaxHero>

      <SectionDivider />

      {/* ── 2. ABOUT ─────────────────────────────────────── */}
      <Section id="about">
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>About Sean Swan</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              A legacy of transforming lives through science-backed fitness and AI-enhanced coaching.
            </SectionSubtitle>
          </ScrollReveal>

          <AboutGrid>
            <ScrollReveal direction="left">
              <AboutText>
                <p>
                  Sean Swan is an NCEP-certified personal trainer (National College of
                  Exercise Professionals, 1998) with <strong>25+ years of experience</strong> helping
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
                  combines <strong>personal training with AI as a powerful tool</strong> —
                  enabling deep research on each client's goals for truly optimized programming.
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

            <ScrollReveal direction="right">
              <AboutImageWrapper
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <AboutImage src={logoImg} alt="SwanStudios brand" />
              </AboutImageWrapper>
            </ScrollReveal>
          </AboutGrid>

          {/* Certification Badges */}
          <BadgesGrid>
            {certifications.map((cert) => (
              <ScrollReveal key={cert.name} delay={0.1}>
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
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 3. STATS (Animated Counters) ─────────────────── */}
      <Section $alt ref={statsRef}>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>By The Numbers</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              Decades of dedication, thousands of lives changed.
            </SectionSubtitle>
          </ScrollReveal>

          <StatsGrid>
            {statsData.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <AnimatedStatCard
                  numericValue={stat.numericValue}
                  suffix={stat.suffix}
                  label={stat.label}
                  delay={stat.delay}
                  isVisible={statsInView}
                  prefersReduced={prefersReducedMotion}
                />
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
            <AccentLine />
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
            <AccentLine />
            <SectionSubtitle>
              The four pillars that drive every program we create.
            </SectionSubtitle>
          </ScrollReveal>

          <PhilosophyGrid>
            {philosophies.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <PhilosophyCard>
                  <PhilosophyIconWrapper>{p.icon}</PhilosophyIconWrapper>
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
              <CTAHeading>
                <TypewriterText text="Ready to Transform?" as="span" speed={45} />
              </CTAHeading>
              <AccentLine />
              <CTADescription>
                Whether you are just starting out or looking to break through a plateau,
                SwanStudios has the expertise and technology to get you there. Take the
                first step today.
              </CTADescription>
              <CTAButtons>
                <GlowButton
                  text="Start Your Journey"
                  variant="accent"
                  size="large"
                  onClick={() => navigate('/shop')}
                />
                <GlowButton
                  text="Contact Us"
                  variant="ghost"
                  size="large"
                  onClick={() => navigate('/contact')}
                />
              </CTAButtons>
            </CTABlock>
          </ScrollReveal>
        </SectionInner>
      </Section>
    </PageWrapper>
  );
};

export default AboutV2;
