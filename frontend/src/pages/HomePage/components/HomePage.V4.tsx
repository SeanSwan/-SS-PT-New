/**
 * HomePage V4.1 — Designed by Gemini 3.1 Pro (Lead Design Authority)
 * Implemented by Claude (Lead Software Engineer)
 *
 * Complete 9-section cinematic homepage with:
 * - Nano Banana 2 parallax backgrounds (swan imagery)
 * - Glassmorphism + noise overlay + weighted motion
 * - NO prices displayed
 * - Golf, Social, About sections restored
 * - cubic-bezier(0.16, 1, 0.3, 1) weighted easing on all animations
 * - prefers-reduced-motion support throughout
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, ChevronDown, Crosshair,
  Shield, Brain, Zap, Sparkles, Music, Palette,
  Gamepad2, Flame, MapPin, Award, TrendingUp, Check,
} from 'lucide-react';
import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import logoImg from '../../../assets/Logo.png';

// ═══════════════════════════════════════════════════════
// CINEMATIC MOTION SYSTEM
// ═══════════════════════════════════════════════════════

const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

const cinematicReveal = {
  hidden: { opacity: 0, y: 40, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: CINEMATIC_EASE },
  },
};

const reducedReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 1, ease: CINEMATIC_EASE },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 1, ease: CINEMATIC_EASE },
  },
};

// ═══════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════

const useCountUp = (target: number, isVisible: boolean, prefersReduced: boolean) => {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    if (prefersReduced) {
      setValue(target);
      hasAnimated.current = true;
      return;
    }
    hasAnimated.current = true;
    const duration = 2500;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, prefersReduced]);

  return value;
};

// ═══════════════════════════════════════════════════════
// PARALLAX HOOK
// ═══════════════════════════════════════════════════════

const useParallax = (range: [string, string] = ['-15%', '15%']) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], range);
  return { ref, y };
};

// ═══════════════════════════════════════════════════════
// GLOBAL STYLED COMPONENTS
// ═══════════════════════════════════════════════════════

const NoiseOverlayEl = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

const CinematicDivider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    ${({ theme }) => (theme.colors?.primary || '#00FFFF') + '40'} 50%,
    transparent 100%
  );
  opacity: 0.6;
`;

const ParallaxBg = styled(motion.div)<{ $bgImage: string; $opacity?: number }>`
  position: absolute;
  top: -20%;
  left: 0;
  width: 100%;
  height: 140%;
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  opacity: ${({ $opacity }) => $opacity ?? 0.4};
  z-index: 0;
  pointer-events: none;
`;

const SectionEl = styled.section`
  position: relative;
  width: 100%;
  padding: clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 2rem);
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'};
`;

const Container = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
`;

const SectionHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: clamp(2rem, 5vw, 4rem);
`;

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3.5rem);
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  line-height: 1.1;
`;

const SectionSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
  margin: 0 auto;
  max-width: 680px;
  line-height: 1.6;
`;

const GlassCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors?.glass || 'rgba(255, 255, 255, 0.03)'};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors?.glassBorder || 'rgba(255, 255, 255, 0.08)'};
  border-radius: 24px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${({ theme }) => theme.colors?.primary || 'rgba(0, 255, 255, 0.3)'};
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 255, 255, 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 1: HERO — "The Event Horizon"
// ═══════════════════════════════════════════════════════

const HeroSection = styled.section`
  position: relative;
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'};
`;

const VideoEl = styled(motion.video)`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const HeroParallaxImg = styled(motion.div)`
  position: absolute;
  inset: -20% 0;
  width: 100%;
  height: 140%;
  background-image: url('/images/parallax/hero-swan-bg.png');
  background-size: cover;
  background-position: center;
  opacity: 0.35;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 26, 0.3) 0%,
    rgba(10, 10, 26, 0.7) 50%,
    ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'} 100%
  );
`;

const HeroContent = styled(motion.div)`
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 24px;
  max-width: 1200px;
`;

const HeroLogo = styled(motion.img)`
  height: 100px;
  margin-bottom: 32px;
  filter: drop-shadow(0 0 24px rgba(0, 255, 255, 0.3));

  @media (min-width: 768px) {
    height: 140px;
  }
`;

const HeroEyebrow = styled(motion.span)`
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  font-size: 0.875rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 24px;
  font-weight: 600;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const HeroHeadline = styled(motion.h1)`
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  font-size: clamp(2.5rem, 6vw, 5.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
  text-transform: uppercase;
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
`;

const HeroSubheadline = styled(motion.p)`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
  font-size: clamp(1.125rem, 2vw, 1.5rem);
  font-weight: 400;
  max-width: 600px;
  margin-bottom: 48px;
  line-height: 1.5;
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 560px;

  @media (min-width: 768px) {
    flex-direction: row;
    width: auto;
    gap: 24px;
  }
`;

const ScrollIndicatorEl = styled(motion.div)`
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.text?.muted || 'rgba(240, 240, 255, 0.4)'};
  cursor: pointer;

  span {
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 2: FEATURES — "The Arsenal"
// ═══════════════════════════════════════════════════════

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  width: 100%;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ theme }) => `rgba(${theme.colors?.primary === '#00FFFF' ? '0, 255, 255' : '120, 81, 169'}, 0.1)`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  transition: all 0.4s ease;
`;

const FeatureTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  margin: 0 0 12px;
`;

const FeatureDesc = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  line-height: 1.6;
  margin: 0;
`;

// ═══════════════════════════════════════════════════════
// SECTION 3: PROGRAMS — "Your Training Programs"
// ═══════════════════════════════════════════════════════

const ProgramsContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1280px;
  margin: 0 auto;
  align-items: center;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
  }
`;

const ProgramCard = styled(GlassCard)<{ $isPopular?: boolean }>`
  width: 100%;
  max-width: 400px;
  align-items: center;
  text-align: center;
  border-color: ${({ $isPopular, theme }) =>
    $isPopular ? (theme.colors?.primary || '#00FFFF') : 'rgba(255, 255, 255, 0.08)'};
  box-shadow: ${({ $isPopular }) =>
    $isPopular ? '0 24px 64px rgba(0, 255, 255, 0.1)' : 'none'};

  @media (min-width: 1024px) {
    transform: ${({ $isPopular }) => ($isPopular ? 'scale(1.05)' : 'scale(1)')};
  }
`;

const PopularBadge = styled.span`
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ProgramName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  margin: 0 0 8px;
`;

const ProgramMeta = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  margin: 0 0 16px;
  font-weight: 600;
`;

const ProgramFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  text-align: left;
  width: 100%;
`;

const ProgramFeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child { border-bottom: none; }

  svg {
    color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
    flex-shrink: 0;
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 4: GOLF — "The Fairway"
// ═══════════════════════════════════════════════════════

const GolfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  max-width: 1280px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }
`;

const GolfFeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GolfFeatureItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
  line-height: 1.5;

  svg {
    color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  }
`;

const GolfSummaryCard = styled(GlassCard)`
  align-items: center;
  text-align: center;
  padding: 48px 32px;

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
    margin: 24px 0 16px;
  }

  p {
    font-size: 0.9375rem;
    color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
    line-height: 1.6;
    margin: 0 0 32px;
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 5: ABOUT — "The Architect"
// ═══════════════════════════════════════════════════════

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    grid-template-columns: 1.5fr 1fr;
    align-items: center;
  }
`;

const AboutText = styled(motion.div)`
  p {
    font-size: 1rem;
    color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.7)'};
    line-height: 1.7;
    margin: 0 0 16px;

    &:last-child { margin-bottom: 0; }

    strong {
      color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
    }
  }
`;

const AboutLogoWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AboutLogo = styled.img`
  width: 200px;
  height: auto;
  filter: drop-shadow(0 0 40px rgba(0, 255, 255, 0.2));

  @media (min-width: 768px) {
    width: 260px;
  }
`;

const ApproachGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 48px;
  max-width: 1200px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ApproachCard = styled(GlassCard)`
  align-items: center;
  text-align: center;

  svg {
    color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
    margin-bottom: 16px;
  }

  h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
    margin: 0 0 12px;
  }

  p {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
    line-height: 1.6;
    margin: 0;
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 6: TESTIMONIALS — "The Echoes"
// ═══════════════════════════════════════════════════════

const TestimonialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StarsRow = styled.div`
  display: flex;
  gap: 4px;
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  margin-bottom: 24px;
`;

const Quote = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.text?.primary || 'rgba(240, 240, 255, 0.9)'};
  margin: 0 0 24px;
  flex-grow: 1;
  font-style: italic;
`;

const TestimonialAuthor = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
`;

const TestimonialMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  margin-top: 4px;
`;

const ResultBadge = styled.span`
  display: inline-block;
  margin-top: 12px;
  padding: 6px 16px;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  background: ${({ theme }) => (theme.colors?.primary || '#00FFFF') + '15'};
  border: 1px solid ${({ theme }) => (theme.colors?.primary || '#00FFFF') + '30'};
`;

// ═══════════════════════════════════════════════════════
// SECTION 7: STATISTICS — "The Proof"
// ═══════════════════════════════════════════════════════

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const StatItem = styled(motion.div)`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, ${({ theme }) => theme.colors?.primary || '#00FFFF'} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
`;

const StatIcon = styled.div`
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  margin-bottom: 8px;
  opacity: 0.6;
`;

// ═══════════════════════════════════════════════════════
// SECTION 8: SOCIAL — "Beyond the Gym"
// ═══════════════════════════════════════════════════════

const BeyondSection = styled.section`
  position: relative;
  width: 100%;
  padding: clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 2rem);
  overflow: hidden;
`;

const BeyondImageBg = styled(motion.div)`
  position: absolute;
  top: -10%;
  left: 0;
  width: 100%;
  height: 120%;
  background-image: url('/images/parallax/beyond-the-gym-bg.png');
  background-size: cover;
  background-position: center;
  opacity: 0.45;
  z-index: 0;
  pointer-events: none;
`;

const BeyondOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'} 0%,
    rgba(10, 10, 26, 0.85) 30%,
    rgba(10, 10, 26, 0.85) 70%,
    ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'} 100%
  );
`;

const SocialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 9: CTA — "The Singularity"
// ═══════════════════════════════════════════════════════

const CTASection = styled.section`
  padding: clamp(4rem, 10vw, 10rem) clamp(1rem, 5vw, 2rem);
  background: ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'};
  display: flex;
  justify-content: center;
`;

const CTAContainer = styled(motion.div)`
  background: linear-gradient(
    180deg,
    rgba(120, 81, 169, 0.08) 0%,
    rgba(0, 255, 255, 0.04) 100%
  );
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 32px;
  padding: clamp(3rem, 8vw, 5rem) 24px;
  max-width: 900px;
  width: 100%;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(0, 255, 255, 0.04);
`;

const CTAButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  margin-top: 32px;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 24px;
  }
`;

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════

const FEATURES = [
  { icon: Dumbbell, title: 'Elite Personal Training', desc: 'Personalized coaching from NCEP-certified experts with 25+ years experience. Science-based programming tailored to your goals.' },
  { icon: Activity, title: 'Performance Assessment', desc: 'Comprehensive evaluation using NASM OPT model to analyze movement patterns and build your optimal program.' },
  { icon: Apple, title: 'Nutrition Coaching', desc: 'Evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.' },
  { icon: Heart, title: 'Recovery & Mobility', desc: 'Corrective exercise strategies, mobility training, and myofascial release guided by NASM CES principles.' },
  { icon: Monitor, title: 'Online Coaching', desc: 'Expert guidance anywhere with customized programs and regular check-ins through our AI-enhanced platform.' },
  { icon: Users, title: 'Group Performance', desc: 'Exclusive small-group sessions combining group energy with personalized attention for maximum results.' },
  { icon: Target, title: 'Sports-Specific Training', desc: 'Specialized programs for golfers, athletes, and weekend warriors. Rotational power and sport-specific conditioning.' },
  { icon: Building2, title: 'Corporate Wellness', desc: 'Comprehensive corporate wellness programs including on-site sessions, workshops, and team challenges.' },
];

const PROGRAMS = [
  {
    name: 'Express Precision',
    meta: '30-Minute Sessions',
    badge: null,
    features: ['Targeted time-optimized training', 'Customized workout plans', 'Progress tracking', 'Flexible scheduling'],
  },
  {
    name: 'Signature Performance',
    meta: '60-Minute Sessions',
    badge: 'Most Popular',
    features: ['Full biomechanical coaching', 'NASM OHSA movement analysis', 'Nutrition guidance included', 'Priority scheduling', 'Monthly progress reports'],
  },
  {
    name: 'Transformation Programs',
    meta: 'Multi-Session Packages',
    badge: 'Best Value',
    features: ['Comprehensive NASM assessment', 'Periodized programming', 'Priority scheduling', 'Weekly check-ins', 'Full nutrition plan'],
  },
];

const GOLF_FEATURES = [
  { icon: Crosshair, title: 'Rotational Power Training', desc: 'Generate explosive hip and torso rotation for longer drives and more consistent ball striking.' },
  { icon: Shield, title: 'Core Stability & Balance', desc: 'Build a rock-solid foundation that keeps your swing consistent from the first tee to the 18th green.' },
  { icon: Activity, title: 'Flexibility & Mobility', desc: 'Increase your range of motion for a fuller backswing and smoother follow-through without strain.' },
  { icon: Heart, title: 'Injury Prevention', desc: 'Corrective exercise protocols targeting common golf injuries: lower back, shoulders, elbows, and wrists.' },
  { icon: Brain, title: 'Movement Analysis', desc: 'NASM-guided assessment of your movement patterns to identify limitations affecting your swing mechanics.' },
];

const TESTIMONIALS = [
  {
    quote: "Thanks to SwanStudios personal training, I achieved an incredible transformation. The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.",
    author: 'Sarah J.',
    descriptor: 'Corporate Executive',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    quote: "Sean Swan completely transformed my golf game. Through targeted core stability work, rotational power training, and flexibility protocols, I added serious distance off the tee.",
    author: 'Robert T.',
    descriptor: 'Avid Golfer',
    result: 'Added 35 yards to drive',
  },
  {
    quote: "Training with Sean Swan got me in the best shape of my life. My department fitness test running time improved dramatically, and I feel stronger, faster, and more capable on the job.",
    author: 'Officer Martinez',
    descriptor: 'Law Enforcement',
    result: 'Run improved by 2:30',
  },
];

const STATS = [
  { target: 25, suffix: '+', label: 'Years Experience', icon: Award },
  { target: 500, suffix: '+', label: 'Clients Transformed', icon: Users },
  { target: 10000, suffix: '+', label: 'Sessions Delivered', icon: TrendingUp, display: '10k' },
  { target: 312, suffix: '', label: 'Swimmers Taught', icon: Activity },
  { target: 12450, suffix: '+', label: 'Lbs Lost Together', icon: Flame, display: '12.4k' },
  { target: 98, suffix: '%', label: 'Client Satisfaction', icon: Star },
];

const SOCIAL_CATEGORIES = [
  { title: 'Dance & Movement', desc: 'Post your dance videos, choreography, and freestyle sessions. From hip-hop to contemporary — move your way.', icon: Sparkles },
  { title: 'Music & Singing', desc: 'Share vocal performances, covers, instrumentals, and original music. Your stage, your sound.', icon: Music },
  { title: 'Art & Expression', desc: 'Showcase artwork, digital art, photography, and creative projects. Inspire and get inspired.', icon: Palette },
  { title: 'Gaming', desc: 'Share your gaming builds, favorite consoles, portable setups, and streams. Gamers get fit too.', icon: Gamepad2 },
  { title: 'Fitness Challenges', desc: 'Community workout challenges, transformation posts, and accountability groups. Push each other forward.', icon: Flame },
  { title: 'Community Meetups', desc: 'Local events, group activities, and real-world connections. The digital community, IRL.', icon: MapPin },
];

// ═══════════════════════════════════════════════════════
// STAT COUNTER SUB-COMPONENT
// ═══════════════════════════════════════════════════════

const StatCounter: React.FC<{
  target: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  display?: string;
  prefersReduced: boolean;
}> = ({ target, suffix, label, icon: Icon, display, prefersReduced }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCountUp(target, isInView, prefersReduced);
  const displayValue = display ? (isInView ? display : '0') : count.toLocaleString();

  return (
    <StatItem ref={ref} variants={cinematicReveal}>
      <StatIcon><Icon size={20} /></StatIcon>
      <StatNumber>{displayValue}{suffix}</StatNumber>
      <StatLabel>{label}</StatLabel>
    </StatItem>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

const HomePageV4: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [showOrientation, setShowOrientation] = useState(false);
  const [showScroll, setShowScroll] = useState(true);

  // Motion variants (respects reduced motion)
  const reveal = prefersReduced ? reducedReveal : cinematicReveal;
  const leftSlide = prefersReduced ? reducedReveal : slideInLeft;
  const rightSlide = prefersReduced ? reducedReveal : slideInRight;

  // Hero parallax
  const { scrollY } = useScroll();
  const heroContentY = useTransform(scrollY, [0, 600], [0, -120]);
  const heroVideoScale = useTransform(scrollY, [0, 600], [1, 1.1]);
  const heroParallaxY = useTransform(scrollY, [0, 800], ['0%', '25%']);

  // Section parallax hooks
  const featuresParallax = useParallax(['-15%', '15%']);
  const golfParallax = useParallax(['-20%', '20%']);
  const testimonialsParallax = useParallax(['-15%', '15%']);
  const beyondParallax = useParallax(['-10%', '10%']);

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY <= 200);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision</title>
        <meta name="description" content="Transform your fitness with SwanStudios' elite personal training. NASM-certified coaching with 25+ years experience, AI-driven programming, serving Orange County and LA." />
      </Helmet>

      <main style={{ position: 'relative', background: '#0a0a1a' }}>
        <NoiseOverlayEl />

        {/* ─── 1. HERO — "The Event Horizon" ─── */}
        <HeroSection>
          <VideoEl
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-hidden="true"
            initial={prefersReduced ? { opacity: 0.5 } : { scale: 1.1, opacity: 0 }}
            animate={prefersReduced ? { opacity: 0.5 } : { scale: 1, opacity: 0.5 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={prefersReduced ? undefined : { scale: heroVideoScale }}
          >
            <source src="/swan.mp4" type="video/mp4" />
            <track kind="captions" srcLang="en" label="English captions" />
          </VideoEl>
          <HeroParallaxImg
            style={prefersReduced ? undefined : { y: heroParallaxY }}
            aria-hidden="true"
          />
          <HeroOverlay />

          <HeroContent
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={prefersReduced ? undefined : { y: heroContentY }}
          >
            <HeroLogo
              src={logoImg}
              alt="SwanStudios Logo"
              loading="eager"
              variants={reveal}
              animate={prefersReduced ? undefined : { y: [0, -10, 0] }}
              transition={prefersReduced ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <HeroEyebrow variants={reveal}>
              Sean Swan &bull; NASM Certified &bull; 25+ Years
            </HeroEyebrow>
            <HeroHeadline variants={reveal}>
              Elevate Your
              <br />
              Existence
            </HeroHeadline>
            <HeroSubheadline variants={reveal}>
              This is not another fitness app. This is your personal universe of transformation, powered by elite coaching and AI precision.
            </HeroSubheadline>
            <ButtonGroup variants={reveal}>
              <GlowButton
                text="START MY JOURNEY"
                theme="primary"
                size="large"
                onClick={() => setShowOrientation(true)}
                aria-label="Start your personalized fitness journey"
              />
              <GlowButton
                text="EXPLORE PROGRAMS"
                theme="cosmic"
                size="large"
                onClick={() => navigate('/store')}
                aria-label="Explore training programs"
              />
            </ButtonGroup>
          </HeroContent>

          {showScroll && (
            <ScrollIndicatorEl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
              onClick={scrollToFeatures}
              aria-label="Scroll down to explore"
            >
              <span>Explore</span>
              <motion.div
                animate={prefersReduced ? undefined : { y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <ChevronDown size={24} />
              </motion.div>
            </ScrollIndicatorEl>
          )}
        </HeroSection>

        <CinematicDivider />

        {/* ─── 2. FEATURES — "The Arsenal" ─── */}
        <SectionEl id="features" ref={featuresParallax.ref as React.Ref<HTMLElement>}>
          <ParallaxBg
            $bgImage="/images/parallax/features-swan-bg.png"
            $opacity={0.35}
            style={prefersReduced ? undefined : { y: featuresParallax.y }}
            aria-hidden="true"
          />
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={reveal}
            >
              <SectionTitle>The Arsenal</SectionTitle>
              <SectionSubtitle>
                Eight pillars of elite performance, engineered for your transformation.
              </SectionSubtitle>
            </SectionHeader>
            <FeaturesGrid
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              {FEATURES.map((feat) => (
                <GlassCard key={feat.title} variants={reveal}>
                  <IconWrapper>
                    <feat.icon size={24} />
                  </IconWrapper>
                  <FeatureTitle>{feat.title}</FeatureTitle>
                  <FeatureDesc>{feat.desc}</FeatureDesc>
                </GlassCard>
              ))}
            </FeaturesGrid>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 3. PROGRAMS — "Ascension Protocols" ─── */}
        <SectionEl>
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>Your Training Programs</SectionTitle>
              <SectionSubtitle>
                Choose your protocol. Every tier includes AI-driven programming and NASM-certified coaching.
              </SectionSubtitle>
            </SectionHeader>
            <ProgramsContainer
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {PROGRAMS.map((prog) => (
                <ProgramCard
                  key={prog.name}
                  $isPopular={prog.badge === 'Most Popular'}
                  variants={reveal}
                >
                  {prog.badge && <PopularBadge>{prog.badge}</PopularBadge>}
                  <ProgramName>{prog.name}</ProgramName>
                  <ProgramMeta>{prog.meta}</ProgramMeta>
                  <ProgramFeatures>
                    {prog.features.map((f) => (
                      <ProgramFeatureItem key={f}>
                        <Check size={16} />
                        {f}
                      </ProgramFeatureItem>
                    ))}
                  </ProgramFeatures>
                  <GlowButton
                    text="View Details"
                    theme={prog.badge === 'Most Popular' ? 'primary' : 'ghost'}
                    size="medium"
                    onClick={() => navigate('/store')}
                  />
                </ProgramCard>
              ))}
            </ProgramsContainer>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 4. GOLF — "The Fairway" ─── */}
        <SectionEl ref={golfParallax.ref as React.Ref<HTMLElement>}>
          <ParallaxBg
            $bgImage="/images/parallax/golf-section-bg.png"
            $opacity={0.4}
            style={prefersReduced ? undefined : { y: golfParallax.y }}
            aria-hidden="true"
          />
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>Master The Fairway</SectionTitle>
              <SectionSubtitle>
                Unlock your full potential on the course with sport-specific training designed for golfers of every level.
              </SectionSubtitle>
            </SectionHeader>
            <GolfGrid>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                <GolfFeatureList>
                  {GOLF_FEATURES.map((gf) => (
                    <GolfFeatureItem key={gf.title} variants={leftSlide}>
                      <gf.icon size={22} />
                      <span>
                        <strong>{gf.title}</strong> — {gf.desc}
                      </span>
                    </GolfFeatureItem>
                  ))}
                </GolfFeatureList>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={rightSlide}
              >
                <GolfSummaryCard>
                  <Crosshair size={40} />
                  <h3>Golf Performance Program</h3>
                  <p>
                    Whether you're a weekend warrior or a competitive amateur, our golf-specific
                    training addresses the physical demands of the game. Improve your drive distance,
                    reduce your handicap, and play pain-free.
                  </p>
                  <GlowButton
                    text="Improve Your Game"
                    theme="primary"
                    size="medium"
                    onClick={() => navigate('/store')}
                    aria-label="Explore golf performance training"
                  />
                </GolfSummaryCard>
              </motion.div>
            </GolfGrid>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 5. ABOUT — "The Architect" ─── */}
        <SectionEl>
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>About Sean Swan</SectionTitle>
              <SectionSubtitle>
                A legacy of transforming lives through science-backed fitness and AI-enhanced coaching.
              </SectionSubtitle>
            </SectionHeader>

            <AboutGrid>
              <AboutText
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={leftSlide}
              >
                <p>
                  <strong>Sean Swan</strong> is an NCEP-certified personal trainer
                  (National College of Exercise Professionals, 1998) with{' '}
                  <strong>25+ years of experience</strong> helping clients transform
                  their lives. Trained in NASM protocols and workshops, Sean applies the
                  NASM Optimum Performance Training (OPT) model to every program he builds.
                </p>
                <p>
                  His career spans elite fitness brands including LA Fitness, Gold's Gym,
                  24 Hour Fitness, and Bodies in Motion. His time as a physical therapy aid
                  at Kerlan Jobe Health South deepened his expertise in injury prevention,
                  corrective exercise, and rehabilitation.
                </p>
                <p>
                  At SwanStudios, we blend <strong>elite personal training with AI as a powerful tool</strong> —
                  not a replacement for the coach. Sean and his team conduct deep research on each
                  client's goals, athletic background, and physical history to build truly optimized
                  programs. The result: the fastest, safest progress possible with a real coach guiding every step.
                </p>
              </AboutText>

              <AboutLogoWrapper
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={rightSlide}
              >
                <motion.div
                  animate={prefersReduced ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <AboutLogo src={logoImg} alt="SwanStudios" />
                </motion.div>
              </AboutLogoWrapper>
            </AboutGrid>

            <ApproachGrid
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <ApproachCard variants={reveal}>
                <Brain size={28} />
                <h4>Deep Client Research</h4>
                <p>Your trainer studies your goals, movement history, and athletic background to build a program that's truly yours.</p>
              </ApproachCard>
              <ApproachCard variants={reveal}>
                <Zap size={28} />
                <h4>AI-Optimized Programming</h4>
                <p>AI helps analyze performance data and refine your training program for faster, safer results — guided by your coach.</p>
              </ApproachCard>
              <ApproachCard variants={reveal}>
                <Shield size={28} />
                <h4>Privacy & Rehabilitation</h4>
                <p>Your data stays private through our programming protocol. Injury rehab programs built with precision and care.</p>
              </ApproachCard>
            </ApproachGrid>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <GlowButton
                text="Learn More"
                theme="ghost"
                size="medium"
                onClick={() => navigate('/about')}
                aria-label="Learn more about Sean Swan"
              />
            </div>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 6. TESTIMONIALS — "The Echoes" ─── */}
        <SectionEl ref={testimonialsParallax.ref as React.Ref<HTMLElement>}>
          <ParallaxBg
            $bgImage="/images/parallax/testimonials-swan-bg.png"
            $opacity={0.25}
            style={prefersReduced ? undefined : { y: testimonialsParallax.y }}
            aria-hidden="true"
          />
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>The Echoes</SectionTitle>
              <SectionSubtitle>
                Real results from real people. No shortcuts — just elite-level coaching that works.
              </SectionSubtitle>
            </SectionHeader>
            <TestimonialGrid
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {TESTIMONIALS.map((t) => (
                <GlassCard key={t.author} variants={reveal} style={{ padding: '40px 32px' }}>
                  <StarsRow>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
                    ))}
                  </StarsRow>
                  <Quote>&ldquo;{t.quote}&rdquo;</Quote>
                  <TestimonialAuthor>{t.author}</TestimonialAuthor>
                  <TestimonialMeta>{t.descriptor}</TestimonialMeta>
                  <ResultBadge>{t.result}</ResultBadge>
                </GlassCard>
              ))}
            </TestimonialGrid>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 7. STATISTICS — "The Proof" ─── */}
        <SectionEl style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>By the Numbers</SectionTitle>
            </SectionHeader>
            <StatsGrid
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {STATS.map((stat) => (
                <StatCounter
                  key={stat.label}
                  target={stat.target}
                  suffix={stat.suffix}
                  label={stat.label}
                  icon={stat.icon}
                  display={stat.display}
                  prefersReduced={prefersReduced}
                />
              ))}
            </StatsGrid>
          </Container>
        </SectionEl>

        <CinematicDivider />

        {/* ─── 8. SOCIAL — "Beyond the Gym" ─── */}
        <BeyondSection ref={beyondParallax.ref as React.Ref<HTMLElement>}>
          <BeyondImageBg
            style={prefersReduced ? undefined : { y: beyondParallax.y }}
            aria-hidden="true"
          />
          <BeyondOverlay />
          <Container>
            <SectionHeader
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
            >
              <SectionTitle>Beyond the Gym</SectionTitle>
              <SectionSubtitle>
                SwanStudios isn't just a fitness platform — it's a creative social ecosystem.
                Imagine TikTok, Instagram, Twitch, YouTube, and Meetup combined into one community
                where fitness meets art, music, gaming, and real human connection.
              </SectionSubtitle>
            </SectionHeader>
            <SocialGrid
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {SOCIAL_CATEGORIES.map((cat) => (
                <GlassCard key={cat.title} variants={reveal}>
                  <IconWrapper>
                    <cat.icon size={24} />
                  </IconWrapper>
                  <FeatureTitle>{cat.title}</FeatureTitle>
                  <FeatureDesc>{cat.desc}</FeatureDesc>
                </GlassCard>
              ))}
            </SocialGrid>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={reveal}
              style={{ textAlign: 'center', marginTop: '2.5rem' }}
            >
              <GlowButton
                text="Join the Community"
                theme="cosmic"
                size="large"
                onClick={() => navigate('/social')}
                aria-label="Join the SwanStudios community"
              />
            </motion.div>
          </Container>
        </BeyondSection>

        <CinematicDivider />

        {/* ─── 9. FINAL CTA — "The Singularity" ─── */}
        <CTASection>
          <CTAContainer
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
          >
            <SectionTitle style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Ready to Transform?
            </SectionTitle>
            <SectionSubtitle style={{ margin: '16px auto 0' }}>
              Your journey to a stronger, healthier, more confident you starts with
              a single step. Let our NCEP-certified coaches guide you with proven
              NASM protocols and 25+ years of expertise.
            </SectionSubtitle>
            <CTAButtons>
              <GlowButton
                text="Start Today"
                theme="primary"
                size="large"
                onClick={() => navigate('/store')}
                aria-label="Start your transformation today"
              />
              <GlowButton
                text="Contact Us"
                theme="ghost"
                size="large"
                onClick={() => navigate('/contact')}
                aria-label="Contact SwanStudios"
              />
            </CTAButtons>
          </CTAContainer>
        </CTASection>
      </main>

      {/* ─── ORIENTATION MODAL ─── */}
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </>
  );
};

export default HomePageV4;
