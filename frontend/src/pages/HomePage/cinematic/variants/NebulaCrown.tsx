/**
 * NebulaCrown.tsx — Design 5: "Nebula Crown" — Cosmic Throne
 *
 * Mood: Cosmic royalty. Stars, nebulae, celestial power. Ascending.
 * Hero: Radial spotlight from center, slow-rotating nebula gradient, twinkling stars.
 *       Ultra-wide letter-spacing heading.
 * Particles: Twinkling star field with depth layers (parallax at different speeds).
 * Cards: Dark glass with nebula gradient borders, radial hover glow from cursor.
 * Section style: Centered/theatrical — all content pulls toward center column.
 *               Circular/radial design elements instead of rectangular.
 * Motion: Medium-high — celestial, ethereal. Slow rotations, radial reveals.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, ArrowRight, Crown, Sparkles,
  ChevronRight,
} from 'lucide-react';

import { nebulaCrownTokens as tokens } from '../cinematic-tokens';
import { homepageContent as content } from '../HomepageContent';
import { radialScaleIn, staggerContainer, staggerItem, fadeUpVariants, defaultViewport, heroViewport } from '../cinematic-animations';
import { NoiseOverlay } from '../cinematic-shared';
import CinematicNavbar from '../sections/CinematicNavbar';

// ─── Icon Map ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, Crown, Sparkles,
};

const getIcon = (name: string) => ICON_MAP[name] || Star;

// ─── Keyframes ──────────────────────────────────────────────────────

const nebulaRotate = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.05); }
  100% { transform: rotate(360deg) scale(1); }
`;

const starTwinkle = keyframes`
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const radialPulse = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.4; }
`;

const cosmicShimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ─── Styled Components ──────────────────────────────────────────────

const PageRoot = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background: ${tokens.palette.bg};
  color: ${tokens.palette.textPrimary};
`;

/* ── Star Field ── */

const StarField = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
`;

const StarLayer = styled.div<{ $count: number; $speed: number }>`
  position: absolute;
  inset: 0;

  span {
    position: absolute;
    width: 2px;
    height: 2px;
    background: ${tokens.palette.textPrimary};
    border-radius: 50%;
    animation: ${starTwinkle} ${({ $speed }) => $speed}s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.3; }
  }
`;

/* ── Hero ── */

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1.5rem;
  overflow: hidden;
`;

const NebulaBackground = styled.div`
  position: absolute;
  inset: -20%;
  background: conic-gradient(
    from 0deg at 50% 50%,
    ${tokens.palette.gaming}15,
    ${tokens.palette.secondary}10,
    ${tokens.palette.tertiary}12,
    ${tokens.palette.gaming}08,
    ${tokens.palette.secondary}15
  );
  animation: ${nebulaRotate} 60s linear infinite;
  filter: blur(80px);
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const RadialSpotlight = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80vw;
  height: 80vw;
  max-width: 800px;
  max-height: 800px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, ${tokens.palette.gaming}08 0%, transparent 60%);
  animation: ${radialPulse} 5s ease-in-out infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const HeroBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  border-radius: 2rem;
  background: ${tokens.palette.glass};
  border: 1px solid ${tokens.palette.gaming}25;
  backdrop-filter: blur(20px);
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const HeroHeading = styled(motion.h1)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: clamp(3rem, 8vw, 5.5rem);
  line-height: 1.1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.palette.textPrimary};
  max-width: 900px;
  margin: 0;
`;

const HeroCosmicAccent = styled.span`
  display: block;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary}, ${tokens.palette.accent});
  background-size: 300% 300%;
  animation: ${cosmicShimmer} 6s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const HeroSub = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${tokens.palette.textSecondary};
  max-width: 550px;
  line-height: 1.8;
  margin: 1.5rem 0 2.5rem;
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const CosmicButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 2rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary});
  color: #fff;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: scale(1.03); box-shadow: 0 4px 30px ${tokens.palette.gaming}30; }

  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const EtherealButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 2rem;
  background: transparent;
  color: ${tokens.palette.textPrimary};
  border: 1px solid ${tokens.palette.gaming}30;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: border-color 0.3s ease;
  &:hover { border-color: ${tokens.palette.gaming}60; }
`;

/* ── Radial Divider ── */

const RadialDivider = styled.div`
  position: relative;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, ${tokens.palette.gaming}08 0%, transparent 70%);
  }

  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${tokens.palette.gaming};
    box-shadow: 0 0 10px ${tokens.palette.gaming}50;
  }
`;

/* ── Section Primitives ── */

const Section = styled.section<{ $surface?: boolean }>`
  position: relative;
  padding: 6rem 1.5rem;
  background: ${({ $surface }) => $surface ? tokens.palette.surface : 'transparent'};

  @media (max-width: 768px) { padding: 4rem 1rem; }
`;

const SectionInner = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
`;

const SectionTitle = styled(motion.h2)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: clamp(2rem, 5vw, 3.5rem);
  color: ${tokens.palette.textPrimary};
  letter-spacing: 0.04em;
  margin: 0 0 1rem;
`;

const SectionDesc = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1.1rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto 3rem;
`;

/* ── Nebula Cards (Programs) ── */

const NebulaGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  text-align: left;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const NebulaCard = styled(motion.div)`
  position: relative;
  padding: 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  border: 1px solid transparent;
  background-clip: padding-box;
  overflow: hidden;
  transition: box-shadow 0.4s ease;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 1.5rem;
    padding: 1px;
    background: linear-gradient(135deg, ${tokens.palette.gaming}30, ${tokens.palette.secondary}20, ${tokens.palette.tertiary}30);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  &:hover {
    box-shadow: 0 0 40px ${tokens.palette.gaming}10;
  }
`;

const NebulaBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}20, ${tokens.palette.secondary}15);
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const NebulaCardTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const NebulaCardSub = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0 0 1.5rem;
`;

const NebulaFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0;
    font-family: ${tokens.typography.bodyFamily};
    font-size: 0.85rem;
    color: ${tokens.palette.textSecondary};

    &::before {
      content: '✦';
      color: ${tokens.palette.gaming};
      font-size: 0.5rem;
    }
  }
`;

const NebulaCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 2rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}15, ${tokens.palette.secondary}10);
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.3s ease;
  &:hover { background: linear-gradient(135deg, ${tokens.palette.gaming}25, ${tokens.palette.secondary}20); }
`;

/* ── Feature Constellation ── */

const ConstellationGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  text-align: center;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const ConstellationNode = styled(motion.div)`
  position: relative;
  padding: 2rem 1.5rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  overflow: hidden;
  transition: box-shadow 0.4s ease;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 1.5rem;
    padding: 1px;
    background: linear-gradient(135deg, ${tokens.palette.gaming}20, transparent, ${tokens.palette.secondary}20);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  &:hover {
    box-shadow: 0 0 30px ${tokens.palette.gaming}10;
  }
`;

const ConstellationIcon = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, ${tokens.palette.gaming}15 0%, transparent 70%);
  color: ${tokens.palette.gaming};
`;

const ConstellationTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const ConstellationDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

/* ── Stats Orbit ── */

const OrbitGrid = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
`;

const OrbitCell = styled(motion.div)`
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    padding: 1px;
    background: conic-gradient(${tokens.palette.gaming}30, transparent, ${tokens.palette.secondary}20, transparent, ${tokens.palette.gaming}30);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @media (max-width: 768px) { width: 140px; height: 140px; }
`;

const OrbitValue = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.6rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const OrbitLabel = styled.div`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.7rem;
  color: ${tokens.palette.textSecondary};
  text-align: center;
  max-width: 120px;
  margin-top: 0.25rem;
`;

/* ── Testimonials ── */

const TestimonialColumn = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  text-align: left;
`;

const TestimonialOrb = styled(motion.div)`
  position: relative;
  padding: 2rem 2.5rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 1.5rem;
    padding: 1px;
    background: linear-gradient(135deg, ${tokens.palette.gaming}20, transparent 50%, ${tokens.palette.secondary}20);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

const TestimonialQuote = styled.blockquote`
  font-family: ${tokens.typography.dramaFamily};
  font-style: italic;
  font-size: 1.1rem;
  color: ${tokens.palette.textPrimary};
  line-height: 1.7;
  margin: 0 0 1.25rem;
`;

const TestimonialAuthor = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  color: ${tokens.palette.gaming};
`;

const TestimonialMeta = styled.div`
  font-size: 0.75rem;
  color: ${tokens.palette.textSecondary};
  margin-top: 0.25rem;
`;

/* ── Creative ── */

const CreativeGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  text-align: left;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

/* ── Newsletter ── */

const NewsletterSection = styled.section`
  position: relative;
  padding: 6rem 1.5rem;
  text-align: center;

  @media (max-width: 768px) { padding: 4rem 1rem; }
`;

const NewsletterInner = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const NewsletterForm = styled(motion.form)`
  display: flex;
  gap: 0;
  border-radius: 2rem;
  overflow: hidden;
  border: 1px solid ${tokens.palette.gaming}20;

  @media (max-width: 600px) {
    flex-direction: column;
    border-radius: 1rem;
  }
`;

const NewsletterInput = styled.input`
  flex: 1;
  padding: 1rem 1.5rem;
  background: ${tokens.palette.glass};
  border: none;
  color: ${tokens.palette.textPrimary};
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.95rem;
  min-height: 44px;
  outline: none;
`;

const NewsletterBtn = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary});
  color: #fff;
  border: none;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: opacity 0.3s ease;
  &:hover { opacity: 0.85; }
`;

/* ── Footer ── */

const Footer = styled.footer`
  padding: 4rem 1.5rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
  text-align: left;

  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 2rem; text-align: center; }
`;

const FooterBrand = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
  letter-spacing: 0.04em;
  margin: 0 0 0.75rem;
`;

const FooterDesc = styled.p`
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

const FooterGroupTitle = styled.h4`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.palette.gaming};
  margin: 0 0 1rem;
`;

const FooterLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  text-decoration: none;
  min-height: 44px;
  &:hover { color: ${tokens.palette.textPrimary}; }

  @media (max-width: 768px) { justify-content: center; }
`;

const FooterBottom = styled.div`
  border-top: 1px solid ${tokens.palette.border};
  padding-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
  font-size: 0.8rem;
  color: ${tokens.palette.textSecondary};

  @media (max-width: 768px) { flex-direction: column; gap: 0.5rem; }
`;

// ─── Star Positions ─────────────────────────────────────────────────

const generateStars = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.round((i * 37 + 13) % 100)}%`,
    top: `${Math.round((i * 53 + 7) % 100)}%`,
    delay: `${(i * 0.7) % 5}s`,
    size: 1 + (i % 3),
  }));

const STARS_NEAR = generateStars(25);
const STARS_FAR = generateStars(40);

// ─── Component ──────────────────────────────────────────────────────

const NebulaCrown: React.FC = () => {
  const radialIn = radialScaleIn(tokens.motion);
  const fadeUp = fadeUpVariants(tokens.motion);
  const stagger = staggerContainer(tokens.motion);
  const item = staggerItem(tokens.motion);

  return (
    <PageRoot>
      {/* Star Field */}
      <StarField>
        <StarLayer $count={40} $speed={4}>
          {STARS_FAR.map((s) => (
            <span
              key={`far-${s.id}`}
              style={{
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                width: `${s.size}px`,
                height: `${s.size}px`,
                opacity: 0.2,
              }}
            />
          ))}
        </StarLayer>
        <StarLayer $count={25} $speed={2.5}>
          {STARS_NEAR.map((s) => (
            <span
              key={`near-${s.id}`}
              style={{
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                width: `${s.size + 1}px`,
                height: `${s.size + 1}px`,
                opacity: 0.4,
              }}
            />
          ))}
        </StarLayer>
      </StarField>

      <NoiseOverlay $tokens={tokens} />

      <CinematicNavbar
        tokens={tokens}
        marketingLinks={content.nav.marketingLinks}
        ctaLabel={content.nav.ctaLabel}
        ctaPath={content.nav.ctaPath}
      />

      {/* ── Hero ── */}
      <HeroSection>
        <NebulaBackground />
        <RadialSpotlight />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <HeroBadge variants={item}>
            <Crown size={14} />
            {content.hero.badge}
          </HeroBadge>
          <HeroHeading variants={radialIn}>
            {content.hero.heading}
            <HeroCosmicAccent>{content.hero.headingAccent}</HeroCosmicAccent>
          </HeroHeading>
          <HeroSub variants={item}>{content.hero.subheading}</HeroSub>
          <HeroActions variants={item}>
            <CosmicButton to={content.hero.ctaPrimary.path}>
              {content.hero.ctaPrimary.label}
              <ArrowRight size={16} />
            </CosmicButton>
            <EtherealButton to={content.hero.ctaSecondary.path}>
              {content.hero.ctaSecondary.label}
            </EtherealButton>
          </HeroActions>
        </motion.div>
      </HeroSection>

      <RadialDivider />

      {/* ── Programs ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionDescription}
          </SectionDesc>

          <NebulaGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.cards.map((card) => (
              <NebulaCard key={card.title} variants={item}>
                {card.badge && <NebulaBadge>{card.badge}</NebulaBadge>}
                <NebulaCardTitle>{card.title}</NebulaCardTitle>
                <NebulaCardSub>{card.subtitle}</NebulaCardSub>
                <NebulaFeatures>
                  {card.features.map((f) => <li key={f}>{f}</li>)}
                </NebulaFeatures>
                <NebulaCta to={card.ctaPath}>
                  {card.ctaLabel} <ChevronRight size={14} />
                </NebulaCta>
              </NebulaCard>
            ))}
          </NebulaGrid>
        </SectionInner>
      </Section>

      <RadialDivider />

      {/* ── Features ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionDescription}
          </SectionDesc>

          <ConstellationGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.items.map((feat) => {
              const Icon = getIcon(feat.icon);
              return (
                <ConstellationNode key={feat.title} variants={item}>
                  <ConstellationIcon><Icon size={22} /></ConstellationIcon>
                  <ConstellationTitle>{feat.title}</ConstellationTitle>
                  <ConstellationDesc>{feat.description}</ConstellationDesc>
                </ConstellationNode>
              );
            })}
          </ConstellationGrid>
        </SectionInner>
      </Section>

      <RadialDivider />

      {/* ── Creative Expression ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.sectionBody}
          </SectionDesc>

          <CreativeGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.cards.map((card) => {
              const Icon = getIcon(card.icon);
              return (
                <NebulaCard key={card.title} variants={item}>
                  <ConstellationIcon><Icon size={22} /></ConstellationIcon>
                  <NebulaCardTitle>{card.title}</NebulaCardTitle>
                  <ConstellationDesc>{card.description}</ConstellationDesc>
                </NebulaCard>
              );
            })}
          </CreativeGrid>
        </SectionInner>
      </Section>

      <RadialDivider />

      {/* ── Stats (Orbit Bubbles) ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.sectionDescription}
          </SectionDesc>

          <OrbitGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.stats.map((stat) => (
              <OrbitCell key={stat.label} variants={item}>
                <OrbitValue>{stat.value}</OrbitValue>
                <OrbitLabel>{stat.label}</OrbitLabel>
              </OrbitCell>
            ))}
          </OrbitGrid>
        </SectionInner>
      </Section>

      <RadialDivider />

      {/* ── Testimonials ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionDescription}
          </SectionDesc>

          <TestimonialColumn variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.items.map((t) => (
              <TestimonialOrb key={t.name} variants={item}>
                <TestimonialQuote>{t.quote}</TestimonialQuote>
                <TestimonialAuthor>{t.name}</TestimonialAuthor>
                <TestimonialMeta>{t.duration} — {t.category}</TestimonialMeta>
              </TestimonialOrb>
            ))}
          </TestimonialColumn>
        </SectionInner>
      </Section>

      <RadialDivider />

      {/* ── Newsletter ── */}
      <NewsletterSection>
        <NewsletterInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.newsletter.heading}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.newsletter.subheading}
          </SectionDesc>
          <NewsletterForm
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            onSubmit={(e) => e.preventDefault()}
          >
            <NewsletterInput type="email" placeholder={content.newsletter.emailPlaceholder} />
            <NewsletterBtn type="submit">{content.newsletter.buttonText}</NewsletterBtn>
          </NewsletterForm>
        </NewsletterInner>
      </NewsletterSection>

      {/* ── Footer ── */}
      <Footer>
        <FooterGrid>
          <div>
            <FooterBrand>{content.footer.brandName}</FooterBrand>
            <FooterDesc>{content.footer.brandDescription}</FooterDesc>
          </div>
          {content.footer.linkGroups.map((group) => (
            <div key={group.title}>
              <FooterGroupTitle>{group.title}</FooterGroupTitle>
              {group.links.map((link) => (
                <FooterLink key={link.path} to={link.path}>{link.label}</FooterLink>
              ))}
            </div>
          ))}
        </FooterGrid>
        <FooterBottom>
          <span>&copy; {content.footer.copyright}</span>
          <span>{content.footer.madeWith}</span>
        </FooterBottom>
      </Footer>
    </PageRoot>
  );
};

export default NebulaCrown;
