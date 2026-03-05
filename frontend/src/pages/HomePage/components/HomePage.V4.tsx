/**
 * HomePage V4 — Designed by Gemini 3.1 Pro (Lead Design Authority)
 * Implemented by Claude (Lead Software Engineer)
 *
 * Design Philosophy: "Do not build a website; build a digital instrument."
 * - Cinematic Web Design System
 * - Weighted Motion: cubic-bezier(0.16, 1, 0.3, 1)
 * - Texture Over Flatness: noise overlay, glassmorphism, radial gradients
 * - No AI Slop: no generic patterns, no cookie-cutter layouts
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, ChevronDown,
} from 'lucide-react';
import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import logoImg from '../../../assets/Logo.png';

// ═══════════════════════════════════════════════════════
// CINEMATIC MOTION SYSTEM (Gemini 3.1 Pro Design Authority)
// ═══════════════════════════════════════════════════════

const cinematicTransition = { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const };

const fadeUpVariant = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: cinematicTransition,
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
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
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, prefersReduced]);

  return value;
};

// ═══════════════════════════════════════════════════════
// NOISE OVERLAY (Cinematic texture)
// ═══════════════════════════════════════════════════════

const NoiseOverlayEl = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
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
  background-color: ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'};
`;

const VideoEl = styled(motion.video)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 26, 0.2) 0%,
    rgba(10, 10, 26, 0.8) 60%,
    ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'} 100%
  );
`;

const HeroContent = styled(motion.div)`
  position: relative;
  z-index: 2;
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
  text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
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
  z-index: 3;
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

const FeaturesSection = styled.section`
  padding: 120px 24px;
  background-color: ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'};
  position: relative;

  @media (max-width: 768px) {
    padding: 80px 16px;
  }
`;

const SectionHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 80px;

  @media (max-width: 768px) {
    margin-bottom: 48px;
  }
`;

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3.5rem);
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  margin-top: 16px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const FeatureCard = styled(motion.div)`
  background: rgba(26, 26, 46, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(240, 240, 255, 0.05);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(0, 255, 255, 0.1), transparent 50%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors?.primary || 'rgba(0, 255, 255, 0.3)'};
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 255, 255, 0.08);

    &::before {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ theme }) => `rgba(120, 81, 169, 0.1)`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  transition: all 0.4s ease;

  ${FeatureCard}:hover & {
    color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
    transform: scale(1.1);
  }

  @media (prefers-reduced-motion: reduce) {
    ${FeatureCard}:hover & {
      transform: none;
    }
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.25rem;
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
// SECTION 3: PROGRAMS — "Ascension Tiers"
// ═══════════════════════════════════════════════════════

const ProgramsSection = styled.section`
  padding: 120px 24px;
  background: linear-gradient(
    to bottom,
    ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'},
    #05050a
  );

  @media (max-width: 768px) {
    padding: 80px 16px;
  }
`;

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

const ProgramCard = styled(motion.div)<{ $isPopular?: boolean }>`
  background: ${({ $isPopular }) =>
    $isPopular ? 'rgba(30, 30, 50, 0.6)' : 'rgba(26, 26, 46, 0.3)'};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $isPopular, theme }) =>
    $isPopular
      ? (theme.colors?.primary || '#00FFFF')
      : 'rgba(240, 240, 255, 0.08)'};
  border-radius: 24px;
  padding: 48px 32px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: ${({ $isPopular }) => ($isPopular ? 2 : 1)};
  box-shadow: ${({ $isPopular }) =>
    $isPopular ? '0 24px 64px rgba(0, 255, 255, 0.1)' : 'none'};
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  @media (min-width: 1024px) {
    transform: ${({ $isPopular }) => ($isPopular ? 'scale(1.05)' : 'scale(1)')};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(0, 255, 255, 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
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
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  margin: 0 0 24px;
`;

const PriceTag = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  margin: 0 0 32px;

  span {
    font-size: 1rem;
    color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.5)'};
    font-weight: 400;
  }
`;

// ═══════════════════════════════════════════════════════
// SECTION 4: STATISTICS — "The Proof"
// ═══════════════════════════════════════════════════════

const StatsSection = styled.section`
  padding: 80px 24px;
  border-top: 1px solid rgba(240, 240, 255, 0.05);
  border-bottom: 1px solid rgba(240, 240, 255, 0.05);
  background: ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'};
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatItem = styled(motion.div)`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: clamp(3rem, 5vw, 4.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, ${({ theme }) => theme.colors?.primary || '#00FFFF'} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
`;

// ═══════════════════════════════════════════════════════
// SECTION 5: TESTIMONIALS — "The Echoes"
// ═══════════════════════════════════════════════════════

const TestimonialSection = styled.section`
  padding: 120px 24px;
  background: radial-gradient(
    circle at center,
    rgba(120, 81, 169, 0.05) 0%,
    ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'} 70%
  );
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 80px 16px;
  }
`;

const TestimonialTrack = styled(motion.div)`
  display: flex;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  overflow-x: auto;
  padding-bottom: 32px;
  scroll-snap-type: x mandatory;
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    overflow-x: visible;
  }
`;

const TestimonialCard = styled(motion.div)`
  min-width: 320px;
  scroll-snap-align: center;
  background: rgba(26, 26, 46, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(240, 240, 255, 0.05);
  border-radius: 16px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1023px) {
    flex-shrink: 0;
  }
`;

const StarsRow = styled.div`
  display: flex;
  gap: 4px;
  color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
  margin-bottom: 24px;
`;

const Quote = styled.p`
  font-size: 1.125rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.text?.primary || 'rgba(240, 240, 255, 0.9)'};
  margin: 0 0 32px;
  flex-grow: 1;
  font-style: italic;
`;

const TestimonialAuthor = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  margin: 0;
`;

const TestimonialLocation = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(240, 240, 255, 0.6)'};
  margin-top: 4px;
`;

// ═══════════════════════════════════════════════════════
// SECTION 6: CTA / NEWSLETTER — "The Singularity"
// ═══════════════════════════════════════════════════════

const CTASection = styled.section`
  padding: 160px 24px;
  background: ${({ theme }) => theme.colors?.galaxyCore || theme.colors?.deepSpace || '#0a0a1a'};
  display: flex;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 80px 16px;
  }
`;

const CTAContainer = styled(motion.div)`
  background: linear-gradient(
    180deg,
    rgba(120, 81, 169, 0.1) 0%,
    rgba(0, 255, 255, 0.05) 100%
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 32px;
  padding: 80px 24px;
  max-width: 800px;
  width: 100%;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(0, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 48px 20px;
    border-radius: 24px;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  margin: 40px auto 0;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const EmailInput = styled.input`
  flex-grow: 1;
  min-height: 56px;
  background: rgba(10, 10, 26, 0.6);
  border: 1px solid rgba(240, 240, 255, 0.1);
  border-radius: 8px;
  padding: 0 24px;
  color: ${({ theme }) => theme.text?.primary || '#f0f0ff'};
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || '#00FFFF'};
    box-shadow: 0 0 0 2px ${({ theme }) => (theme.colors?.primary || '#00FFFF') + '30'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.text?.muted || 'rgba(240, 240, 255, 0.4)'};
  }
`;

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════

const FEATURES = [
  { icon: Dumbbell, title: 'Elite Personal Training', desc: '1-on-1 biomechanics and hypertrophy coaching with NASM precision.' },
  { icon: Activity, title: 'Performance Assessment', desc: 'Clinical-grade movement screening and metabolic analysis.' },
  { icon: Apple, title: 'Nutrition Coaching', desc: 'Macro-periodization tailored to your exact physiology and goals.' },
  { icon: Heart, title: 'Recovery & Mobility', desc: 'Advanced protocols for CNS recovery and soft tissue health.' },
  { icon: Monitor, title: 'Online Coaching', desc: 'The SwanStudios app: your universe in your pocket.' },
  { icon: Users, title: 'Group Performance', desc: 'High-output small group dynamic training sessions.' },
  { icon: Target, title: 'Sports-Specific Training', desc: 'Rotational power and explosive mechanics for athletes.' },
  { icon: Building2, title: 'Corporate Wellness', desc: 'Executive health optimization programs for organizations.' },
];

const PROGRAMS = [
  { name: 'Express Sculpt', meta: '4 Weeks \u2022 3x/Week', price: 150 },
  { name: 'Signature Transformation', meta: '8 Weeks \u2022 4x/Week', price: 280, isPopular: true },
  { name: 'Total Evolution', meta: '12 Weeks \u2022 5x/Week', price: 450 },
];

const STATS = [
  { target: 25, suffix: '+', label: 'Years Experience' },
  { target: 500, suffix: '+', label: 'Lives Transformed' },
  { target: 10000, suffix: '+', label: 'Sessions Delivered', display: '10k' },
  { target: 98, suffix: '%', label: 'Client Satisfaction' },
];

const TESTIMONIALS = [
  {
    quote: "Sean didn\u2019t just change my physique; he re-engineered my entire approach to performance and recovery. Worth every penny.",
    author: 'Michael R.',
    location: 'Orange County, CA',
  },
  {
    quote: "After 3 months with SwanStudios, I hit PRs I hadn\u2019t touched in a decade. The AI-driven programming is genuinely next level.",
    author: 'Sarah K.',
    location: 'Newport Beach, CA',
  },
  {
    quote: "The combination of NASM science and personalized coaching made me realize I\u2019d been wasting years on generic programs.",
    author: 'David L.',
    location: 'Beverly Hills, CA',
  },
];

// ═══════════════════════════════════════════════════════
// STAT COUNTER COMPONENT
// ═══════════════════════════════════════════════════════

const StatCounter: React.FC<{
  target: number;
  suffix: string;
  label: string;
  display?: string;
  prefersReduced: boolean;
}> = ({ target, suffix, label, display, prefersReduced }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCountUp(target, isInView, prefersReduced);

  const displayValue = display
    ? (isInView ? display : '0')
    : count.toLocaleString();

  return (
    <StatItem ref={ref} variants={fadeUpVariant}>
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

  // Parallax: hero content moves up faster on scroll
  const { scrollY } = useScroll();
  const heroContentY = useTransform(scrollY, [0, 600], [0, -150]);
  const heroVideoScale = useTransform(scrollY, [0, 600], [1, 1.1]);

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

        {/* ─── HERO ─── */}
        <HeroSection>
          <VideoEl
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            initial={prefersReduced ? { opacity: 0.6 } : { scale: 1.1, opacity: 0 }}
            animate={prefersReduced ? { opacity: 0.6 } : { scale: 1, opacity: 0.6 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={prefersReduced ? undefined : { scale: heroVideoScale }}
          >
            <source src="/swan.mp4" type="video/mp4" />
            <track kind="captions" srcLang="en" label="English captions" />
          </VideoEl>
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
              variants={fadeUpVariant}
            />
            <HeroEyebrow variants={fadeUpVariant}>
              Sean Swan &bull; NASM Certified &bull; 25+ Years
            </HeroEyebrow>
            <HeroHeadline variants={fadeUpVariant}>
              Where Human Excellence{' '}
              <br />
              Meets AI Precision
            </HeroHeadline>
            <HeroSubheadline variants={fadeUpVariant}>
              This is Not Another Fitness App. This is Your New Universe.
            </HeroSubheadline>
            <ButtonGroup variants={fadeUpVariant}>
              <GlowButton
                text="START MY FITNESS JOURNEY"
                theme="primary"
                size="large"
                onClick={() => setShowOrientation(true)}
                aria-label="Start your personalized fitness journey"
              />
              <GlowButton
                text="PREVIEW MY UNIVERSE"
                theme="cosmic"
                size="large"
                onClick={() => navigate('/store')}
                aria-label="Preview training packages"
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
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <ChevronDown size={24} />
              </motion.div>
            </ScrollIndicatorEl>
          )}
        </HeroSection>

        {/* ─── FEATURES ─── */}
        <FeaturesSection id="features">
          <SectionHeader
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUpVariant}
          >
            <SectionTitle>The Arsenal</SectionTitle>
            <SectionSubtitle>
              Eight pillars of elite performance, engineered for your transformation.
            </SectionSubtitle>
          </SectionHeader>
          <FeaturesGrid
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            {FEATURES.map((feat) => (
              <FeatureCard key={feat.title} variants={fadeUpVariant}>
                <IconWrapper>
                  <feat.icon size={24} />
                </IconWrapper>
                <FeatureTitle>{feat.title}</FeatureTitle>
                <FeatureDesc>{feat.desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </FeaturesSection>

        {/* ─── PROGRAMS ─── */}
        <ProgramsSection>
          <SectionHeader
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
          >
            <SectionTitle>Ascension Tiers</SectionTitle>
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
                $isPopular={prog.isPopular}
                variants={fadeUpVariant}
              >
                {prog.isPopular && <PopularBadge>Most Selected</PopularBadge>}
                <ProgramName>{prog.name}</ProgramName>
                <ProgramMeta>{prog.meta}</ProgramMeta>
                <PriceTag>
                  ${prog.price}
                  <span>/mo</span>
                </PriceTag>
                <GlowButton
                  text="Select Protocol"
                  theme={prog.isPopular ? 'primary' : 'ghost'}
                  size="medium"
                  onClick={() => navigate('/store')}
                />
              </ProgramCard>
            ))}
          </ProgramsContainer>
        </ProgramsSection>

        {/* ─── STATS ─── */}
        <StatsSection>
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
                display={stat.display}
                prefersReduced={prefersReduced}
              />
            ))}
          </StatsGrid>
        </StatsSection>

        {/* ─── TESTIMONIALS ─── */}
        <TestimonialSection>
          <SectionHeader
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
          >
            <SectionTitle>The Echoes</SectionTitle>
            <SectionSubtitle>
              Hear from the professionals who transformed their performance.
            </SectionSubtitle>
          </SectionHeader>
          <TestimonialTrack
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.author} variants={fadeUpVariant}>
                <StarsRow>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
                  ))}
                </StarsRow>
                <Quote>&ldquo;{t.quote}&rdquo;</Quote>
                <TestimonialAuthor>{t.author}</TestimonialAuthor>
                <TestimonialLocation>{t.location}</TestimonialLocation>
              </TestimonialCard>
            ))}
          </TestimonialTrack>
        </TestimonialSection>

        {/* ─── CTA / NEWSLETTER ─── */}
        <CTASection>
          <CTAContainer
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
          >
            <SectionTitle style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Enter The Universe
            </SectionTitle>
            <SectionSubtitle style={{ margin: '16px auto 0' }}>
              Join the inner circle. Receive elite training protocols and exclusive insights directly from Sean Swan.
            </SectionSubtitle>
            <InputGroup>
              <EmailInput
                type="email"
                placeholder="Enter your email address"
                aria-label="Email Address"
              />
              <GlowButton
                text="Subscribe"
                theme="primary"
                size="large"
                style={{ minHeight: '56px' }}
              />
            </InputGroup>
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
