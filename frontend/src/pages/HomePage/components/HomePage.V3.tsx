import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, Sparkles, Clock, Award,
  TrendingUp, Music, Palette, Gamepad2, Flame, MapPin,
  Shield, Brain, Zap, Crosshair,
} from 'lucide-react';

import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import ParallaxHero from '../../../components/ui-kit/cinematic/ParallaxHero';
import ScrollReveal from '../../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../../components/ui-kit/cinematic/TypewriterText';
import SectionDivider from '../../../components/ui-kit/cinematic/SectionDivider';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import logoImg from '../../../assets/Logo.png';

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
        // ease-out quad
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

const features = [
  {
    icon: <Dumbbell size={28} />,
    title: 'Elite Personal Training',
    description:
      'Personalized coaching from NCEP-certified experts trained in NASM protocols, with over 25 years of experience. Science-based programming tailored to your goals.',
  },
  {
    icon: <Activity size={28} />,
    title: 'Performance Assessment',
    description:
      'Comprehensive evaluation using NASM OPT model principles to analyze movement patterns, identify imbalances, and build your optimal program.',
  },
  {
    icon: <Apple size={28} />,
    title: 'Nutrition Coaching',
    description:
      'Evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies that fuel your training and recovery.',
  },
  {
    icon: <Heart size={28} />,
    title: 'Recovery & Mobility',
    description:
      'Corrective exercise strategies, mobility training, and myofascial release techniques guided by NASM CES principles for injury prevention.',
  },
  {
    icon: <Monitor size={28} />,
    title: 'Online Coaching',
    description:
      'Expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our AI-enhanced coaching platform.',
  },
  {
    icon: <Users size={28} />,
    title: 'Group Performance',
    description:
      'Exclusive small-group sessions combining group energy with personalized attention for maximum results at an accessible price point.',
  },
  {
    icon: <Target size={28} />,
    title: 'Sports-Specific Training',
    description:
      'Specialized programs for golfers, athletes, and weekend warriors. Rotational power, core stability, and sport-specific conditioning.',
  },
  {
    icon: <Building2 size={28} />,
    title: 'Corporate Wellness',
    description:
      'Comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges to boost team performance.',
  },
];

const programs = [
  {
    title: 'Express Precision',
    tagline: '30-Minute Sessions',
    description: 'Maximum efficiency for busy professionals. Targeted, time-optimized training.',
    badge: null,
  },
  {
    title: 'Signature Performance',
    tagline: '60-Minute Sessions',
    description: 'Full biomechanical coaching with movement analysis using NASM OHSA protocol.',
    badge: 'Most Popular',
  },
  {
    title: 'Transformation Programs',
    tagline: 'Multi-Session Packages',
    description: 'Comprehensive assessment using NASM guidelines with priority scheduling and progress tracking.',
    badge: 'Best Value',
  },
];

const testimonials = [
  {
    name: 'Sarah J.',
    descriptor: 'Corporate Executive',
    rating: 5,
    quote:
      'Thanks to SwanStudios personal training, I achieved an incredible transformation. The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    name: 'Robert T.',
    descriptor: 'Avid Golfer',
    rating: 5,
    quote:
      'Sean Swan completely transformed my golf game. Through targeted core stability work, rotational power training, and flexibility protocols, I added serious distance off the tee and my swing mechanics have never been better.',
    result: 'Added 35 yards to drive, handicap dropped 6 strokes',
  },
  {
    name: 'Officer Martinez',
    descriptor: 'Law Enforcement',
    rating: 5,
    quote:
      'Training with Sean Swan got me in the best shape of my life. My department fitness test running time improved dramatically, and I feel stronger, faster, and more capable on the job every single day.',
    result: '1.5 mile run improved by 2:30, top fitness scores',
  },
];

const statsData = [
  { numericValue: 25, suffix: '+', label: 'Years Experience', icon: <Award size={24} />, delay: 0 },
  { numericValue: 500, suffix: '+', label: 'Clients Transformed', icon: <Users size={24} />, delay: 0.2 },
  { numericValue: 10000, suffix: '+', label: 'Sessions Delivered', icon: <TrendingUp size={24} />, delay: 0.4 },
  { numericValue: 312, suffix: '', label: 'Swimmers Taught', icon: <Activity size={24} />, delay: 0.6 },
  { numericValue: 12450, suffix: '+', label: 'Lbs Lost Collectively', icon: <Flame size={24} />, delay: 0.8 },
  { numericValue: 98, suffix: '%', label: 'Client Satisfaction', icon: <Star size={24} />, delay: 1.0 },
];

const socialCategories = [
  {
    title: 'Dance & Movement',
    description: 'Post your dance videos, choreography, and freestyle sessions. From hip-hop to contemporary — move your way.',
    icon: <Sparkles size={28} />,
  },
  {
    title: 'Music & Singing',
    description: 'Share vocal performances, covers, instrumentals, and original music. Your stage, your sound.',
    icon: <Music size={28} />,
  },
  {
    title: 'Art & Expression',
    description: 'Showcase artwork, digital art, photography, and creative projects. Inspire and get inspired.',
    icon: <Palette size={28} />,
  },
  {
    title: 'Gaming',
    description: 'Share your gaming builds, favorite consoles, portable setups, and streams. Gamers get fit too.',
    icon: <Gamepad2 size={28} />,
  },
  {
    title: 'Fitness Challenges',
    description: 'Community workout challenges, transformation posts, and accountability groups. Push each other forward.',
    icon: <Flame size={28} />,
  },
  {
    title: 'Community Meetups',
    description: 'Local events, group activities, and real-world connections. The digital community, IRL.',
    icon: <MapPin size={28} />,
  },
];

/* ═══════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0,255,255,0.1); }
  50% { box-shadow: 0 0 40px rgba(0,255,255,0.25); }
`;

/* ═══════════════════════════════════════════════════════
   STYLED COMPONENTS — All theme-aware, zero hardcoded colors
   ═══════════════════════════════════════════════════════ */

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.body};
`;

const HeroLogo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 25px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}50`
      : 'transparent'});
  animation: ${subtleFloat} 4s ease-in-out infinite;
`;

const HeroHeadline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2.2rem, 5vw, 4rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 1rem;
  line-height: 1.15;
  text-shadow: 0 2px 20px rgba(0,0,0,0.3);
`;

const HeroSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: clamp(0.9rem, 2vw, 1.15rem);
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 2.5rem;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 8px rgba(0,0,0,0.2);
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Section = styled.section<{ $alt?: boolean }>`
  width: 100%;
  padding: 5rem 1.5rem;
  position: relative;
  background: ${({ theme, $alt }) =>
    $alt ? theme.background.secondary : theme.background.primary};

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin-bottom: 0.75rem;
`;

const SectionSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  max-width: 750px;
  margin: 0 auto 3rem;
  line-height: 1.7;
`;

/* Accent line under section titles */
const AccentLine = styled.div`
  width: 60px;
  height: 3px;
  margin: 0.5rem auto 1.5rem;
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent || theme.colors.primary})`};
  border-radius: 2px;
`;

/* Features Grid */
const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
    border-color: ${({ theme }) => `${theme.colors.primary}60`};
  }
`;

const FeatureIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
`;

const FeatureTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.75rem;
`;

const FeatureDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.muted};
  line-height: 1.55;
`;

/* Programs Grid */
const ProgramsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ProgramCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 2.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
  }
`;

const ProgramBadge = styled.span`
  position: absolute;
  top: 16px;
  right: 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) =>
    theme.id === 'crystalline-light' ? '#FFFFFF' : theme.background.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProgramTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.5rem;
`;

const ProgramTagline = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ProgramDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.6;
`;

/* Golf Section */
const GolfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GolfFeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GolfFeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.5;

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const GolfCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 20px;
  padding: 3rem 2.5rem;
  text-align: center;

  h3 {
    font-family: ${({ theme }) => theme.fonts.drama};
    font-size: 1.6rem;
    color: ${({ theme }) => theme.text.heading};
    margin-bottom: 1rem;
  }

  p {
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 0.95rem;
    color: ${({ theme }) => theme.text.secondary};
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
`;

/* About/Bio Section */
const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 3rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const AboutText = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.7;

  p {
    margin-bottom: 1.25rem;
  }

  strong {
    color: ${({ theme }) => theme.text.heading};
  }
`;

const AboutLogoWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AboutLogo = styled.img`
  width: 220px;
  height: 220px;
  object-fit: contain;
  filter: drop-shadow(0 0 30px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}30`
      : 'transparent'});
`;

/* AI Approach highlight */
const ApproachGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 2.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ApproachCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(10px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 14px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }

  svg {
    color: ${({ theme }) => theme.colors.accent || theme.colors.primary};
    margin-bottom: 0.75rem;
  }

  h4 {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 0.95rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text.heading};
    margin-bottom: 0.5rem;
  }

  p {
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 0.85rem;
    color: ${({ theme }) => theme.text.muted};
    line-height: 1.5;
  }
`;

/* Testimonials */
const TestimonialsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TestimonialCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
  }
`;

const StarRating = styled.div`
  display: flex;
  gap: 4px;
  color: ${({ theme }) => theme.colors.accent || '#C6A84B'};
`;

const TestimonialQuote = styled.div`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1rem;
  font-style: italic;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.65;
  flex: 1;
  min-height: 120px;
`;

const ClientName = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
`;

const ResultBadge = styled.span`
  display: inline-block;
  background: ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}15`
      : `${theme.colors.primary}10`};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}30`};
  align-self: flex-start;
`;

/* Stats */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(10px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }
`;

const StatIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: center;
`;

const StatValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.25rem;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.text.heading}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text.muted};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

/* Beyond the Gym — Social Section with video bg */
const BeyondSection = styled.section`
  width: 100%;
  position: relative;
  overflow: hidden;
`;

const BeyondVideoWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const BeyondOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: ${({ theme }) => {
    const base = theme.background.primary;
    return `linear-gradient(180deg, ${base}E6 0%, ${base}CC 30%, ${base}CC 70%, ${base}E6 100%)`;
  }};
`;

const BeyondContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 5rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const SocialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const SocialCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}DD`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
    border-color: ${({ theme }) => `${theme.colors.primary}60`};
  }
`;

/* CTA Section */
const CTASection = styled.section`
  width: 100%;
  padding: 5rem 1.5rem;
  background: ${({ theme }) => theme.background.secondary};
  text-align: center;
`;

const CTAInner = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const CTAText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 2rem;
  line-height: 1.6;
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
  icon: React.ReactNode;
  delay: number;
  isVisible: boolean;
  prefersReduced: boolean;
}> = ({ numericValue, suffix, label, icon, delay, isVisible, prefersReduced }) => {
  const count = useCountUp(numericValue, isVisible, 3, delay, prefersReduced);
  const displayValue = numericValue >= 10000
    ? `${(count).toLocaleString()}`
    : `${count}`;

  return (
    <StatCard>
      <StatIcon>{icon}</StatIcon>
      <StatValue>{displayValue}{suffix}</StatValue>
      <StatLabel>{label}</StatLabel>
    </StatCard>
  );
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

const HomePageV3: React.FC = () => {
  const navigate = useNavigate();
  const [showOrientation, setShowOrientation] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Stats section visibility for counter animation
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  return (
    <PageWrapper>
      <Helmet>
        <title>SwanStudios | Elite Personal Training & Creative Wellness</title>
        <meta
          name="description"
          content="Transform your fitness journey with SwanStudios' elite personal training. NCEP-certified coaching using NASM guidelines with over 25 years of experience in performance, dance, and creative wellness."
        />
        <meta
          name="keywords"
          content="personal training, fitness, NCEP certified, NASM protocols, dance, creative expression, wellness, performance training, elite coaching, golf training, sports specific"
        />
        <meta property="og:title" content="SwanStudios | Elite Personal Training" />
        <meta
          property="og:description"
          content="Experience the world's first Fitness Social Ecosystem with NCEP-certified expert trainers and AI-enhanced coaching."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Logo.png" />
        <link rel="canonical" href="https://sswanstudios.com" />
      </Helmet>

      {/* ── 1. HERO ──────────────────────────────────── */}
      <ParallaxHero videoSrc="/Swans.mp4" overlayOpacity={0.55} minHeight="100vh">
        <HeroLogo src={logoImg} alt="SwanStudios Logo" />
        <HeroHeadline>
          <TypewriterText text="Where Excellence Meets Precision" as="span" speed={50} />
        </HeroHeadline>
        <HeroSubtitle>
          NCEP-Certified Personal Training &middot; 25+ Years of Experience &middot; NASM-Guided Protocols
        </HeroSubtitle>
        <HeroButtons>
          <GlowButton
            text="Start My Fitness Journey"
            variant="primary"
            size="large"
            onClick={() => navigate('/shop')}
            animateOnRender
          />
          <GlowButton
            text="Book Free Consultation"
            variant="accent"
            size="large"
            onClick={() => setShowOrientation(true)}
            animateOnRender
          />
        </HeroButtons>
      </ParallaxHero>

      <SectionDivider />

      {/* ── 2. FEATURES ─────────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Our Services</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              Comprehensive fitness solutions built on NASM best practices and over
              25 years of hands-on coaching experience.
            </SectionSubtitle>
          </ScrollReveal>

          <FeaturesGrid>
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <FeatureCard>
                  <FeatureIcon>{f.icon}</FeatureIcon>
                  <FeatureTitle>{f.title}</FeatureTitle>
                  <FeatureDesc>{f.description}</FeatureDesc>
                </FeatureCard>
              </ScrollReveal>
            ))}
          </FeaturesGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 3. PROGRAMS ─────────────────────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Discover Your Path</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              Every transformation begins with understanding your body. Our NCEP-certified
              coaches use NASM-guided protocols to assess your movement patterns and craft
              a strategy that delivers lasting results.
            </SectionSubtitle>
          </ScrollReveal>

          <ProgramsGrid>
            {programs.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <ProgramCard>
                  {p.badge && <ProgramBadge>{p.badge}</ProgramBadge>}
                  <ProgramTitle>{p.title}</ProgramTitle>
                  <ProgramTagline>{p.tagline}</ProgramTagline>
                  <ProgramDesc>{p.description}</ProgramDesc>
                </ProgramCard>
              </ScrollReveal>
            ))}
          </ProgramsGrid>

          <div style={{ textAlign: 'center' }}>
            <GlowButton
              text="View All Packages"
              variant="accent"
              size="medium"
              onClick={() => navigate('/shop')}
            />
          </div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 4. GOLF PERFORMANCE ────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Enhance Your Golf Game</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              Unlock your full potential on the course with sport-specific training designed
              for golfers of every level. NASM-guided movement analysis meets golf performance.
            </SectionSubtitle>
          </ScrollReveal>

          <GolfGrid>
            <ScrollReveal direction="left">
              <GolfFeatureList>
                <GolfFeatureItem>
                  <Crosshair size={20} />
                  <span><strong>Rotational Power Training</strong> — Generate explosive hip and torso rotation for longer drives and more consistent ball striking.</span>
                </GolfFeatureItem>
                <GolfFeatureItem>
                  <Shield size={20} />
                  <span><strong>Core Stability & Balance</strong> — Build a rock-solid foundation that keeps your swing consistent from the first tee to the 18th green.</span>
                </GolfFeatureItem>
                <GolfFeatureItem>
                  <Activity size={20} />
                  <span><strong>Flexibility & Mobility</strong> — Increase your range of motion for a fuller backswing and smoother follow-through without strain.</span>
                </GolfFeatureItem>
                <GolfFeatureItem>
                  <Heart size={20} />
                  <span><strong>Injury Prevention</strong> — Corrective exercise protocols targeting common golf injuries: lower back, shoulders, elbows, and wrists.</span>
                </GolfFeatureItem>
                <GolfFeatureItem>
                  <Brain size={20} />
                  <span><strong>Movement Analysis</strong> — NASM-guided assessment of your movement patterns to identify limitations affecting your swing mechanics.</span>
                </GolfFeatureItem>
              </GolfFeatureList>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <GolfCard>
                <Crosshair size={40} />
                <h3>Golf Performance Program</h3>
                <p>
                  Whether you're a weekend warrior or a competitive amateur, our golf-specific
                  training addresses the physical demands of the game. Improve your drive distance,
                  reduce your handicap, and play pain-free.
                </p>
                <GlowButton
                  text="Improve Your Game"
                  variant="primary"
                  size="medium"
                  onClick={() => navigate('/shop')}
                />
              </GolfCard>
            </ScrollReveal>
          </GolfGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 5. ABOUT / BIO + AI APPROACH ─────────────── */}
      <Section $alt>
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
                  corrective exercise, and rehabilitation — principles he applies daily.
                </p>
                <p>
                  At SwanStudios, we blend <strong>elite personal training with AI as a powerful tool</strong> —
                  not a replacement for the coach. Sean and his team conduct deep research on each
                  client's goals, athletic background, and physical history to build truly optimized
                  programs. AI helps analyze data, refine programming, and accelerate injury
                  rehabilitation — all while keeping your information private through our secure
                  programming protocol. The result: the fastest, safest progress possible with a
                  real coach guiding every step.
                </p>
              </AboutText>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <AboutLogoWrapper
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <AboutLogo src={logoImg} alt="SwanStudios" />
              </AboutLogoWrapper>
            </ScrollReveal>
          </AboutGrid>

          {/* AI-Enhanced Approach Cards */}
          <ApproachGrid>
            <ScrollReveal delay={0}>
              <ApproachCard>
                <Brain size={28} />
                <h4>Deep Client Research</h4>
                <p>Your trainer studies your goals, movement history, and athletic background to build a program that's truly yours.</p>
              </ApproachCard>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <ApproachCard>
                <Zap size={28} />
                <h4>AI-Optimized Programming</h4>
                <p>AI helps analyze performance data and refine your training program for faster, safer results — guided by your coach.</p>
              </ApproachCard>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <ApproachCard>
                <Shield size={28} />
                <h4>Privacy & Rehabilitation</h4>
                <p>Your data stays private through our programming protocol. Injury rehab programs built with precision and care.</p>
              </ApproachCard>
            </ScrollReveal>
          </ApproachGrid>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <GlowButton
              text="Learn More"
              variant="ghost"
              size="medium"
              onClick={() => navigate('/about')}
            />
          </div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 6. TESTIMONIALS (no photos) ─────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>
              <TypewriterText text="Client Success Stories" as="span" speed={40} />
            </SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              Real results from real people. No shortcuts — just elite-level
              coaching that works.
            </SectionSubtitle>
          </ScrollReveal>

          <TestimonialsGrid>
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.15}>
                <TestimonialCard>
                  <StarRating>
                    {Array.from({ length: 5 }, (_, j) => (
                      <Star
                        key={j}
                        size={18}
                        fill={j < Math.floor(t.rating) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </StarRating>
                  <TestimonialQuote>
                    <TypewriterText
                      text={`"${t.quote}"`}
                      as="p"
                      speed={25}
                      cursor={false}
                    />
                  </TestimonialQuote>
                  <ClientName>— {t.name}, {t.descriptor}</ClientName>
                  <ResultBadge>{t.result}</ResultBadge>
                </TestimonialCard>
              </ScrollReveal>
            ))}
          </TestimonialsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 7. STATS (Animated Counters) ──────────── */}
      <Section $alt ref={statsRef}>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>By the Numbers</SectionTitle>
            <AccentLine />
          </ScrollReveal>

          <StatsGrid>
            {statsData.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 0.1}>
                <AnimatedStatCard
                  numericValue={s.numericValue}
                  suffix={s.suffix}
                  label={s.label}
                  icon={s.icon}
                  delay={s.delay}
                  isVisible={statsInView}
                  prefersReduced={prefersReducedMotion}
                />
              </ScrollReveal>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 8. BEYOND THE GYM (Social Platform) ─────── */}
      <BeyondSection>
        <BeyondVideoWrapper>
          <video autoPlay muted loop playsInline>
            <source src="/smoke.mp4" type="video/mp4" />
          </video>
        </BeyondVideoWrapper>
        <BeyondOverlay />
        <BeyondContent>
          <ScrollReveal>
            <SectionTitle>Beyond the Gym</SectionTitle>
            <AccentLine />
            <SectionSubtitle>
              SwanStudios isn't just a fitness platform — it's a creative social ecosystem.
              Imagine TikTok, Instagram, Twitch, YouTube, and Meetup combined into one community
              where fitness meets art, music, gaming, and real human connection.
            </SectionSubtitle>
          </ScrollReveal>

          <SocialGrid>
            {socialCategories.map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 0.1}>
                <SocialCard>
                  <FeatureIcon>{c.icon}</FeatureIcon>
                  <FeatureTitle>{c.title}</FeatureTitle>
                  <FeatureDesc>{c.description}</FeatureDesc>
                </SocialCard>
              </ScrollReveal>
            ))}
          </SocialGrid>

          <ScrollReveal delay={0.6}>
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <GlowButton
                text="Join the Community"
                variant="accent"
                size="large"
                onClick={() => navigate('/social')}
              />
            </div>
          </ScrollReveal>
        </BeyondContent>
      </BeyondSection>

      <SectionDivider />

      {/* ── 9. FINAL CTA ─────────────────────────────── */}
      <CTASection>
        <CTAInner>
          <ScrollReveal>
            <SectionTitle>
              <TypewriterText text="Ready to Transform?" as="span" speed={45} />
            </SectionTitle>
            <AccentLine />
            <CTAText>
              Your journey to a stronger, healthier, more confident you starts with
              a single step. Let our NCEP-certified coaches guide you with proven
              NASM protocols and 25+ years of expertise.
            </CTAText>
            <CTAButtons>
              <GlowButton
                text="Start Today"
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
          </ScrollReveal>
        </CTAInner>
      </CTASection>

      {/* ── ORIENTATION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showOrientation && (
          <OrientationForm onClose={() => setShowOrientation(false)} />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default HomePageV3;
