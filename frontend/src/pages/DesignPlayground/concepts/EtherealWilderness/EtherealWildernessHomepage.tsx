import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Mountain, Waves, Wind, Sun, Moon, Star,
  Users, Clock, Award, Shield,
  ArrowRight, MapPin, Phone, Mail, Instagram, Twitter,
} from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import GlowButton from '../../../../components/ui/buttons/GlowButton';
import {
  etherealWildernessDarkTheme,
  etherealWildernessLightTheme,
} from './EtherealWildernessTheme';
import type { ConceptTheme } from '../shared/ConceptTypes';

/* ─────────────────────────────────────
   Animations
   ───────────────────────────────────── */
const mistDrift = keyframes`
  0%   { transform: translateX(0) scaleX(1); opacity: 0.4; }
  50%  { transform: translateX(60px) scaleX(1.1); opacity: 0.6; }
  100% { transform: translateX(0) scaleX(1); opacity: 0.4; }
`;

const mistDriftReverse = keyframes`
  0%   { transform: translateX(0) scaleX(1); opacity: 0.3; }
  50%  { transform: translateX(-50px) scaleX(1.05); opacity: 0.5; }
  100% { transform: translateX(0) scaleX(1); opacity: 0.3; }
`;

const fireflyFloat = keyframes`
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  20%  { opacity: 0.8; }
  50%  { transform: translateY(-120px) translateX(20px); opacity: 0.6; }
  80%  { opacity: 0.3; }
  100% { transform: translateY(-200px) translateX(-10px); opacity: 0; }
`;

const gentleGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 170, 0.15); }
  50%      { box-shadow: 0 0 40px rgba(0, 212, 170, 0.3); }
`;

const glassReveal = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const gridPulse = keyframes`
  0%, 100% { opacity: 0.015; }
  50%      { opacity: 0.035; }
`;

/* ─────────────────────────────────────
   Theme-aware styled helper
   ───────────────────────────────────── */
interface ThemeProps {
  $t: ConceptTheme;
}

/* ─────────────────────────────────────
   Toggle Button
   ───────────────────────────────────── */
const ToggleButton = styled.button<ThemeProps>`
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 50px;
  border: 1px solid ${({ $t }) => $t.colors.primary}33;
  background: ${({ $t }) => $t.colors.surface};
  backdrop-filter: blur(16px);
  color: ${({ $t }) => $t.colors.primary};
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s ease;
  min-height: 44px;
  min-width: 44px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);

  &:hover {
    border-color: ${({ $t }) => $t.colors.primary}66;
    box-shadow: 0 4px 24px ${({ $t }) => $t.colors.primary}22;
  }

  @media (max-width: 768px) {
    top: 76px;
    right: 12px;
    padding: 8px 14px;
    font-size: 0.75rem;
  }
`;

/* ─────────────────────────────────────
   Hero Section
   ───────────────────────────────────── */
const Hero = styled.section<ThemeProps>`
  min-height: 100vh;
  background: ${({ $t }) => $t.gradients.hero};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
  transition: background 0.4s ease;
`;

/* Mist layers */
const MistLayer = styled.div<ThemeProps & { $top: string; $delay: string; $reverse?: boolean }>`
  position: absolute;
  width: 140%;
  height: 200px;
  left: -20%;
  top: ${({ $top }) => $top};
  background: radial-gradient(
    ellipse at 50% 50%,
    ${({ $t }) => $t.colors.primary}12,
    transparent 70%
  );
  border-radius: 50%;
  animation: ${({ $reverse }) => ($reverse ? mistDriftReverse : mistDrift)} 20s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  pointer-events: none;
  z-index: 0;
  transition: background 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Firefly particles */
const Firefly = styled.div<ThemeProps & { $left: string; $delay: string; $size: number }>`
  position: absolute;
  bottom: 10%;
  left: ${({ $left }) => $left};
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $t }) => $t.colors.accent};
  box-shadow: 0 0 ${({ $size }) => $size * 3}px ${({ $t }) => $t.colors.accent}88;
  animation: ${fireflyFloat} 8s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  pointer-events: none;
  z-index: 0;
  transition: background 0.4s ease, box-shadow 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.4;
  }
`;

/* Cyberpunk grid overlay — the "smidge" */
const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  animation: ${gridPulse} 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.02;
  }
`;

const HeroBadge = styled(motion.span)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${({ $t }) => $t.colors.primary};
  margin-bottom: 16px;
  z-index: 1;
  transition: color 0.4s ease;
`;

const HeroTitle = styled(motion.h1)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 700;
  font-style: italic;
  color: ${({ $t }) => $t.colors.text};
  margin: 0 0 16px;
  line-height: 1.1;
  z-index: 1;
  max-width: 800px;
  transition: color 0.4s ease;
`;

const HeroAccent = styled.span<ThemeProps>`
  color: ${({ $t }) => $t.colors.primary};
  transition: color 0.4s ease;
`;

const HeroSubtitle = styled(motion.p)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${({ $t }) => $t.colors.textSecondary};
  max-width: 560px;
  line-height: 1.7;
  margin: 0 0 40px;
  z-index: 1;
  transition: color 0.4s ease;
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: 16px;
  z-index: 1;
  flex-wrap: wrap;
  justify-content: center;
`;

/* ─────────────────────────────────────
   Section Shared
   ───────────────────────────────────── */
const Section = styled.section<ThemeProps & { $pad?: string }>`
  padding: ${({ $pad }) => $pad || '100px 24px'};
  position: relative;
  transition: background 0.4s ease;
`;

const SectionTitle = styled(motion.h2)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: ${({ $t }) => $t.colors.text};
  text-align: center;
  margin: 0 0 12px;
  transition: color 0.4s ease;
`;

const SectionSubtitle = styled(motion.p)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 1.1rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  text-align: center;
  max-width: 600px;
  margin: 0 auto 56px;
  line-height: 1.6;
  transition: color 0.4s ease;
`;

/* ─────────────────────────────────────
   Programs Section
   ───────────────────────────────────── */
const ProgramsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  max-width: 1100px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ProgramCard = styled(motion.div)<ThemeProps>`
  background: ${({ $t }) => $t.gradients.card};
  border: 1px solid ${({ $t }) => $t.colors.primary}15;
  border-radius: ${({ $t }) => $t.borderRadius};
  padding: 40px 28px;
  text-align: center;
  backdrop-filter: blur(12px);
  transition: all 0.4s ease;
  animation: ${glassReveal} 0.6s ease-out both;

  &:hover {
    transform: translateY(-6px);
    border-color: ${({ $t }) => $t.colors.primary}35;
    box-shadow: 0 12px 40px ${({ $t }) => $t.colors.primary}15;
  }
`;

const ProgramIcon = styled.div<ThemeProps>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ $t }) => $t.colors.primary}15;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: ${({ $t }) => $t.colors.primary};
  transition: all 0.4s ease;
  animation: ${gentleGlow} 4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ProgramTitle = styled.h3<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $t }) => $t.colors.text};
  margin: 0 0 12px;
  transition: color 0.4s ease;
`;

const ProgramDesc = styled.p<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.95rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  line-height: 1.65;
  margin: 0;
  transition: color 0.4s ease;
`;

/* ─────────────────────────────────────
   Stats Section
   ───────────────────────────────────── */
const StatsSection = styled(Section)<ThemeProps>`
  background: ${({ $t }) => $t.colors.surface};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled(motion.div)<ThemeProps>`
  text-align: center;
  padding: 32px 16px;
  border-radius: ${({ $t }) => $t.borderRadius};
  background: ${({ $t }) => $t.gradients.card};
  border: 1px solid ${({ $t }) => $t.colors.primary}10;
  backdrop-filter: blur(8px);
  transition: all 0.4s ease;
`;

const StatNumber = styled.div<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ $t }) => $t.colors.primary};
  text-shadow: 0 0 30px ${({ $t }) => $t.colors.primary}30;
  margin-bottom: 8px;
  transition: all 0.4s ease;
`;

const StatLabel = styled.div<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ $t }) => $t.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  transition: color 0.4s ease;
`;

const StatIcon = styled.div<ThemeProps>`
  color: ${({ $t }) => $t.colors.accent};
  margin-bottom: 12px;
  transition: color 0.4s ease;
`;

/* ─────────────────────────────────────
   Testimonials Section
   ───────────────────────────────────── */
const TestimonialsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  max-width: 900px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TestimonialCard = styled(motion.div)<ThemeProps>`
  background: ${({ $t }) => $t.gradients.card};
  border: 1px solid ${({ $t }) => $t.colors.primary}12;
  border-radius: ${({ $t }) => $t.borderRadius};
  padding: 36px;
  backdrop-filter: blur(12px);
  transition: all 0.4s ease;
`;

const TestimonialQuote = styled.blockquote<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: 1.15rem;
  font-style: italic;
  color: ${({ $t }) => $t.colors.text};
  line-height: 1.7;
  margin: 0 0 20px;
  padding-left: 20px;
  border-left: 3px solid ${({ $t }) => $t.colors.primary};
  transition: all 0.4s ease;
`;

const TestimonialAuthor = styled.div<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.9rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  transition: color 0.4s ease;
`;

const AuthorName = styled.span<ThemeProps>`
  font-weight: 600;
  color: ${({ $t }) => $t.colors.text};
  transition: color 0.4s ease;
`;

/* ─────────────────────────────────────
   CTA Section
   ───────────────────────────────────── */
const CTASection = styled(Section)<ThemeProps>`
  background: ${({ $t }) => $t.gradients.hero};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const CTATitle = styled(motion.h2)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 700;
  font-style: italic;
  color: ${({ $t }) => $t.colors.text};
  margin: 0 0 16px;
  z-index: 1;
  position: relative;
  transition: color 0.4s ease;
`;

const CTASubtext = styled(motion.p)<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 1.1rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  max-width: 500px;
  margin: 0 auto 36px;
  line-height: 1.6;
  z-index: 1;
  position: relative;
  transition: color 0.4s ease;
`;

const CTAButtonWrap = styled(motion.div)`
  z-index: 1;
  position: relative;
  display: flex;
  justify-content: center;
`;

/* ─────────────────────────────────────
   Footer
   ───────────────────────────────────── */
const Footer = styled.footer<ThemeProps>`
  background: ${({ $t }) => $t.colors.surface};
  border-top: 1px solid ${({ $t }) => $t.colors.primary}15;
  padding: 60px 24px 32px;
  transition: all 0.4s ease;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  max-width: 1100px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
`;

const FooterBrand = styled.div<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
`;

const FooterLogo = styled.div<ThemeProps>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $t }) => $t.colors.primary};
  margin-bottom: 12px;
  transition: color 0.4s ease;
`;

const FooterTagline = styled.p<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.9rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
  transition: color 0.4s ease;
`;

const FooterColumn = styled.div``;

const FooterHeading = styled.h4<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.display}', serif;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ $t }) => $t.colors.text};
  margin: 0 0 16px;
  transition: color 0.4s ease;
`;

const FooterLink = styled(Link)<ThemeProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.85rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  text-decoration: none;
  padding: 6px 0;
  transition: color 0.3s;
  min-height: 44px;

  &:hover {
    color: ${({ $t }) => $t.colors.primary};
  }
`;

const FooterContact = styled.div<ThemeProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.85rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  padding: 6px 0;
  transition: color 0.4s ease;
`;

const FooterDivider = styled.hr<ThemeProps>`
  border: none;
  border-top: 1px solid ${({ $t }) => $t.colors.primary}10;
  margin: 36px auto 20px;
  max-width: 1100px;
`;

const FooterCopyright = styled.p<ThemeProps>`
  font-family: '${({ $t }) => $t.fonts.body}', sans-serif;
  font-size: 0.8rem;
  color: ${({ $t }) => $t.colors.textSecondary};
  text-align: center;
  margin: 0;
  transition: color 0.4s ease;
`;

const SocialRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
`;

const SocialLink = styled.a<ThemeProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $t }) => $t.colors.primary}25;
  color: ${({ $t }) => $t.colors.textSecondary};
  transition: all 0.3s;

  &:hover {
    color: ${({ $t }) => $t.colors.primary};
    border-color: ${({ $t }) => $t.colors.primary}50;
    background: ${({ $t }) => $t.colors.primary}10;
  }
`;

/* ─────────────────────────────────────
   Motion Variants
   ───────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
};

/* ─────────────────────────────────────
   Programs Data
   ───────────────────────────────────── */
const programs = [
  {
    icon: Mountain,
    title: 'Strength & Sculpt',
    desc: 'Build functional power through mountain-inspired resistance training. Every rep carves you closer to your summit — stronger, leaner, unshakeable.',
  },
  {
    icon: Waves,
    title: 'Flow & Recover',
    desc: 'Fluid mobility sessions inspired by ocean tides. Restore balance, release tension, and move with a grace that carries into everything you do.',
  },
  {
    icon: Wind,
    title: 'Endurance & Spirit',
    desc: 'Wind-forged cardio and HIIT that expands your capacity. Push past perceived limits and discover the athlete inside — relentless, free, alive.',
  },
];

/* ─────────────────────────────────────
   Stats Data
   ───────────────────────────────────── */
const stats = [
  { icon: Users, number: '500+', label: 'Clients Transformed' },
  { icon: Clock, number: '15+', label: 'Years Experience' },
  { icon: Award, number: '98%', label: 'Client Retention' },
  { icon: Shield, number: '24/7', label: 'Support Access' },
];

/* ─────────────────────────────────────
   Testimonials Data
   ───────────────────────────────────── */
const testimonials = [
  {
    quote:
      'SwanStudios transformed not just my body, but my entire relationship with fitness. The programs feel like they were written by nature itself — organic, powerful, and deeply personal.',
    name: 'Alexandra M.',
    detail: 'Executive, 8-month client',
  },
  {
    quote:
      'I have worked with trainers across three continents. Nothing compares to the precision and artistry of this program. It is luxury fitness at its finest.',
    name: 'Jonathan K.',
    detail: 'Entrepreneur, 2-year client',
  },
];

/* ─────────────────────────────────────
   Component
   ───────────────────────────────────── */
const EtherealWildernessHomepage: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const t: ConceptTheme = isDark ? etherealWildernessDarkTheme : etherealWildernessLightTheme;

  return (
    <ConceptWrapper theme={t}>
      {/* ── Dark / Light Toggle ── */}
      <ToggleButton
        $t={t}
        onClick={() => setIsDark((prev) => !prev)}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
        <span>{isDark ? 'Light' : 'Dark'}</span>
      </ToggleButton>

      {/* ══════════════════════════
          HERO
         ══════════════════════════ */}
      <Hero $t={t}>
        <GridOverlay aria-hidden="true" />
        <MistLayer $t={t} $top="10%" $delay="0s" aria-hidden="true" />
        <MistLayer $t={t} $top="50%" $delay="-7s" $reverse aria-hidden="true" />
        <MistLayer $t={t} $top="75%" $delay="-14s" aria-hidden="true" />

        {/* Fireflies */}
        {[
          { left: '15%', delay: '0s', size: 4 },
          { left: '35%', delay: '-2s', size: 3 },
          { left: '55%', delay: '-4s', size: 5 },
          { left: '70%', delay: '-1s', size: 3 },
          { left: '85%', delay: '-5s', size: 4 },
          { left: '25%', delay: '-6s', size: 3 },
          { left: '60%', delay: '-3s', size: 4 },
        ].map((f, i) => (
          <Firefly key={i} $t={t} $left={f.left} $delay={f.delay} $size={f.size} aria-hidden="true" />
        ))}

        <HeroBadge
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Personal Training Reimagined
        </HeroBadge>

        <HeroTitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          Train in <HeroAccent $t={t}>Harmony</HeroAccent> with Nature
        </HeroTitle>

        <HeroSubtitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={2}
        >
          Where luxury meets the wild. Personalized fitness programs that honor your body
          the way nature intended — powerful, graceful, and endlessly adaptable.
        </HeroSubtitle>

        <HeroActions
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={3}
        >
          <GlowButton
            variant="emerald"
            size="large"
            rightIcon={<ArrowRight size={18} />}
          >
            Begin Your Journey
          </GlowButton>
          <GlowButton variant="cosmic" size="large">
            View Programs
          </GlowButton>
        </HeroActions>
      </Hero>

      {/* ══════════════════════════
          PROGRAMS — "Your Path"
         ══════════════════════════ */}
      <Section $t={t}>
        <SectionTitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Your Path
        </SectionTitle>
        <SectionSubtitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          Three nature-inspired training pillars, each designed to unlock
          a different dimension of your potential.
        </SectionSubtitle>

        <ProgramsGrid>
          {programs.map((prog, i) => {
            const Icon = prog.icon;
            return (
              <ProgramCard
                key={prog.title}
                $t={t}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={i}
              >
                <ProgramIcon $t={t}>
                  <Icon size={28} />
                </ProgramIcon>
                <ProgramTitle $t={t}>{prog.title}</ProgramTitle>
                <ProgramDesc $t={t}>{prog.desc}</ProgramDesc>
              </ProgramCard>
            );
          })}
        </ProgramsGrid>
      </Section>

      {/* ══════════════════════════
          STATS
         ══════════════════════════ */}
      <StatsSection $t={t} $pad="80px 24px">
        <StatsGrid>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <StatCard
                key={stat.label}
                $t={t}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                custom={i}
              >
                <StatIcon $t={t}>
                  <Icon size={24} />
                </StatIcon>
                <StatNumber $t={t}>{stat.number}</StatNumber>
                <StatLabel $t={t}>{stat.label}</StatLabel>
              </StatCard>
            );
          })}
        </StatsGrid>
      </StatsSection>

      {/* ══════════════════════════
          TESTIMONIALS
         ══════════════════════════ */}
      <Section $t={t}>
        <SectionTitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Voices of Transformation
        </SectionTitle>
        <SectionSubtitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          Real stories from clients who found their edge through nature-aligned training.
        </SectionSubtitle>

        <TestimonialsGrid>
          {testimonials.map((test, i) => (
            <TestimonialCard
              key={test.name}
              $t={t}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              custom={i}
            >
              <TestimonialQuote $t={t}>{test.quote}</TestimonialQuote>
              <TestimonialAuthor $t={t}>
                <AuthorName $t={t}>{test.name}</AuthorName> — {test.detail}
              </TestimonialAuthor>
            </TestimonialCard>
          ))}
        </TestimonialsGrid>
      </Section>

      {/* ══════════════════════════
          CTA
         ══════════════════════════ */}
      <CTASection $t={t} $pad="100px 24px">
        <MistLayer $t={t} $top="20%" $delay="-3s" aria-hidden="true" />
        <MistLayer $t={t} $top="60%" $delay="-10s" $reverse aria-hidden="true" />

        <CTATitle
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Your Transformation Awaits
        </CTATitle>
        <CTASubtext
          $t={t}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          Step into a sanctuary where elite training meets the raw beauty of the natural world.
          Your body. Your journey. Our craft.
        </CTASubtext>
        <CTAButtonWrap
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={2}
        >
          <GlowButton
            variant="emerald"
            size="large"
            rightIcon={<ArrowRight size={18} />}
          >
            Start Training Today
          </GlowButton>
        </CTAButtonWrap>
      </CTASection>

      {/* ══════════════════════════
          FOOTER
         ══════════════════════════ */}
      <Footer $t={t}>
        <FooterGrid>
          <FooterBrand $t={t}>
            <FooterLogo $t={t}>SwanStudios</FooterLogo>
            <FooterTagline $t={t}>
              Where luxury meets the wild. Personalized fitness programs
              crafted with the precision of nature and the polish of purpose.
            </FooterTagline>
            <SocialRow>
              <SocialLink $t={t} href="#" aria-label="Instagram">
                <Instagram size={18} />
              </SocialLink>
              <SocialLink $t={t} href="#" aria-label="Twitter">
                <Twitter size={18} />
              </SocialLink>
            </SocialRow>
          </FooterBrand>

          <FooterColumn>
            <FooterHeading $t={t}>Quick Links</FooterHeading>
            <FooterLink $t={t} to="/dashboard">Dashboard</FooterLink>
            <FooterLink $t={t} to="/schedule">Schedule</FooterLink>
            <FooterLink $t={t} to="/store">Shop</FooterLink>
            <FooterLink $t={t} to="/about">About</FooterLink>
          </FooterColumn>

          <FooterColumn>
            <FooterHeading $t={t}>Contact</FooterHeading>
            <FooterContact $t={t}>
              <MapPin size={14} /> Seattle, WA
            </FooterContact>
            <FooterContact $t={t}>
              <Phone size={14} /> (555) 123-4567
            </FooterContact>
            <FooterContact $t={t}>
              <Mail size={14} /> hello@swanstudios.com
            </FooterContact>
          </FooterColumn>
        </FooterGrid>

        <FooterDivider $t={t} />
        <FooterCopyright $t={t}>
          &copy; {new Date().getFullYear()} SwanStudios. All rights reserved.
        </FooterCopyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default EtherealWildernessHomepage;
