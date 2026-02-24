/**
 * FrozenCanopy.tsx — Design 2: "Frozen Canopy" — Arctic Enchanted Forest
 *
 * Mood: Frozen enchanted forest with aurora borealis. Crystalline surfaces. Ice and light.
 * Hero: Aurora gradient animation, parallax depth, ice-crack reveal text.
 * Particles: Falling ice crystals / snowflake motes with rotation.
 * Cards: Frosted glass with thick blur (40px), ice-blue borders, rounded 2rem.
 * Section style: Layered overlap sections, horizontal scroll carousel for programs.
 * Motion: Medium-high — flowing aurora, parallax, smooth overlaps.
 */

import React, { useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, ArrowRight, Mail, MapPin, Phone, Clock,
  ChevronRight, Sparkles,
} from 'lucide-react';

import { frozenCanopyTokens as tokens } from '../cinematic-tokens';
import { homepageContent as content } from '../HomepageContent';
import { iceCrackReveal, staggerContainer, staggerItem, fadeUpVariants, defaultViewport, heroViewport } from '../cinematic-animations';
import { NoiseOverlay } from '../cinematic-shared';
import CinematicNavbar from '../sections/CinematicNavbar';

// ─── Icon Map ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, Clock, Mail,
};

const getIcon = (name: string) => ICON_MAP[name] || Star;

// ─── Keyframes ──────────────────────────────────────────────────────

const auroraFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const snowfall = keyframes`
  0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
  10% { opacity: 0.7; }
  90% { opacity: 0.3; }
  100% { transform: translate(-30px, 110vh) rotate(180deg); opacity: 0; }
`;

const icePulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px ${tokens.palette.gaming}10, inset 0 0 20px ${tokens.palette.gaming}05; }
  50% { box-shadow: 0 0 30px ${tokens.palette.gaming}20, inset 0 0 30px ${tokens.palette.gaming}08; }
`;

const shimmer = keyframes`
  0% { left: -100%; }
  100% { left: 200%; }
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

const AuroraBackground = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    ${tokens.palette.bg} 0%,
    ${tokens.palette.tertiary} 25%,
    ${tokens.palette.secondary}30 50%,
    ${tokens.palette.gaming}20 75%,
    ${tokens.palette.bg} 100%
  );
  background-size: 400% 400%;
  animation: ${auroraFlow} 15s ease infinite;
  opacity: 0.6;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const FrostLayer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to top, ${tokens.palette.bg}, transparent);
  pointer-events: none;
`;

const SnowMote = styled.div<{ $delay: number; $left: number; $size: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: radial-gradient(circle, ${tokens.palette.gaming}60 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  animation: ${snowfall} ${({ $size }) => 10 + $size}s linear infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { display: none; }
`;

const HeroBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 2rem;
  background: ${tokens.palette.glass};
  border: 1px solid ${tokens.palette.gaming}30;
  backdrop-filter: blur(20px);
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
  color: ${tokens.palette.textPrimary};
  max-width: 800px;
  margin: 0;
`;

const HeroAccent = styled.span`
  display: block;
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary}, ${tokens.palette.accent});
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

const FrostButton = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, ${tokens.palette.accent}, ${tokens.palette.gaming});
  color: ${tokens.palette.bg};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: ${shimmer} 3s ease-in-out infinite;
  }

  &:hover { transform: scale(1.03); box-shadow: 0 4px 30px rgba(96, 192, 240, 0.3); }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
    &:hover { transform: none; }
  }
`;

const GhostButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 1.5rem;
  background: transparent;
  color: ${tokens.palette.textPrimary};
  border: 1px solid ${tokens.palette.gaming}40;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: border-color 0.3s ease;
  &:hover { border-color: ${tokens.palette.gaming}; }
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

/* ── Ice Divider ── */

const IceDivider = styled.div`
  position: relative;
  height: 60px;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 5%;
    right: 5%;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${tokens.palette.gaming}25, ${tokens.palette.secondary}20, transparent);
  }
`;

/* ── Horizontal Scroll Carousel (Programs) ── */

const CarouselWrapper = styled.div`
  overflow-x: auto;
  padding-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${tokens.palette.gaming}40 transparent;

  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${tokens.palette.gaming}40; border-radius: 2px; }
`;

const CarouselTrack = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem;
  min-width: max-content;
`;

const IceCard = styled(motion.div)`
  width: 360px;
  min-width: 360px;
  padding: 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid ${tokens.palette.gaming}20;
  border-radius: 2rem;
  animation: ${icePulse} 4s ease-in-out infinite;
  transition: border-color 0.3s ease;

  &:hover { border-color: ${tokens.palette.gaming}50; }

  @media (max-width: 430px) { width: 300px; min-width: 300px; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const IceCardBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background: ${tokens.palette.gaming}15;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const IceCardTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.4rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const IceCardSub = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0 0 1.5rem;
`;

const IceCardFeatures = styled.ul`
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
      content: '◆';
      color: ${tokens.palette.gaming};
      font-size: 0.5rem;
    }
  }
`;

const IceCardCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 1.5rem;
  background: ${tokens.palette.gaming}15;
  color: ${tokens.palette.gaming};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.2s ease;
  &:hover { background: ${tokens.palette.gaming}25; }
`;

/* ── Feature Grid ── */

const FeatureGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const FeatureGlassCard = styled(motion.div)`
  padding: 2rem 1.5rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid ${tokens.palette.gaming}15;
  border-radius: 2rem;
  text-align: center;
  transition: border-color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: ${tokens.palette.gaming}40;
    transform: translateY(-4px);
  }

  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const FeatureIconWrap = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 1.25rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${tokens.palette.gaming}15, ${tokens.palette.secondary}10);
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

/* ── Stats ── */

const StatsBanner = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  padding: 3rem 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(30px);
  border: 1px solid ${tokens.palette.gaming}15;
  border-radius: 2rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 600px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatCell = styled(motion.div)`
  text-align: center;
`;

const StatValue = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 700;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  background: linear-gradient(135deg, ${tokens.palette.gaming}, ${tokens.palette.secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatLabel = styled.div`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.8rem;
  color: ${tokens.palette.textSecondary};
  margin-top: 0.25rem;
`;

/* ── Testimonials ── */

const TestimonialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const TestimonialGlass = styled(motion.div)`
  padding: 2rem;
  background: ${tokens.palette.glass};
  backdrop-filter: blur(30px);
  border: 1px solid ${tokens.palette.gaming}15;
  border-radius: 2rem;
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

/* ── Creative Section ── */

const CreativeGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

/* ── Newsletter ── */

const NewsletterWrap = styled.section`
  position: relative;
  padding: 6rem 1.5rem;
  text-align: center;
  background: linear-gradient(180deg, ${tokens.palette.surface} 0%, ${tokens.palette.bg} 100%);
`;

const NewsletterInner = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const NewsletterForm = styled(motion.form)`
  display: flex;
  gap: 0;
  border-radius: 1.5rem;
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
  background: linear-gradient(135deg, ${tokens.palette.accent}, ${tokens.palette.gaming});
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

// ─── Snow Motes Data ────────────────────────────────────────────────

const SNOW = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  delay: i * 1.8,
  left: (i * 6.7) % 100,
  size: 3 + (i % 5) * 2,
}));

// ─── Component ──────────────────────────────────────────────────────

const FrozenCanopy: React.FC = () => {
  const iceReveal = iceCrackReveal(tokens.motion);
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
        <AuroraBackground />
        <FrostLayer />
        {SNOW.map((s) => (
          <SnowMote key={s.id} $delay={s.delay} $left={s.left} $size={s.size} />
        ))}

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <HeroBadge variants={item}>
            <Sparkles size={14} />
            {content.hero.badge}
          </HeroBadge>
          <HeroHeading variants={iceReveal}>
            {content.hero.heading}
            <HeroAccent>{content.hero.headingAccent}</HeroAccent>
          </HeroHeading>
          <HeroSub variants={item}>{content.hero.subheading}</HeroSub>
          <HeroActions variants={item}>
            <FrostButton to={content.hero.ctaPrimary.path}>
              {content.hero.ctaPrimary.label}
              <ArrowRight size={16} />
            </FrostButton>
            <GhostButton to={content.hero.ctaSecondary.path}>
              {content.hero.ctaSecondary.label}
            </GhostButton>
          </HeroActions>
        </motion.div>
      </HeroSection>

      <IceDivider />

      {/* ── Programs (Horizontal Carousel) ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.sectionDescription}
          </SectionDesc>
        </SectionInner>

        <CarouselWrapper>
          <CarouselTrack variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.programs.cards.map((card) => (
              <IceCard key={card.title} variants={item}>
                {card.badge && <IceCardBadge>{card.badge}</IceCardBadge>}
                <IceCardTitle>{card.title}</IceCardTitle>
                <IceCardSub>{card.subtitle}</IceCardSub>
                <IceCardFeatures>
                  {card.features.map((f) => <li key={f}>{f}</li>)}
                </IceCardFeatures>
                <IceCardCta to={card.ctaPath}>
                  {card.ctaLabel} <ChevronRight size={14} />
                </IceCardCta>
              </IceCard>
            ))}
          </CarouselTrack>
        </CarouselWrapper>
      </Section>

      <IceDivider />

      {/* ── Features ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.sectionDescription}
          </SectionDesc>

          <FeatureGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.features.items.map((feat) => {
              const Icon = getIcon(feat.icon);
              return (
                <FeatureGlassCard key={feat.title} variants={item}>
                  <FeatureIconWrap><Icon size={24} /></FeatureIconWrap>
                  <FeatureTitle>{feat.title}</FeatureTitle>
                  <FeatureDesc>{feat.description}</FeatureDesc>
                </FeatureGlassCard>
              );
            })}
          </FeatureGrid>
        </SectionInner>
      </Section>

      <IceDivider />

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
                <FeatureGlassCard key={card.title} variants={item}>
                  <FeatureIconWrap><Icon size={24} /></FeatureIconWrap>
                  <FeatureTitle>{card.title}</FeatureTitle>
                  <FeatureDesc>{card.description}</FeatureDesc>
                </FeatureGlassCard>
              );
            })}
          </CreativeGrid>
        </SectionInner>
      </Section>

      <IceDivider />

      {/* ── Stats Banner ── */}
      <Section>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
            {content.fitnessStats.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
            {content.fitnessStats.sectionDescription}
          </SectionDesc>

          <StatsBanner variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.fitnessStats.stats.map((stat) => (
              <StatCell key={stat.label} variants={item}>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </StatCell>
            ))}
          </StatsBanner>
        </SectionInner>
      </Section>

      <IceDivider />

      {/* ── Testimonials ── */}
      <Section $surface>
        <SectionInner>
          <SectionTitle variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionTitle}
          </SectionTitle>
          <SectionDesc variants={fadeUp} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.sectionDescription}
          </SectionDesc>

          <TestimonialGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.testimonials.items.map((t) => (
              <TestimonialGlass key={t.name} variants={item}>
                <TestimonialQuote>{t.quote}</TestimonialQuote>
                <TestimonialAuthor>{t.name}</TestimonialAuthor>
                <TestimonialMeta>{t.duration} — {t.category}</TestimonialMeta>
              </TestimonialGlass>
            ))}
          </TestimonialGrid>
        </SectionInner>
      </Section>

      <IceDivider />

      {/* ── Newsletter ── */}
      <NewsletterWrap>
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
      </NewsletterWrap>

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

export default FrozenCanopy;
