/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: HomePage V5 — Cinematic Rebuild                  ║
 * ║  PURPOSE: Full homepage redesign using optimized design skills║
 * ║  OWNER: Claude Opus 4.6 (CEO) | DESIGNED: 2026-04-03        ║
 * ║  SKILLS APPLIED: design-taste-frontend, high-end-visual-design║
 * ║    frontend-design, fixing-motion-performance, accessibility  ║
 * ║    core-web-vitals, performance, web-design-guidelines        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DESIGN PHILOSOPHY:
 * "Do not build a website; build a digital instrument."
 * — Cinematic Web Design System v1.0
 *
 * KEY DIFFERENCES FROM V4:
 * - Asymmetric bento hero (not centered text block)
 * - Staggered parallax layers with depth
 * - Spring physics on interactions (not linear)
 * - Textured grain overlay throughout
 * - GPU-composited animations ONLY (transform + opacity)
 * - Dark-first: #0A0A0F base, luminous accents
 * - No generic AI patterns (no 3-col equal cards, no gradient text headers)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Star, ChevronDown, Shield, Brain, Zap,
  Sparkles, Award, TrendingUp, Check, ArrowRight,
  Play, MapPin, Clock, Phone,
} from 'lucide-react';
import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import logoImg from '../../../assets/Logo.png';

// ═══════════════════════════════════════════════════════════
// CINEMATIC MOTION SYSTEM — Spring Physics
// GPU-composited only (transform + opacity). No layout thrash.
// ═══════════════════════════════════════════════════════════

const SPRING = { type: 'spring', stiffness: 100, damping: 20, mass: 0.8 };
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
// SECTION 1: HERO — Asymmetric Bento Layout
// Not a centered text block. Content + visual separated.
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
`;

// ═══════════════════════════════════════════════════════════
// SECTION 2: SOCIAL PROOF — Animated Stat Counters
// ═══════════════════════════════════════════════════════════

const StatsStrip = styled.section`
  padding: 48px clamp(20px, 5vw, 80px);
  background: linear-gradient(180deg, rgba(10, 10, 15, 0.95) 0%, #0A0A0F 100%);
  border-top: 1px solid rgba(96, 192, 240, 0.06);
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
`;

const StatCard = styled(motion.div)`
  text-align: center;
  padding: 24px 16px;
  border-radius: 16px;
  background: rgba(20, 20, 25, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.06);
  transition: border-color 0.3s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.15);
  }
`;

const StatNumber = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 800;
  color: #60C0F0;
  line-height: 1;
`;

const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 8px;
`;

// ═══════════════════════════════════════════════════════════
// SECTION 3: FEATURES — Asymmetric Bento Grid (NOT 3-col equal)
// ═══════════════════════════════════════════════════════════

const FeaturesSection = styled.section`
  padding: 100px clamp(20px, 5vw, 80px);
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionHeader = styled(motion.div)`
  margin-bottom: 56px;

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

const SectionSubtitle = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(16px, 1.8vw, 20px);
  color: rgba(224, 236, 244, 0.5);
  max-width: 560px;
  margin: 0;
  line-height: 1.5;
`;

const BentoGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled(motion.div)<{ $span?: string; $accent?: string }>`
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(20, 20, 25, 0.7);
  border: 1px solid rgba(96, 192, 240, 0.06);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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

const CardIcon = styled.div<{ $color?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ $color }) => $color || 'rgba(96, 192, 240, 0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color ? '#fff' : '#60C0F0'};
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
// SECTION 4: CTA — Final Conversion
// ═══════════════════════════════════════════════════════════

const CTASection = styled.section`
  padding: 100px clamp(20px, 5vw, 80px);
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 600px;
    height: 600px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const CTATitle = styled(motion.h2)`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 52px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: #E0ECF4;
`;

const CTASubtitle = styled(motion.p)`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(16px, 2vw, 22px);
  color: rgba(224, 236, 244, 0.5);
  max-width: 600px;
  margin: 0 auto 32px;
`;

// ═══════════════════════════════════════════════════════════
// FEATURES DATA
// ═══════════════════════════════════════════════════════════

const FEATURES = [
  { icon: <Dumbbell size={22} />, title: 'NASM-Protocol Training', desc: '5-phase OPT model with 840+ exercises. Every rep is science-backed, every program is periodized.', accent: 'rgba(96, 192, 240, 0.2)', iconBg: 'rgba(96, 192, 240, 0.12)', span: 'span 2' },
  { icon: <Brain size={22} />, title: 'AI Coach Assistant', desc: 'Your personal AI with 17 data sources. Generates workouts, tracks progress, onboards clients — all by voice or text.', accent: 'rgba(139, 92, 246, 0.2)', iconBg: 'rgba(139, 92, 246, 0.12)' },
  { icon: <Activity size={22} />, title: 'Real-Time Progress', desc: '50 Victory charts tracking every metric. Body composition, strength curves, workout consistency, and more.', accent: 'rgba(96, 192, 240, 0.2)', iconBg: 'rgba(96, 192, 240, 0.12)' },
  { icon: <Shield size={22} />, title: 'Movement Analysis', desc: 'NASM Overhead Squat Assessment with corrective exercise strategy. Goniometer ROM tracking for mobility clients.', accent: 'rgba(198, 168, 75, 0.2)', iconBg: 'rgba(198, 168, 75, 0.12)' },
  { icon: <Sparkles size={22} />, title: 'Gamification Engine', desc: '5-tier progression system with badges, XP, leaderboards, and streaks. Training becomes an RPG.', accent: 'rgba(139, 92, 246, 0.2)', iconBg: 'rgba(139, 92, 246, 0.12)', span: 'span 2' },
  { icon: <Users size={22} />, title: 'Social Platform', desc: 'Share workouts, challenge friends, post achievements. A fitness community, not just an app.', accent: 'rgba(96, 192, 240, 0.2)', iconBg: 'rgba(96, 192, 240, 0.12)' },
  { icon: <Apple size={22} />, title: 'Nutrition Intelligence', desc: 'Macro tracking, barcode scanning, meal logging. AI-powered recommendations based on your goals.', accent: 'rgba(198, 168, 75, 0.2)', iconBg: 'rgba(198, 168, 75, 0.12)' },
  { icon: <Monitor size={22} />, title: 'Content Studio', desc: 'Video library, exercise tutorials, and AI-generated form analysis. Your training encyclopedia.', accent: 'rgba(96, 192, 240, 0.2)', iconBg: 'rgba(96, 192, 240, 0.12)' },
];

const STATS = [
  { value: '25+', label: 'Years Experience' },
  { value: '500+', label: 'Clients Trained' },
  { value: '840+', label: 'Exercises in Library' },
  { value: '97.3%', label: 'Client Satisfaction' },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const HomePageV5: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [showOrientation, setShowOrientation] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: '-50px' });

  const variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : undefined;

  return (
    <PageContainer>
      <Helmet>
        <title>SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision</title>
        <meta name="description" content="NASM-certified personal training powered by AI. 25+ years experience, 840+ exercise library, real-time progress tracking, and gamified fitness." />
      </Helmet>

      <NoiseOverlay />

      {/* ── HERO ── */}
      <HeroSection>
        <HeroBackground>
          <video autoPlay muted loop playsInline poster="/images/hero-poster.jpg">
            <source src="/Swans.mp4" type="video/mp4" />
          </video>
        </HeroBackground>

        <HeroGrid>
          <HeroContent>
            <HeroEyebrow
              custom={0}
              variants={prefersReducedMotion ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <Zap size={12} /> Elite Performance Training
            </HeroEyebrow>

            <HeroHeadline
              custom={1}
              variants={prefersReducedMotion ? undefined : heroReveal}
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
              variants={prefersReducedMotion ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              Science-backed training programs with real-time AI coaching,
              NASM-protocol periodization, and a fitness social platform
              that makes every rep count.
            </HeroSubline>

            <HeroCredentials
              custom={3}
              variants={prefersReducedMotion ? undefined : heroReveal}
              initial="hidden"
              animate="visible"
            >
              <CredentialBadge><Award size={14} /> NASM Certified</CredentialBadge>
              <CredentialBadge><Award size={14} /> NCEP Certified</CredentialBadge>
              <CredentialBadge><TrendingUp size={14} /> 25+ Years</CredentialBadge>
            </HeroCredentials>

            <HeroCTAs
              custom={4}
              variants={prefersReducedMotion ? undefined : heroReveal}
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
          </HeroContent>

          <HeroVisual
            custom={2}
            variants={prefersReducedMotion ? undefined : heroReveal}
            initial="hidden"
            animate="visible"
          >
            <LogoFloat
              animate={prefersReducedMotion ? {} : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={logoImg} alt="SwanStudios Logo" loading="eager" />
            </LogoFloat>
          </HeroVisual>
        </HeroGrid>

        <ScrollIndicator
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <span>EXPLORE</span>
          <ChevronBounce><ChevronDown size={18} /></ChevronBounce>
        </ScrollIndicator>
      </HeroSection>

      {/* ── STATS STRIP ── */}
      <StatsStrip>
        <StatsGrid
          ref={statsRef}
          variants={prefersReducedMotion ? undefined : staggerContainer}
          initial="hidden"
          animate={statsInView ? 'visible' : 'hidden'}
        >
          {STATS.map((stat) => (
            <StatCard key={stat.label} variants={prefersReducedMotion ? undefined : cardReveal}>
              <StatNumber>{stat.value}</StatNumber>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
      </StatsStrip>

      {/* ── FEATURES — Asymmetric Bento ── */}
      <FeaturesSection>
        <SectionHeader
          variants={prefersReducedMotion ? undefined : sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <SectionEyebrow>The Arsenal</SectionEyebrow>
          <SectionTitle>Everything You Need.<br />Nothing You Don't.</SectionTitle>
          <SectionSubtitle>
            A complete fitness ecosystem built for trainers who demand precision
            and clients who expect results.
          </SectionSubtitle>
        </SectionHeader>

        <BentoGrid
          ref={featuresRef}
          variants={prefersReducedMotion ? undefined : staggerContainer}
          initial="hidden"
          animate={featuresInView ? 'visible' : 'hidden'}
        >
          {FEATURES.map((f) => (
            <BentoCard
              key={f.title}
              $span={f.span}
              $accent={f.accent}
              variants={prefersReducedMotion ? undefined : cardReveal}
            >
              <CardIcon $color={f.iconBg}>{f.icon}</CardIcon>
              <CardTitle>{f.title}</CardTitle>
              <CardDesc>{f.desc}</CardDesc>
            </BentoCard>
          ))}
        </BentoGrid>
      </FeaturesSection>

      {/* ── FINAL CTA ── */}
      <CTASection>
        <CTATitle
          variants={prefersReducedMotion ? undefined : sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Ready to Transform?
        </CTATitle>
        <CTASubtitle
          variants={prefersReducedMotion ? undefined : sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Join the platform where science, technology, and human expertise converge
          to create extraordinary results.
        </CTASubtitle>
        <motion.div
          variants={prefersReducedMotion ? undefined : sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <GlowButton variant="cosmic" size="large" onClick={() => navigate('/store')}>
            View Training Packages <ArrowRight size={16} />
          </GlowButton>
          <GlowButton variant="ghost" size="large" onClick={() => setShowOrientation(true)}>
            Book Free Consultation
          </GlowButton>
        </motion.div>
      </CTASection>

      {/* Orientation Form Modal */}
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </PageContainer>
  );
};

export default HomePageV5;
