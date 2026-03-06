/**
 * About.V3.tsx — Cinematic Upgrade of About.V2
 * ==============================================
 * Enhances V2 with:
 *  - ParallaxHero with imageSrc for about-hero background
 *  - Fixed noise overlay (inline SVG, opacity 0.04)
 *  - Extended responsive breakpoints (320px, 2560px, 3840px)
 *  - Enhanced glassmorphism on cards (deeper blur, cyan glow border on hover)
 *  - Enhanced stats section with animated counters and color-coded backgrounds
 *  - Main content z-indexed above noise layer
 *
 * All existing functionality (stats, timeline, philosophy, certifications, CTA)
 * remains identical — only visual enhancements applied.
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
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
  { numericValue: 25, suffix: '+', label: 'Years Experience', delay: 0, color: '#00FFFF' },
  { numericValue: 1000, suffix: '+', label: 'Clients Transformed', delay: 0.2, color: '#7851A9' },
  { numericValue: 97, suffix: '%', label: 'Client Satisfaction', delay: 0.4, color: '#00E5FF' },
  { numericValue: 312, suffix: '', label: 'Swimmers Taught', delay: 0.6, color: '#9B59B6' },
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

const cyanPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.15), inset 0 0 8px rgba(0, 255, 255, 0.05); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 12px rgba(0, 255, 255, 0.08); }
`;

/* ═══════════════════════════════════════════════════════
   NOISE OVERLAY — Fixed inline SVG noise pattern
   ═══════════════════════════════════════════════════════ */

const NoiseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

/* ═══════════════════════════════════════════════════════
   STYLED COMPONENTS — All theme-aware, V3 enhanced
   ═══════════════════════════════════════════════════════ */

const PageWrapper = styled.div`
  width: 100%;
  overflow-x: hidden;
  background: ${({ theme }) => theme.background.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.body};
`;

/** Wraps all main content to sit above the noise overlay */
const MainContent = styled.div`
  position: relative;
  z-index: 2;
`;

/* Hero */
const HeroLogo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  --glow-color: ${({ theme }) => `${theme.colors.primary}40`};
  animation: ${pulseGlow} 3s ease-in-out infinite;

  @media (min-width: 2560px) {
    width: 160px;
    height: 160px;
  }

  @media (min-width: 3840px) {
    width: 200px;
    height: 200px;
  }
`;

const HeroHeadline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;
  line-height: 1.15;

  @media (max-width: 320px) {
    font-size: 1.6rem;
  }

  @media (min-width: 2560px) {
    font-size: 4.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 6rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(0.95rem, 2vw, 1.2rem);
  color: ${({ theme }) => theme.text.secondary};
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  text-align: center;

  @media (max-width: 320px) {
    font-size: 0.85rem;
    max-width: 280px;
  }

  @media (min-width: 2560px) {
    font-size: 1.5rem;
    max-width: 800px;
  }

  @media (min-width: 3840px) {
    font-size: 1.9rem;
    max-width: 1000px;
  }
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: 320px) {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
`;

/* Section Shells */
const Section = styled.section<{ $alt?: boolean }>`
  padding: 5rem 2rem;
  background: ${({ theme, $alt }) =>
    $alt ? theme.background.secondary : theme.background.primary};

  @media (max-width: 768px) { padding: 3.5rem 1.25rem; }
  @media (max-width: 430px) { padding: 2.5rem 1rem; }
  @media (max-width: 320px) { padding: 2rem 0.75rem; }

  @media (min-width: 2560px) { padding: 7rem 4rem; }
  @media (min-width: 3840px) { padding: 9rem 6rem; }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 2560px) { max-width: 1600px; }
  @media (min-width: 3840px) { max-width: 2200px; }
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin: 0 0 0.75rem;

  @media (max-width: 320px) { font-size: 1.4rem; }
  @media (min-width: 2560px) { font-size: 3.25rem; }
  @media (min-width: 3840px) { font-size: 4.25rem; }
`;

const AccentLine = styled.div`
  width: 60px;
  height: 3px;
  margin: 0.5rem auto 1.5rem;
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent || theme.colors.primary})`};
  border-radius: 2px;

  @media (min-width: 2560px) { width: 90px; height: 4px; }
  @media (min-width: 3840px) { width: 120px; height: 5px; }
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;
  line-height: 1.6;

  @media (max-width: 320px) {
    font-size: 0.9rem;
    max-width: 280px;
  }

  @media (min-width: 2560px) {
    font-size: 1.4rem;
    max-width: 900px;
  }

  @media (min-width: 3840px) {
    font-size: 1.75rem;
    max-width: 1200px;
  }
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

  @media (max-width: 320px) {
    gap: 1.5rem;
  }

  @media (min-width: 2560px) {
    gap: 5rem;
  }

  @media (min-width: 3840px) {
    gap: 7rem;
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

  @media (max-width: 320px) {
    p { font-size: 0.9rem; }
    p:first-child::first-letter { font-size: 2.4rem; }
  }

  @media (min-width: 2560px) {
    p { font-size: 1.3rem; }
    p:first-child::first-letter { font-size: 3.75rem; }
  }

  @media (min-width: 3840px) {
    p { font-size: 1.6rem; }
    p:first-child::first-letter { font-size: 4.5rem; }
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

  @media (min-width: 2560px) { max-width: 360px; }
  @media (min-width: 3840px) { max-width: 460px; }
`;

/* Feature Checkmark List */
const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (min-width: 2560px) { gap: 1rem; }
  @media (min-width: 3840px) { gap: 1.25rem; }
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

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
  @media (min-width: 3840px) { font-size: 1.5rem; }
`;

/* Certification Badges — Enhanced glassmorphism */
const BadgesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 2.5rem;

  @media (max-width: 320px) { gap: 0.75rem; }
  @media (min-width: 2560px) { gap: 1.5rem; }
  @media (min-width: 3840px) { gap: 2rem; }
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
    theme.effects.glassmorphism ? 'blur(20px) saturate(1.4)' : 'none'};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}15`};
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ theme }) => `${theme.colors.primary}60`};
    box-shadow: 0 0 16px ${({ theme }) => `${theme.colors.primary}20`},
                0 4px 20px rgba(0, 0, 0, 0.25);
  }

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }

  @media (max-width: 320px) {
    padding: 0.6rem 1rem;
  }

  @media (min-width: 2560px) {
    padding: 1rem 1.75rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    padding: 1.25rem 2.25rem;
    border-radius: 20px;
  }
`;

const BadgeName = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};

  @media (max-width: 320px) { font-size: 0.75rem; }
  @media (min-width: 2560px) { font-size: 1.1rem; }
  @media (min-width: 3840px) { font-size: 1.35rem; }
`;

const BadgeFull = styled.span`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.text.muted};
  display: block;

  @media (max-width: 320px) { font-size: 0.6rem; }
  @media (min-width: 2560px) { font-size: 0.9rem; }
  @media (min-width: 3840px) { font-size: 1.1rem; }
`;

/* Stats Grid — Animated Counters with Color-Coded Backgrounds */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
  @media (max-width: 320px) { gap: 1rem; }

  @media (min-width: 2560px) { gap: 2.5rem; }
  @media (min-width: 3840px) { gap: 3.5rem; }
`;

const StatCard = styled.div<{ $accentColor?: string }>`
  text-align: center;
  padding: 2rem 1.5rem;
  border-radius: 16px;
  background: ${({ theme, $accentColor }) =>
    $accentColor
      ? `linear-gradient(
          145deg,
          ${theme.effects.glassmorphism ? theme.background.surface : theme.background.elevated},
          ${$accentColor}08
        )`
      : theme.effects.glassmorphism
        ? theme.background.surface
        : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(24px) saturate(1.6)' : 'none'};
  border: 1px solid ${({ $accentColor }) => `${$accentColor || 'rgba(0,255,255,0.1)'}20`};
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    border-color: ${({ $accentColor }) => `${$accentColor || '#00FFFF'}50`};
    box-shadow: 0 0 24px ${({ $accentColor }) => `${$accentColor || '#00FFFF'}25`},
                0 8px 32px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 320px) {
    padding: 1.5rem 1rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 3rem 2rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 4rem 3rem;
    border-radius: 24px;
  }
`;

const StatNumber = styled.div<{ $accentColor?: string }>`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: ${({ theme, $accentColor }) =>
    $accentColor
      ? `linear-gradient(135deg, ${theme.text.heading}, ${$accentColor})`
      : `linear-gradient(135deg, ${theme.text.heading}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 320px) { font-size: 2rem; }
  @media (min-width: 2560px) { font-size: 3.5rem; }
  @media (min-width: 3840px) { font-size: 4.5rem; }
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 320px) { font-size: 0.75rem; }
  @media (min-width: 2560px) { font-size: 1.15rem; }
  @media (min-width: 3840px) { font-size: 1.4rem; }
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
    @media (max-width: 320px) { left: 1rem; }
  }

  @media (min-width: 2560px) { padding: 3rem 0; }
  @media (min-width: 3840px) { padding: 4rem 0; }
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
    @media (max-width: 320px) { left: 1rem; }
  }

  @media (max-width: 768px) {
    justify-content: flex-start;
    padding: 0 0 0 3.5rem;
  }

  @media (max-width: 320px) {
    padding: 0 0 0 2.5rem;
    margin-bottom: 1.5rem;
  }

  @media (min-width: 2560px) {
    margin-bottom: 3rem;
  }

  @media (min-width: 3840px) {
    margin-bottom: 4rem;
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
    theme.effects.glassmorphism ? 'blur(24px) saturate(1.4)' : 'none'};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}12`};
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    border-color: ${({ theme }) => `${theme.colors.primary}40`};
    box-shadow: 0 0 16px ${({ theme }) => `${theme.colors.primary}15`},
                0 4px 16px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 320px) {
    padding: 1rem;
    max-width: 100%;
  }

  @media (min-width: 2560px) {
    max-width: 600px;
    padding: 2rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    max-width: 800px;
    padding: 2.5rem;
    border-radius: 20px;
  }
`;

const TimelineYear = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.35rem;

  @media (max-width: 320px) { font-size: 0.95rem; }
  @media (min-width: 2560px) { font-size: 1.4rem; }
  @media (min-width: 3840px) { font-size: 1.75rem; }
`;

const TimelineDescription = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};
  margin: 0;
  line-height: 1.6;

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
  @media (min-width: 3840px) { font-size: 1.5rem; }
`;

/* Philosophy Grid — Enhanced with icons and deeper glassmorphism */
const PhilosophyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
  @media (max-width: 320px) { gap: 1rem; }

  @media (min-width: 2560px) { gap: 2.5rem; }
  @media (min-width: 3840px) { gap: 3.5rem; }
`;

const PhilosophyCard = styled.div`
  padding: 2rem;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? theme.background.surface
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(24px) saturate(1.5)' : 'none'};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}12`};
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => `${theme.colors.primary}50`};
    box-shadow: 0 0 20px ${({ theme }) => `${theme.colors.primary}20`},
                0 8px 32px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 320px) {
    padding: 1.25rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 3rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 4rem;
    border-radius: 24px;
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

  @media (min-width: 2560px) { width: 64px; height: 64px; }
  @media (min-width: 3840px) { width: 80px; height: 80px; }
`;

const PhilosophyTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 0.75rem;

  @media (max-width: 320px) { font-size: 1.05rem; }
  @media (min-width: 2560px) { font-size: 1.5rem; }
  @media (min-width: 3840px) { font-size: 1.9rem; }
`;

const PhilosophyBody = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.7;
  margin: 0;

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
  @media (min-width: 3840px) { font-size: 1.5rem; }
`;

/* CTA */
const CTABlock = styled.div`
  text-align: center;
  max-width: 680px;
  margin: 0 auto;

  @media (min-width: 2560px) { max-width: 900px; }
  @media (min-width: 3840px) { max-width: 1200px; }
`;

const CTAHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 1rem;

  @media (max-width: 320px) { font-size: 1.4rem; }
  @media (min-width: 2560px) { font-size: 3.5rem; }
  @media (min-width: 3840px) { font-size: 4.5rem; }
`;

const CTADescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin: 0 0 2rem;
  line-height: 1.7;

  @media (max-width: 320px) { font-size: 0.9rem; }
  @media (min-width: 2560px) { font-size: 1.4rem; }
  @media (min-width: 3840px) { font-size: 1.75rem; }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;

  @media (max-width: 320px) {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
`;

/* ═══════════════════════════════════════════════════════
   STAT COUNTER COMPONENT — V3 Enhanced with color coding
   ═══════════════════════════════════════════════════════ */

const AnimatedStatCard: React.FC<{
  numericValue: number;
  suffix: string;
  label: string;
  delay: number;
  isVisible: boolean;
  prefersReduced: boolean;
  color: string;
}> = ({ numericValue, suffix, label, delay, isVisible, prefersReduced, color }) => {
  const count = useCountUp(numericValue, isVisible, 3, delay, prefersReduced);
  return (
    <StatCard $accentColor={color}>
      <StatNumber $accentColor={color}>{count.toLocaleString()}{suffix}</StatNumber>
      <StatLabel>{label}</StatLabel>
    </StatCard>
  );
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

const AboutV3: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const statsRef = useRef<HTMLElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  return (
    <PageWrapper>
      {/* Noise Overlay — fixed, sits below main content */}
      <NoiseOverlay />

      {/* Main Content — z-index: 2 to sit above noise */}
      <MainContent>
        {/* ── 1. HERO ──────────────────────────────────────── */}
        <ParallaxHero
          imageSrc="/images/parallax/about-hero-bg.png"
          videoSrc="/Waves.mp4"
          overlayOpacity={0.6}
          minHeight="100vh"
        >
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
                    color={stat.color}
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
      </MainContent>
    </PageWrapper>
  );
};

export default AboutV3;
