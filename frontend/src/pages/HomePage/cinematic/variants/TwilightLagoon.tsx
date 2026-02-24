/**
 * TwilightLagoon.tsx — Design 4: "Twilight Lagoon" — Bioluminescent Depths
 *
 * Mood: Bioluminescent underwater world at twilight. Magical, serene but alive with light.
 * Hero: Undulating wave shapes, gradient text teal→cyan→gold, bioluminescent orbs.
 * Particles: Floating bioluminescent orbs with glow halos, gentle random drift.
 * Cards: Rounded pill shapes (3rem radius), teal edge glow on hover.
 * Section style: Wave-shaped SVG dividers, organic flowing layout, bubble metrics.
 * Motion: Medium — gentle, flowing, organic. Wave-based easings.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, ArrowRight, Waves, Droplets,
  ChevronRight,
} from 'lucide-react';

import { twilightLagoonTokens as tokens } from '../cinematic-tokens';
import { homepageContent as content } from '../HomepageContent';
import { floatUpVariants, staggerContainer, staggerItem, defaultViewport, heroViewport } from '../cinematic-animations';
import { NoiseOverlay } from '../cinematic-shared';
import CinematicNavbar from '../sections/CinematicNavbar';

// ─── Icon Map ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, Clock: Waves, Flame: Droplets,
};

const getIcon = (name: string) => ICON_MAP[name] || Star;

// ─── Keyframes ──────────────────────────────────────────────────────

const orbFloat = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(15px, -20px) scale(1.1); }
  50% { transform: translate(-10px, -40px) scale(0.95); }
  75% { transform: translate(20px, -15px) scale(1.05); }
  100% { transform: translate(0, 0) scale(1); }
`;

const biolumePulse = keyframes`
  0%, 100% { opacity: 0.3; box-shadow: 0 0 20px ${tokens.palette.gaming}30; }
  50% { opacity: 0.6; box-shadow: 0 0 40px ${tokens.palette.gaming}50; }
`;

const waveUndulate = keyframes`
  0% { transform: translateX(0); }
  50% { transform: translateX(-25px); }
  100% { transform: translateX(0); }
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

const OceanGradient = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 70%, ${tokens.palette.gaming}12 0%, transparent 50%),
    radial-gradient(ellipse at 70% 30%, ${tokens.palette.secondary}08 0%, transparent 50%),
    radial-gradient(ellipse at 50% 90%, ${tokens.palette.tertiary}10 0%, transparent 40%);
  pointer-events: none;
`;

const BioOrb = styled.div<{ $left: number; $top: number; $size: number; $delay: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  top: ${({ $top }) => $top}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: radial-gradient(circle, ${tokens.palette.gaming}40 0%, ${tokens.palette.gaming}10 40%, transparent 70%);
  border-radius: 50%;
  animation: ${orbFloat} ${({ $size }) => 10 + $size * 0.3}s ease-in-out infinite,
             ${biolumePulse} ${({ $size }) => 4 + $size * 0.2}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.3; }
`;

const HeroBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  border-radius: 3rem;
  background: ${tokens.palette.gaming}12;
  border: 1px solid ${tokens.palette.gaming}25;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const HeroHeading = styled(motion.h1)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: clamp(3rem, 8vw, 5.5rem);
  line-height: 1.1;
  max-width: 800px;
  margin: 0;
  color: ${tokens.palette.textPrimary};
`;

const HeroGradientText = styled.span`
  display: block;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.tertiary}, ${tokens.palette.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

const TealButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 3rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.tertiary});
  color: ${tokens.palette.bg};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: scale(1.03); box-shadow: 0 4px 30px ${tokens.palette.gaming}30; }

  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const GlassButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 3rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  color: ${tokens.palette.textPrimary};
  border: 1px solid ${tokens.palette.gaming}20;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: border-color 0.3s ease;
  &:hover { border-color: ${tokens.palette.gaming}50; }
`;

/* ── Wave SVG Divider ── */

const WaveDivider = styled.div<{ $flip?: boolean }>`
  position: relative;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  transform: ${({ $flip }) => $flip ? 'rotate(180deg)' : 'none'};

  svg {
    display: block;
    width: calc(100% + 50px);
    height: 60px;
    animation: ${waveUndulate} 8s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) { animation: none; }
  }
`;

const WaveSvg: React.FC<{ fill: string }> = ({ fill }) => (
  <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
    <path
      d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
      fill={fill}
    />
  </svg>
);

/* ── Section Primitives ── */

const Section = styled.section<{ $surface?: boolean }>`
  position: relative;
  padding: 6rem 1.5rem;
  background: ${({ $surface }) => $surface ? tokens.palette.surface : 'transparent'};

  @media (max-width: 768px) { padding: 4rem 1rem; }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: clamp(2rem, 5vw, 3.5rem);
  color: ${tokens.palette.textPrimary};
  margin: 0 0 1rem;
`;

const SectionDesc = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1.1rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  max-width: 600px;
  margin: 0 0 3rem;
`;

/* ── Pill Cards (Programs) ── */

const PillGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const PillCard = styled(motion.div)`
  position: relative;
  padding: 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${tokens.palette.gaming}12;
  border-radius: 3rem;
  transition: border-color 0.4s ease, box-shadow 0.4s ease;

  &:hover {
    border-color: ${tokens.palette.gaming}40;
    box-shadow: 0 0 30px ${tokens.palette.gaming}10;
  }
`;

const PillBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 1rem;
  border-radius: 2rem;
  background: ${tokens.palette.gaming}15;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const PillTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const PillSub = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0 0 1.5rem;
`;

const PillFeatures = styled.ul`
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
      content: '●';
      color: ${tokens.palette.gaming};
      font-size: 0.4rem;
    }
  }
`;

const PillCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 3rem;
  background: ${tokens.palette.gaming}15;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.3s ease;
  &:hover { background: ${tokens.palette.gaming}25; }
`;

/* ── Feature Orbs ── */

const FeatureOrbGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const FeatureOrbCard = styled(motion.div)`
  padding: 2rem 1.5rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  border: 1px solid ${tokens.palette.gaming}10;
  border-radius: 3rem;
  text-align: center;
  transition: border-color 0.4s ease, box-shadow 0.4s ease;

  &:hover {
    border-color: ${tokens.palette.gaming}30;
    box-shadow: 0 0 25px ${tokens.palette.gaming}08;
  }
`;

const FeatureOrbIcon = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, ${tokens.palette.gaming}20 0%, transparent 70%);
  color: ${tokens.palette.gaming};
`;

const FeatureTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const FeatureDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

/* ── Stats Bubbles ── */

const BubbleGrid = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
`;

const Bubble = styled(motion.div)`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  border: 1px solid ${tokens.palette.gaming}20;
  transition: box-shadow 0.4s ease;

  &:hover { box-shadow: 0 0 30px ${tokens.palette.gaming}15; }

  @media (max-width: 768px) { width: 130px; height: 130px; }
`;

const BubbleValue = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.5rem;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.tertiary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BubbleLabel = styled.div`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.7rem;
  color: ${tokens.palette.textSecondary};
  text-align: center;
  margin-top: 0.25rem;
  max-width: 110px;
`;

/* ── Testimonials ── */

const TestimonialFlow = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const TestimonialPill = styled(motion.div)`
  padding: 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(20px);
  border: 1px solid ${tokens.palette.gaming}12;
  border-radius: 3rem;
  transition: border-color 0.3s ease;
  &:hover { border-color: ${tokens.palette.gaming}30; }
`;

const TestimonialQuote = styled.blockquote`
  font-family: ${tokens.typography.dramaFamily};
  font-style: italic;
  font-size: 1.05rem;
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
  border-radius: 3rem;
  overflow: hidden;
  border: 1px solid ${tokens.palette.gaming}20;

  @media (max-width: 600px) {
    flex-direction: column;
    border-radius: 1.5rem;
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
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.tertiary});
  color: ${tokens.palette.bg};
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
  max-width: 1200px;
  margin: 0 auto;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 2rem; }
`;

const FooterBrand = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
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
`;

const FooterBottom = styled.div`
  border-top: 1px solid ${tokens.palette.border};
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${tokens.palette.textSecondary};

  @media (max-width: 768px) { flex-direction: column; text-align: center; }
`;

// ─── Bioluminescent Orbs Data ───────────────────────────────────────

const ORBS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 5 + (i * 9) % 90,
  top: 10 + (i * 13) % 80,
  size: 15 + (i % 4) * 12,
  delay: i * 1.2,
}));

// ─── Component ──────────────────────────────────────────────────────

const TwilightLagoon: React.FC = () => {
  const floatUp = floatUpVariants(tokens.motion);
  const stagger = staggerContainer(tokens.motion);
  const item = staggerItem(tokens.motion);

  return (
    <PageRoot>
      <NoiseOverlay $tokens={tokens} />

      <CinematicNavbar
        tokens={tokens}
        marketingLinks={content.nav.marketingLinks}
        ctaLabel={content.nav.ctaLabel}
        ctaPath={content.nav.ctaPath}
      />

      {/* ── Hero ── */}
      <HeroSection>
        <OceanGradient />
        {ORBS.map((o) => (
          <BioOrb key={o.id} $left={o.left} $top={o.top} $size={o.size} $delay={o.delay} />
        ))}

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <HeroBadge variants={item}>
            <Droplets size={14} />
            {content.hero.badge}
          </HeroBadge>
          <HeroHeading variants={floatUp}>
            {content.hero.heading}
            <HeroGradientText>{content.hero.headingAccent}</HeroGradientText>
          </HeroHeading>
          <HeroSub variants={item}>{content.hero.subheading}</HeroSub>
          <HeroActions variants={item}>
            <TealButton to={content.hero.ctaPrimary.path}>
              {content.hero.ctaPrimary.label}
              <ArrowRight size={16} />
            </TealButton>
            <GlassButton to={content.hero.ctaSecondary.path}>
              {content.hero.ctaSecondary.label}
            </GlassButton>
          </HeroActions>
        </motion.div>
      </HeroSection>

      <WaveDivider>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Programs ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionDescription}
          </SectionDesc>

          <PillGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.cards.map((card) => (
              <PillCard key={card.title} variants={item}>
                {card.badge && <PillBadge>{card.badge}</PillBadge>}
                <PillTitle>{card.title}</PillTitle>
                <PillSub>{card.subtitle}</PillSub>
                <PillFeatures>
                  {card.features.map((f) => <li key={f}>{f}</li>)}
                </PillFeatures>
                <PillCta to={card.ctaPath}>
                  {card.ctaLabel} <ChevronRight size={14} />
                </PillCta>
              </PillCard>
            ))}
          </PillGrid>
        </SectionInner>
      </Section>

      <WaveDivider $flip>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Features ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionDescription}
          </SectionDesc>

          <FeatureOrbGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.items.map((feat) => {
              const Icon = getIcon(feat.icon);
              return (
                <FeatureOrbCard key={feat.title} variants={item}>
                  <FeatureOrbIcon><Icon size={24} /></FeatureOrbIcon>
                  <FeatureTitle>{feat.title}</FeatureTitle>
                  <FeatureDesc>{feat.description}</FeatureDesc>
                </FeatureOrbCard>
              );
            })}
          </FeatureOrbGrid>
        </SectionInner>
      </Section>

      <WaveDivider>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Creative Expression ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.sectionBody}
          </SectionDesc>

          <CreativeGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.creativeExpression.cards.map((card) => {
              const Icon = getIcon(card.icon);
              return (
                <PillCard key={card.title} variants={item}>
                  <FeatureOrbIcon><Icon size={24} /></FeatureOrbIcon>
                  <PillTitle>{card.title}</PillTitle>
                  <FeatureDesc>{card.description}</FeatureDesc>
                </PillCard>
              );
            })}
          </CreativeGrid>
        </SectionInner>
      </Section>

      <WaveDivider $flip>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Stats (Bubbles) ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
            {content.fitnessStats.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            {content.fitnessStats.sectionDescription}
          </SectionDesc>

          <BubbleGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.stats.map((stat) => (
              <Bubble key={stat.label} variants={item}>
                <BubbleValue>{stat.value}</BubbleValue>
                <BubbleLabel>{stat.label}</BubbleLabel>
              </Bubble>
            ))}
          </BubbleGrid>
        </SectionInner>
      </Section>

      <WaveDivider>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Testimonials ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionDescription}
          </SectionDesc>

          <TestimonialFlow variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.items.map((t) => (
              <TestimonialPill key={t.name} variants={item}>
                <TestimonialQuote>{t.quote}</TestimonialQuote>
                <TestimonialAuthor>{t.name}</TestimonialAuthor>
                <TestimonialMeta>{t.duration} — {t.category}</TestimonialMeta>
              </TestimonialPill>
            ))}
          </TestimonialFlow>
        </SectionInner>
      </Section>

      <WaveDivider $flip>
        <WaveSvg fill={tokens.palette.surface} />
      </WaveDivider>

      {/* ── Newsletter ── */}
      <NewsletterSection>
        <NewsletterInner>
          <SectionTitle variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
            {content.newsletter.heading}
          </SectionTitle>
          <SectionDesc variants={floatUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center', margin: '0 auto 2.5rem' }}>
            {content.newsletter.subheading}
          </SectionDesc>
          <NewsletterForm
            variants={floatUp}
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

export default TwilightLagoon;
