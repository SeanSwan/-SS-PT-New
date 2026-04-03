/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: HomePage V5 — Cinematic Rebuild (Complete)       ║
 * ║  PURPOSE: Full 9-section homepage with dark-first design     ║
 * ║  OWNER: Claude Opus 4.6 (CEO) | DESIGNED: 2026-04-03        ║
 * ║  SKILLS APPLIED: design-taste-frontend, high-end-visual-     ║
 * ║    design, frontend-design, full-output-enforcement          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [1] HERO: Video bg + asymmetric bento (content | logo)     │
 * │     Eyebrow, headline, subline, credentials, CTAs, QuickNav│
 * ├────────────────────────────────────────────────────────────┤
 * │ [2] FEATURES: "The Arsenal" — 8 bento cards asymmetric     │
 * ├────────────────────────────────────────────────────────────┤
 * │ [3] PROGRAMS: 3 program cards (30m, 60m, packages)         │
 * ├────────────────────────────────────────────────────────────┤
 * │ [4] GOLF: Split layout — features left, summary right      │
 * ├────────────────────────────────────────────────────────────┤
 * │ [5] ABOUT: Bio + logo + 3 approach cards                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ [6] TESTIMONIALS: 3 glass cards with stars + result badges │
 * ├────────────────────────────────────────────────────────────┤
 * │ [7] STATISTICS: 6 animated count-up stat counters          │
 * ├────────────────────────────────────────────────────────────┤
 * │ [8] SOCIAL: 8 social category cards + community CTA        │
 * ├────────────────────────────────────────────────────────────┤
 * │ [9] FINAL CTA: Glass container + two CTA buttons           │
 * └────────────────────────────────────────────────────────────┘
 *
 * KEY DIFFERENCES FROM V4:
 * - Asymmetric bento hero (not centered text block)
 * - Spring physics on interactions (not linear)
 * - Dark-first: #0A0A0F base, luminous accents
 * - No generic 3-col equal cards — asymmetric bento grids
 * - GPU-composited animations ONLY (transform + opacity)
 * - Typed fonts: Plus Jakarta Sans, Cormorant Garamond, Fira Code, Sora
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, ChevronDown, Crosshair,
  Shield, Brain, Zap, Sparkles, Award, TrendingUp,
  Check, ArrowRight, Play, MapPin, Clock, Phone,
  Camera, LayoutDashboard, FileSignature, UserCircle, Share2,
  Flame, Mic2, Mic, Paintbrush, Gamepad2, Laugh,
} from 'lucide-react';
import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import logoImg from '../../../assets/Logo.png';

// ═══════════════════════════════════════════════════════════
// CINEMATIC MOTION SYSTEM — Spring Physics
// GPU-composited only (transform + opacity). No layout thrash.
// ═══════════════════════════════════════════════════════════

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20, mass: 0.8 };
const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

const heroReveal = {
  hidden: { opacity: 0, y: 60, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ...SPRING, delay: 0.15 * i },
  }),
};

const sectionReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.9, ease: CINEMATIC_EASE },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: CINEMATIC_EASE },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.8, ease: CINEMATIC_EASE },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.8, ease: CINEMATIC_EASE },
  },
};

const reducedReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ═══════════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK — requestAnimationFrame count-up
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// NOISE OVERLAY — Adds texture, prevents flat AI look
// ═══════════════════════════════════════════════════════════

const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px 128px;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

// ═══════════════════════════════════════════════════════════
// PAGE SHELL
// ═══════════════════════════════════════════════════════════

const PageContainer = styled.div`
  min-height: 100vh;
  background: #0A0A0F;
  color: #E0ECF4;
  overflow-x: hidden;
  position: relative;
`;

// ═══════════════════════════════════════════════════════════
// SECTION DIVIDER — gradient line between sections
// ═══════════════════════════════════════════════════════════

const SectionDivider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(139, 92, 246, 0.25) 30%,
    rgba(96, 192, 240, 0.3) 50%,
    rgba(139, 92, 246, 0.25) 70%,
    transparent 100%
  );
`;

// ═══════════════════════════════════════════════════════════
// REUSABLE SECTION + HEADER COMPONENTS
// ═══════════════════════════════════════════════════════════

const Section = styled.section`
  position: relative;
  padding: clamp(80px, 10vw, 120px) clamp(20px, 5vw, 80px);
  overflow: hidden;
`;

const SectionInner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const SectionHeader = styled(motion.div)<{ $center?: boolean }>`
  margin-bottom: 56px;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};

  @media (max-width: 768px) {
    margin-bottom: 36px;
  }
`;

const SectionEyebrow = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #8B5CF6;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #E0ECF4;
  margin: 0 0 16px;
  line-height: 1.1;
`;

const SectionSubtitle = styled.p<{ $center?: boolean }>`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(16px, 1.8vw, 20px);
  color: rgba(224, 236, 244, 0.5);
  max-width: ${({ $center }) => ($center ? '640px' : '560px')};
  margin: ${({ $center }) => ($center ? '0 auto' : '0')};
  line-height: 1.5;
`;

// ═══════════════════════════════════════════════════════════
// GLASS CARD — Reusable glassmorphism card
// ═══════════════════════════════════════════════════════════

const GlassCard = styled(motion.div)`
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(20, 20, 25, 0.7);
  border: 1px solid rgba(96, 192, 240, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(20, 20, 25, 0.95);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

// ═══════════════════════════════════════════════════════════
// SECTION 1: HERO — Asymmetric Bento Layout
// ═══════════════════════════════════════════════════════════

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 clamp(20px, 5vw, 80px);
`;

const HeroBackground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(10, 10, 15, 0.3) 0%,
      rgba(10, 10, 15, 0.6) 50%,
      rgba(10, 10, 15, 0.95) 100%
    );
    z-index: 1;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.4;
  }
`;

const HeroGrid = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: clamp(32px, 5vw, 80px);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 120px 0 80px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 100px 0 60px;
  }
`;

const HeroContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
`;

const HeroEyebrow = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 100px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: rgba(96, 192, 240, 0.06);
  color: #60C0F0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  width: fit-content;
`;

const HeroHeadline = styled(motion.h1)`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(36px, 5.5vw, 72px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: #E0ECF4;
  margin: 0;

  span.accent {
    background: linear-gradient(135deg, #60C0F0 0%, #8B5CF6 50%, #C6A84B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const HeroSubline = styled(motion.p)`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(18px, 2vw, 24px);
  line-height: 1.5;
  color: rgba(224, 236, 244, 0.6);
  max-width: 520px;
  margin: 0;
`;

const HeroCredentials = styled(motion.div)`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const CredentialBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.08);
  border: 1px solid rgba(198, 168, 75, 0.15);
  color: #C6A84B;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
`;

const HeroCTAs = styled(motion.div)`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const HeroVisual = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const LogoFloat = styled(motion.div)`
  width: clamp(280px, 25vw, 400px);
  height: clamp(280px, 25vw, 400px);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 75%;
    height: auto;
    filter: drop-shadow(0 0 60px rgba(96, 192, 240, 0.15));
  }

  &::before {
    content: '';
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    border: 1px solid rgba(96, 192, 240, 0.08);
    animation: logoOrbitSpin 30s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -50px;
    border-radius: 50%;
    border: 1px dashed rgba(139, 92, 246, 0.06);
    animation: logoOrbitSpin 45s linear infinite reverse;
  }

  @keyframes logoOrbitSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before, &::after { animation: none; }
  }
`;

// ── Quick-Nav Capsule Buttons ──

const QuickNavRow = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;

  @media (min-width: 768px) {
    gap: 10px;
  }
`;

type CapsuleVariant = 'default' | 'gilded' | 'wingPurple' | 'arcticCyan' | 'royalDepth';

const capsuleColors: Record<CapsuleVariant, { border: string; bg: string; color: string; hoverBorder: string; hoverBg: string; glow: string; focus: string }> = {
  default:    { border: 'rgba(96,192,240,0.2)',  bg: 'rgba(10,10,15,0.6)',    color: '#E0ECF4', hoverBorder: 'rgba(139,92,246,0.5)',  hoverBg: 'rgba(20,20,30,0.8)',   glow: 'rgba(139,92,246,0.2)',  focus: '#8B5CF6' },
  gilded:     { border: 'rgba(198,168,75,0.3)',  bg: 'rgba(198,168,75,0.08)', color: '#C6A84B', hoverBorder: 'rgba(198,168,75,0.6)',  hoverBg: 'rgba(198,168,75,0.15)', glow: 'rgba(198,168,75,0.25)', focus: '#C6A84B' },
  wingPurple: { border: 'rgba(139,92,246,0.3)',  bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6', hoverBorder: 'rgba(139,92,246,0.6)',  hoverBg: 'rgba(139,92,246,0.15)', glow: 'rgba(139,92,246,0.25)', focus: '#8B5CF6' },
  arcticCyan: { border: 'rgba(80,160,240,0.3)',  bg: 'rgba(80,160,240,0.08)', color: '#50A0F0', hoverBorder: 'rgba(80,160,240,0.6)',  hoverBg: 'rgba(80,160,240,0.15)', glow: 'rgba(80,160,240,0.25)', focus: '#50A0F0' },
  royalDepth: { border: 'rgba(0,48,128,0.5)',    bg: 'rgba(0,48,128,0.2)',    color: '#60C0F0', hoverBorder: 'rgba(0,48,128,0.8)',   hoverBg: 'rgba(0,48,128,0.35)',  glow: 'rgba(96,192,240,0.2)',  focus: '#60C0F0' },
};

const CapsuleButton = styled(motion.button)<{ $variant?: CapsuleVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid ${p => capsuleColors[p.$variant || 'default'].border};
  background: ${p => capsuleColors[p.$variant || 'default'].bg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: ${p => capsuleColors[p.$variant || 'default'].color};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;

  svg { flex-shrink: 0; opacity: 0.8; }

  &:hover {
    border-color: ${p => capsuleColors[p.$variant || 'default'].hoverBorder};
    background: ${p => capsuleColors[p.$variant || 'default'].hoverBg};
    box-shadow: 0 0 16px ${p => capsuleColors[p.$variant || 'default'].glow};
  }

  &:active { transform: scale(0.97); }

  &:focus-visible {
    outline: 2px solid ${p => capsuleColors[p.$variant || 'default'].focus};
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    padding: 6px 12px;
    font-size: 0.7rem;
    min-height: 40px;
    gap: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(224, 236, 244, 0.3);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  cursor: pointer;
`;

const bounceDown = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
`;

const ChevronBounce = styled.div`
  animation: ${bounceDown} 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ═══════════════════════════════════════════════════════════
// SECTION 2: FEATURES — Asymmetric Bento Grid
// ═══════════════════════════════════════════════════════════

const BentoGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled(GlassCard)<{ $span?: string; $accent?: string }>`
  gap: 14px;
  cursor: default;
  ${({ $span }) => $span && css`grid-column: ${$span};`}

  &:hover {
    border-color: ${({ $accent }) => $accent || 'rgba(96, 192, 240, 0.2)'};
    transform: translateY(-4px);
  }

  @media (max-width: 1024px) {
    ${({ $span }) => $span && css`grid-column: auto;`}
  }
`;

const CardIcon = styled.div<{ $bg?: string; $color?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg || 'rgba(96, 192, 240, 0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || '#60C0F0'};
  flex-shrink: 0;
`;

const CardTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const CardDesc = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
`;

// ═══════════════════════════════════════════════════════════
// SECTION 3: PROGRAMS — Ascension Protocols
// ═══════════════════════════════════════════════════════════

const ProgramsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    align-items: stretch;
  }
`;

const ProgramCard = styled(GlassCard)<{ $featured?: boolean }>`
  align-items: center;
  text-align: center;
  gap: 0;
  padding: 36px 28px;
  position: relative;

  ${({ $featured }) => $featured && css`
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.06);

    @media (min-width: 768px) {
      transform: scale(1.04);
      z-index: 1;
    }
  `}

  &:hover {
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-6px);
    ${({ $featured }) => $featured && css`
      @media (min-width: 768px) {
        transform: scale(1.04) translateY(-6px);
      }
    `}
  }
`;

const ProgramBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8B5CF6;
  font-weight: 700;
  margin-bottom: 12px;
`;

const ProgramName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #E0ECF4;
  margin: 0 0 6px;
`;

const ProgramMeta = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: #60C0F0;
  font-weight: 600;
  margin: 0 0 20px;
`;

const ProgramFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  text-align: left;
  width: 100%;
`;

const ProgramFeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.6);
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);

  &:last-child { border-bottom: none; }

  svg {
    color: #8B5CF6;
    flex-shrink: 0;
  }
`;

// ═══════════════════════════════════════════════════════════
// SECTION 4: GOLF — Split Layout
// ═══════════════════════════════════════════════════════════

const GolfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
  }
`;

const GolfFeatureList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GolfFeatureItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.6;

  svg {
    color: #C6A84B;
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    color: #E0ECF4;
  }
`;

const GolfSummaryCard = styled(GlassCard)`
  align-items: center;
  text-align: center;
  padding: 48px 32px;
  border-color: rgba(198, 168, 75, 0.12);

  &:hover {
    border-color: rgba(198, 168, 75, 0.25);
    transform: translateY(-4px);
  }
`;

const GolfSummaryIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(198, 168, 75, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #C6A84B;
  margin-bottom: 20px;
`;

const GolfSummaryTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #E0ECF4;
  margin: 0 0 12px;
`;

const GolfSummaryDesc = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: rgba(224, 236, 244, 0.5);
  line-height: 1.6;
  margin: 0 0 28px;
`;

// ═══════════════════════════════════════════════════════════
// SECTION 5: ABOUT — Bio + Logo + Approach Cards
// ═══════════════════════════════════════════════════════════

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    grid-template-columns: 1.4fr 0.6fr;
    align-items: center;
  }
`;

const AboutText = styled(motion.div)`
  p {
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    color: rgba(224, 236, 244, 0.6);
    line-height: 1.7;
    margin: 0 0 16px;

    &:last-child { margin-bottom: 0; }

    strong {
      color: #E0ECF4;
    }
  }
`;

const AboutLogoWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 1024px) {
    order: -1;
  }
`;

const AboutLogo = styled.img`
  width: clamp(160px, 20vw, 260px);
  height: auto;
  filter: drop-shadow(0 0 40px rgba(96, 192, 240, 0.12));
`;

const ApproachGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin: 48px auto 0;
  max-width: 1200px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ApproachCard = styled(GlassCard)`
  align-items: center;
  text-align: center;
  gap: 12px;

  &:hover {
    border-color: rgba(139, 92, 246, 0.2);
    transform: translateY(-4px);
  }
`;

const ApproachIconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(139, 92, 246, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
`;

const ApproachTitle = styled.h4`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const ApproachDesc = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.5);
  line-height: 1.6;
  margin: 0;
`;

// ═══════════════════════════════════════════════════════════
// SECTION 6: TESTIMONIALS — Glass Cards with Stars
// ═══════════════════════════════════════════════════════════

const TestimonialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const TestimonialCard = styled(GlassCard)`
  padding: 36px 28px;
  gap: 0;

  &:hover {
    border-color: rgba(198, 168, 75, 0.2);
    transform: translateY(-4px);
  }
`;

const StarsRow = styled.div`
  display: flex;
  gap: 4px;
  color: #C6A84B;
  margin-bottom: 20px;
`;

const Quote = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(224, 236, 244, 0.75);
  margin: 0 0 24px;
  flex-grow: 1;
`;

const TestimonialAuthor = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
`;

const TestimonialMeta = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 4px;
`;

const ResultBadge = styled.span`
  display: inline-block;
  margin-top: 14px;
  padding: 6px 16px;
  border-radius: 100px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #60C0F0;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
`;

// ═══════════════════════════════════════════════════════════
// SECTION 7: STATISTICS — Animated Counters
// ═══════════════════════════════════════════════════════════

const StatsSection = styled(Section)`
  border-top: 1px solid rgba(96, 192, 240, 0.04);
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px 16px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 430px) {
    gap: 40px 24px;
  }

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

const StatIcon = styled.div`
  color: #8B5CF6;
  margin-bottom: 8px;
  opacity: 0.5;
`;

const StatNumber = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  color: #60C0F0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(224, 236, 244, 0.35);
  margin-top: 8px;
`;

// ═══════════════════════════════════════════════════════════
// SECTION 8: SOCIAL — Beyond the Gym
// ═══════════════════════════════════════════════════════════

const SocialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const SocialCard = styled(GlassCard)`
  gap: 12px;

  &:hover {
    border-color: rgba(139, 92, 246, 0.2);
    transform: translateY(-4px);
  }
`;

const SocialIconWrap = styled.div<{ $bg?: string; $color?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg || 'rgba(139, 92, 246, 0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || '#8B5CF6'};
`;

// ═══════════════════════════════════════════════════════════
// SECTION 9: FINAL CTA
// ═══════════════════════════════════════════════════════════

const CTASection = styled(Section)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CTAContainer = styled(motion.div)`
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 32px;
  padding: clamp(48px, 8vw, 80px) clamp(24px, 4vw, 48px);
  max-width: 900px;
  width: 100%;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(139, 92, 246, 0.04);

  @supports not (backdrop-filter: blur(24px)) {
    background: rgba(20, 20, 25, 0.97);
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 500px;
    height: 500px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const CTATitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #E0ECF4;
  margin: 0 0 16px;
  position: relative;
`;

const CTASubtitle = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(16px, 2vw, 20px);
  color: rgba(224, 236, 244, 0.5);
  max-width: 560px;
  margin: 0 auto 32px;
  line-height: 1.5;
  position: relative;
`;

const CTAButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  align-items: center;
  position: relative;

  @media (min-width: 600px) {
    flex-direction: row;
  }
`;

// ═══════════════════════════════════════════════════════════
// DATA ARRAYS
// ═══════════════════════════════════════════════════════════

const FEATURES_DATA = [
  {
    icon: <Dumbbell size={22} />,
    title: 'Elite Personal Training',
    desc: 'Personalized coaching from NCEP-certified experts with 25+ years experience. Science-based programming tailored to your goals.',
    accent: 'rgba(96, 192, 240, 0.2)',
    iconBg: 'rgba(96, 192, 240, 0.1)',
    iconColor: '#60C0F0',
    span: 'span 2',
  },
  {
    icon: <Activity size={22} />,
    title: 'Performance Assessment',
    desc: 'Comprehensive evaluation using NASM OPT model to analyze movement patterns and build your optimal program.',
    accent: 'rgba(139, 92, 246, 0.2)',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    iconColor: '#8B5CF6',
  },
  {
    icon: <Apple size={22} />,
    title: 'Nutrition Coaching',
    desc: 'Evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.',
    accent: 'rgba(198, 168, 75, 0.2)',
    iconBg: 'rgba(198, 168, 75, 0.1)',
    iconColor: '#C6A84B',
  },
  {
    icon: <Heart size={22} />,
    title: 'Recovery & Mobility',
    desc: 'Corrective exercise strategies, mobility training, and myofascial release guided by NASM CES principles.',
    accent: 'rgba(96, 192, 240, 0.2)',
    iconBg: 'rgba(96, 192, 240, 0.1)',
    iconColor: '#60C0F0',
  },
  {
    icon: <Monitor size={22} />,
    title: 'Online Coaching',
    desc: 'Expert guidance anywhere with customized programs and regular check-ins through our AI-enhanced platform.',
    accent: 'rgba(139, 92, 246, 0.2)',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    iconColor: '#8B5CF6',
    span: 'span 2',
  },
  {
    icon: <Users size={22} />,
    title: 'Group Performance',
    desc: 'Exclusive small-group sessions combining group energy with personalized attention for maximum results.',
    accent: 'rgba(96, 192, 240, 0.2)',
    iconBg: 'rgba(96, 192, 240, 0.1)',
    iconColor: '#60C0F0',
  },
  {
    icon: <Target size={22} />,
    title: 'Sports-Specific Training',
    desc: 'Specialized programs for golfers, athletes, and weekend warriors. Rotational power and sport-specific conditioning.',
    accent: 'rgba(198, 168, 75, 0.2)',
    iconBg: 'rgba(198, 168, 75, 0.1)',
    iconColor: '#C6A84B',
  },
  {
    icon: <Building2 size={22} />,
    title: 'Corporate Wellness',
    desc: 'Comprehensive corporate wellness programs including on-site sessions, workshops, and team challenges.',
    accent: 'rgba(139, 92, 246, 0.2)',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    iconColor: '#8B5CF6',
  },
];

const PROGRAMS_DATA = [
  {
    name: 'Express Precision',
    meta: '30-Minute Sessions',
    badge: null as string | null,
    featured: false,
    features: [
      'Targeted time-optimized training',
      'Customized workout plans',
      'Progress tracking',
      'Flexible scheduling',
    ],
  },
  {
    name: 'Signature Performance',
    meta: '60-Minute Sessions',
    badge: 'Most Popular',
    featured: true,
    features: [
      'Full biomechanical coaching',
      'NASM OHSA movement analysis',
      'Nutrition guidance included',
      'Priority scheduling',
      'Monthly progress reports',
    ],
  },
  {
    name: 'Transformation Programs',
    meta: 'Multi-Session Packages',
    badge: 'Best Value',
    featured: false,
    features: [
      'Comprehensive NASM assessment',
      'Periodized programming',
      'Priority scheduling',
      'Weekly check-ins',
      'Full nutrition plan',
    ],
  },
];

const GOLF_FEATURES_DATA = [
  {
    icon: Crosshair,
    title: 'Rotational Power Training',
    desc: 'Generate explosive hip and torso rotation for longer drives and more consistent ball striking.',
  },
  {
    icon: Shield,
    title: 'Core Stability & Balance',
    desc: 'Build a rock-solid foundation that keeps your swing consistent from the first tee to the 18th green.',
  },
  {
    icon: Activity,
    title: 'Flexibility & Mobility',
    desc: 'Increase your range of motion for a fuller backswing and smoother follow-through without strain.',
  },
  {
    icon: Heart,
    title: 'Injury Prevention',
    desc: 'Corrective exercise protocols targeting common golf injuries: lower back, shoulders, elbows, and wrists.',
  },
  {
    icon: Brain,
    title: 'Movement Analysis',
    desc: 'NASM-guided assessment of your movement patterns to identify limitations affecting your swing mechanics.',
  },
];

const TESTIMONIALS_DATA = [
  {
    quote: 'Thanks to SwanStudios personal training, I achieved an incredible transformation. The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.',
    author: 'Sarah J.',
    descriptor: 'Corporate Executive',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    quote: 'Sean Swan completely transformed my golf game. Through targeted core stability work, rotational power training, and flexibility protocols, I added serious distance off the tee.',
    author: 'Robert T.',
    descriptor: 'Avid Golfer',
    result: 'Added 35 yards to drive',
  },
  {
    quote: 'Training with Sean Swan got me in the best shape of my life. My department fitness test running time improved dramatically, and I feel stronger, faster, and more capable on the job.',
    author: 'Officer Martinez',
    descriptor: 'Law Enforcement',
    result: 'Run improved by 2:30',
  },
];

const STATS_DATA = [
  { target: 25, suffix: '+', label: 'Years Experience', icon: Award, display: '' },
  { target: 500, suffix: '+', label: 'Clients Transformed', icon: Users, display: '' },
  { target: 10000, suffix: '+', label: 'Sessions Delivered', icon: TrendingUp, display: '10k' },
  { target: 312, suffix: '', label: 'Swimmers Taught', icon: Activity, display: '' },
  { target: 12450, suffix: '+', label: 'Lbs Lost Together', icon: Flame, display: '12.4k' },
  { target: 98, suffix: '%', label: 'Client Satisfaction', icon: Star, display: '' },
];

const SOCIAL_DATA = [
  { title: 'Dance & Movement', desc: 'Post your dance videos, choreography, and freestyle sessions. From hip-hop to contemporary.', icon: Sparkles, bg: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6' },
  { title: 'Music Production', desc: 'Making songs, playing instruments, producing beats, and sharing your creative process.', icon: Mic2, bg: 'rgba(96, 192, 240, 0.08)', color: '#60C0F0' },
  { title: 'Singing', desc: 'Share vocal performances, covers, instrumentals, and original music. Your stage, your voice.', icon: Mic, bg: 'rgba(198, 168, 75, 0.08)', color: '#C6A84B' },
  { title: 'Art & Expression', desc: 'Showcase artwork, digital art, photography, and creative projects. Inspire and get inspired.', icon: Paintbrush, bg: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6' },
  { title: 'Gaming', desc: 'Share your gaming builds, favorite consoles, portable setups, and streams. Gamers get fit too.', icon: Gamepad2, bg: 'rgba(96, 192, 240, 0.08)', color: '#60C0F0' },
  { title: 'Comedy', desc: 'Standup, skits, memes, and funny content. Make the community laugh while you flex.', icon: Laugh, bg: 'rgba(198, 168, 75, 0.08)', color: '#C6A84B' },
  { title: 'Fitness Challenges', desc: 'Community workout challenges, transformation posts, and accountability groups.', icon: Flame, bg: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6' },
  { title: 'Community Meetups', desc: 'Local events, group activities, and real-world connections. The digital community, IRL.', icon: MapPin, bg: 'rgba(96, 192, 240, 0.08)', color: '#60C0F0' },
];

// ═══════════════════════════════════════════════════════════
// STAT COUNTER SUB-COMPONENT (memoized)
// ═══════════════════════════════════════════════════════════

const StatCounter: React.FC<{
  target: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  display: string;
  prefersReduced: boolean;
}> = React.memo(({ target, suffix, label, icon: Icon, display, prefersReduced }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCountUp(target, isInView, prefersReduced);

  const displayValue = display
    ? (isInView ? display : '0')
    : count.toLocaleString();

  return (
    <StatItem ref={ref} variants={cardReveal}>
      <StatIcon><Icon size={20} /></StatIcon>
      <StatNumber>{displayValue}{suffix}</StatNumber>
      <StatLabel>{label}</StatLabel>
    </StatItem>
  );
});

StatCounter.displayName = 'StatCounter';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT — HomePageV5
// ═══════════════════════════════════════════════════════════

const HomePageV5: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [showOrientation, setShowOrientation] = useState(false);
  const [showScroll, setShowScroll] = useState(true);

  // Scroll listener for hiding scroll indicator
  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY <= 200);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Variant selection respecting reduced motion
  const reveal = prefersReduced ? reducedReveal : sectionReveal;
  const leftSlide = prefersReduced ? reducedReveal : slideInLeft;
  const rightSlide = prefersReduced ? reducedReveal : slideInRight;
  const card = prefersReduced ? reducedReveal : cardReveal;
  const stagger = prefersReduced
    ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
    : staggerContainer;

  // Section refs for inView detection
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: '-50px' });

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageContainer>
      <Helmet>
        <title>SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision</title>
        <meta name="description" content="NASM-certified personal training powered by AI. 25+ years experience, 840+ exercise library, real-time progress tracking, and gamified fitness." />
      </Helmet>

      <NoiseOverlay />

      {/* ════════════════════════════════════════════════
          SECTION 1: HERO — Asymmetric Bento Layout
          ════════════════════════════════════════════════ */}
      <HeroSection>
        <HeroBackground>
          <video
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-hidden="true"
            poster="/images/parallax/hero-swan-bg.png"
            preload="metadata"
          >
            <source src="/Swans.mp4" type="video/mp4" />
          </video>
        </HeroBackground>

        <HeroGrid>
          <HeroContent>
            <HeroEyebrow
              custom={0}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <Zap size={12} /> Elite Performance Training
            </HeroEyebrow>

            <HeroHeadline
              custom={1}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              Where Human
              <br />
              Excellence Meets
              <br />
              <span className="accent">AI Precision</span>
            </HeroHeadline>

            <HeroSubline
              custom={2}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              Science-backed training programs with real-time AI coaching,
              NASM-protocol periodization, and a fitness social platform
              that makes every rep count.
            </HeroSubline>

            <HeroCredentials
              custom={3}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <CredentialBadge><Award size={14} /> NASM Certified</CredentialBadge>
              <CredentialBadge><Award size={14} /> NCEP Certified</CredentialBadge>
              <CredentialBadge><TrendingUp size={14} /> 25+ Years</CredentialBadge>
            </HeroCredentials>

            <HeroCTAs
              custom={4}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <GlowButton
                variant="cosmic"
                size="large"
                onClick={() => navigate('/store')}
              >
                Start Training <ArrowRight size={16} />
              </GlowButton>
              <GlowButton
                variant="ghost"
                size="large"
                onClick={() => setShowOrientation(true)}
              >
                <Phone size={16} /> Free Consultation
              </GlowButton>
            </HeroCTAs>

            {/* Quick-Nav Capsule Buttons */}
            <QuickNavRow
              custom={5}
              variants={prefersReduced ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <CapsuleButton
                $variant="royalDepth"
                onClick={() => navigate('/user-dashboard')}
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <img src="/Logo.png" alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                SwanStudios Social
              </CapsuleButton>
              <CapsuleButton
                $variant="arcticCyan"
                onClick={() => navigate('/dashboard/client/overview')}
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <UserCircle size={14} />
                Client Dashboard
              </CapsuleButton>
              <CapsuleButton
                $variant="gilded"
                onClick={() => navigate('/gallery')}
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <Camera size={14} />
                Photography
              </CapsuleButton>
              <CapsuleButton
                onClick={() => navigate('/waiver')}
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <FileSignature size={14} />
                Waiver
              </CapsuleButton>
              <CapsuleButton
                $variant="wingPurple"
                onClick={() => navigate('/dashboard/trainer/overview')}
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <LayoutDashboard size={14} />
                Trainer Dashboard
              </CapsuleButton>
            </QuickNavRow>
          </HeroContent>

          <HeroVisual
            custom={2}
            variants={prefersReduced ? undefined : heroReveal}
            initial="hidden"
            animate="visible"
          >
            <LogoFloat
              animate={prefersReduced ? {} : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={logoImg} alt="SwanStudios Logo" loading="eager" />
            </LogoFloat>
          </HeroVisual>
        </HeroGrid>

        <AnimatePresence>
          {showScroll && (
            <ScrollIndicator
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              onClick={scrollToFeatures}
              aria-label="Scroll down to explore"
            >
              <span>EXPLORE</span>
              <ChevronBounce><ChevronDown size={18} /></ChevronBounce>
            </ScrollIndicator>
          )}
        </AnimatePresence>
      </HeroSection>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 2: FEATURES — "The Arsenal"
          ════════════════════════════════════════════════ */}
      <Section id="features">
        <SectionInner>
          <SectionHeader
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow>The Arsenal</SectionEyebrow>
            <SectionTitle>Everything You Need.<br />Nothing You Don't.</SectionTitle>
            <SectionSubtitle>
              Eight pillars of elite performance, engineered for your transformation.
            </SectionSubtitle>
          </SectionHeader>

          <BentoGrid
            ref={featuresRef}
            variants={stagger}
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
          >
            {FEATURES_DATA.map((f) => (
              <BentoCard
                key={f.title}
                $span={f.span}
                $accent={f.accent}
                variants={card}
              >
                <CardIcon $bg={f.iconBg} $color={f.iconColor}>{f.icon}</CardIcon>
                <CardTitle>{f.title}</CardTitle>
                <CardDesc>{f.desc}</CardDesc>
              </BentoCard>
            ))}
          </BentoGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 3: PROGRAMS — "Ascension Protocols"
          ════════════════════════════════════════════════ */}
      <Section>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>Ascension Protocols</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>Your Training Programs</SectionTitle>
            <SectionSubtitle $center>
              Choose your protocol. Every tier includes AI-driven programming and NASM-certified coaching.
            </SectionSubtitle>
          </SectionHeader>

          <ProgramsGrid
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {PROGRAMS_DATA.map((prog) => (
              <ProgramCard
                key={prog.name}
                $featured={prog.featured}
                variants={card}
              >
                {prog.badge && <ProgramBadge>{prog.badge}</ProgramBadge>}
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
                  variant={prog.featured ? 'primary' : 'ghost'}
                  size="medium"
                  onClick={() => navigate('/store')}
                />
              </ProgramCard>
            ))}
          </ProgramsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 4: GOLF — "Master The Fairway"
          ════════════════════════════════════════════════ */}
      <Section>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>The Fairway</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>Master The Fairway</SectionTitle>
            <SectionSubtitle $center>
              Unlock your full potential on the course with sport-specific training designed for golfers of every level.
            </SectionSubtitle>
          </SectionHeader>

          <GolfGrid>
            <GolfFeatureList
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {GOLF_FEATURES_DATA.map((gf) => (
                <GolfFeatureItem key={gf.title} variants={leftSlide}>
                  <gf.icon size={22} />
                  <span>
                    <strong>{gf.title}</strong> — {gf.desc}
                  </span>
                </GolfFeatureItem>
              ))}
            </GolfFeatureList>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={rightSlide}
            >
              <GolfSummaryCard>
                <GolfSummaryIcon>
                  <Crosshair size={32} />
                </GolfSummaryIcon>
                <GolfSummaryTitle>Golf Performance Program</GolfSummaryTitle>
                <GolfSummaryDesc>
                  Whether you're a weekend warrior or a competitive amateur, our golf-specific
                  training addresses the physical demands of the game. Improve your drive distance,
                  reduce your handicap, and play pain-free.
                </GolfSummaryDesc>
                <GlowButton
                  text="Improve Your Game"
                  variant="gilded"
                  size="medium"
                  onClick={() => navigate('/store')}
                  aria-label="Explore golf performance training"
                />
              </GolfSummaryCard>
            </motion.div>
          </GolfGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 5: ABOUT — "About Sean Swan"
          ════════════════════════════════════════════════ */}
      <Section>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>The Architect</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>About Sean Swan</SectionTitle>
            <SectionSubtitle $center>
              A legacy of transforming lives through science-backed fitness and AI-enhanced coaching.
            </SectionSubtitle>
          </SectionHeader>

          <AboutGrid>
            <AboutText
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
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
              viewport={{ once: true, margin: '-50px' }}
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
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <ApproachCard variants={card}>
              <ApproachIconWrap><Brain size={24} /></ApproachIconWrap>
              <ApproachTitle>Deep Client Research</ApproachTitle>
              <ApproachDesc>
                Your trainer studies your goals, movement history, and athletic background to build a program that's truly yours.
              </ApproachDesc>
            </ApproachCard>
            <ApproachCard variants={card}>
              <ApproachIconWrap><Zap size={24} /></ApproachIconWrap>
              <ApproachTitle>AI-Optimized Programming</ApproachTitle>
              <ApproachDesc>
                AI helps analyze performance data and refine your training program for faster, safer results — guided by your coach.
              </ApproachDesc>
            </ApproachCard>
            <ApproachCard variants={card}>
              <ApproachIconWrap><Shield size={24} /></ApproachIconWrap>
              <ApproachTitle>Privacy & Rehabilitation</ApproachTitle>
              <ApproachDesc>
                Your data stays private through our programming protocol. Injury rehab programs built with precision and care.
              </ApproachDesc>
            </ApproachCard>
          </ApproachGrid>

          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginTop: 32 }}
          >
            <GlowButton
              text="Learn More"
              variant="ghost"
              size="medium"
              onClick={() => navigate('/about')}
              aria-label="Learn more about Sean Swan"
            />
          </motion.div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 6: TESTIMONIALS
          ════════════════════════════════════════════════ */}
      <Section>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>The Echoes</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>Client Success Stories</SectionTitle>
            <SectionSubtitle $center>
              Real results from real people. No shortcuts — just elite-level coaching that works.
            </SectionSubtitle>
          </SectionHeader>

          <TestimonialGrid
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {TESTIMONIALS_DATA.map((t) => (
              <TestimonialCard key={t.author} variants={card}>
                <StarsRow>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
                  ))}
                </StarsRow>
                <Quote>&ldquo;{t.quote}&rdquo;</Quote>
                <TestimonialAuthor>{t.author}</TestimonialAuthor>
                <TestimonialMeta>{t.descriptor}</TestimonialMeta>
                <ResultBadge>{t.result}</ResultBadge>
              </TestimonialCard>
            ))}
          </TestimonialGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 7: STATISTICS — "By the Numbers"
          ════════════════════════════════════════════════ */}
      <StatsSection>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>The Proof</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>By the Numbers</SectionTitle>
          </SectionHeader>

          <StatsGrid
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {STATS_DATA.map((stat) => (
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
        </SectionInner>
      </StatsSection>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 8: SOCIAL — "Beyond the Gym"
          ════════════════════════════════════════════════ */}
      <Section>
        <SectionInner>
          <SectionHeader
            $center
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <SectionEyebrow style={{ textAlign: 'center' }}>Beyond the Gym</SectionEyebrow>
            <SectionTitle style={{ textAlign: 'center' }}>More Than Fitness</SectionTitle>
            <SectionSubtitle $center>
              SwanStudios isn't just a fitness platform — it's a creative social ecosystem.
              Imagine TikTok, Instagram, Twitch, YouTube, and Meetup combined into one community
              where fitness meets art, music, singing, gaming, comedy, and real human connection.
            </SectionSubtitle>
          </SectionHeader>

          <SocialGrid
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {SOCIAL_DATA.map((cat) => (
              <SocialCard key={cat.title} variants={card}>
                <SocialIconWrap $bg={cat.bg} $color={cat.color}>
                  <cat.icon size={22} />
                </SocialIconWrap>
                <CardTitle>{cat.title}</CardTitle>
                <CardDesc>{cat.desc}</CardDesc>
              </SocialCard>
            ))}
          </SocialGrid>

          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginTop: 40 }}
          >
            <GlowButton
              variant="cosmic"
              size="large"
              onClick={() => navigate('/user-dashboard')}
            >
              Join the Community <ArrowRight size={16} />
            </GlowButton>
          </motion.div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════
          SECTION 9: FINAL CTA — "Ready to Transform?"
          ════════════════════════════════════════════════ */}
      <CTASection>
        <CTAContainer
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <CTATitle>Ready to Transform?</CTATitle>
          <CTASubtitle>
            Join the platform where science, technology, and human expertise converge
            to create extraordinary results.
          </CTASubtitle>
          <CTAButtons>
            <GlowButton
              variant="cosmic"
              size="large"
              onClick={() => navigate('/store')}
            >
              Start Today <ArrowRight size={16} />
            </GlowButton>
            <GlowButton
              variant="ghost"
              size="large"
              onClick={() => setShowOrientation(true)}
            >
              <Phone size={16} /> Contact Us
            </GlowButton>
          </CTAButtons>
        </CTAContainer>
      </CTASection>

      {/* ── Orientation Form Modal ── */}
      <AnimatePresence>
        {showOrientation && (
          <OrientationForm onClose={() => setShowOrientation(false)} />
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

export default HomePageV5;
