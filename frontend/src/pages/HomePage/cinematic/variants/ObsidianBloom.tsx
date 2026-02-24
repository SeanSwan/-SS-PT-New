/**
 * ObsidianBloom.tsx — Design 1: "Obsidian Bloom" — Dark Gothic Garden
 *
 * Mood: Dark botanical garden at midnight. Romantic gothic luxury. Thorns and roses.
 * Hero: Full-viewport oversized serif text, rose-tinted fog, fashion editorial feel.
 * Particles: Floating dark rose petals, slow drift downward.
 * Cards: Tall portrait-oriented, thin gold borders, sharp corners — editorial.
 * Section style: High contrast, dramatic typography (5rem+), minimal UI chrome.
 * Motion: Medium — slow, deliberate, luxurious. No bouncy springs.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, ArrowRight, Mail, MapPin, Phone, Clock,
  Facebook, Instagram, Youtube, ChevronRight,
} from 'lucide-react';

import { obsidianBloomTokens as tokens } from '../cinematic-tokens';
import { homepageContent as content } from '../HomepageContent';
import { driftInVariants, staggerContainer, staggerItem, defaultViewport, heroViewport } from '../cinematic-animations';
import { NoiseOverlay } from '../cinematic-shared';
import CinematicNavbar from '../sections/CinematicNavbar';

// ─── Icon Map ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
  Music, Palette, Mic, Star, Clock, Mail,
};

const getIcon = (name: string) => ICON_MAP[name] || Star;

// ─── Keyframes ──────────────────────────────────────────────────────

const petalFall = keyframes`
  0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.4; }
  100% { transform: translate(80px, 110vh) rotate(360deg); opacity: 0; }
`;

const roseFog = keyframes`
  0% { opacity: 0.2; transform: translateX(-5%) scale(1); }
  50% { opacity: 0.35; transform: translateX(3%) scale(1.05); }
  100% { opacity: 0.2; transform: translateX(-5%) scale(1); }
`;

const goldPulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
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

const HeroFog = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 80%, ${tokens.palette.gaming}18 0%, transparent 60%),
              radial-gradient(ellipse at 20% 30%, ${tokens.palette.secondary}08 0%, transparent 50%);
  animation: ${roseFog} 20s ease-in-out infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Petal = styled.div<{ $delay: number; $left: number; $size: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size * 1.3}px;
  background: ${tokens.palette.gaming};
  border-radius: 50% 0 50% 0;
  opacity: 0;
  animation: ${petalFall} ${({ $size }) => 12 + $size * 0.5}s linear infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) { display: none; }
`;

const HeroBadge = styled(motion.span)`
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border: 1px solid ${tokens.palette.accent}40;
  color: ${tokens.palette.accent};
  font-family: ${tokens.typography.monoFamily};
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const HeroHeading = styled(motion.h1)`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 300;
  font-size: clamp(3.5rem, 10vw, 7rem);
  line-height: 1.05;
  color: ${tokens.palette.textPrimary};
  max-width: 900px;
  margin: 0;
`;

const HeroAccent = styled.span`
  display: block;
  color: ${tokens.palette.gaming};
  font-style: italic;
`;

const HeroSub = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${tokens.palette.textSecondary};
  max-width: 560px;
  line-height: 1.8;
  margin: 2rem 0 3rem;
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const PrimaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: ${tokens.palette.accent};
  color: ${tokens.palette.bg};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  text-decoration: none;
  text-transform: uppercase;
  min-height: 44px;
  transition: opacity 0.3s ease;
  &:hover { opacity: 0.85; }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: transparent;
  color: ${tokens.palette.textPrimary};
  border: 1px solid ${tokens.palette.border};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 500;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  text-decoration: none;
  text-transform: uppercase;
  min-height: 44px;
  transition: border-color 0.3s ease;
  &:hover { border-color: ${tokens.palette.accent}; }
`;

/* ── Section Primitives ── */

const Section = styled.section`
  position: relative;
  padding: 8rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 5rem 1rem; }
`;

const SectionLabel = styled(motion.span)`
  display: block;
  font-family: ${tokens.typography.monoFamily};
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${tokens.palette.accent};
  margin-bottom: 1rem;
`;

const SectionTitle = styled(motion.h2)`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 300;
  font-size: clamp(2.5rem, 6vw, 5rem);
  line-height: 1.1;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 1.5rem;
`;

const SectionDesc = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1.1rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.8;
  max-width: 600px;
  margin: 0 0 4rem;
`;

/* ── Divider ── */

const GoldLine = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${tokens.palette.accent}30, transparent);
`;

/* ── Portrait Cards (Programs) ── */

const PortraitGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const PortraitCard = styled(motion.div)`
  position: relative;
  border: 1px solid ${tokens.palette.accent}20;
  padding: 2.5rem 2rem;
  background: ${tokens.palette.surface};
  min-height: 400px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.4s ease;

  &:hover {
    border-color: ${tokens.palette.accent}50;
  }
`;

const CardBadge = styled.span`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid ${tokens.palette.accent}40;
  font-family: ${tokens.typography.monoFamily};
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${tokens.palette.accent};
`;

const CardTitle = styled.h3`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 400;
  font-size: 1.8rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.5rem;
`;

const CardSub = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  margin: 0 0 1.5rem;
  line-height: 1.6;
`;

const CardFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 auto;

  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid ${tokens.palette.border};
    font-family: ${tokens.typography.bodyFamily};
    font-size: 0.85rem;
    color: ${tokens.palette.textSecondary};

    &:last-child { border-bottom: none; }
  }
`;

const CardCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  color: ${tokens.palette.accent};
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  min-height: 44px;

  &:hover { opacity: 0.75; }
`;

/* ── Feature Grid ── */

const FeatureGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  border: 1px solid ${tokens.palette.accent}15;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const FeatureCell = styled(motion.div)`
  padding: 2.5rem 2rem;
  border-bottom: 1px solid ${tokens.palette.accent}10;
  border-right: 1px solid ${tokens.palette.accent}10;
  transition: background 0.4s ease;

  &:hover { background: ${tokens.palette.surface}; }

  &:nth-child(2n) { border-right: none; }
  @media (max-width: 768px) { border-right: none; }
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.palette.gaming};
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.1rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.75rem;
`;

const FeatureDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

/* ── Stats Row ── */

const StatsRow = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  text-align: center;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
`;

const StatItem = styled(motion.div)``;

const StatValue = styled.div`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 300;
  font-size: clamp(2.5rem, 5vw, 4rem);
  color: ${tokens.palette.accent};
  line-height: 1;
`;

const StatLabel = styled.div`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${tokens.palette.textSecondary};
  margin-top: 0.5rem;
`;

/* ── Testimonials ── */

const TestimonialStack = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const TestimonialCard = styled(motion.div)`
  border-left: 2px solid ${tokens.palette.gaming};
  padding: 2rem 2.5rem;
  background: ${tokens.palette.surface};
`;

const TestimonialQuote = styled.blockquote`
  font-family: ${tokens.typography.dramaFamily};
  font-style: italic;
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  color: ${tokens.palette.textPrimary};
  line-height: 1.7;
  margin: 0 0 1.5rem;
`;

const TestimonialAuthor = styled.div`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  color: ${tokens.palette.accent};
`;

const TestimonialMeta = styled.span`
  font-weight: 400;
  color: ${tokens.palette.textSecondary};
  margin-left: 0.5rem;
`;

/* ── Creative Section ── */

const CreativeGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const CreativeCard = styled(motion.div)`
  border: 1px solid ${tokens.palette.accent}15;
  padding: 2.5rem 2rem;
  transition: border-color 0.4s ease;
  &:hover { border-color: ${tokens.palette.gaming}40; }
`;

const CreativeCardTitle = styled.h3`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 400;
  font-size: 1.5rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.75rem;
`;

const CreativeCardDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

/* ── Newsletter ── */

const NewsletterSection = styled.section`
  position: relative;
  padding: 8rem 1.5rem;
  text-align: center;
  background: ${tokens.palette.surface};

  @media (max-width: 768px) { padding: 5rem 1rem; }
`;

const NewsletterInner = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const NewsletterHeading = styled(motion.h2)`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 300;
  font-size: clamp(2rem, 4vw, 3.5rem);
  color: ${tokens.palette.textPrimary};
  margin: 0 0 1rem;
`;

const NewsletterSub = styled(motion.p)`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 1rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0 0 2.5rem;
`;

const NewsletterForm = styled(motion.form)`
  display: flex;
  gap: 0;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const NewsletterInput = styled.input`
  flex: 1;
  padding: 1rem 1.5rem;
  background: ${tokens.palette.bg};
  border: 1px solid ${tokens.palette.border};
  color: ${tokens.palette.textPrimary};
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.95rem;
  min-height: 44px;
  outline: none;
  &:focus { border-color: ${tokens.palette.accent}50; }
`;

const NewsletterBtn = styled.button`
  padding: 1rem 2rem;
  background: ${tokens.palette.accent};
  color: ${tokens.palette.bg};
  border: none;
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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

const FooterTop = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterBrand = styled.div``;

const FooterBrandName = styled.h3`
  font-family: ${tokens.typography.dramaFamily};
  font-weight: 400;
  font-size: 1.5rem;
  color: ${tokens.palette.textPrimary};
  margin: 0 0 0.75rem;
`;

const FooterDesc = styled.p`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

const FooterGroup = styled.div``;

const FooterGroupTitle = styled.h4`
  font-family: ${tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.palette.accent};
  margin: 0 0 1rem;
`;

const FooterLink = styled(Link)`
  display: block;
  padding: 0.375rem 0;
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${tokens.palette.textSecondary};
  text-decoration: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  &:hover { color: ${tokens.palette.textPrimary}; }
`;

const FooterBottom = styled.div`
  border-top: 1px solid ${tokens.palette.border};
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) { flex-direction: column; text-align: center; }
`;

const Copyright = styled.span`
  font-family: ${tokens.typography.bodyFamily};
  font-size: 0.8rem;
  color: ${tokens.palette.textSecondary};
`;

// ─── Petals Data ────────────────────────────────────────────────────

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  delay: i * 2.5,
  left: (i * 8.3) % 100,
  size: 5 + (i % 4) * 2,
}));

// ─── Component ──────────────────────────────────────────────────────

const ObsidianBloom: React.FC = () => {
  const drift = driftInVariants(tokens.motion);
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
        <HeroFog />
        {PETALS.map((p) => (
          <Petal key={p.id} $delay={p.delay} $left={p.left} $size={p.size} />
        ))}

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          viewport={heroViewport}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <HeroBadge variants={item}>{content.hero.badge}</HeroBadge>
          <HeroHeading variants={item}>
            {content.hero.heading}
            <HeroAccent>{content.hero.headingAccent}</HeroAccent>
          </HeroHeading>
          <HeroSub variants={item}>{content.hero.subheading}</HeroSub>
          <HeroActions variants={item}>
            <PrimaryBtn to={content.hero.ctaPrimary.path}>
              {content.hero.ctaPrimary.label}
              <ArrowRight size={16} />
            </PrimaryBtn>
            <SecondaryBtn to={content.hero.ctaSecondary.path}>
              {content.hero.ctaSecondary.label}
            </SecondaryBtn>
          </HeroActions>
        </motion.div>
      </HeroSection>

      <GoldLine />

      {/* ── Programs ── */}
      <Section>
        <SectionLabel variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          Programs
        </SectionLabel>
        <SectionTitle variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.programs.sectionTitle}
        </SectionTitle>
        <SectionDesc variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.programs.sectionDescription}
        </SectionDesc>

        <PortraitGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.programs.cards.map((card) => (
            <PortraitCard key={card.title} variants={item}>
              {card.badge && <CardBadge>{card.badge}</CardBadge>}
              <CardTitle>{card.title}</CardTitle>
              <CardSub>{card.subtitle}</CardSub>
              <CardFeatures>
                {card.features.map((f) => <li key={f}>{f}</li>)}
              </CardFeatures>
              <CardCta to={card.ctaPath}>
                {card.ctaLabel} <ArrowRight size={14} />
              </CardCta>
            </PortraitCard>
          ))}
        </PortraitGrid>
      </Section>

      <GoldLine />

      {/* ── Features ── */}
      <Section>
        <SectionLabel variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          Services
        </SectionLabel>
        <SectionTitle variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.features.sectionTitle}
        </SectionTitle>
        <SectionDesc variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.features.sectionDescription}
        </SectionDesc>

        <FeatureGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.features.items.map((feat) => {
            const Icon = getIcon(feat.icon);
            return (
              <FeatureCell key={feat.title} variants={item}>
                <FeatureIcon><Icon size={24} /></FeatureIcon>
                <FeatureTitle>{feat.title}</FeatureTitle>
                <FeatureDesc>{feat.description}</FeatureDesc>
              </FeatureCell>
            );
          })}
        </FeatureGrid>
      </Section>

      <GoldLine />

      {/* ── Creative Expression ── */}
      <Section>
        <SectionLabel variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          Expression
        </SectionLabel>
        <SectionTitle variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.creativeExpression.sectionTitle}
        </SectionTitle>
        <SectionDesc variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.creativeExpression.sectionBody}
        </SectionDesc>

        <CreativeGrid variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.creativeExpression.cards.map((card) => {
            const Icon = getIcon(card.icon);
            return (
              <CreativeCard key={card.title} variants={item}>
                <FeatureIcon><Icon size={24} /></FeatureIcon>
                <CreativeCardTitle>{card.title}</CreativeCardTitle>
                <CreativeCardDesc>{card.description}</CreativeCardDesc>
              </CreativeCard>
            );
          })}
        </CreativeGrid>
      </Section>

      <GoldLine />

      {/* ── Stats ── */}
      <Section style={{ textAlign: 'center' }}>
        <SectionLabel variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center' }}>
          Impact
        </SectionLabel>
        <SectionTitle variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport} style={{ textAlign: 'center', margin: '0 auto 4rem' }}>
          {content.fitnessStats.sectionTitle}
        </SectionTitle>

        <StatsRow variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.fitnessStats.stats.map((stat) => (
            <StatItem key={stat.label} variants={item}>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatItem>
          ))}
        </StatsRow>
      </Section>

      <GoldLine />

      {/* ── Testimonials ── */}
      <Section>
        <SectionLabel variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          Voices
        </SectionLabel>
        <SectionTitle variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.testimonials.sectionTitle}
        </SectionTitle>

        <TestimonialStack variants={stagger} initial="hidden" whileInView="visible" viewport={defaultViewport}>
          {content.testimonials.items.map((t) => (
            <TestimonialCard key={t.name} variants={item}>
              <TestimonialQuote>{t.quote}</TestimonialQuote>
              <TestimonialAuthor>
                {t.name}
                <TestimonialMeta>— {t.duration}</TestimonialMeta>
              </TestimonialAuthor>
            </TestimonialCard>
          ))}
        </TestimonialStack>
      </Section>

      <GoldLine />

      {/* ── Newsletter ── */}
      <NewsletterSection>
        <NewsletterInner>
          <NewsletterHeading variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.newsletter.heading}
          </NewsletterHeading>
          <NewsletterSub variants={drift} initial="hidden" whileInView="visible" viewport={defaultViewport}>
            {content.newsletter.subheading}
          </NewsletterSub>
          <NewsletterForm
            variants={drift}
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
        <FooterTop>
          <FooterBrand>
            <FooterBrandName>{content.footer.brandName}</FooterBrandName>
            <FooterDesc>{content.footer.brandDescription}</FooterDesc>
          </FooterBrand>
          {content.footer.linkGroups.map((group) => (
            <FooterGroup key={group.title}>
              <FooterGroupTitle>{group.title}</FooterGroupTitle>
              {group.links.map((link) => (
                <FooterLink key={link.path} to={link.path}>{link.label}</FooterLink>
              ))}
            </FooterGroup>
          ))}
        </FooterTop>
        <FooterBottom>
          <Copyright>&copy; {content.footer.copyright}</Copyright>
          <Copyright>{content.footer.madeWith}</Copyright>
        </FooterBottom>
      </Footer>
    </PageRoot>
  );
};

export default ObsidianBloom;
