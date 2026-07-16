/**
 * EmberRealm.tsx — Design 3: "Ember Realm" — Warrior Forge
 *
 * Mood: Ancient warrior forge. Fire, metal, determination. Raw power meets discipline.
 * Hero: Dark bg with rising ember particles, fire glow shimmer on accent words,
 *       bold condensed typography at 800 weight. Diagonal slash across hero.
 * Particles: Rising embers / fire sparks floating upward with orange glow trails.
 * Cards: Dark metal-textured, angular 0.5rem corners, orange border-bottom glow.
 * Section style: Bold diagonal dividers, overlapping geometric shapes, masonry grids.
 * Motion: High — aggressive, energetic. Fast entrances, dynamic hovers.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, ArrowRight, Flame, Zap, Swords, Shield,
  ChevronRight,
} from 'lucide-react';

import { emberRealmTokens as tokens } from '../cinematic-tokens';
import { homepageContent as content } from '../HomepageContent';
import { diagonalSlashIn, staggerContainer, staggerItem, fadeUpVariants, defaultViewport, heroViewport } from '../cinematic-animations';
import { NoiseOverlay } from '../cinematic-shared';
import CinematicNavbar from '../sections/CinematicNavbar';

// ─── Icon Map ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, Flame, Clock: Zap,
};

const getIcon = (name: string) => ICON_MAP[name] || Star;

// ─── Keyframes ──────────────────────────────────────────────────────

const emberRise = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(${Math.random() > 0.5 ? '' : '-'}40px, -110vh) scale(0.3); opacity: 0; }
`;

const fireGlow = keyframes`
  0%, 100% { text-shadow: 0 0 20px ${tokens.palette.gaming}40, 0 0 40px ${tokens.palette.gaming}20; }
  50% { text-shadow: 0 0 30px ${tokens.palette.gaming}60, 0 0 60px ${tokens.palette.gaming}30; }
`;

const forgeFlicker = keyframes`
  0%, 100% { opacity: 0.3; }
  30% { opacity: 0.5; }
  60% { opacity: 0.2; }
  80% { opacity: 0.4; }
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
  align-items: center;
  padding: 6rem 1.5rem 4rem;
  overflow: hidden;
`;

const HeroForgeGlow = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(to top, ${tokens.palette.gaming}12, transparent);
  animation: ${forgeFlicker} 3s ease-in-out infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const DiagonalSlash = styled.div`
  position: absolute;
  top: -5%;
  right: -10%;
  width: 60%;
  height: 120%;
  background: linear-gradient(135deg, transparent 40%, ${tokens.palette.gaming}06 50%, transparent 60%);
  transform: rotate(-12deg);
  pointer-events: none;
`;

const Ember = styled.div<{ $delay: number; $left: number; $size: number }>`
  position: absolute;
  bottom: 5%;
  left: ${({ $left }) => $left}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: radial-gradient(circle, ${tokens.palette.gaming} 0%, ${tokens.palette.tertiary} 50%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  animation: ${emberRise} ${({ $size }) => 6 + $size * 0.8}s ease-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { display: none; }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 700px;
`;

const HeroBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: ${tokens.palette.gaming}15;
  border-left: 3px solid ${tokens.palette.gaming};
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const HeroHeading = styled(motion.h1)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: clamp(3.5rem, 9vw, 6rem);
  line-height: 1;
  color: ${tokens.palette.textPrimary};
  text-transform: uppercase;
  margin: 0;
`;

const HeroAccent = styled.span`
  display: block;
  color: ${tokens.palette.gaming};
  animation: ${fireGlow} 3s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; text-shadow: 0 0 20px ${tokens.palette.gaming}40; }
`;

const HeroSub = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${tokens.palette.textSecondary};
  max-width: 500px;
  line-height: 1.8;
  margin: 1.5rem 0 2.5rem;
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ForgeButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  background: ${tokens.palette.gaming};
  color: ${tokens.palette.bg};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.2s ease, transform 0.15s ease;
  &:hover { background: ${tokens.palette.tertiary}; transform: translateY(-2px); }

  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const OutlineButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  background: transparent;
  color: ${tokens.palette.gaming};
  border: 2px solid ${tokens.palette.gaming}60;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  min-height: 44px;
  transition: border-color 0.2s ease;
  &:hover { border-color: ${tokens.palette.gaming}; }
`;

/* ── Diagonal Section Divider ── */

const DiagonalDivider = styled.div`
  position: relative;
  height: 80px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -5%;
    right: -5%;
    height: 200%;
    background: ${tokens.palette.surface};
    transform: skewY(-2deg);
    transform-origin: top left;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${tokens.palette.gaming}40, ${tokens.palette.tertiary}30, transparent);
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
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTag = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  background: ${tokens.palette.gaming}10;
  border-left: 3px solid ${tokens.palette.gaming};
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const SectionTitle = styled(motion.h2)`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: clamp(2rem, 5vw, 3.5rem);
  color: ${tokens.palette.textPrimary};
  text-transform: uppercase;
  margin: 0 0 1rem;
`;

const SectionDesc = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1.05rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  max-width: 600px;
  margin: 0 0 3rem;
`;

/* ── Metal Cards (Programs) ── */

const MetalGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const MetalCard = styled(motion.div)`
  position: relative;
  padding: 2rem;
  background: ${tokens.palette.surface};
  border-radius: 0.5rem;
  border-bottom: 3px solid ${tokens.palette.gaming};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(255, 107, 44, 0.15);
  }

  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const MetalCardBadge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  background: ${tokens.palette.gaming};
  color: ${tokens.palette.bg};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 0.25rem;
`;

const MetalCardTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
  text-transform: uppercase;
  margin: 0 0 0.5rem;
`;

const MetalCardSub = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0 0 1.5rem;
`;

const MetalFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    font-family: ${tokens.typography.bodyFamily};
    font-size: 0.85rem;
    color: ${tokens.palette.textSecondary};

    &::before {
      content: '▸';
      color: ${tokens.palette.gaming};
      font-weight: bold;
    }
  }
`;

const MetalCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  background: ${tokens.palette.gaming}15;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.2s ease;
  &:hover { background: ${tokens.palette.gaming}25; }
`;

/* ── Feature Grid (Masonry-like) ── */

const MasonryGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: auto;
  gap: 1rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const MasonryCell = styled(motion.div)<{ $span?: boolean }>`
  padding: 1.5rem;
  background: ${tokens.palette.surface};
  border-radius: 0.5rem;
  border-left: 2px solid ${tokens.palette.gaming}40;
  grid-column: ${({ $span }) => $span ? 'span 2' : 'span 1'};
  transition: border-color 0.2s ease;
  &:hover { border-color: ${tokens.palette.gaming}; }

  @media (max-width: 1024px) { grid-column: span 1; }
`;

const MasonryIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.palette.gaming};
  margin-bottom: 0.75rem;
`;

const MasonryTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const MasonryDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

/* ── Stats ── */

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard = styled(motion.div)`
  padding: 2rem;
  background: ${tokens.palette.surface};
  border-radius: 0.5rem;
  border-bottom: 2px solid ${tokens.palette.gaming}60;
  text-align: center;
`;

const StatValue = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 3rem);
  color: ${tokens.palette.gaming};
  text-transform: uppercase;
`;

const StatLabel = styled.div`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  margin-top: 0.5rem;
`;

/* ── Testimonials ── */

const TestimonialStack = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const TestimonialBar = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  padding: 2rem;
  background: ${tokens.palette.surface};
  border-radius: 0.5rem;
  border-left: 3px solid ${tokens.palette.gaming};
  align-items: flex-start;

  @media (max-width: 768px) { flex-direction: column; }
`;

const TestimonialQuote = styled.blockquote`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1rem;
  color: ${tokens.palette.textPrimary};
  line-height: 1.7;
  margin: 0;
  flex: 1;
`;

const TestimonialAuthor = styled.div`
  min-width: 140px;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 0.85rem;
  color: ${tokens.palette.gaming};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TestimonialMeta = styled.div`
  font-size: 0.75rem;
  color: ${tokens.palette.textSecondary};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  margin-top: 0.25rem;
`;

/* ── Creative Section ── */

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
  background: ${tokens.palette.surface};
  overflow: hidden;

  @media (max-width: 768px) { padding: 4rem 1rem; }
`;

const NewsletterDiagonal = styled.div`
  position: absolute;
  top: -5%;
  left: -5%;
  right: -5%;
  height: 110%;
  background: linear-gradient(135deg, transparent 45%, ${tokens.palette.gaming}06 50%, transparent 55%);
  transform: skewY(-3deg);
  pointer-events: none;
`;

const NewsletterInner = styled.div`
  position: relative;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
`;

const NewsletterForm = styled(motion.form)`
  display: flex;
  gap: 0;
  border-radius: 0.5rem;
  overflow: hidden;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const NewsletterInput = styled.input`
  flex: 1;
  padding: 1rem 1.5rem;
  background: ${tokens.palette.bg};
  border: 1px solid ${tokens.palette.border};
  border-right: none;
  color: ${tokens.palette.textPrimary};
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.95rem;
  min-height: 44px;
  outline: none;
  &:focus { border-color: ${tokens.palette.gaming}50; }

  @media (max-width: 600px) { border-right: 1px solid ${tokens.palette.border}; }
`;

const NewsletterBtn = styled.button`
  padding: 1rem 2rem;
  background: ${tokens.palette.gaming};
  color: ${tokens.palette.bg};
  border: none;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: background 0.2s ease;
  &:hover { background: ${tokens.palette.tertiary}; }
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
  font-weight: 800;
  font-size: 1.3rem;
  color: ${tokens.palette.textPrimary};
  text-transform: uppercase;
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
  font-weight: 700;
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
  border-top: 2px solid ${tokens.palette.gaming}20;
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${tokens.palette.textSecondary};

  @media (max-width: 768px) { flex-direction: column; text-align: center; }
`;

// ─── Embers Data ────────────────────────────────────────────────────

const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  delay: i * 1.5,
  left: (i * 5.6) % 100,
  size: 2 + (i % 5) * 1.5,
}));

// ─── Component ──────────────────────────────────────────────────────

const EmberRealm: React.FC = () => {
  const slash = diagonalSlashIn(tokens.motion);
  const fadeUp = fadeUpVariants(tokens.motion);
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
        <HeroForgeGlow />
        <DiagonalSlash />
        {EMBERS.map((e) => (
          <Ember key={e.id} $delay={e.delay} $left={e.left} $size={e.size} />
        ))}

        <HeroContent>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <HeroBadge variants={item}>
              <Flame size={14} />
              {content.hero.badge}
            </HeroBadge>
            <HeroHeading variants={slash}>
              {content.hero.heading}
              <HeroAccent>{content.hero.headingAccent}</HeroAccent>
            </HeroHeading>
            <HeroSub variants={item}>{content.hero.subheading}</HeroSub>
            <HeroActions variants={item}>
              <ForgeButton to={content.hero.ctaPrimary.path}>
                {content.hero.ctaPrimary.label}
                <ArrowRight size={16} />
              </ForgeButton>
              <OutlineButton to={content.hero.ctaSecondary.path}>
                {content.hero.ctaSecondary.label}
              </OutlineButton>
            </HeroActions>
          </motion.div>
        </HeroContent>
      </HeroSection>

      <DiagonalDivider />

      {/* ── Programs ── */}
      <Section $surface>
        <SectionInner>
          <SectionTag variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            <Zap size={12} /> Programs
          </SectionTag>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionDescription}
          </SectionDesc>

          <MetalGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.cards.map((card) => (
              <MetalCard key={card.title} variants={item}>
                {card.badge && <MetalCardBadge>{card.badge}</MetalCardBadge>}
                <MetalCardTitle>{card.title}</MetalCardTitle>
                <MetalCardSub>{card.subtitle}</MetalCardSub>
                <MetalFeatures>
                  {card.features.map((f) => <li key={f}>{f}</li>)}
                </MetalFeatures>
                <MetalCta to={card.ctaPath}>
                  {card.ctaLabel} <ChevronRight size={14} />
                </MetalCta>
              </MetalCard>
            ))}
          </MetalGrid>
        </SectionInner>
      </Section>

      <DiagonalDivider />

      {/* ── Features (Masonry) ── */}
      <Section>
        <SectionInner>
          <SectionTag variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            <Shield size={12} /> Arsenal
          </SectionTag>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionDescription}
          </SectionDesc>

          <MasonryGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.items.map((feat, i) => {
              const Icon = getIcon(feat.icon);
              return (
                <MasonryCell key={feat.title} variants={item} $span={i < 2}>
                  <MasonryIcon><Icon size={22} /></MasonryIcon>
                  <MasonryTitle>{feat.title}</MasonryTitle>
                  <MasonryDesc>{feat.description}</MasonryDesc>
                </MasonryCell>
              );
            })}
          </MasonryGrid>
        </SectionInner>
      </Section>

      <DiagonalDivider />

      {/* ── Creative ── */}
      <Section $surface>
        <SectionInner>
          <SectionTag variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            <Flame size={12} /> Expression
          </SectionTag>
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
                <MetalCard key={card.title} variants={item}>
                  <MasonryIcon><Icon size={22} /></MasonryIcon>
                  <MetalCardTitle>{card.title}</MetalCardTitle>
                  <MasonryDesc>{card.description}</MasonryDesc>
                </MetalCard>
              );
            })}
          </CreativeGrid>
        </SectionInner>
      </Section>

      <DiagonalDivider />

      {/* ── Stats ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
            {content.fitnessStats.sectionTitle}
          </SectionTitle>

          <StatsGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.stats.map((stat) => (
              <StatCard key={stat.label} variants={item}>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </StatCard>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      <DiagonalDivider />

      {/* ── Testimonials ── */}
      <Section $surface>
        <SectionInner>
          <SectionTag variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            <Star size={12} /> Battle Stories
          </SectionTag>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionTitle}
          </SectionTitle>

          <TestimonialStack variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.items.map((t) => (
              <TestimonialBar key={t.name} variants={item}>
                <TestimonialQuote>{t.quote}</TestimonialQuote>
                <TestimonialAuthor>
                  {t.name}
                  <TestimonialMeta>{t.duration}</TestimonialMeta>
                </TestimonialAuthor>
              </TestimonialBar>
            ))}
          </TestimonialStack>
        </SectionInner>
      </Section>

      <DiagonalDivider />

      {/* ── Newsletter ── */}
      <NewsletterSection>
        <NewsletterDiagonal />
        <NewsletterInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
            {content.newsletter.heading}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center', margin: '0 auto 2.5rem' }}>
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

export default EmberRealm;
